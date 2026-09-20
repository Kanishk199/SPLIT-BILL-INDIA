import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma';

// Configure Decimal for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface Balance {
  userId: string;
  userName: string;
  avatarColor: string;
  totalPaid: string;
  totalOwed: string;
  netBalance: string; // positive = owed to you, negative = you owe
}

export interface SettlementTransaction {
  fromId: string;
  fromName: string;
  fromAvatarColor: string;
  toId: string;
  toName: string;
  toAvatarColor: string;
  amount: string;
}

/**
 * Calculate each member's net balance in a group.
 * netBalance > 0 means others owe this person money
 * netBalance < 0 means this person owes others money
 */
export async function calculateBalances(groupId: string): Promise<Balance[]> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
      },
      bills: {
        where: { isSettled: false },
        include: {
          payer: { select: { id: true } },
          items: {
            include: {
              assignments: {
                include: { user: { select: { id: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!group) return [];

  // Initialize balance map
  const balanceMap = new Map<string, { paid: Decimal; owed: Decimal; user: { name: string; avatarColor: string } }>();

  for (const member of group.members) {
    balanceMap.set(member.userId, {
      paid: new Decimal(0),
      owed: new Decimal(0),
      user: { name: member.user.name, avatarColor: member.user.avatarColor },
    });
  }

  // Process each bill
  for (const bill of group.bills) {
    const billTotal = new Decimal(bill.total);
    const subtotal = new Decimal(bill.subtotal);

    // Extra charges (tax, service, tip) ratio
    const extraRatio = subtotal.gt(0)
      ? billTotal.div(subtotal)
      : new Decimal(1);

    // Credit the payer for what they paid
    const payerEntry = balanceMap.get(bill.payerId);
    if (payerEntry) {
      payerEntry.paid = payerEntry.paid.add(billTotal);
    }

    // For each item, assign the cost to the assigned users
    for (const item of bill.items) {
      const itemTotal = new Decimal(item.totalPrice);
      const itemWithExtras = itemTotal.mul(extraRatio);

      if (item.assignments.length === 0) {
        // Unassigned item: split equally among all members
        const share = itemWithExtras.div(group.members.length);
        for (const [userId, entry] of balanceMap) {
          entry.owed = entry.owed.add(share);
        }
      } else {
        // Split by share weight
        const totalShares = item.assignments.reduce(
          (sum, a) => sum.add(new Decimal(a.share)),
          new Decimal(0)
        );

        for (const assignment of item.assignments) {
          const assignedEntry = balanceMap.get(assignment.userId);
          if (assignedEntry) {
            const assignmentShare = new Decimal(assignment.share);
            const amount = itemWithExtras.mul(assignmentShare).div(totalShares);
            assignedEntry.owed = assignedEntry.owed.add(amount);
          }
        }
      }
    }
  }

  // Apply payments
  const payments = await prisma.payment.findMany({
    where: {
      bill: { groupId },
    },
  });

  for (const payment of payments) {
    const fromEntry = balanceMap.get(payment.fromId);
    const toEntry = balanceMap.get(payment.toId);
    const amount = new Decimal(payment.amount);

    if (fromEntry) {
      fromEntry.paid = fromEntry.paid.add(amount);
    }
    if (toEntry) {
      toEntry.owed = toEntry.owed.sub(amount);
    }
  }

  // Calculate net balance
  const balances: Balance[] = [];
  for (const [userId, entry] of balanceMap) {
    const netBalance = entry.paid.sub(entry.owed);
    balances.push({
      userId,
      userName: entry.user.name,
      avatarColor: entry.user.avatarColor,
      totalPaid: entry.paid.toFixed(2),
      totalOwed: entry.owed.toFixed(2),
      netBalance: netBalance.toFixed(2),
    });
  }

  return balances;
}

/**
 * Minimum Settlement Algorithm (Greedy)
 * Minimizes the number of transactions needed to settle all debts in a group.
 */
export function minimizeSettlements(balances: Balance[]): SettlementTransaction[] {
  const transactions: SettlementTransaction[] = [];

  // Separate into creditors and debtors
  type Person = { userId: string; name: string; avatarColor: string; amount: Decimal };
  const creditors: Person[] = []; // net > 0, others owe them
  const debtors: Person[] = [];   // net < 0, they owe others

  for (const b of balances) {
    const net = new Decimal(b.netBalance);
    if (net.gt(0.005)) {
      creditors.push({ userId: b.userId, name: b.userName, avatarColor: b.avatarColor, amount: net });
    } else if (net.lt(-0.005)) {
      debtors.push({ userId: b.userId, name: b.userName, avatarColor: b.avatarColor, amount: net.abs() });
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.amount.cmp(a.amount));
  debtors.sort((a, b) => b.amount.cmp(a.amount));

  // Greedy matching
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transfer = Decimal.min(creditor.amount, debtor.amount);

    if (transfer.gt(0.005)) {
      transactions.push({
        fromId: debtor.userId,
        fromName: debtor.name,
        fromAvatarColor: debtor.avatarColor,
        toId: creditor.userId,
        toName: creditor.name,
        toAvatarColor: creditor.avatarColor,
        amount: transfer.toFixed(2),
      });
    }

    creditor.amount = creditor.amount.sub(transfer);
    debtor.amount = debtor.amount.sub(transfer);

    if (creditor.amount.lte(0.005)) ci++;
    if (debtor.amount.lte(0.005)) di++;
  }

  return transactions;
}

/**
 * Calculate individual share for a bill item considering tax/service charge
 */
export function calculateItemShare(
  itemPrice: string,
  quantity: number,
  billSubtotal: string,
  billTotal: string,
  shareWeight: number,
  totalShares: number
): string {
  const price = new Decimal(itemPrice);
  const qty = new Decimal(quantity);
  const subtotal = new Decimal(billSubtotal);
  const total = new Decimal(billTotal);

  const itemTotal = price.mul(qty);
  const extraRatio = subtotal.gt(0) ? total.div(subtotal) : new Decimal(1);
  const itemWithExtras = itemTotal.mul(extraRatio);
  const share = itemWithExtras.mul(shareWeight).div(totalShares);

  return share.toFixed(2);
}

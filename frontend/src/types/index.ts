// API Types for BillSplit India

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarColor: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  category: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  myBalance?: string;
  totalBills?: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarColor'>;
}

export interface Bill {
  id: string;
  groupId: string;
  payerId: string;
  title: string;
  description?: string;
  category: string;
  imageUrl?: string;
  rawOcrText?: string;
  subtotal: string;
  tax: string;
  serviceCharge: string;
  tip: string;
  discount: string;
  total: string;
  date: string;
  isSettled: boolean;
  createdAt: string;
  payer: Pick<User, 'id' | 'name' | 'avatarColor'>;
  items?: BillItem[];
  group?: Pick<Group, 'id' | 'name' | 'emoji' | 'members'>;
}

export interface BillItem {
  id: string;
  billId: string;
  name: string;
  quantity: number;
  price: string;
  totalPrice: string;
  assignments?: ItemAssignment[];
}

export interface ItemAssignment {
  id: string;
  billItemId: string;
  userId: string;
  share: string;
  amount: string;
  user: Pick<User, 'id' | 'name' | 'avatarColor'>;
}

export interface Balance {
  userId: string;
  userName: string;
  avatarColor: string;
  totalPaid: string;
  totalOwed: string;
  netBalance: string;
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

export interface SettlementResult {
  balances: Balance[];
  transactions: SettlementTransaction[];
  optimizedCount: number;
  naiveCount: number;
  savingsMessage?: string;
}

export interface Payment {
  id: string;
  billId?: string;
  groupId?: string;
  fromId: string;
  toId: string;
  amount: string;
  note?: string;
  method: string;
  createdAt: string;
  from: Pick<User, 'id' | 'name' | 'avatarColor'>;
  to: Pick<User, 'id' | 'name' | 'avatarColor'>;
}

export interface Reminder {
  id: string;
  creatorId: string;
  targetId: string;
  message: string;
  context?: string;
  status: 'pending' | 'sent' | 'cancelled';
  sentAt?: string;
  createdAt: string;
  creator: Pick<User, 'id' | 'name' | 'avatarColor'>;
  target: Pick<User, 'id' | 'name' | 'avatarColor'>;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  action?: string; // JSON string
  createdAt: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  groupId?: string;
  billId?: string;
  title?: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AIAction {
  type: 'assign_items' | 'show_balance' | 'record_payment' | 'create_reminder' | 'general_response' | 'show_settlements';
  data?: Record<string, unknown>;
}

export interface DashboardData {
  totalOwedToMe: string;
  totalIOwe: string;
  pendingGroups: number;
  pendingReminders: number;
  recentBills: Bill[];
  insightMessage: string;
  groups: Array<{
    id: string;
    name: string;
    emoji: string;
    memberCount: number;
    pendingBills: number;
  }>;
}

export interface ExtractedBill {
  title: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  tip: number;
  discount: number;
  total: number;
  rawText?: string;
  confidence: 'high' | 'medium' | 'low';
}

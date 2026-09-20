import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, CheckCircle, Bot, ArrowRight, RefreshCw } from 'lucide-react';
import { settlementsApi, remindersApi, groupsApi } from '../api';
import type { SettlementResult, Balance, Reminder } from '../types';
import { formatCurrency, getInitials } from '../utils';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

export default function SettlementPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Record<string, 'idle' | 'prepared' | 'sending' | 'sent'>>({});
  const [pendingReminder, setPendingReminder] = useState<{ targetId: string; targetName: string; amount: string; message: string } | null>(null);
  const [groupMembers, setGroupMembers] = useState<Array<{ userId: string; user: { id: string; name: string; avatarColor: string } }>>([]);

  useEffect(() => {
    if (!groupId) return;
    
    Promise.all([
      settlementsApi.calculate(groupId),
      groupsApi.get(groupId),
    ])
      .then(([settlRes, groupRes]) => {
        setResult(settlRes.data);
        setGroupMembers(groupRes.data.group.members as unknown as Array<{ userId: string; user: { id: string; name: string; avatarColor: string } }>);
        
        // Initialize reminder states
        const initStates: Record<string, 'idle'> = {};
        settlRes.data.transactions.forEach((tx, i) => {
          initStates[i] = 'idle';
        });
        setReminders(initStates);
      })
      .catch(() => toast.error('Failed to load settlements'))
      .finally(() => setLoading(false));
  }, [groupId]);

  const prepareReminder = (toName: string, toId: string, amount: string, idx: number) => {
    const msg = `Hey ${toName}! Your share from our recent expense is ${formatCurrency(amount)}. Please settle up when you get a chance 🙏`;
    setPendingReminder({ targetId: toId, targetName: toName, amount, message: msg });
    setReminders((prev) => ({ ...prev, [idx]: 'prepared' }));
  };

  const sendReminder = async () => {
    if (!pendingReminder) return;
    const idx = Object.entries(reminders).find(([, v]) => v === 'prepared')?.[0];
    if (idx === undefined) return;

    setReminders((prev) => ({ ...prev, [idx]: 'sending' }));
    try {
      const res = await remindersApi.create({
        targetId: pendingReminder.targetId,
        message: pendingReminder.message,
      });
      await remindersApi.send(res.data.reminder.id);
      setReminders((prev) => ({ ...prev, [idx]: 'sent' }));
      toast.success(`Reminder sent to ${pendingReminder.targetName}! 📨`);
      setPendingReminder(null);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to send reminder');
      setReminders((prev) => ({ ...prev, [idx]: 'idle' }));
    }
  };

  const findMember = (userId: string) => groupMembers.find((m) => m.userId === userId || m.user.id === userId);

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-2xl)' }} />
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="page-container animate-fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/groups/${groupId}`)} style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back to Group
      </button>

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: 8 }}>
          Settle up ⚡
        </h1>

        {/* Optimization badge */}
        {result.savingsMessage && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(59,130,246,0.1) 100%)',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-full)',
            padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-light)',
          }}>
            <Zap size={14} /> {result.savingsMessage}
          </div>
        )}
      </div>

      {/* Settlement transactions */}
      {result.transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-emoji">🎉</div>
          <div className="empty-state-title">All settled up!</div>
          <div className="empty-state-desc">Everyone's balanced. No payments needed!</div>
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', marginBottom: 16 }}>
            Settlement plan
          </h2>
          <div className="settlement-flow">
            {result.transactions.map((tx, idx) => {
              const reminderState = reminders[idx] || 'idle';
              const iAmTheCreditor = tx.toId === user?.id;

              return (
                <div key={idx} className="settlement-transaction" id={`settlement-${idx}`}>
                  {/* From person */}
                  <div className="settlement-person">
                    <div className="avatar avatar-md" style={{ background: tx.fromAvatarColor }}>
                      {getInitials(tx.fromName)}
                    </div>
                    <div className="settlement-person-name">{tx.fromName}</div>
                  </div>

                  {/* Arrow + amount */}
                  <div className="settlement-arrow">
                    <div className="settlement-arrow-line" />
                    <div className="settlement-arrow-amount">{formatCurrency(tx.amount)}</div>
                    <ArrowRight size={14} style={{ color: 'var(--accent)' }} />
                  </div>

                  {/* To person */}
                  <div className="settlement-person">
                    <div className="avatar avatar-md" style={{ background: tx.toAvatarColor }}>
                      {getInitials(tx.toName)}
                    </div>
                    <div className="settlement-person-name">{tx.toName}</div>
                  </div>

                  {/* Actions - only show if I'm the creditor */}
                  {iAmTheCreditor && (
                    <div>
                      {reminderState === 'idle' && (
                        <button
                          className="btn btn-outline btn-sm"
                          id={`remind-btn-${idx}`}
                          onClick={() => prepareReminder(tx.fromName, tx.fromId, tx.amount, idx)}
                        >
                          <Bot size={12} /> Remind
                        </button>
                      )}
                      {reminderState === 'prepared' && (
                        <span className="badge badge-accent">Ready</span>
                      )}
                      {reminderState === 'sending' && (
                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                      )}
                      {reminderState === 'sent' && (
                        <span className="badge badge-neutral"><CheckCircle size={12} /> Sent</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Reminder preview */}
      {pendingReminder && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div className="chat-action-card">
            <div className="chat-action-title">🤖 SplitBot prepared a reminder</div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', margin: '12px 0', fontSize: '0.9rem', lineHeight: 1.6 }}>
              "{pendingReminder.message}"
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              → Will be sent to {pendingReminder.targetName}
            </div>
            <div className="chat-action-buttons">
              <button className="btn btn-accent btn-sm" id="send-reminder-btn" onClick={sendReminder}>
                <CheckCircle size={14} /> Send
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => { setPendingReminder(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balances */}
      {result.balances.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', marginBottom: 16 }}>
            Individual balances
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.balances.map((b) => {
              const net = parseFloat(b.netBalance);
              return (
                <div key={b.userId} className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div className="avatar avatar-md" style={{ background: b.avatarColor }}>{getInitials(b.userName)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.userName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {net > 0 ? 'should receive' : net < 0 ? 'needs to pay' : 'is settled'}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    color: net > 0 ? 'var(--accent-light)' : net < 0 ? 'var(--danger-light)' : 'var(--text-muted)',
                  }}>
                    {net > 0 ? `+${formatCurrency(Math.abs(net))}` : net < 0 ? `-${formatCurrency(Math.abs(net))}` : '✓ Even'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

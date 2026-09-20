import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scan, Plus, UserPlus, Zap, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { groupsApi, settlementsApi } from '../api';
import type { Group, Balance, Bill } from '../types';
import { formatCurrency, formatDate, getCategoryEmoji, getInitials } from '../utils';
import toast from 'react-hot-toast';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'bills' | 'balances'>('bills');

  const loadGroup = () => {
    if (!id) return;
    groupsApi.get(id)
      .then((res) => {
        setGroup(res.data.group);
        setBalances(res.data.balances);
      })
      .catch(() => toast.error('Group not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadGroup(); }, [id]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !memberEmail.trim()) return;
    setAdding(true);
    try {
      await groupsApi.addMember(id, memberEmail);
      toast.success('Member added! 🎉');
      setMemberEmail('');
      setShowAddMember(false);
      loadGroup();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-2xl)' }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 'var(--radius-xl)' }} />
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="page-container animate-fade-in">
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/groups')} style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Groups
      </button>

      {/* Group header */}
      <div className="card-gradient" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div style={{ fontSize: 48 }}>{group.emoji}</div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>{group.name}</h1>
            {group.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>{group.description}</p>}
          </div>
        </div>

        {/* Members avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex' }}>
            {group.members.slice(0, 5).map((m, i) => (
              <div
                key={m.id}
                className="avatar avatar-md"
                style={{
                  background: m.user.avatarColor,
                  marginLeft: i > 0 ? -10 : 0,
                  border: '2px solid var(--bg-card)',
                  fontSize: '0.75rem',
                }}
                title={m.user.name}
              >
                {getInitials(m.user.name)}
              </div>
            ))}
            {group.members.length > 5 && (
              <div className="avatar avatar-md" style={{ background: 'var(--bg-glass-light)', marginLeft: -10, border: '2px solid var(--bg-card)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                +{group.members.length - 5}
              </div>
            )}
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{group.members.length} members</span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddMember(true)}>
              <UserPlus size={14} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/bills/scan', { state: { groupId: id } })}>
          <Scan size={16} /> Scan Bill
        </button>
        <button className="btn btn-outline" onClick={() => navigate(`/groups/${id}/settlements`)}>
          <Zap size={16} /> Settle up
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', borderRadius: 'var(--radius-lg)', padding: 4, marginBottom: 'var(--space-5)', width: 'fit-content' }}>
        {(['bills', 'balances'] as const).map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px', borderRadius: 'calc(var(--radius-lg) - 4px)',
              fontWeight: 600, fontSize: '0.875rem',
              background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab === 'bills' ? '🧾 Bills' : '⚖️ Balances'}
          </button>
        ))}
      </div>

      {/* Bills tab */}
      {activeTab === 'bills' && (
        <div>
          {(group as Group & { bills?: Bill[] }).bills?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-emoji">🧾</div>
              <div className="empty-state-title">No bills yet</div>
              <div className="empty-state-desc">Scan your first bill for this group.</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/bills/scan', { state: { groupId: id } })}>
                <Scan size={16} /> Scan Bill
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(group as Group & { bills?: Bill[] }).bills?.map((bill) => (
                <div
                  key={bill.id}
                  className="bill-card"
                  id={`bill-${bill.id}`}
                  onClick={() => navigate(`/bills/${bill.id}`)}
                >
                  <div className="bill-card-emoji">{getCategoryEmoji(bill.category)}</div>
                  <div className="bill-card-info">
                    <div className="bill-card-title">{bill.title}</div>
                    <div className="bill-card-meta">
                      {formatDate(bill.date)} · paid by {bill.payer?.name || 'Unknown'}
                    </div>
                  </div>
                  <div className="bill-card-amount">
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                      {formatCurrency(bill.total)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: bill.isSettled ? 'var(--accent)' : 'var(--warning)', fontWeight: 600, marginTop: 2 }}>
                      {bill.isSettled ? '✓ Settled' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Balances tab */}
      {activeTab === 'balances' && (
        <div>
          {balances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-emoji">⚖️</div>
              <div className="empty-state-title">All settled up!</div>
              <div className="empty-state-desc">No pending balances in this group.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {balances.map((b) => {
                const net = parseFloat(b.netBalance);
                return (
                  <div key={b.userId} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
                    <div className="avatar avatar-md" style={{ background: b.avatarColor }}>{getInitials(b.userName)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{b.userName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Paid {formatCurrency(b.totalPaid)} · Owes {formatCurrency(b.totalOwed)}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
                      color: net > 0 ? 'var(--accent-light)' : net < 0 ? 'var(--danger-light)' : 'var(--text-muted)',
                    }}>
                      {net > 0 ? `+${formatCurrency(net)}` : net < 0 ? formatCurrency(net) : 'Even ✓'}
                    </div>
                  </div>
                );
              })}
              <button
                className="btn btn-primary w-full"
                style={{ marginTop: 8 }}
                onClick={() => navigate(`/groups/${id}/settlements`)}
              >
                <Zap size={16} /> See settlement plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add member modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add member</h2>
              <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setShowAddMember(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={addMember} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="input-group">
                <label className="input-label" htmlFor="member-email">Member's email</label>
                <input
                  id="member-email"
                  className="input"
                  type="email"
                  placeholder="rahul@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  required
                  autoFocus
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  They must already have a BillSplit India account.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowAddMember(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={adding}>
                  {adding ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Bot, ChevronRight, ArrowRight } from 'lucide-react';
import { billsApi, aiApi } from '../api';
import type { Bill, BillItem, GroupMember } from '../types';
import { formatCurrency, getInitials } from '../utils';
import toast from 'react-hot-toast';

export default function AssignPeoplePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => {
    if (!id) return;
    billsApi.get(id)
      .then((res) => {
        setBill(res.data.bill);
        // Init assignments from existing data
        const init: Record<string, string[]> = {};
        res.data.bill.items?.forEach((item) => {
          init[item.id] = item.assignments?.map((a) => a.userId) || [];
        });
        setAssignments(init);
      })
      .catch(() => toast.error('Bill not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleAssignment = (itemId: string, userId: string) => {
    setAssignments((prev) => {
      const current = prev[itemId] || [];
      const exists = current.includes(userId);
      return {
        ...prev,
        [itemId]: exists ? current.filter((u) => u !== userId) : [...current, userId],
      };
    });
  };

  const handleAiAssign = async () => {
    if (!aiMessage.trim() || !bill?.group || !id) return;
    setAiLoading(true);
    try {
      const res = await aiApi.assign({
        message: aiMessage,
        billId: id,
        groupId: bill.groupId,
      });

      // Apply AI assignments
      const newAssignments = { ...assignments };
      for (const a of res.data.assignments) {
        if (!newAssignments[a.itemId]) newAssignments[a.itemId] = [];
        if (!newAssignments[a.itemId].includes(a.userId)) {
          newAssignments[a.itemId] = [...newAssignments[a.itemId], a.userId];
        }
      }
      setAssignments(newAssignments);
      setAiMessage('');
      setShowAiPanel(false);
      toast.success(`AI assigned items to ${res.data.parsed.length} people! ✨`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'AI assignment failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    const hasAnyAssignment = Object.values(assignments).some((a) => a.length > 0);
    if (!hasAnyAssignment) {
      toast.error('Assign at least one item to someone');
      return;
    }

    setSaving(true);
    try {
      const flat = [];
      for (const [itemId, userIds] of Object.entries(assignments)) {
        for (const userId of userIds) {
          flat.push({ itemId, userId, share: String(1 / userIds.length) });
        }
      }

      await billsApi.assign(id, flat);
      toast.success('Assignments saved! Calculating splits... ⚡');
      navigate(`/groups/${bill?.groupId}/settlements`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const calculatePersonTotal = (memberId: string): number => {
    if (!bill?.items) return 0;
    const subtotal = bill.items.reduce((s, i) => s + parseFloat(i.totalPrice), 0);
    const total = parseFloat(bill.total);
    const extraRatio = subtotal > 0 ? total / subtotal : 1;

    let amount = 0;
    for (const item of bill.items) {
      const assignees = assignments[item.id] || [];
      if (assignees.includes(memberId) && assignees.length > 0) {
        amount += (parseFloat(item.totalPrice) * extraRatio) / assignees.length;
      }
    }
    return amount;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 60, marginBottom: 16, borderRadius: 'var(--radius-xl)' }} />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 12, borderRadius: 'var(--radius-xl)' }} />)}
      </div>
    );
  }

  if (!bill) return null;

  const members = bill.group?.members || [];

  return (
    <div className="page-container animate-fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/bills/${id}`)} style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Bill Details
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          Who had what?
        </h1>
        <button
          className="btn btn-outline btn-sm"
          id="ai-assign-btn"
          onClick={() => setShowAiPanel(!showAiPanel)}
        >
          <Bot size={14} /> Ask AI
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
        Tap people to assign items. Or tell AI who had what.
      </p>

      {/* AI natural language panel */}
      {showAiPanel && (
        <div className="card-gradient" style={{ marginBottom: 24, padding: 'var(--space-5)' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--primary-light)', fontSize: '0.9rem' }}>
            🤖 Tell AI who had what
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
            Example: "Rahul had biryani and coke. Kanishk had paneer and pepsi."
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              placeholder='e.g. "Rahul had biryani..."'
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !aiLoading) handleAiAssign(); }}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAiAssign}
              disabled={aiLoading || !aiMessage.trim()}
            >
              {aiLoading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Assign'}
            </button>
          </div>
        </div>
      )}

      {/* Bill items with assignment */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {bill.items?.map((item) => {
          const assignedUsers = assignments[item.id] || [];
          return (
            <div key={item.id} className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{item.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {item.quantity > 1 ? `${item.quantity}×` : ''} {formatCurrency(item.price)} each
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-light)', fontSize: '1.05rem' }}>
                  {formatCurrency(item.totalPrice)}
                </div>
              </div>

              {/* Member chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {members.map((m) => {
                  const assigned = assignedUsers.includes(m.userId);
                  return (
                    <div
                      key={m.userId}
                      className={`person-chip ${assigned ? 'selected' : ''}`}
                      onClick={() => toggleAssignment(item.id, m.userId)}
                      role="button"
                      tabIndex={0}
                      id={`assign-${item.id}-${m.userId}`}
                    >
                      <div
                        className="avatar avatar-sm"
                        style={{ background: m.user.avatarColor, width: 24, height: 24, fontSize: 10 }}
                      >
                        {getInitials(m.user.name)}
                      </div>
                      {m.user.name.split(' ')[0]}
                      {assigned && <span style={{ color: 'var(--accent-light)', fontSize: 12 }}>✓</span>}
                    </div>
                  );
                })}
              </div>

              {assignedUsers.length > 0 && (
                <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Each pays: {formatCurrency(parseFloat(item.totalPrice) / assignedUsers.length)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Person totals */}
      {members.length > 0 && (
        <div className="card-glass" style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 16, fontSize: '0.95rem' }}>
            Individual totals (preview)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map((m) => {
              const total = calculatePersonTotal(m.userId);
              return (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar avatar-sm" style={{ background: m.user.avatarColor }}>
                    {getInitials(m.user.name)}
                  </div>
                  <div style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>{m.user.name}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: total > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {total > 0 ? formatCurrency(total) : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        className="btn btn-primary w-full btn-lg"
        id="confirm-assignments-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
        ) : (
          <>Confirm & Calculate Settlements <ArrowRight size={18} /></>
        )}
      </button>
    </div>
  );
}

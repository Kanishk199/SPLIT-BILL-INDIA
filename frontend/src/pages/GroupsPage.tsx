import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ChevronRight, X } from 'lucide-react';
import { groupsApi } from '../api';
import type { Group } from '../types';
import { formatCurrency, CATEGORIES } from '../utils';
import toast from 'react-hot-toast';

const GROUP_EMOJIS = ['👥', '🍛', '🏠', '✈️', '🎉', '🏏', '🎬', '☕', '🛒', '🚕'];

export default function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'other', emoji: '👥' });

  const loadGroups = () => {
    groupsApi.list()
      .then((res) => setGroups(res.data.groups))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadGroups(); }, []);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await groupsApi.create(form);
      setGroups((prev) => [res.data.group, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '', category: 'other', emoji: '👥' });
      toast.success('Group created! 🎉');
      navigate(`/groups/${res.data.group.id}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700 }}>Your Groups</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            {groups.length} group{groups.length !== 1 ? 's' : ''} · Split bills with your people
          </p>
        </div>
        <button className="btn btn-primary" id="create-group-btn" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Group
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-xl)' }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-emoji">👥</div>
          <div className="empty-state-title">No groups yet</div>
          <div className="empty-state-desc">Create a group for your roommates, friends, or travel squad.</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create a group
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {groups.map((group) => {
            const balance = parseFloat(group.myBalance || '0');
            return (
              <div
                key={group.id}
                className="card"
                style={{ cursor: 'pointer', padding: 'var(--space-5)' }}
                id={`group-card-${group.id}`}
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-glass-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, flexShrink: 0,
                  }}>
                    {group.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {group.name}
                    </div>
                    {group.description && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {group.description}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <Users size={14} />
                    {group.members?.length || 0} members
                  </div>
                  <div style={{
                    fontSize: '0.9rem', fontWeight: 700,
                    color: balance > 0 ? 'var(--accent-light)' : balance < 0 ? 'var(--danger-light)' : 'var(--text-muted)',
                  }}>
                    {balance > 0 ? `+${formatCurrency(balance)}` : balance < 0 ? formatCurrency(balance) : 'Settled ✓'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create group modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create a group</h2>
              <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createGroup} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Emoji picker */}
              <div className="input-group">
                <label className="input-label">Pick an emoji</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GROUP_EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                      style={{
                        width: 44, height: 44, borderRadius: 'var(--radius-lg)', fontSize: 22,
                        background: form.emoji === e ? 'rgba(124,58,237,0.2)' : 'var(--bg-input)',
                        border: form.emoji === e ? '2px solid var(--primary)' : '1px solid var(--border)',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="group-name">Group name *</label>
                <input
                  id="group-name"
                  className="input"
                  placeholder="Hostel Room 4, Goa Trip, Dinner Squad..."
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="group-desc">Description (optional)</label>
                <input
                  id="group-desc"
                  className="input"
                  placeholder="What's this group for?"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="group-category">Category</label>
                <select
                  id="group-category"
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={creating}>
                  {creating ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

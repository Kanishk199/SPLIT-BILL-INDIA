import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scan, Plus, Bot, TrendingUp, TrendingDown, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { dashboardApi } from '../api';
import type { DashboardData } from '../types';
import { formatCurrency, formatRelativeDate, getCategoryEmoji } from '../utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const owedToMe = parseFloat(data?.totalOwedToMe || '0');
  const iOwe = parseFloat(data?.totalIOwe || '0');

  return (
    <div className="page-container animate-fade-in">
      {/* Greeting */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: 4 }}>
          Hey {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Here's your money situation today
        </p>
      </div>

      {/* Insight card */}
      {data?.insightMessage && (
        <div className="insight-card mb-6" style={{ animationDelay: '0.1s' }}>
          <div className="insight-text">{data.insightMessage}</div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="stat-card stat-card-owed">
          <div className="stat-label">People who owe you</div>
          {loading ? (
            <div className="skeleton" style={{ height: 40, marginTop: 8 }} />
          ) : (
            <div className="stat-value stat-value-green">{formatCurrency(data?.totalOwedToMe || '0')}</div>
          )}
          {owedToMe > 0 && <TrendingUp size={16} style={{ color: 'var(--accent)', marginTop: 8 }} />}
        </div>

        <div className="stat-card stat-card-owes">
          <div className="stat-label">You need to pay</div>
          {loading ? (
            <div className="skeleton" style={{ height: 40, marginTop: 8 }} />
          ) : (
            <div className="stat-value stat-value-red">{formatCurrency(data?.totalIOwe || '0')}</div>
          )}
          {iOwe > 0 && <TrendingDown size={16} style={{ color: 'var(--danger)', marginTop: 8 }} />}
        </div>

        <div className="stat-card stat-card-pending">
          <div className="stat-label">Pending groups</div>
          {loading ? (
            <div className="skeleton" style={{ height: 40, marginTop: 8 }} />
          ) : (
            <div className="stat-value stat-value-yellow">{data?.pendingGroups || 0}</div>
          )}
          <Clock size={16} style={{ color: 'var(--warning)', marginTop: 8 }} />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 'var(--space-4)', fontSize: '1rem' }}>
          Quick actions
        </h2>
        <div className="quick-actions">
          <div className="quick-action-btn" id="quick-scan" onClick={() => navigate('/bills/scan')}>
            <div className="quick-action-icon">📸</div>
            Scan Bill
          </div>
          <div className="quick-action-btn" id="quick-group" onClick={() => navigate('/groups')}>
            <div className="quick-action-icon">👥</div>
            Groups
          </div>
          <div className="quick-action-btn" id="quick-ai" onClick={() => navigate('/ai')}>
            <div className="quick-action-icon">🤖</div>
            Ask AI
          </div>
          <div className="quick-action-btn" id="quick-settle" onClick={() => navigate('/groups')}>
            <div className="quick-action-icon">⚡</div>
            Settle up
          </div>
        </div>
      </div>

      {/* Recent bills */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem' }}>Recent bills</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/groups')} style={{ fontSize: '0.8rem' }}>
            See all <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        ) : data?.recentBills.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <div className="empty-state-emoji">🍽️</div>
            <div className="empty-state-title">No bills yet</div>
            <div className="empty-state-desc">Scan your first bill to get started!</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/bills/scan')}>
              <Scan size={16} /> Scan a Bill
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data?.recentBills.map((bill) => (
              <div
                key={bill.id}
                className="bill-card"
                id={`bill-card-${bill.id}`}
                onClick={() => navigate(`/bills/${bill.id}`)}
              >
                <div className="bill-card-emoji">{getCategoryEmoji(bill.category)}</div>
                <div className="bill-card-info">
                  <div className="bill-card-title">{bill.title}</div>
                  <div className="bill-card-meta">
                    {bill.group?.name} · {formatRelativeDate(bill.date)} · paid by {bill.payer.name}
                  </div>
                </div>
                <div className="bill-card-amount">
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
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

      {/* My groups */}
      {data && data.groups.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem' }}>My groups</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/groups')} style={{ fontSize: '0.8rem' }}>
              All groups <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.groups.slice(0, 3).map((g) => (
              <div
                key={g.id}
                className="card"
                style={{ padding: 'var(--space-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                <div style={{ fontSize: 28 }}>{g.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{g.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{g.memberCount} members · {g.pendingBills} pending bills</div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

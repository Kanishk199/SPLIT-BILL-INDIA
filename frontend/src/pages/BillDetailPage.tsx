import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Edit2, Trash2, Check, X } from 'lucide-react';
import { billsApi } from '../api';
import type { Bill } from '../types';
import { formatCurrency, formatDate, getCategoryEmoji, getInitials } from '../utils';
import toast from 'react-hot-toast';

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    billsApi.get(id)
      .then((res) => setBill(res.data.bill))
      .catch(() => toast.error('Bill not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-2xl)', marginBottom: 20 }} />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 'var(--radius-xl)' }} />)}
      </div>
    );
  }

  if (!bill) return null;

  const subtotal = parseFloat(bill.subtotal);
  const total = parseFloat(bill.total);
  const extraRatio = subtotal > 0 ? total / subtotal : 1;

  return (
    <div className="page-container animate-fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Bill header */}
      <div className="card-gradient" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>{getCategoryEmoji(bill.category)}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>
              {bill.title}
            </h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {bill.group?.name} · {formatDate(bill.date)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent-light)' }}>
              {formatCurrency(bill.total)}
            </div>
            <div style={{
              fontSize: '0.75rem', fontWeight: 600, marginTop: 4,
              color: bill.isSettled ? 'var(--accent)' : 'var(--warning)',
            }}>
              {bill.isSettled ? '✓ Settled' : 'Pending'}
            </div>
          </div>
        </div>

        {/* Payer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
          <div className="avatar avatar-sm" style={{ background: bill.payer?.avatarColor || '#7C3AED' }}>
            {getInitials(bill.payer?.name || 'U')}
          </div>
          <span style={{ color: 'var(--text-muted)' }}>Paid by</span>
          <span style={{ fontWeight: 600 }}>{bill.payer?.name}</span>
        </div>
      </div>

      {/* Receipt */}
      <div className="receipt" style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>ITEM</span>
          <span>AMOUNT</span>
        </div>
        <div className="receipt-body">
          {bill.items?.map((item) => (
            <div key={item.id} className="receipt-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 600 }}>{item.name} {item.quantity > 1 ? `×${item.quantity}` : ''}</span>
                <span style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{formatCurrency(item.totalPrice)}</span>
              </div>
              {item.assignments && item.assignments.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {item.assignments.map((a) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(124,58,237,0.1)', borderRadius: 20, padding: '2px 8px 2px 4px', fontSize: 11 }}>
                      <div className="avatar" style={{ width: 16, height: 16, fontSize: 8, background: a.user.avatarColor }}>{getInitials(a.user.name)}</div>
                      {a.user.name.split(' ')[0]} · {formatCurrency(parseFloat(item.totalPrice) * extraRatio / item.assignments!.length)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="receipt-divider" />

          {parseFloat(bill.tax) > 0 && <div className="receipt-row"><span>Tax / GST</span><span>{formatCurrency(bill.tax)}</span></div>}
          {parseFloat(bill.serviceCharge) > 0 && <div className="receipt-row"><span>Service charge</span><span>{formatCurrency(bill.serviceCharge)}</span></div>}
          {parseFloat(bill.tip) > 0 && <div className="receipt-row"><span>Tip</span><span>{formatCurrency(bill.tip)}</span></div>}
          {parseFloat(bill.discount) > 0 && <div className="receipt-row"><span>Discount</span><span style={{ color: 'var(--accent-light)' }}>-{formatCurrency(bill.discount)}</span></div>}

          <div className="receipt-total" style={{ marginTop: 16 }}>
            <span className="receipt-total-label">Grand Total</span>
            <span className="receipt-total-value">{formatCurrency(bill.total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn btn-primary flex-1"
          id="edit-assignments-btn"
          onClick={() => navigate(`/bills/${id}/assign`)}
        >
          <Users size={16} /> Edit Assignments
        </button>
        <button
          className="btn btn-outline flex-1"
          id="view-settlements-btn"
          onClick={() => navigate(`/groups/${bill.groupId}/settlements`)}
        >
          View Settlements
        </button>
      </div>
    </div>
  );
}

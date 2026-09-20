import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, Camera, FileText, ArrowLeft, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { groupsApi, billsApi } from '../api';
import type { Group, ExtractedBill } from '../types';
import { formatCurrency, CATEGORIES } from '../utils';
import toast from 'react-hot-toast';

interface LocationState { groupId?: string }

export default function ScanBillPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState(state.groupId || '');
  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedBill | null>(null);
  const [editedItems, setEditedItems] = useState<ExtractedBill['items']>([]);
  const [billMeta, setBillMeta] = useState({ title: '', category: 'restaurant', tax: 0, serviceCharge: 0, tip: 0, discount: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    groupsApi.list().then((res) => {
      setGroups(res.data.groups);
      if (!selectedGroup && res.data.groups.length > 0) {
        setSelectedGroup(res.data.groups[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (extracted) {
      setEditedItems(extracted.items);
      setBillMeta({
        title: extracted.title || 'Restaurant Bill',
        category: 'restaurant',
        tax: extracted.tax,
        serviceCharge: extracted.serviceCharge,
        tip: extracted.tip,
        discount: extracted.discount,
      });
    }
  }, [extracted]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.');
      return;
    }

    setScanning(true);
    setExtracted(null);
    try {
      const res = await billsApi.scan(file);
      setExtracted(res.data.bill);
      toast.success('Bill scanned successfully! ✨');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to scan bill. Try entering manually.');
    } finally {
      setScanning(false);
    }
  };

  const addItem = () => {
    setEditedItems((prev) => [...prev, { name: '', quantity: 1, price: 0, totalPrice: 0 }]);
  };

  const removeItem = (idx: number) => {
    setEditedItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: string | number) => {
    setEditedItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'price' || field === 'quantity') {
        updated.totalPrice = (updated.quantity || 1) * (updated.price || 0);
      }
      return updated;
    }));
  };

  const computeSubtotal = () => editedItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
  const computeTotal = () => {
    const sub = computeSubtotal();
    return sub + billMeta.tax + billMeta.serviceCharge + billMeta.tip - billMeta.discount;
  };

  const handleSave = async () => {
    if (!selectedGroup) { toast.error('Please select a group'); return; }
    if (editedItems.length === 0) { toast.error('Add at least one item'); return; }
    if (editedItems.some((i) => !i.name.trim())) { toast.error('All items need a name'); return; }

    setSaving(true);
    try {
      const subtotal = computeSubtotal();
      const total = computeTotal();

      const res = await billsApi.create({
        groupId: selectedGroup,
        title: billMeta.title || 'Restaurant Bill',
        category: billMeta.category,
        subtotal: subtotal.toFixed(2),
        tax: billMeta.tax.toFixed(2),
        serviceCharge: billMeta.serviceCharge.toFixed(2),
        tip: billMeta.tip.toFixed(2),
        discount: billMeta.discount.toFixed(2),
        total: total.toFixed(2),
        items: editedItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price.toFixed(2),
          totalPrice: item.totalPrice.toFixed(2),
        })),
      });

      toast.success('Bill saved! Now assign items to people 👥');
      navigate(`/bills/${res.data.bill.id}/assign`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: 8 }}>
        Scan a Bill
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 32 }}>
        Upload a photo or PDF of your bill. AI will extract all the items.
      </p>

      {!extracted && !scanning && (
        <>
          {/* Group selector */}
          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label" htmlFor="group-select">Which group is this for?</label>
            <select
              id="group-select"
              className="input"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">Select a group...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
              ))}
            </select>
          </div>

          {/* Upload zone */}
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            id="bill-upload-zone"
          >
            <span className="upload-zone-icon">📸</span>
            <div className="upload-zone-text">Drop your bill here or click to upload</div>
            <div className="upload-zone-sub">JPG, PNG, PDF · Max 10MB</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Upload size={16} /> Upload Photo
              </button>
              <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Camera size={16} /> Take Photo
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="visually-hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            capture="environment"
          />

          <div className="divider-label" style={{ margin: '24px 0' }}>
            <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
            <span style={{ padding: '0 16px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR ENTER MANUALLY</span>
            <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
          </div>

          <button
            className="btn btn-outline w-full"
            id="manual-entry-btn"
            onClick={() => setExtracted({ title: 'Restaurant Bill', items: [], subtotal: 0, tax: 0, serviceCharge: 0, tip: 0, discount: 0, total: 0, confidence: 'high' })}
          >
            <FileText size={16} /> Enter bill manually
          </button>
        </>
      )}

      {/* Scanning state */}
      {scanning && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-16)', gap: 'var(--space-4)' }}>
          <div className="spinner spinner-lg" />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600 }}>
            Reading your bill...
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            AI is extracting items, prices, and charges
          </div>
        </div>
      )}

      {/* Extracted bill editor */}
      {extracted && !scanning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Confidence indicator */}
          {extracted.confidence !== 'high' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-4)',
              background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <AlertCircle size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--warning)' }}>Low confidence extraction.</span> Please review and correct any mistakes below.
              </div>
            </div>
          )}

          {/* Bill meta */}
          <div className="card-glass">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 16 }}>Bill Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group" style={{ gridColumn: '1/-1' }}>
                <label className="input-label">Bill title</label>
                <input
                  className="input"
                  value={billMeta.title}
                  onChange={(e) => setBillMeta((m) => ({ ...m, title: e.target.value }))}
                  placeholder="e.g. Dinner at Sharma Dhaba"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select className="input" value={billMeta.category} onChange={(e) => setBillMeta((m) => ({ ...m, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Group</label>
                <select className="input" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                  <option value="">Select group...</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Bill Items ({editedItems.length})
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={addItem}>
                <Plus size={14} /> Add item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {editedItems.map((item, idx) => (
                <div key={idx} className="card" style={{ padding: 'var(--space-4)', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center' }}>
                    <input
                      className="input"
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(idx, 'name', e.target.value)}
                      style={{ minHeight: 'auto', padding: '8px 12px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                      <input
                        type="number"
                        min={1}
                        className="input"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        style={{ width: 52, minHeight: 'auto', padding: '8px 8px', border: 'none', textAlign: 'center', background: 'transparent' }}
                      />
                    </div>
                    <div className="input-prefix" style={{ minWidth: 110 }}>
                      <span className="prefix" style={{ padding: '8px 8px 8px 12px', fontSize: '0.9rem' }}>₹</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input"
                        placeholder="Price"
                        value={item.price || ''}
                        onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                        style={{ minHeight: 'auto', padding: '8px 8px', width: 70 }}
                      />
                    </div>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => removeItem(idx)}
                      style={{ color: 'var(--danger)', width: 36, height: 36 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--accent-light)', fontWeight: 600 }}>
                    Total: {formatCurrency(item.totalPrice)}
                  </div>
                </div>
              ))}

              {editedItems.length === 0 && (
                <button className="btn btn-ghost w-full" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)' }} onClick={addItem}>
                  <Plus size={16} /> Add your first item
                </button>
              )}
            </div>
          </div>

          {/* Charges */}
          <div className="card-glass">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 16 }}>Extra Charges</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { field: 'tax', label: 'Tax / GST' },
                { field: 'serviceCharge', label: 'Service Charge' },
                { field: 'tip', label: 'Tip' },
                { field: 'discount', label: 'Discount (-)' },
              ].map(({ field, label }) => (
                <div key={field} className="input-group">
                  <label className="input-label">{label}</label>
                  <div className="input-prefix">
                    <span className="prefix">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input"
                      value={(billMeta as unknown as Record<string, number>)[field] || ''}
                      onChange={(e) => setBillMeta((m) => ({ ...m, [field]: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total preview */}
          <div className="receipt">
            <div className="receipt-body">
              <div className="receipt-row">
                <span>Subtotal</span>
                <span>{formatCurrency(computeSubtotal())}</span>
              </div>
              {billMeta.tax > 0 && <div className="receipt-row"><span>Tax/GST</span><span>{formatCurrency(billMeta.tax)}</span></div>}
              {billMeta.serviceCharge > 0 && <div className="receipt-row"><span>Service charge</span><span>{formatCurrency(billMeta.serviceCharge)}</span></div>}
              {billMeta.tip > 0 && <div className="receipt-row"><span>Tip</span><span>{formatCurrency(billMeta.tip)}</span></div>}
              {billMeta.discount > 0 && <div className="receipt-row"><span>Discount</span><span style={{ color: 'var(--accent-light)' }}>-{formatCurrency(billMeta.discount)}</span></div>}
              <div className="receipt-total" style={{ marginTop: 12 }}>
                <span className="receipt-total-label">Total</span>
                <span className="receipt-total-value">{formatCurrency(computeTotal())}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline flex-1" onClick={() => { setExtracted(null); setEditedItems([]); }}>
              Rescan
            </button>
            <button
              className="btn btn-primary flex-1"
              id="save-bill-btn"
              onClick={handleSave}
              disabled={saving || !selectedGroup}
            >
              {saving ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (
                <><CheckCircle size={16} /> Save & Assign</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

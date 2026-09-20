import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, LogOut, User, Phone, Mail, CreditCard } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { formatDate, getInitials } from '../utils';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="page-container animate-fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Dashboard
      </button>

      {/* Profile header */}
      <div className="card-gradient" style={{ marginBottom: 'var(--space-6)', textAlign: 'center', padding: 'var(--space-8)' }}>
        <div
          className="avatar avatar-2xl"
          style={{ background: user.avatarColor, margin: '0 auto var(--space-4)' }}
        >
          {getInitials(user.name)}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
          {user.name}
        </h1>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
          Member since {formatDate(user.createdAt)}
        </div>
      </div>

      {/* Info cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 'var(--space-6)' }}>
        {[
          { icon: User, label: 'Full name', value: user.name },
          { icon: Mail, label: 'Email', value: user.email },
          { icon: Phone, label: 'Phone', value: user.phone || 'Not set' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-lg)',
              background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} style={{ color: 'var(--primary-light)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontWeight: 500 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* App info */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          About
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>App version</span>
          <span style={{ fontWeight: 600 }}>1.0.0</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Powered by</span>
          <span style={{ fontWeight: 600 }}>Gemini AI ✨</span>
        </div>
      </div>

      {/* Logout */}
      <button
        className="btn btn-danger w-full"
        id="logout-btn"
        onClick={() => {
          if (window.confirm('Are you sure you want to sign out?')) logout();
        }}
      >
        <LogOut size={16} /> Sign out
      </button>

      <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Made with ❤️ for India
        <br />
        <span className="text-gradient" style={{ fontWeight: 600 }}>BillSplit India v1.0</span>
      </div>
    </div>
  );
}

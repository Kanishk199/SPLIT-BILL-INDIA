import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, Sparkles } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setDemoCredentials = (email: string) => {
    setMode('login');
    setForm({ name: '', email, password: 'Password123!', phone: '' });
    toast.success(`Loaded credentials for ${email}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanEmail = form.email.trim().toLowerCase();

      if (mode === 'login') {
        await login(cleanEmail, form.password);
        toast.success('Welcome back! 👋');
      } else {
        const cleanName = form.name.trim();
        if (cleanName.length < 2) {
          toast.error('Name must be at least 2 characters');
          setLoading(false);
          return;
        }
        if (form.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const cleanPhone = form.phone.trim() || undefined;
        await register(cleanName, cleanEmail, form.password, cleanPhone);
        toast.success("Account created! Let's split some bills 🚀");
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          data?: {
            error?: string;
            details?: Array<{ message: string }>;
          };
        };
        message?: string;
      };
      const errorMsg =
        axiosErr?.response?.data?.details?.[0]?.message ||
        axiosErr?.response?.data?.error ||
        (axiosErr?.message === 'Network Error'
          ? 'Cannot connect to backend server. Make sure the backend is running on port 3001.'
          : axiosErr?.message) ||
        'Authentication failed. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
    }}>
      {/* Bg orbs */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
            <Zap size={40} color="#7C3AED" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: 8 }}>
            <span className="text-gradient">BillSplit India</span> 🇮🇳
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account and start splitting.'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="card-glass" style={{ padding: 'var(--space-8)' }}>
          {/* Toggle */}
          <div style={{
            display: 'flex', background: 'var(--bg-input)',
            borderRadius: 'var(--radius-lg)', padding: 4, marginBottom: 24,
          }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                id={`auth-tab-${m}`}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 'calc(var(--radius-lg) - 4px)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem',
                  transition: 'all 0.2s ease', border: 'none', cursor: 'pointer',
                  background: mode === m ? 'var(--bg-card)' : 'transparent',
                  color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'register' && (
              <div className="input-group">
                <label className="input-label" htmlFor="auth-name">Your name</label>
                <input
                  id="auth-name"
                  className="input"
                  type="text"
                  placeholder="Rahul Sharma"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                className="input"
                type="email"
                placeholder="rahul@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode === 'register' && (
              <div className="input-group">
                <label className="input-label" htmlFor="auth-phone">Phone (optional)</label>
                <input
                  id="auth-phone"
                  className="input"
                  type="tel"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  autoComplete="tel"
                />
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="auth-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={mode === 'register' ? 6 : undefined}
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              id="auth-submit-btn"
              disabled={loading}
              style={{ marginTop: 6 }}
            >
              {loading ? (
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div style={{
            marginTop: 20,
            padding: '12px 14px',
            background: 'rgba(124, 58, 237, 0.08)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--primary-light)', marginBottom: 6 }}>
              <Sparkles size={14} /> Quick Demo Accounts (pass: Password123!)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['rahul@gmail.com', 'pooja@gmail.com', 'aman@gmail.com'].map((email) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => setDemoCredentials(email)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {email.split('@')[0]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              style={{ color: 'var(--primary-light)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          By continuing, you agree to split bills fairly 🤝
        </div>
      </div>
    </div>
  );
}

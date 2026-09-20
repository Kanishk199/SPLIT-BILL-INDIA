import { useNavigate } from 'react-router-dom';
import { Scan, Zap, ArrowRight, ChevronRight, Users, Bot, BarChart3 } from 'lucide-react';

const FEATURES = [
  {
    emoji: '📸',
    title: 'Snap a Bill',
    desc: 'Upload any restaurant receipt. AI extracts every item instantly.',
  },
  {
    emoji: '🤖',
    title: 'AI Splits It',
    desc: 'Tell SplitBot who had what in plain English. It handles the rest.',
  },
  {
    emoji: '⚡',
    title: 'Minimum Transfers',
    desc: 'Our algorithm finds the least number of payments to settle up.',
  },
  {
    emoji: '🇮🇳',
    title: 'Made for India',
    desc: 'Built for chai, biryani, cab rides, and hostel life.',
  },
];

const SCENARIOS = [
  { emoji: '🍛', text: 'Restaurant bills' },
  { emoji: '☕', text: 'Cafe hangouts' },
  { emoji: '🏠', text: 'Hostel/PG expenses' },
  { emoji: '🛒', text: 'Group groceries' },
  { emoji: '🚕', text: 'Cab rides' },
  { emoji: '✈️', text: 'Group trips' },
  { emoji: '🎬', text: 'Movie nights' },
  { emoji: '🎉', text: 'Birthday parties' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem' }}>
          <span className="text-gradient">BillSplit</span>{' '}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>India</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth')}>
            Sign in
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>
            Get started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px',
        position: 'relative',
      }}>
        {/* Animated background orbs */}
        <div style={{
          position: 'absolute', top: '20%', left: '10%',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
          animation: 'float 6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '5%',
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite reverse',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div className="badge badge-primary" style={{ marginBottom: 24, fontSize: '0.8rem', padding: '8px 16px' }}>
          <Zap size={12} /> AI-powered for Indian Gen-Z
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          maxWidth: 800,
          marginBottom: 24,
        }}>
          Stop doing{' '}
          <span className="text-gradient">the math</span>
          <br />
          after the meal.
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          color: 'var(--text-secondary)',
          maxWidth: 560,
          marginBottom: 48,
          lineHeight: 1.7,
        }}>
          Upload your restaurant bill. Tell AI who had what.
          Get exact splits and minimum settlements instantly.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
          <button
            className="btn btn-primary btn-lg"
            id="hero-scan-btn"
            onClick={() => navigate('/auth')}
          >
            <Scan size={20} />
            Scan a Bill
          </button>
          <button
            className="btn btn-outline btn-lg"
            id="hero-ai-btn"
            onClick={() => navigate('/auth')}
          >
            <Bot size={20} />
            Try AI Split
          </button>
        </div>

        {/* Demo receipt visualization */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-2xl)',
          padding: '24px',
          maxWidth: 380,
          width: '100%',
          fontFamily: 'monospace',
          textAlign: 'left',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #7C3AED, #10B981)',
            color: 'white', padding: '4px 16px', borderRadius: 20,
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
          }}>
            AI EXTRACTED ✓
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: 12 }}>
            🍛 Sharma Dhaba — Table 4
          </div>
          {[
            ['Chicken Biryani', '₹280'],
            ['Coke (1L)', '₹60'],
            ['Paneer Tikka', '₹220'],
            ['Pepsi', '₹50'],
          ].map(([item, price]) => (
            <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
              <span>{item}</span>
              <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{price}</span>
            </div>
          ))}
          <div style={{ borderTop: '2px dashed var(--border)', marginTop: 12, paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
              <span>GST (18%)</span><span>₹110</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, marginTop: 8 }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary-light)' }}>₹720</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: 16,
        }}>
          Don't just split the bill.
          <br />
          <span className="text-gradient">Understand it.</span>
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 64, fontSize: '1.05rem' }}>
          Built for real Indian situations — not generic Western apps.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card-glass" style={{ transition: 'transform 0.25s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>{f.emoji}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Flow Section */}
      <section style={{ padding: '80px 24px', background: 'rgba(124, 58, 237, 0.04)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, marginBottom: 48 }}>
            How it works
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              { step: '01', title: 'Scan or upload your bill', desc: 'Take a photo or upload a PDF. AI extracts all items in seconds.', emoji: '📸' },
              { step: '02', title: 'Tell AI who had what', desc: '"Rahul had biryani and coke. Kanishk had paneer." — done.', emoji: '💬' },
              { step: '03', title: 'Get minimum transfers', desc: 'Our algorithm shows the fewest payments needed to settle everyone.', emoji: '⚡' },
              { step: '04', title: 'Review and send reminders', desc: 'AI prepares reminders. You approve. Nothing happens without you.', emoji: '✅' },
            ].map((step, i) => (
              <div key={step.step} style={{
                display: 'flex', alignItems: 'flex-start', gap: 24, textAlign: 'left',
                background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: 24,
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7C3AED, #10B981)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'white',
                  flexShrink: 0,
                }}>
                  {step.step}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.1rem', marginBottom: 6 }}>
                    {step.emoji} {step.title}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, textAlign: 'center', marginBottom: 40 }}>
          Perfect for every Indian situation
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {SCENARIOS.map((s) => (
            <div key={s.text} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)', padding: '10px 18px',
              fontSize: '0.9rem', fontWeight: 500,
              transition: 'all 0.2s ease',
              cursor: 'default',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = 'rgba(124,58,237,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
            >
              {s.emoji} {s.text}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 600, margin: '0 auto',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.25)',
          borderRadius: 'var(--radius-2xl)',
          padding: '60px 40px',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: 16 }}>
            Ready to settle up?
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
            Join thousands of Indian Gen-Z users who've stopped fighting over bills.
          </p>
          <button
            className="btn btn-primary btn-lg"
            id="cta-start-btn"
            onClick={() => navigate('/auth')}
          >
            Start for free <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px', textAlign: 'center',
        borderTop: '1px solid var(--border)',
        color: 'var(--text-muted)', fontSize: '0.85rem',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 8 }}>
          <span className="text-gradient">BillSplit India</span>
        </div>
        <div>Made with ❤️ for India · AI-powered · Split fairly, always</div>
      </footer>
    </div>
  );
}

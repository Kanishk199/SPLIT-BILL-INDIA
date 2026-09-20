import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Scan, Bot, User, Plus, Zap } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { getInitials } from '../../utils';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { path: '/groups', icon: Users, label: 'Groups' },
  { path: '/ai', icon: Bot, label: 'SplitBot' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const SIDEBAR_SECTIONS = [
  {
    title: 'Main',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/groups', icon: Users, label: 'Groups' },
      { path: '/bills/scan', icon: Scan, label: 'Scan Bill' },
    ],
  },
  {
    title: 'AI',
    items: [
      { path: '/ai', icon: Bot, label: 'SplitBot AI' },
    ],
  },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="app-layout">
      {/* Sidebar (desktop) */}
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">BillSplit</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg, #7C3AED, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>INDIA</span>
            <span className="sidebar-logo-sub">· AI-powered splitting</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item) => (
                <div
                  key={item.path}
                  className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(item.path)}
                >
                  <item.icon className="icon" size={18} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Quick action */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <button
              className="btn btn-primary w-full"
              style={{ borderRadius: 'var(--radius-lg)', justifyContent: 'center' }}
              onClick={() => navigate('/bills/scan')}
            >
              <Scan size={16} />
              Scan a Bill
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
            >
              <div
                className="avatar avatar-md"
                style={{ background: user.avatarColor }}
              >
                {getInitials(user.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="app-content">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          item.label === 'SplitBot' ? (
            <div
              key={item.path}
              className="bottom-nav-fab"
              onClick={() => navigate(item.path)}
              role="button"
              tabIndex={0}
              id="bottom-nav-ai"
              aria-label="Open SplitBot AI"
            >
              <Zap size={22} />
            </div>
          ) : (
            <div
              key={item.path}
              className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              role="button"
              tabIndex={0}
              id={`bottom-nav-${item.label.toLowerCase()}`}
              aria-label={item.label}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          )
        ))}
        <div
          className="bottom-nav-item"
          onClick={() => navigate('/bills/scan')}
          role="button"
          tabIndex={0}
          id="bottom-nav-scan"
          aria-label="Scan Bill"
        >
          <Scan size={20} />
          <span>Scan</span>
        </div>
      </nav>
    </div>
  );
}

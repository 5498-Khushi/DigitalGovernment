import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = {
  citizen: [
    { to: '/citizen/dashboard', label: 'Dashboard' },
    { to: '/citizen/services', label: 'Services' },
    { to: '/citizen/notifications', label: 'Notifications' }
  ],
  staff: [
    { to: '/staff/dashboard', label: 'Counter Dashboard' }
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Overview' },
    { to: '/admin/services', label: 'Services' },
    { to: '/admin/counters', label: 'Counters' },
    { to: '/admin/analytics', label: 'Analytics' }
  ]
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const links = NAV_LINKS[user.role] || [];

  return (
    <header className="border-b border-civic-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-civic-600 font-display text-sm font-semibold text-white">
            CS
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold text-civic-700 sm:text-base">
              AI-based Smart Citizen Service Management System
            </p>
            <p className="text-xs text-civic-200 sm:text-civic-600/60">
              {user.role === 'citizen' ? 'Citizen Portal' : user.role === 'staff' ? 'Counter Staff Portal' : 'Administrator Portal'}
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-civic-600 text-white' : 'text-ink hover:bg-civic-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink/70 sm:inline">{user.name}</span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-md border border-civic-100 px-3 py-1.5 text-sm font-medium text-civic-700 hover:bg-civic-50"
          >
            Sign out
          </button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-civic-100 px-4 py-1.5 md:hidden">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                isActive ? 'bg-civic-600 text-white' : 'text-ink hover:bg-civic-50'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

import { ReactNode } from 'react';
import { ConnectKitButton } from 'connectkit';
import { HandCoins } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'create', label: 'Create Offer' },
    { id: 'browse', label: 'Browse Offers' },
    { id: 'how-it-works', label: 'How It Works' },
  ];

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--surface)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent)' }}
            >
              <HandCoins className="h-4 w-4 text-white" />
            </div>
            <span
              className="display text-base font-bold tracking-tight"
              style={{ color: 'var(--ink)' }}
            >
              Item Lending Deposit
            </span>
          </button>

          {/* Nav + Connect */}
          <div className="flex items-center gap-1">
            <nav className="hidden items-center gap-1 sm:flex">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    color: currentPage === link.id ? 'var(--accent)' : 'var(--muted)',
                    background: currentPage === link.id ? 'var(--surface-muted)' : 'transparent',
                  }}
                >
                  {link.label}
                </button>
              ))}
            </nav>
            <div className="ml-3">
              <ConnectKitButton />
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex border-t sm:hidden" style={{ borderColor: 'var(--border)' }}>
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className="flex-1 py-2 text-xs font-medium transition-colors"
              style={{
                color: currentPage === link.id ? 'var(--accent)' : 'var(--muted)',
                borderBottom: currentPage === link.id ? `2px solid var(--accent)` : '2px solid transparent',
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="pb-8 text-center text-xs" style={{ color: 'var(--subtle)' }}>
        Item Lending Deposit — Arc Testnet — USDC Escrow
      </footer>
    </div>
  );
}

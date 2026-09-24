'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchApi } from '@/lib/api-client';
import { IClientPortalSessionDTO, IStudioBranding } from '@pixmatch/types';

export default function ClientPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const pathname = usePathname();

  const [session, setSession] = useState<IClientPortalSessionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      const res = await fetchApi<IClientPortalSessionDTO>(
        `/v1/public/client-portal/${token}/session`
      );
      if (res.success && res.data) {
        setSession(res.data);
        // Also check unread notifications count
        const notifRes = await fetchApi<any[]>(
          `/v1/public/client-portal/${token}/notifications`
        );
        if (notifRes.success && Array.isArray(notifRes.data)) {
          setUnreadNotifications(notifRes.data.filter((n) => !n.is_read).length);
        }
      } else {
        setError(res.error?.message || 'Invalid or expired client portal access link.');
      }
      setLoading(false);
    };

    loadSession();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium">Opening your client portal...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-100">Portal Link Unavailable</h1>
            <p className="text-sm text-slate-400">
              {error || 'This access link is invalid, expired, or has been revoked.'}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Please contact your photographer or studio to request a fresh portal link.
          </p>
        </div>
      </div>
    );
  }

  const branding = session.branding;
  const primaryColor = branding?.primary_color || '#111827';
  const secondaryColor = branding?.secondary_color || '#4F46E5';
  const accentColor = branding?.accent_color || '#06B6D4';
  const fontFamily = branding?.font_family || 'Inter';
  const studioName = branding?.studio_name || session.studio.name;
  const logoUrl = branding?.logo_url || session.studio.logo_url;
  const customFooter = branding?.custom_footer_text || `© ${new Date().getFullYear()} ${studioName}. All rights reserved.`;

  const navItems = [
    { label: 'Home', href: `/portal/client/${token}`, exact: true },
    { label: 'Projects', href: `/portal/client/${token}/projects` },
    { label: 'Orders', href: `/portal/client/${token}/orders` },
    { label: 'Downloads', href: `/portal/client/${token}/downloads` },
    { label: 'Delivery', href: `/portal/client/${token}/delivery` },
    {
      label: 'Notifications',
      href: `/portal/client/${token}/notifications`,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    { label: 'Profile', href: `/portal/client/${token}/profile` },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white"
      style={{ fontFamily: `'${fontFamily}', sans-serif` }}
    >
      {/* Dynamic CSS Variables */}
      <style>{`
        :root {
          --brand-primary: ${primaryColor};
          --brand-secondary: ${secondaryColor};
          --brand-accent: ${accentColor};
        }
      `}</style>

      {/* Top Client Portal Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Studio Brand */}
          <Link
            href={`/portal/client/${token}`}
            className="flex items-center space-x-3 group"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={studioName}
                className="h-9 max-w-[140px] object-contain rounded"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow-md text-sm"
                style={{ backgroundColor: secondaryColor }}
              >
                {studioName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-slate-100 tracking-tight text-base sm:text-lg group-hover:text-indigo-400 transition-colors">
              {studioName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all relative flex items-center space-x-1.5 ${
                    active
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Client Indicator / Mobile Menu Button */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800/60 border border-slate-700/60 rounded-full px-3 py-1 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{session.client.first_name || session.client.name}</span>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-slate-100"
              aria-label="Toggle Navigation"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-base font-medium flex items-center justify-between ${
                    active
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-indigo-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* White-Label Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-slate-500 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="font-medium text-slate-400">{studioName}</p>
              <p className="text-slate-500 mt-0.5">{customFooter}</p>
            </div>

            {/* Social / Contact Links */}
            <div className="flex items-center space-x-4 text-slate-400">
              {branding?.contact_email && (
                <a
                  href={`mailto:${branding.contact_email}`}
                  className="hover:text-slate-200 transition-colors"
                >
                  Contact
                </a>
              )}
              {branding?.website_url && (
                <a
                  href={branding.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-200 transition-colors"
                >
                  Website
                </a>
              )}
            </div>
          </div>

          {/* Conditional PixMatch AI Badge */}
          {branding?.show_pixmatch_badge && (
            <div className="pt-4 border-t border-slate-900 flex items-center justify-center text-[11px] text-slate-600 space-x-1">
              <span>Client Experience Powered by</span>
              <span className="font-semibold text-slate-400 tracking-wide">
                PixMatch AI
              </span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

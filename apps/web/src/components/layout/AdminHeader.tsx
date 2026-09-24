'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  Images,
  Activity,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { AdminSearchResultDTO } from '@pixmatch/types';

export function AdminHeader() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminSearchResultDTO | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced server-side search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults(null);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetchApi<AdminSearchResultDTO>(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.success && res.data) {
          setSearchResults(res.data);
          setIsOpen(true);
        }
      } catch (_err) {
        // Silently handle
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasResults =
    searchResults &&
    (searchResults.studios.length > 0 ||
      searchResults.users.length > 0 ||
      searchResults.subscriptions.length > 0 ||
      searchResults.galleries.length > 0);

  return (
    <header className="h-16 border-b border-card-border/80 bg-[#0B0F17]/95 backdrop-blur sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-muted hover:text-white rounded-lg hover:bg-card-border/40"
          aria-label="Toggle Navigation"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 hidden sm:inline-block">
            Control Center
          </span>
        </div>
      </div>

      {/* Center: Global Admin Search */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (hasResults) setIsOpen(true);
            }}
            placeholder="Search studios, users, plans, galleries..."
            className="w-full bg-[#131B2A] border border-card-border/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0E1422] border border-card-border rounded-xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto z-50 divide-y divide-card-border/40">
            {!hasResults && !isSearching && (
              <div className="p-4 text-center text-xs text-muted">
                No matching platform records found for &quot;{searchQuery}&quot;
              </div>
            )}

            {/* Studios */}
            {searchResults && searchResults.studios.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-amber-400" /> Studios ({searchResults.studios.length})
                </p>
                {searchResults.studios.map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/admin/studios/${s.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-card-border/40 text-white transition group"
                  >
                    <div>
                      <span className="font-semibold group-hover:text-amber-300">{s.name}</span>
                      <span className="text-muted ml-2 font-mono text-[10px]">{s.slug}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-card-border text-muted font-mono uppercase">
                      {s.plan}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Users */}
            {searchResults && searchResults.users.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-blue-400" /> Users ({searchResults.users.length})
                </p>
                {searchResults.users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/dashboard/admin/users/${u.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-card-border/40 text-white transition group"
                  >
                    <div>
                      <span className="font-semibold group-hover:text-blue-300">{u.name}</span>
                      <span className="text-muted ml-2 text-[11px]">{u.email}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                      {u.role}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Subscriptions */}
            {searchResults && searchResults.subscriptions.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 text-emerald-400" /> Subscriptions ({searchResults.subscriptions.length})
                </p>
                {searchResults.subscriptions.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/dashboard/admin/subscriptions`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-card-border/40 text-white transition group"
                  >
                    <div>
                      <span className="font-semibold group-hover:text-emerald-300">{sub.studio_name}</span>
                      <span className="text-muted ml-2 font-mono text-[10px]">{sub.plan}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold uppercase">
                      {sub.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Galleries */}
            {searchResults && searchResults.galleries.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Images className="h-3 w-3 text-purple-400" /> Galleries ({searchResults.galleries.length})
                </p>
                {searchResults.galleries.map((g) => (
                  <Link
                    key={g.id}
                    href={`/dashboard/admin/studios/${g.studio_id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-card-border/40 text-white transition group"
                  >
                    <div>
                      <span className="font-semibold group-hover:text-purple-300">{g.title}</span>
                      <span className="text-muted ml-2 text-[10px] font-mono">{g.slug}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-card-border text-muted">
                      {g.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Operational Status & System Indicator */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/admin/system"
          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/15 transition"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">All Systems Operational</span>
        </Link>
      </div>
    </header>
  );
}

import React from 'react';
import Link from 'next/link';
import { Camera } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-card-border bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Camera className="h-4 w-4" />
          </div>
          <span className="font-bold text-white tracking-tight">PixMatch AI</span>
          <span className="text-xs text-muted">© {new Date().getFullYear()} PixMatch Technologies. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted">
          <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-white transition-colors">Security</Link>
          <Link href="/gallery/sophia-and-liam-wedding" className="hover:text-white transition-colors">Client View</Link>
        </div>
      </div>
    </footer>
  );
}

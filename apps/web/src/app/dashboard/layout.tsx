'use client';

import React from 'react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { CopilotDashboard } from '@/components/dashboard/CopilotDashboard';

export default function CopilotPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
      <DashboardHeader title="AI Photographer Copilot" />
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
        <CopilotDashboard />
      </main>
    </div>
  );
}

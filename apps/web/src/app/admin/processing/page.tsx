'use client';

import React from 'react';
import { Cpu, CheckCircle2, Layers, Server } from 'lucide-react';

export default function AdminProcessingQueuePage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="h-16 border-b border-card-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Global Background Workers</h1>
          <p className="text-xs text-muted">Cluster-wide BullMQ and Redis pipeline state</p>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-3">
            <div className="flex items-center justify-between">
              <Server className="h-6 w-6 text-primary" />
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Connected
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Redis Queue Cluster</h3>
              <p className="text-xs text-muted">localhost:6379 • DB 0</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-3">
            <div className="flex items-center justify-between">
              <Cpu className="h-6 w-6 text-purple-400" />
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Sharp Image Processor</h3>
              <p className="text-xs text-muted">Thumbnail generation pipeline</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-card-border space-y-3">
            <div className="flex items-center justify-between">
              <Layers className="h-6 w-6 text-accent" />
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                Phase 2 Ready
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Face Embedding Service</h3>
              <p className="text-xs text-muted">Python FastAPI InsightFace bridge</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

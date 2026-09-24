'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {
  Camera,
  Sparkles,
  Zap,
  Shield,
  HardDrive,
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Search,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8 border-b border-card-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]" />
        
        <div className="relative mx-auto max-w-5xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Phase 1 Live: Multi-Tenant Architecture & Studio Engine
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            AI-Powered Photo Delivery for{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Modern Studios
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted leading-relaxed">
            Delight photography clients with lightning-fast cloud galleries. Built-in storage adapters, multi-tenant studio management, and future-ready AI facial recognition matching.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition shadow-xl shadow-primary/25 text-base"
            >
              Launch Studio Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/gallery/sophia-and-liam-wedding"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-card hover:bg-card-border/60 text-white border border-card-border font-medium transition text-base"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              View Client Gallery Demo
            </Link>
          </div>

          {/* Social Proof / Stats pill */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-card-border/40 text-left">
            <div>
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-muted">Isolated Tenant Boundaries</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">&lt; 100ms</p>
              <p className="text-xs text-muted">Fastify API Response</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">7 Providers</p>
              <p className="text-xs text-muted">Storage Abstraction Layer</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">Phase 2</p>
              <p className="text-xs text-muted">AI Facial Matching Ready</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">Engineered for Scale</h2>
          <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Everything a Photography Business Needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-card border border-card-border space-y-4 hover:border-primary/40 transition">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-primary">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Multi-Tenant Isolation</h3>
            <p className="text-sm text-muted leading-relaxed">
              Every studio operates in total isolation. Galleries, photos, clients, storage credentials, and metrics are strictly scoped with cryptographic RBAC authorization.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-card-border space-y-4 hover:border-primary/40 transition">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <HardDrive className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Universal Storage Abstraction</h3>
            <p className="text-sm text-muted leading-relaxed">
              Store directly on PixMatch Platform Storage or connect external S3, Cloudflare R2, Google Drive, Dropbox, or OneDrive without changing your gallery workflows.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-card-border space-y-4 hover:border-primary/40 transition">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">AI Face Match Ready</h3>
            <p className="text-sm text-muted leading-relaxed">
              Architecture ready for Python FastAPI + InsightFace + pgvector. Soon guests will find all their photos instantly by uploading a quick selfie.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-card-border/50 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">Simple Transparent Plans</h2>
            <p className="text-3xl font-bold text-white">Choose Your Studio Tier</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="p-8 rounded-2xl bg-card border border-card-border space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-sm text-muted">/ month</span>
                </div>
                <p className="text-xs text-muted mt-2">Perfect for trying out PixMatch AI</p>
                <ul className="mt-6 space-y-3 text-sm text-muted">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 2 GB Platform Storage</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 500 Photos</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Public & Password Galleries</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 50 AI Face Searches / mo</li>
                </ul>
              </div>
              <Link href="/register" className="w-full py-2.5 rounded-lg border border-card-border text-center text-sm font-semibold text-white hover:bg-card-border/60 transition">
                Start Free
              </Link>
            </div>

            {/* Pro */}
            <div className="p-8 rounded-2xl bg-card border-2 border-primary space-y-6 flex flex-col justify-between relative shadow-2xl shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-[11px] font-bold text-white uppercase tracking-wider">
                Most Popular
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Studio Pro</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$29</span>
                  <span className="text-sm text-muted">/ month</span>
                </div>
                <p className="text-xs text-muted mt-2">For active professional photographers</p>
                <ul className="mt-6 space-y-3 text-sm text-muted">
                  <li className="flex items-center gap-2 text-white"><CheckCircle2 className="h-4 w-4 text-primary" /> 50 GB Fast Storage</li>
                  <li className="flex items-center gap-2 text-white"><CheckCircle2 className="h-4 w-4 text-primary" /> 15,000 Photos</li>
                  <li className="flex items-center gap-2 text-white"><CheckCircle2 className="h-4 w-4 text-primary" /> Custom Studio Branding & Domain</li>
                  <li className="flex items-center gap-2 text-white"><CheckCircle2 className="h-4 w-4 text-primary" /> 2,500 AI Face Searches / mo</li>
                  <li className="flex items-center gap-2 text-white"><CheckCircle2 className="h-4 w-4 text-primary" /> Cloudflare R2 / S3 Integration</li>
                </ul>
              </div>
              <Link href="/register" className="w-full py-2.5 rounded-lg bg-primary text-center text-sm font-semibold text-white hover:bg-primary-hover transition shadow-md shadow-primary/30">
                Get Started with Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-2xl bg-card border border-card-border space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Enterprise Agency</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$99</span>
                  <span className="text-sm text-muted">/ month</span>
                </div>
                <p className="text-xs text-muted mt-2">For high-volume photo agencies & multi-teams</p>
                <ul className="mt-6 space-y-3 text-sm text-muted">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 500 GB Storage</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited Photos</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Multi-Photographer Team Seats</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 25,000 AI Face Searches / mo</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Dedicated VIP Support</li>
                </ul>
              </div>
              <Link href="/register" className="w-full py-2.5 rounded-lg border border-card-border text-center text-sm font-semibold text-white hover:bg-card-border/60 transition">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

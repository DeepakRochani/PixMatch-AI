import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'PixMatch AI — Next-Gen AI Photo Delivery for Photography Studios',
  description: 'Multi-tenant SaaS platform for photographers. Ultra-fast client galleries, smart storage integration, and upcoming AI facial recognition.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

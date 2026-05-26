'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Dumbbell } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    } else if (!loading && user && pathname === '/login') {
      router.push('/');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-bgPrimary">
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-accent/10 text-accent rounded-full animate-pulse-ring">
            <Dumbbell className="w-10 h-10 animate-bounce" />
          </div>
          <span className="text-sm font-bold text-textSecondary uppercase tracking-widest animate-pulse">
            Gym Logger Loading...
          </span>
        </div>
      </div>
    );
  }

  // Hide page content during redirect to /login
  if (!user && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}

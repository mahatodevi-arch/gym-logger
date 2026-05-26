'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, ClipboardList, Activity, BarChart2, Settings } from 'lucide-react';

interface TabItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabItem[] = [
  { label: 'Workout', href: '/', icon: Dumbbell },
  { label: 'Templates', href: '/templates', icon: ClipboardList },
  { label: 'Movements', href: '/movements', icon: Activity },
  { label: 'History', href: '/history', icon: BarChart2 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Helper to determine if a route is active
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-glass-bg backdrop-blur-xl border-t border-borderColor px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.15)] transition-colors duration-200">
      
      {TABS.map((tab) => {
        const IconComponent = tab.icon;
        const active = isActive(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center gap-1 py-1 relative select-none active:scale-90 transition-all duration-150 cursor-pointer ${
              active 
                ? 'text-accent font-extrabold drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]' 
                : 'text-textTertiary hover:text-accent/70'
            }`}
            aria-label={tab.label}
          >
            <div className={`p-1 rounded-xl transition-all duration-200 ${active ? 'scale-105' : ''}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            
            <span className="text-[10px] uppercase font-black tracking-wider leading-none">
              {tab.label}
            </span>
            
            {active && (
              <div className="absolute bottom-0 w-1 h-1 rounded-full bg-accent animate-fade-in" />
            )}
          </Link>
        );
      })}

    </nav>
  );
}

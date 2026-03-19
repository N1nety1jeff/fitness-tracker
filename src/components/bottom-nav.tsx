'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TrendingUp, ClipboardList, Dumbbell, Database } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: TrendingUp },
  { label: 'Pläne', href: '/plans', icon: ClipboardList },
  { label: 'Übungen', href: '/exercises', icon: Dumbbell },
  { label: 'Daten', href: '/settings', icon: Database },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent pt-10 z-50">
      <div className="glass-card flex justify-around p-4 border-white/10 shadow-2xl max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Megaphone, Users, Sparkles, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  const routes = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      active: pathname === '/dashboard',
    },
    {
      label: 'Campaigns',
      icon: Megaphone,
      href: '/campaigns',
      active: pathname.startsWith('/campaigns'),
    },
    {
      label: 'Segments',
      icon: Filter,
      href: '/segments',
      active: pathname.startsWith('/segments'),
    },
    {
      label: 'Customers',
      icon: Users,
      href: '/customers',
      active: pathname.startsWith('/customers'),
    },
  ];

  return (
    <div className="flex flex-col w-[240px] bg-background/60 backdrop-blur-xl border-r border-border h-full z-10 shadow-lg">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <div className="font-semibold text-foreground flex items-center gap-3">
          <span className="text-2xl drop-shadow-md">☕</span>
          <span className="tracking-tight text-lg">BrewCRM</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3">
        <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
          Navigation
        </div>
        
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group",
              route.active 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <route.icon className={cn("w-4 h-4 transition-transform duration-200 group-hover:scale-110", route.active ? "text-primary" : "")} />
            {route.label}
          </Link>
        ))}

        <div className="mt-8 mb-1 px-3 text-xs font-semibold text-primary/70 uppercase tracking-widest">
          AI Agent
        </div>
        
        <Link
          href="/chat"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative overflow-hidden",
            pathname === '/chat'
              ? "bg-primary/15 text-primary font-medium shadow-[inset_2px_0_0_0_hsl(var(--primary))]" 
              : "text-primary/70 hover:text-primary hover:bg-primary/10"
          )}
        >
          <Sparkles className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
          <span className="relative z-10">Co-pilot</span>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>
      </div>
    </div>
  );
}

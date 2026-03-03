import React, { memo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import {
  PenLine,
  CalendarDays,
  FileText,
  BookmarkCheck,
  History,
  Shield,
  Settings,
  Sparkles,
} from 'lucide-react';

const NoraLayout = memo(() => {
  const { user } = useUser();
  const isSuperAdmin = user?.role === 'super_admin';

  const navItems = [
    { label: 'Generate', to: '/dashboard/social-media', icon: PenLine, end: true },
    { label: 'Content Calendar', to: '/dashboard/social-media/calendar', icon: CalendarDays },
    { label: 'Saved Posts', to: '/dashboard/social-media/saved', icon: BookmarkCheck },
    { label: 'Post History', to: '/dashboard/social-media/history', icon: History },
  ];

  const adminItems = isSuperAdmin
    ? [
        { label: 'Prompts Library', to: '/dashboard/social-media/prompts', icon: FileText },
        { label: 'Admin Settings', to: '/dashboard/social-media/admin', icon: Shield },
      ]
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Nora Header & Internal Nav */}
      <div className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Nora</h1>
              <p className="text-xs text-muted-foreground">Your AI Content Partner</p>
            </div>
          </div>

          {/* Horizontal Nav Bar */}
          <nav className="flex gap-1 overflow-x-auto pb-0 -mb-px scrollbar-none">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap',
                    isActive
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}

            {adminItems.length > 0 && (
              <>
                <div className="w-px bg-border mx-1 my-2" />
                {adminItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap',
                        isActive
                          ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Sub-page Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
});

NoraLayout.displayName = 'NoraLayout';

export default NoraLayout;

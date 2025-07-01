'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, Mic, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'ホーム',
    icon: Home,
    href: '/',
  },
  {
    id: 'record',
    label: '録音',
    icon: Mic,
    href: '/record',
  },
  {
    id: 'profile',
    label: 'マイページ',
    icon: User,
    href: '/profile',
  },
];

export const BottomNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = (href: string) => {
    console.log('🔄 Navigation clicked:', href);
    // 静的サイトでは直接URLを変更
    window.location.href = href;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-3 h-16">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.href)}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 transition-colors",
                isActive
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-blue-600")} />
              <span className={cn(
                "text-xs font-medium",
                isActive ? "text-blue-600" : "text-gray-500"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  Heart,
  ShoppingCart,
  User
} from 'lucide-react';
import { useCartStore } from '../hooks/useCartStore';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number;
}

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems } = useCartStore();
  const { isLoggedIn } = useAuth();

  const navItems: NavItem[] = [
    {
      icon: <Home size={20} />,
      label: '홈',
      path: '/'
    },
    {
      icon: <Search size={20} />,
      label: '검색',
      path: '/search'
    },
    {
      icon: <Heart size={20} />,
      label: '찜',
      path: '/favorites'
    },
    {
      icon: <ShoppingCart size={20} />,
      label: '장바구니',
      path: '/cart',
      badge: cartItems.length
    },
    {
      icon: <User size={20} />,
      label: isLoggedIn ? '마이' : '로그인',
      path: isLoggedIn ? '/my' : '/login'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav md:hidden">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="mobile-nav-text">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}

export default MobileNav;
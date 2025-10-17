import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';

export interface DashboardStats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalPartners: number;
  totalReviews: number;
  totalBlogs: number;
  totalContacts: number;
}

export interface AdminDataState {
  stats: DashboardStats;
  isLoading: boolean;
  error: string | null;
}

export function useAdminData() {
  const [state, setState] = useState<AdminDataState>({
    stats: {
      totalProducts: 0,
      totalUsers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalPartners: 0,
      totalReviews: 0,
      totalBlogs: 0,
      totalContacts: 0,
    },
    isLoading: true,
    error: null,
  });

  const loadStats = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load all data in parallel with improved error handling
      const [productsRes, usersRes, partnersRes, reviewsRes, blogsRes, contactsRes, ordersRes] = await Promise.all([
        api.getListings({ limit: 1000 }),
        fetch('/api/users').then(r => {
          if (!r.ok) throw new Error(`Users API failed: ${r.status}`);
          return r.json();
        }).catch(err => {
          console.error('❌ Failed to fetch users:', err);
          return { success: false, users: [] };
        }),
        api.getPartners(),
        api.getRecentReviews(1000),
        fetch('/api/blogs').then(r => {
          if (!r.ok) throw new Error(`Blogs API failed: ${r.status}`);
          return r.json();
        }).catch(err => {
          console.error('❌ Failed to fetch blogs:', err);
          return { success: false, blogs: [] };
        }),
        fetch('/api/contacts').then(r => {
          if (!r.ok) throw new Error(`Contacts API failed: ${r.status}`);
          return r.json();
        }).catch(err => {
          console.error('❌ Failed to fetch contacts:', err);
          return { success: false, contacts: [] };
        }),
        fetch('/api/orders').then(r => {
          if (!r.ok) throw new Error(`Orders API failed: ${r.status}`);
          return r.json();
        }).catch(err => {
          console.error('❌ Failed to fetch orders:', err);
          return { success: false, orders: [] };
        }),
      ]);

      const products = productsRes.data || [];
      const users = usersRes.users || [];
      const partners = partnersRes.data || [];
      const reviews = reviewsRes || [];
      const blogs = blogsRes.blogs || [];
      const contacts = contactsRes.contacts || [];
      const orders = ordersRes.orders || [];

      // Calculate revenue from actual orders (payments), not product prices
      const totalRevenue = orders.reduce((sum: number, order: any) => {
        const amount = order.amount || 0;
        return sum + amount;
      }, 0);

      setState({
        stats: {
          totalProducts: products.length,
          totalUsers: users.length,
          totalOrders: orders.length,
          totalRevenue,
          totalPartners: partners.length,
          totalReviews: reviews.length,
          totalBlogs: blogs.length,
          totalContacts: contacts.length,
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load admin stats:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    ...state,
    refresh: loadStats,
  };
}

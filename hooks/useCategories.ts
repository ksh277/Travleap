import { useState, useEffect } from 'react';

export interface Category {
  id: number;
  slug: string;
  name_ko: string;
  name_en?: string;
  icon?: string;
  color_hex?: string;
  sort_order: number;
  is_active: boolean;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/categories');

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('❌ Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');

        // Fallback to hardcoded categories if API fails
        setCategories([
          { id: 1, slug: 'tour', name_ko: '여행', name_en: 'Travel', icon: '🗺️', color_hex: '#FF6B6B', sort_order: 1, is_active: true },
          { id: 2, slug: 'rentcar', name_ko: '렌트카', name_en: 'Car Rental', icon: '🚗', color_hex: '#4ECDC4', sort_order: 2, is_active: true },
          { id: 3, slug: 'accommodation', name_ko: '숙박', name_en: 'Accommodation', icon: '🏨', color_hex: '#45B7D1', sort_order: 3, is_active: true },
          { id: 4, slug: 'food', name_ko: '음식', name_en: 'Food', icon: '🍽️', color_hex: '#96CEB4', sort_order: 4, is_active: true },
          { id: 5, slug: 'attraction', name_ko: '관광지', name_en: 'Tourist Spots', icon: '📷', color_hex: '#FFEAA7', sort_order: 5, is_active: true },
          { id: 6, slug: 'popup', name_ko: '팝업', name_en: 'Pop-up', icon: '🎪', color_hex: '#FF9FF3', sort_order: 6, is_active: true },
          { id: 7, slug: 'event', name_ko: '행사', name_en: 'Events', icon: '📅', color_hex: '#54A0FF', sort_order: 7, is_active: true },
          { id: 8, slug: 'experience', name_ko: '체험', name_en: 'Experience', icon: '🎡', color_hex: '#5F27CD', sort_order: 8, is_active: true },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading, error };
}

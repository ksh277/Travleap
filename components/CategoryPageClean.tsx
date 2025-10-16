import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api, type TravelItem } from '../utils/api';
import { formatPrice } from '../utils/translations';
import CategorySearchBar from './CategorySearchBar';

interface CategoryPageProps {
  selectedCurrency?: string;
}

export function CategoryPage({ selectedCurrency = 'KRW' }: CategoryPageProps) {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<TravelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mappedCategory = category === 'accommodation' ? 'stay' : (category || '');

  // Partner-style search bar state (mirrors query params)
  const [destination, setDestination] = useState<string>(searchParams.get('q') || '');
  const [checkIn, setCheckIn] = useState<string | undefined>(searchParams.get('from') || undefined);
  const [checkOut, setCheckOut] = useState<string | undefined>(searchParams.get('to') || undefined);
  const [timeOption, setTimeOption] = useState<string>(searchParams.get('time') || '선택안함');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = (searchParams.get('q') || '').trim();
        const res = await api.getListings({ category: mappedCategory, limit: 60, sortBy: 'popular' as any, q: q || undefined });
        if (!mounted) return;
        if (res.success && res.data) setItems(res.data);
        else setItems([]);
      } catch (e) {
        if (mounted) setError('목록을 불러오는 중 문제가 발생했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [mappedCategory, searchParams]);

  const filtered = useMemo(() => items, [items]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Partner-style search bar (hero) */}
      <CategorySearchBar
        destination={destination}
        onDestinationChange={setDestination}
        checkIn={checkIn}
        checkOut={checkOut}
        onDateChange={(from, to) => { setCheckIn(from); setCheckOut(to); }}
        timeOption={timeOption}
        onTimeChange={setTimeOption}
        onSearch={() => {
          const sp = new URLSearchParams(searchParams.toString());
          if (destination && destination.trim()) sp.set('q', destination.trim()); else sp.delete('q');
          if (checkIn) sp.set('from', checkIn); else sp.delete('from');
          if (checkOut) sp.set('to', checkOut); else sp.delete('to');
          if (timeOption && timeOption !== '선택안함') sp.set('time', timeOption); else sp.delete('time');
          setSearchParams(sp, { replace: false });
        }}
      />

      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">{mappedCategory}</h1>
          <p className="text-gray-500">카테고리 상품을 확인해 보세요.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-500">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-500">표시할 상품이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/detail/${item.id}`)}
              >
                <div className="relative">
                  <ImageWithFallback
                    src={Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'}
                    alt={item.title}
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    {item.partner?.is_verified && (
                      <Badge variant="secondary" className="bg-blue-500 text-white text-xs">Verified</Badge>
                    )}
                    {(item.partner?.tier === 'gold' || item.partner?.tier === 'platinum') && (
                      <Badge variant="secondary" className="bg-yellow-400 text-black text-xs">스폰서</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold line-clamp-2 mb-1">{item.title}</h3>
                  <div className="text-sm text-gray-600 line-clamp-2 mb-2">{item.short_description || item.description_md || ''}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 text-sm">{item.location || 'Shinan'}</div>
                    <div className="font-semibold text-orange-600">{formatPrice(item.price_from || 0, selectedCurrency)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * 식당 상세 페이지
 * Phase 4: 음식 시스템
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  ShoppingCart,
  Loader2,
  Heart,
  Share2,
  ChevronLeft,
  Star,
  Plus,
  Minus,
  Utensils,
  PackageOpen,
  Truck,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface Menu {
  id: number;
  name: string;
  description: string;
  category: string;
  price_krw: number;
  discount_price_krw: number;
  image_url: string;
  is_available: boolean;
  is_signature: boolean;
  is_popular: boolean;
  options: Array<{
    name: string;
    choices: string[];
    required: boolean;
  }>;
  allergens: string[];
  spicy_level: number;
}

interface Restaurant {
  id: number;
  name: string;
  description: string;
  cuisine_type: string;
  address: string;
  phone: string;
  operating_hours: Record<string, string>;
  break_time: { start: string; end: string } | null;
  last_order_time: string;
  accepts_reservations: boolean;
  accepts_takeout: boolean;
  accepts_delivery: boolean;
  table_order_enabled: boolean;
  thumbnail_url: string;
  images: string[];
  listing_title: string;
  rating: number;
  review_count: number;
}

interface CartItem extends Menu {
  quantity: number;
  selectedOptions: Record<string, string>;
}

export function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menusByCategory, setMenusByCategory] = useState<Record<string, Menu[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // 주문 관련
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');
  const [cart, setCart] = useState<CartItem[]>([]);

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // 식당 정보 조회 (실제로는 /api/food/restaurants/[id] 필요)
        const restaurantResponse = await fetch(`/api/food/restaurants?limit=1`);
        const restaurantResult = await restaurantResponse.json();

        // 메뉴 조회
        const menuResponse = await fetch(`/api/food/menus/${id}`);
        const menuResult = await menuResponse.json();

        if (restaurantResult.success && menuResult.success) {
          // 임시로 첫 번째 식당 사용 (실제로는 ID로 조회)
          setRestaurant(restaurantResult.data[0]);
          setMenus(menuResult.data.menus);
          setMenusByCategory(menuResult.data.menusByCategory);
        } else {
          setError('식당 정보를 찾을 수 없습니다');
        }
      } catch (err) {
        console.error('데이터 로드 오류:', err);
        setError('정보를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // 장바구니에 추가
  const addToCart = (menu: Menu) => {
    const existingItem = cart.find(item => item.id === menu.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === menu.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...menu, quantity: 1, selectedOptions: {} }]);
    }
    toast.success(`${menu.name}을(를) 장바구니에 담았습니다`);
  };

  // 수량 변경
  const updateQuantity = (menuId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === menuId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  // 총 금액 계산
  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.discount_price_krw || item.price_krw;
      return sum + (price * item.quantity);
    }, 0);
  };

  // 주문하기
  const handleOrder = () => {
    if (cart.length === 0) {
      toast.error('장바구니가 비어있습니다');
      return;
    }

    navigate('/food/order', {
      state: {
        restaurant,
        cart,
        orderType,
        totalPrice: calculateTotal()
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-600">{error || '식당을 찾을 수 없습니다'}</p>
        <Button onClick={() => navigate('/food')}>목록으로 돌아가기</Button>
      </div>
    );
  }

  const categories = Object.keys(menusByCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setIsFavorite(!isFavorite)}>
                <Heart className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* 식당 정보 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <ImageWithFallback
                src={restaurant.thumbnail_url}
                alt={restaurant.name}
                className="w-24 h-24 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{restaurant.name}</h1>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{restaurant.rating}</span>
                  </div>
                  <span className="text-gray-500">({restaurant.review_count})</span>
                  <Badge>{restaurant.cuisine_type}</Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {restaurant.address}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {restaurant.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {restaurant.last_order_time} 마지막 주문
                  </div>
                </div>
              </div>
            </div>

            {/* 서비스 옵션 */}
            <div className="flex gap-2 mt-4">
              {restaurant.accepts_takeout && (
                <Button
                  variant={orderType === 'takeout' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderType('takeout')}
                >
                  <PackageOpen className="h-4 w-4 mr-1" />
                  포장
                </Button>
              )}
              {restaurant.accepts_delivery && (
                <Button
                  variant={orderType === 'delivery' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderType('delivery')}
                >
                  <Truck className="h-4 w-4 mr-1" />
                  배달
                </Button>
              )}
              {restaurant.table_order_enabled && (
                <Button
                  variant={orderType === 'dine_in' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderType('dine_in')}
                >
                  <Utensils className="h-4 w-4 mr-1" />
                  매장
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메뉴 목록 */}
          <div className="lg:col-span-2 space-y-6">
            {categories.map(category => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {menusByCategory[category].map(menu => (
                    <div key={menu.id} className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50">
                      <ImageWithFallback
                        src={menu.image_url}
                        alt={menu.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h4 className="font-medium">{menu.name}</h4>
                            {menu.is_signature && <Badge variant="outline" className="mt-1">대표 메뉴</Badge>}
                            {menu.is_popular && <Badge variant="outline" className="mt-1 ml-1">인기</Badge>}
                          </div>
                          <div className="text-right">
                            {menu.discount_price_krw ? (
                              <>
                                <div className="text-sm text-gray-500 line-through">
                                  {menu.price_krw.toLocaleString()}원
                                </div>
                                <div className="text-lg font-bold text-red-600">
                                  {menu.discount_price_krw.toLocaleString()}원
                                </div>
                              </>
                            ) : (
                              <div className="text-lg font-bold">
                                {menu.price_krw.toLocaleString()}원
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{menu.description}</p>
                        {menu.spicy_level > 0 && (
                          <div className="flex items-center gap-1 text-sm text-red-600">
                            🌶️ {menu.spicy_level === 1 ? '약간 매움' : menu.spicy_level === 2 ? '매움' : '아주 매움'}
                          </div>
                        )}
                        {menu.allergens.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            알레르기: {menu.allergens.join(', ')}
                          </div>
                        )}
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => addToCart(menu)}
                          disabled={!menu.is_available}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {menu.is_available ? '담기' : '품절'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 장바구니 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  장바구니 ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    장바구니가 비어있습니다
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{item.name}</h5>
                            <p className="text-sm text-gray-600">
                              {(item.discount_price_krw || item.price_krw).toLocaleString()}원
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* 총 금액 */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">총 금액</span>
                        <span className="text-xl font-bold text-blue-600">
                          {calculateTotal().toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    {/* 주문 버튼 */}
                    <Button className="w-full" size="lg" onClick={handleOrder}>
                      {orderType === 'dine_in' ? '주문하기' : orderType === 'takeout' ? '포장 주문' : '배달 주문'}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      {orderType === 'takeout' && '포장 준비에 약 20-30분 소요됩니다'}
                      {orderType === 'delivery' && '배달비는 결제 시 추가됩니다'}
                      {orderType === 'dine_in' && '테이블에서 주문을 확인해주세요'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

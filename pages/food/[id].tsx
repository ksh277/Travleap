import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  MapPin, Phone, Clock, Star, Loader, ShoppingCart, Plus, Minus
} from 'lucide-react';

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
  spicy_level: number;
  sold_out: boolean;
  available: boolean;
}

interface Restaurant {
  id: number;
  name: string;
  description: string;
  cuisine_type: string;
  address: string;
  phone: string;
  operating_hours: any;
  accepts_reservations: boolean;
  accepts_takeout: boolean;
  accepts_delivery: boolean;
  parking_available: boolean;
  images: string[];
  rating_avg: number;
  rating_count: number;
  total_orders: number;
}

const FoodDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menusByCategory, setMenusByCategory] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{[key: number]: number}>({});

  const userId = 1; // TODO: 실제 사용자 ID

  useEffect(() => {
    if (id) {
      loadRestaurant();
      loadMenus();
    }
  }, [id]);

  const loadRestaurant = async () => {
    try {
      const response = await fetch(`/api/food/restaurants?id=${id}`);
      const data = await response.json();
      if (data.success) {
        setRestaurant(data.restaurant);
      }
    } catch (error) {
      console.error('식당 로드 실패:', error);
    }
  };

  const loadMenus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/food/menus?restaurant_id=${id}`);
      const data = await response.json();
      if (data.success) {
        setMenus(data.menus || []);
        setMenusByCategory(data.menus_by_category || {});
      }
    } catch (error) {
      console.error('메뉴 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (menuId: number) => {
    setCart(prev => ({
      ...prev,
      [menuId]: (prev[menuId] || 0) + 1
    }));
  };

  const removeFromCart = (menuId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[menuId] > 1) {
        newCart[menuId]--;
      } else {
        delete newCart[menuId];
      }
      return newCart;
    });
  };

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((total, [menuId, count]) => {
      const menu = menus.find(m => m.id === parseInt(menuId));
      if (menu) {
        const price = menu.discount_price_krw || menu.price_krw;
        return total + (price * count);
      }
      return total;
    }, 0);
  };

  const handleOrder = async (orderType: 'dine_in' | 'takeout' | 'delivery') => {
    if (Object.keys(cart).length === 0) {
      alert('메뉴를 선택해주세요.');
      return;
    }

    const items = Object.entries(cart).map(([menuId, count]) => {
      const menu = menus.find(m => m.id === parseInt(menuId));
      return {
        menu_id: parseInt(menuId),
        name: menu?.name,
        quantity: count,
        price: menu?.discount_price_krw || menu?.price_krw
      };
    });

    try {
      const response = await fetch('/api/food/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          restaurant_id: id,
          order_type: orderType,
          items,
          subtotal_krw: getTotalPrice(),
          delivery_fee_krw: orderType === 'delivery' ? 3000 : 0
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`주문이 완료되었습니다!\n주문번호: ${data.order.order_number}`);
        setCart({});
      } else {
        alert(`주문 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('주문 실패:', error);
      alert('주문 중 오류가 발생했습니다.');
    }
  };

  if (loading || !restaurant) {
    return (
      <div className="loading-container">
        <Loader className="spinner" size={48} />
        <p>로딩 중...</p>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
          }
          .spinner {
            animation: spin 1s linear infinite;
            color: #f59e0b;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <>
      <Head>
        <title>{restaurant.name} - Travleap 맛집</title>
        <meta name="description" content={restaurant.description} />
      </Head>

      <div className="food-detail-page">
        <div className="container">
          <div className="restaurant-header">
            {restaurant.images && restaurant.images.length > 0 && (
              <div className="header-image">
                <img src={restaurant.images[0]} alt={restaurant.name} />
              </div>
            )}
            <div className="header-info">
              <div className="cuisine-badge">{restaurant.cuisine_type}</div>
              <h1>{restaurant.name}</h1>
              {restaurant.rating_avg && (
                <div className="rating">
                  <Star size={18} fill="#fbbf24" color="#fbbf24" />
                  <span>{restaurant.rating_avg.toFixed(1)}</span>
                  <span className="rating-count">({restaurant.rating_count})</span>
                </div>
              )}
              {restaurant.description && <p className="description">{restaurant.description}</p>}

              <div className="info-items">
                {restaurant.address && (
                  <div className="info-item">
                    <MapPin size={16} />
                    <span>{restaurant.address}</span>
                  </div>
                )}
                {restaurant.phone && (
                  <div className="info-item">
                    <Phone size={16} />
                    <span>{restaurant.phone}</span>
                  </div>
                )}
              </div>

              <div className="service-tags">
                {restaurant.accepts_reservations && <span className="tag">예약</span>}
                {restaurant.accepts_takeout && <span className="tag">포장</span>}
                {restaurant.accepts_delivery && <span className="tag">배달</span>}
                {restaurant.parking_available && <span className="tag">주차</span>}
              </div>
            </div>
          </div>

          <div className="menu-section">
            <h2>메뉴</h2>
            {Object.entries(menusByCategory).map(([category, categoryMenus]: [string, any]) => (
              <div key={category} className="menu-category">
                <h3>{category}</h3>
                <div className="menu-grid">
                  {categoryMenus.map((menu: Menu) => (
                    <div key={menu.id} className="menu-card">
                      {menu.image_url && (
                        <div className="menu-image">
                          <img src={menu.image_url} alt={menu.name} />
                        </div>
                      )}
                      <div className="menu-info">
                        <div className="menu-header">
                          <h4>{menu.name}</h4>
                          {menu.is_signature && <span className="badge signature">대표</span>}
                          {menu.is_popular && <span className="badge popular">인기</span>}
                        </div>
                        {menu.description && <p className="menu-desc">{menu.description}</p>}
                        <div className="menu-footer">
                          <div className="price">
                            {menu.discount_price_krw ? (
                              <>
                                <span className="original">{menu.price_krw.toLocaleString()}원</span>
                                <span className="discount">{menu.discount_price_krw.toLocaleString()}원</span>
                              </>
                            ) : (
                              <span className="current">{menu.price_krw.toLocaleString()}원</span>
                            )}
                          </div>
                          {menu.available && !menu.sold_out ? (
                            <div className="cart-controls">
                              {cart[menu.id] ? (
                                <>
                                  <button onClick={() => removeFromCart(menu.id)}>
                                    <Minus size={16} />
                                  </button>
                                  <span>{cart[menu.id]}</span>
                                  <button onClick={() => addToCart(menu.id)}>
                                    <Plus size={16} />
                                  </button>
                                </>
                              ) : (
                                <button className="add-button" onClick={() => addToCart(menu.id)}>
                                  담기
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="sold-out">품절</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {cartCount > 0 && (
          <div className="cart-summary">
            <div className="cart-info">
              <ShoppingCart size={20} />
              <span>{cartCount}개 메뉴 선택</span>
              <span className="total-price">{getTotalPrice().toLocaleString()}원</span>
            </div>
            <div className="cart-actions">
              {restaurant.accepts_takeout && (
                <button onClick={() => handleOrder('takeout')}>포장 주문</button>
              )}
              {restaurant.accepts_delivery && (
                <button onClick={() => handleOrder('delivery')}>배달 주문</button>
              )}
            </div>
          </div>
        )}

        <style jsx>{`
          .food-detail-page {
            min-height: 100vh;
            background: #f9fafb;
            padding-bottom: 100px;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
          }

          .restaurant-header {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            margin-bottom: 32px;
          }

          .header-image {
            width: 100%;
            height: 300px;
            overflow: hidden;
          }

          .header-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .header-info {
            padding: 24px;
          }

          .cuisine-badge {
            display: inline-block;
            padding: 6px 12px;
            background: #fff7ed;
            color: #d97706;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 12px;
          }

          .header-info h1 {
            font-size: 32px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 12px;
          }

          .rating {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
          }

          .rating-count {
            color: #6b7280;
            font-weight: 400;
          }

          .description {
            color: #374151;
            line-height: 1.6;
            margin-bottom: 16px;
          }

          .info-items {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
          }

          .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #374151;
            font-size: 14px;
          }

          .service-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .tag {
            padding: 6px 12px;
            background: #eff6ff;
            color: #1e40af;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
          }

          .menu-section {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .menu-section h2 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 24px;
          }

          .menu-category {
            margin-bottom: 32px;
          }

          .menu-category h3 {
            font-size: 18px;
            font-weight: 700;
            color: #f59e0b;
            margin-bottom: 16px;
          }

          .menu-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
          }

          .menu-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.2s;
          }

          .menu-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .menu-image {
            width: 100%;
            height: 150px;
            overflow: hidden;
          }

          .menu-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .menu-info {
            padding: 12px;
          }

          .menu-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
          }

          .menu-header h4 {
            font-size: 15px;
            font-weight: 600;
            color: #111827;
          }

          .badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
          }

          .badge.signature {
            background: #fef3c7;
            color: #d97706;
          }

          .badge.popular {
            background: #fee2e2;
            color: #dc2626;
          }

          .menu-desc {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
          }

          .menu-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .price {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .price .original {
            font-size: 13px;
            color: #9ca3af;
            text-decoration: line-through;
          }

          .price .discount,
          .price .current {
            font-size: 15px;
            font-weight: 700;
            color: #f59e0b;
          }

          .cart-controls {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .cart-controls button {
            padding: 4px 8px;
            background: #f3f4f6;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .cart-controls button:hover {
            background: #e5e7eb;
          }

          .add-button {
            padding: 6px 16px;
            background: #f59e0b;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .add-button:hover {
            background: #d97706;
          }

          .sold-out {
            font-size: 13px;
            color: #dc2626;
            font-weight: 600;
          }

          .cart-summary {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            border-top: 1px solid #e5e7eb;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
            z-index: 1000;
          }

          .cart-info {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
          }

          .total-price {
            color: #f59e0b;
            font-size: 18px;
          }

          .cart-actions {
            display: flex;
            gap: 8px;
          }

          .cart-actions button {
            padding: 12px 24px;
            background: #f59e0b;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .cart-actions button:hover {
            background: #d97706;
          }

          @media (max-width: 768px) {
            .menu-grid {
              grid-template-columns: 1fr;
            }

            .cart-summary {
              flex-direction: column;
              gap: 12px;
            }

            .cart-actions {
              width: 100%;
            }

            .cart-actions button {
              flex: 1;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default FoodDetailPage;

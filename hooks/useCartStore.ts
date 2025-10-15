import { useState, useEffect } from 'react';
import type { CartItem } from '../types/database';
import { useAuth } from './useAuth';
import { db } from '../utils/database-cloud';

interface CartState {
  cartItems: CartItem[];
}

export function useCartStore() {
  const { isLoggedIn, user } = useAuth();
  const [cartState, setCartState] = useState<CartState>({
    cartItems: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // 로그인한 사용자의 장바구니 로드
  useEffect(() => {
    const loadCart = async () => {
      if (!isLoggedIn || !user?.id) {
        // 비로그인 사용자는 localStorage 사용
        const savedCart = localStorage.getItem('travleap_cart');
        if (savedCart) {
          try {
            const parsed = JSON.parse(savedCart);
            setCartState({ cartItems: parsed });
          } catch (error) {
            console.error('Failed to parse saved cart state:', error);
            localStorage.removeItem('travleap_cart');
          }
        }
        return;
      }

      // 로그인한 사용자는 DB에서 로드
      setIsLoading(true);
      try {
        console.log('🛒 [장바구니] DB에서 로드 시작, user_id:', user.id);
        const cartItems = await db.select('cart_items', { user_id: user.id });
        console.log('🛒 [장바구니] DB에서 가져온 항목 수:', cartItems.length, cartItems);

        // DB의 cart_items를 CartItem 형식으로 변환
        const formattedItems: CartItem[] = await Promise.all(
          cartItems.map(async (item: any) => {
            // listing 정보 가져오기
            const listings = await db.select('listings', { id: item.listing_id });
            const listing = listings[0];

            console.log('🛒 [장바구니] listing_id:', item.listing_id, '→ listing:', listing ? '찾음' : '❌ 없음');

            if (!listing) return null;

            // images가 문자열이면 파싱, 배열이면 그대로 사용
            let imageUrl = '';
            if (listing.images) {
              if (typeof listing.images === 'string') {
                try {
                  const parsed = JSON.parse(listing.images);
                  imageUrl = Array.isArray(parsed) ? parsed[0] : '';
                } catch {
                  imageUrl = listing.images;
                }
              } else if (Array.isArray(listing.images)) {
                imageUrl = listing.images[0] || '';
              }
            }

            return {
              id: item.listing_id,
              title: listing.title,
              price: item.price_snapshot || listing.price_from || 0,
              quantity: 1, // DB에는 개별 항목으로 저장되므로 수량은 1
              image: imageUrl,
              category: listing.category || '',
              location: listing.location,
              date: item.selected_date,
              guests: item.num_adults + item.num_children + item.num_seniors,
            };
          })
        );

        const validItems = formattedItems.filter(item => item !== null) as CartItem[];
        console.log('🛒 [장바구니] 변환된 항목 수:', validItems.length);

        // 중복된 listing_id를 합쳐서 quantity로 계산
        const mergedItems = validItems.reduce((acc: CartItem[], item) => {
          const existing = acc.find(i => i.id === item.id);
          if (existing) {
            existing.quantity += 1;
          } else {
            acc.push({ ...item, quantity: 1 });
          }
          return acc;
        }, []);

        console.log('🛒 [장바구니] 최종 장바구니 항목 수 (중복 합침):', mergedItems.length, mergedItems);

        setCartState({
          cartItems: mergedItems
        });
      } catch (error) {
        console.error('❌ [장바구니] DB 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [isLoggedIn, user?.id]);

  // 비로그인 사용자는 localStorage에 저장
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.setItem('travleap_cart', JSON.stringify(cartState.cartItems));
    }
  }, [cartState.cartItems, isLoggedIn]);

  const addToCart = async (item: Partial<CartItem>) => {
    // 필수 필드 검증
    if (!item.id) {
      console.error('❌ [장바구니 추가] 상품 ID 없음:', item);
      throw new Error('상품 ID가 없습니다.');
    }

    console.log('➕ [장바구니 추가] 시작:', item);
    console.log('   로그인 상태:', isLoggedIn, '/ user_id:', user?.id);

    // 로그인한 사용자는 DB에 저장
    if (isLoggedIn && user?.id) {
      try {
        const dbData = {
          user_id: user.id,
          listing_id: item.id,
          selected_date: item.date || null,
          num_adults: item.guests || 1,
          num_children: 0,
          num_seniors: 0,
          price_snapshot: item.price || 0,
        };

        console.log('💾 [장바구니 추가] DB에 저장:', dbData);
        const result = await db.insert('cart_items', dbData);
        console.log('✅ [장바구니 추가] DB 저장 성공:', result);

        // 상태 업데이트
        setCartState((prev) => {
          const existingItem = prev.cartItems.find((cartItem) => cartItem.id === item.id);

          if (existingItem) {
            return {
              cartItems: prev.cartItems.map((cartItem) =>
                cartItem.id === item.id
                  ? { ...cartItem, quantity: cartItem.quantity + 1 }
                  : cartItem
              ),
            };
          } else {
            const newCartItem: CartItem = {
              id: item.id!,
              title: item.title || '상품',
              price: item.price || 0,
              quantity: 1,
              image: item.image || '',
              category: item.category || '',
              location: item.location || '',
              date: item.date,
              guests: item.guests,
            };
            return {
              cartItems: [...prev.cartItems, newCartItem],
            };
          }
        });
      } catch (error) {
        console.error('Failed to add item to cart in database:', error);
        throw error;
      }
    } else {
      // 비로그인 사용자는 localStorage만 사용
      setCartState((prev) => {
        const existingItem = prev.cartItems.find((cartItem) => cartItem.id === item.id);

        if (existingItem) {
          return {
            cartItems: prev.cartItems.map((cartItem) =>
              cartItem.id === item.id
                ? { ...cartItem, quantity: cartItem.quantity + 1 }
                : cartItem
            ),
          };
        } else {
          const newCartItem: CartItem = {
            id: item.id!,
            title: item.title || '상품',
            price: item.price || 0,
            quantity: 1,
            image: item.image || '',
            category: item.category || '',
            location: item.location || '',
            date: item.date,
            guests: item.guests,
          };
          return {
            cartItems: [...prev.cartItems, newCartItem],
          };
        }
      });
    }
  };

  const updateCart = (updatedItems: CartItem[]) => {
    setCartState({ cartItems: updatedItems });
  };

  const removeFromCart = async (itemId: number) => {
    // 로그인한 사용자는 DB에서도 삭제
    if (isLoggedIn && user?.id) {
      try {
        // cart_items 테이블에서 해당 항목 삭제
        await db.execute(
          'DELETE FROM cart_items WHERE user_id = ? AND listing_id = ?',
          [user.id, itemId]
        );
      } catch (error) {
        console.error('Failed to remove item from database:', error);
      }
    }

    setCartState((prev) => ({
      cartItems: prev.cartItems.filter((item) => item.id !== itemId),
    }));
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    console.log(`🔢 [수량 변경] listing_id: ${itemId}, 새 수량: ${quantity}`);

    // 로그인한 사용자는 DB에서도 업데이트
    if (isLoggedIn && user?.id) {
      try {
        // 현재 수량 확인
        const currentItem = cartState.cartItems.find(item => item.id === itemId);
        const currentQuantity = currentItem?.quantity || 0;
        const diff = quantity - currentQuantity;

        console.log(`   현재 수량: ${currentQuantity}, 차이: ${diff}`);

        if (diff > 0) {
          // 수량 증가: 새 행 추가
          console.log(`   ➕ DB에 ${diff}개 행 추가`);

          for (let i = 0; i < diff; i++) {
            const dbData = {
              user_id: user.id,
              listing_id: itemId,
              selected_date: currentItem?.date || null,
              num_adults: currentItem?.guests || 1,
              num_children: 0,
              num_seniors: 0,
              price_snapshot: currentItem?.price || 0,
            };
            await db.insert('cart_items', dbData);
          }
          console.log(`   ✅ ${diff}개 행 추가 완료`);
        } else if (diff < 0) {
          // 수량 감소: 행 삭제
          const deleteCount = Math.abs(diff);
          console.log(`   ➖ DB에서 ${deleteCount}개 행 삭제`);

          // LIMIT는 placeholder를 사용할 수 없으므로 직접 SQL에 포함
          // deleteCount는 Math.abs()로 보장된 양의 정수이므로 안전함
          const safeDeleteCount = Math.floor(Math.abs(deleteCount));
          await db.execute(
            `DELETE FROM cart_items WHERE user_id = ? AND listing_id = ? LIMIT ${safeDeleteCount}`,
            [user.id, itemId]
          );
          console.log(`   ✅ ${safeDeleteCount}개 행 삭제 완료`);
        } else {
          console.log(`   ℹ️ 수량 변화 없음`);
        }

        // 상태 업데이트
        setCartState((prev) => ({
          cartItems: prev.cartItems.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      } catch (error) {
        console.error('❌ [수량 변경] DB 업데이트 실패:', error);
        throw error;
      }
    } else {
      // 비로그인 사용자는 상태만 업데이트
      setCartState((prev) => ({
        cartItems: prev.cartItems.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        ),
      }));
    }
  };

  const clearCart = async () => {
    // 로그인한 사용자는 DB에서도 삭제
    if (isLoggedIn && user?.id) {
      try {
        await db.execute('DELETE FROM cart_items WHERE user_id = ?', [user.id]);
      } catch (error) {
        console.error('Failed to clear cart in database:', error);
      }
    }

    setCartState({ cartItems: [] });
  };

  const checkout = (orderData: any) => {
    console.log('Order completed:', orderData);
    clearCart();
    // 여기서 주문 완료 토스트나 페이지를 보여줄 수 있음
  };

  const getTotalPrice = () => {
    return cartState.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartState.cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  return {
    cartItems: cartState.cartItems,
    isLoading,
    addToCart,
    updateCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    checkout,
    getTotalPrice,
    getTotalItems,
  };
}
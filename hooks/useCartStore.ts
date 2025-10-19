import { useState, useEffect } from 'react';
import type { CartItem } from '../types/database';
import { useAuth } from './useAuth';

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

      // 로그인한 사용자는 API에서 로드
      setIsLoading(true);
      try {
        console.log('🛒 [장바구니] API에서 로드 시작, user_id:', user.id);

        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3004' : '';
        const response = await fetch(`${apiUrl}/api/cart?userId=${user.id}`);
        const result = await response.json();

        if (result.success) {
          console.log('🛒 [장바구니] API에서 가져온 항목:', result.data);
          setCartState({
            cartItems: result.data
          });
        } else {
          throw new Error(result.message || '장바구니 로드 실패');
        }
      } catch (error) {
        console.error('❌ [장바구니] API 로드 실패:', error);
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

    // 로그인한 사용자는 API를 통해 저장
    if (isLoggedIn && user?.id) {
      try {
        console.log('💾 [장바구니 추가] API 호출 시작');

        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3004' : '';
        const response = await fetch(`${apiUrl}/api/cart/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id.toString()
          },
          body: JSON.stringify({
            userId: user.id,
            listingId: item.id,
            date: item.date || null,
            guests: item.guests || 1,
            price: item.price || 0
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || '장바구니 추가 실패');
        }

        console.log('✅ [장바구니 추가] API 저장 성공');

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
    // 로그인한 사용자는 API를 통해 삭제
    if (isLoggedIn && user?.id) {
      try {
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3004' : '';
        const response = await fetch(`${apiUrl}/api/cart/remove/${itemId}?userId=${user.id}`, {
          method: 'DELETE'
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || '장바구니 제거 실패');
        }
      } catch (error) {
        console.error('Failed to remove item from cart:', error);
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

    // 로그인한 사용자는 API를 통해 업데이트
    if (isLoggedIn && user?.id) {
      try {
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3004' : '';
        const response = await fetch(`${apiUrl}/api/cart/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id.toString()
          },
          body: JSON.stringify({
            userId: user.id,
            listingId: itemId,
            quantity
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || '수량 업데이트 실패');
        }

        console.log('✅ [수량 변경] API 업데이트 성공');

        // 상태 업데이트
        setCartState((prev) => ({
          cartItems: prev.cartItems.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      } catch (error) {
        console.error('❌ [수량 변경] API 업데이트 실패:', error);
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
    // 로그인한 사용자는 API를 통해 삭제
    if (isLoggedIn && user?.id) {
      try {
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3004' : '';
        const response = await fetch(`${apiUrl}/api/cart/clear?userId=${user.id}`, {
          method: 'DELETE'
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || '장바구니 비우기 실패');
        }
      } catch (error) {
        console.error('Failed to clear cart:', error);
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
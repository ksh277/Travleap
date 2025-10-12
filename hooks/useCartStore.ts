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
        const cartItems = await db.select('cart_items', { user_id: user.id });

        // DB의 cart_items를 CartItem 형식으로 변환
        const formattedItems: CartItem[] = await Promise.all(
          cartItems.map(async (item: any) => {
            // listing 정보 가져오기
            const listings = await db.select('listings', { id: item.listing_id });
            const listing = listings[0];

            if (!listing) return null;

            return {
              id: item.listing_id,
              title: listing.title,
              price: item.price_snapshot || listing.price_per_person || 0,
              quantity: 1, // DB에는 개별 항목으로 저장되므로 수량은 1
              image: listing.images ? JSON.parse(listing.images)[0] : '',
              category: listing.category || '',
              location: listing.location,
              date: item.selected_date,
              guests: item.num_adults + item.num_children + item.num_seniors,
            };
          })
        );

        setCartState({
          cartItems: formattedItems.filter(item => item !== null) as CartItem[]
        });
      } catch (error) {
        console.error('Failed to load cart from database:', error);
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
      console.error('Cannot add item to cart: missing id', item);
      throw new Error('상품 ID가 없습니다.');
    }

    // 로그인한 사용자는 DB에 저장
    if (isLoggedIn && user?.id) {
      try {
        await db.insert('cart_items', {
          user_id: user.id,
          listing_id: item.id,
          selected_date: item.date || null,
          num_adults: item.guests || 1,
          num_children: 0,
          num_seniors: 0,
          price_snapshot: item.price || 0,
        });

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

    // 로그인한 사용자는 DB에서도 업데이트
    if (isLoggedIn && user?.id) {
      try {
        // DB는 개별 항목으로 관리하므로 수량 변경 시 로직 필요
        // 현재는 상태만 업데이트
        setCartState((prev) => ({
          cartItems: prev.cartItems.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      } catch (error) {
        console.error('Failed to update quantity in database:', error);
      }
    } else {
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
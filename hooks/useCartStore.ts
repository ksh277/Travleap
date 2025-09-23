import { useState, useEffect } from 'react';
import type { CartItem } from '../types/database';

interface CartState {
  cartItems: CartItem[];
}

export function useCartStore() {
  const [cartState, setCartState] = useState<CartState>({
    cartItems: [],
  });

  // 로컬 스토리지에서 장바구니 상태 복원
  useEffect(() => {
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
  }, []);

  // 장바구니 상태 변경시 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('travleap_cart', JSON.stringify(cartState.cartItems));
  }, [cartState.cartItems]);

  const addToCart = (item: Partial<CartItem>) => {
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
          title: item.title || '',
          price: item.price || 0,
          quantity: 1,
          image: item.image,
          category: item.category,
          location: item.location,
        };
        return {
          cartItems: [...prev.cartItems, newCartItem],
        };
      }
    });
  };

  const updateCart = (updatedItems: CartItem[]) => {
    setCartState({ cartItems: updatedItems });
  };

  const removeFromCart = (itemId: number) => {
    setCartState((prev) => ({
      cartItems: prev.cartItems.filter((item) => item.id !== itemId),
    }));
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartState((prev) => ({
      cartItems: prev.cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }));
  };

  const clearCart = () => {
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
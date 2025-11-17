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

            // 🔒 CRITICAL: 기존 localStorage 데이터에 category 강제 설정
            const fixedItems = parsed.map((item: any) => {
              let category = item.category || '';

              // category 없으면 상품명으로 팝업 감지
              if (!category || category === 'general') {
                const title = (item.title || item.name || '').toLowerCase();
                // 팝업 관련 키워드 또는 퍼플아일랜드 상품 감지
                if (title.includes('popup') || title.includes('팝업') || title.includes('pop') ||
                    title.includes('퍼플아일랜드') || title.includes('purple island') || title.includes('purpleisland')) {
                  category = '팝업';
                }
              }

              return { ...item, category };
            });

            setCartState({ cartItems: fixedItems });
          } catch (error) {
            console.error('Failed to parse saved cart state:', error);
            localStorage.removeItem('travleap_cart');
          }
        } else {
          // localStorage가 비어있으면 장바구니도 비우기
          setCartState({ cartItems: [] });
        }
        return;
      }

      // 🔒 보안: 로그인 시 localStorage 클리어 (계정 간 데이터 격리)
      localStorage.removeItem('travleap_cart');
      console.log('🔒 로그인 감지: localStorage 장바구니 클리어');

      // 로그인한 사용자는 API에서 로드
      setIsLoading(true);
      try {
        console.log('🛒 [장바구니] API에서 로드 시작, user_id:', user.id);

        const response = await fetch(`/api/cart?userId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          console.log('🛒 [장바구니] API에서 가져온 항목:', result.data);

          // 🔍 디버그: 첫 번째 item의 listing_id 확인
          if (result.data.length > 0) {
            console.log('🛒 [장바구니] 첫 번째 item raw data:', result.data[0]);
            console.log('🛒 [장바구니] 첫 번째 item listing_id:', result.data[0].listing_id);
          }

          // API 응답을 프론트엔드 형식으로 변환
          const transformedItems = result.data.map((item: any) => {
            let images = [];
            try {
              if (item.images && typeof item.images === 'string' && item.images.trim() !== '') {
                images = JSON.parse(item.images);
              } else if (Array.isArray(item.images)) {
                images = item.images;
              }
            } catch (e) {
              console.error('이미지 파싱 실패:', e, '원본:', item.images);
              images = [];
            }

            // 🔒 CRITICAL: category 강제 설정 (기존 DB 데이터 대응)
            let category = item.category_name || item.category || '';

            // 🔧 category 없으면 상품명으로 팝업 감지
            if (!category || category === 'general') {
              const title = (item.title || '').toLowerCase();
              // 팝업 관련 키워드 또는 퍼플아일랜드 상품 감지
              if (title.includes('popup') || title.includes('팝업') || title.includes('pop') ||
                  title.includes('퍼플아일랜드') || title.includes('purple island') || title.includes('purpleisland')) {
                category = '팝업';
              }
            }

            // 🔒 CRITICAL FIX: 팝업 상품은 무조건 단가 × 수량, 일반 상품은 연령별 계산
            const isPopup = category === '팝업' || category === 'popup';

            let calculatedPrice;
            if (isPopup) {
              // 팝업: DB에 뭐가 저장되어 있든 무시하고 무조건 단가만 사용 (수량은 summary에서 곱함)
              calculatedPrice = item.price_from || 0;
            } else {
              // 일반: 연령별 인원이 있으면 연령별 총 가격 계산
              const hasAgeData = item.num_adults || item.num_children || item.num_infants || item.num_seniors;
              calculatedPrice = hasAgeData ? (
                (item.num_adults || 0) * (item.adult_price || item.price_from || 0) +
                (item.num_children || 0) * (item.child_price || 0) +
                (item.num_infants || 0) * (item.infant_price || 0) +
                (item.num_seniors || 0) * (item.senior_price || 0)
              ) : (item.price_from || 0);
            }

            // 🔍 DEBUG: 가격 계산 로그
            console.log(`💰 [장바구니] 가격 계산:`, {
              title: item.title,
              category,
              isPopup,
              num_adults: item.num_adults,
              num_children: item.num_children,
              adult_price: item.adult_price,
              price_from: item.price_from,
              quantity: item.quantity,
              calculatedPrice,
              calculation: isPopup ?
                `팝업: ${item.price_from} (단가) × ${item.quantity} (수량)` :
                `일반: 연령별 계산 또는 price_from`
            });

            const transformed = {
              id: item.id,                    // cart_items 테이블의 id
              listingId: item.listing_id,     // ✅ 실제 상품 ID 추가
              title: item.title || '상품',
              price: calculatedPrice,         // ✅ 연령별 총 가격 계산
              quantity: item.quantity || 1,
              image: images[0] || '/placeholder.jpg',
              category: category,
              location: item.location || '',
              date: item.selected_date,
              guests: item.num_adults || 1,
              // ✅ 투어/음식/관광지/이벤트/체험 인원 정보
              // 🔒 CRITICAL: 팝업 상품은 무조건 undefined (CartPage에서 인원별 계산 방지)
              adults: isPopup ? undefined : item.num_adults,
              children: isPopup ? undefined : item.num_children,
              infants: isPopup ? undefined : item.num_infants,
              seniors: isPopup ? undefined : item.num_seniors,
              // ✅ 연령대별 가격 정보
              // 🔒 FALLBACK: adult_price가 null이면 price_from 사용
              adultPrice: isPopup ? undefined : (item.adult_price || item.price_from || 0),
              childPrice: isPopup ? undefined : (item.child_price || (item.price_from ? item.price_from * 0.7 : 0)),
              infantPrice: isPopup ? undefined : (item.infant_price || (item.price_from ? item.price_from * 0.3 : 0)),
              seniorPrice: isPopup ? undefined : (item.senior_price || item.price_from || 0),
              // ✅ 보험 정보 추가
              selectedInsurance: item.selectedInsurance || undefined,
              insuranceFee: item.insuranceFee || 0,
              inStock: item.is_active === 1 || item.is_active === true,
              validationStatus: item.validationStatus,
              validationMessage: item.validationMessage
            };

            // 🔍 디버그: listing_id 누락 경고
            if (!transformed.listingId) {
              console.error('❌ [장바구니] listingId 누락!', {
                item_id: item.id,
                listing_id: item.listing_id,
                raw_item: item
              });
            }

            return transformed;
          });

          setCartState({
            cartItems: transformedItems
          });
          console.log('✅ [장바구니] 데이터 변환 완료:', transformedItems.length, '개');

          // 🔍 디버그: 변환된 첫 번째 item 확인
          if (transformedItems.length > 0) {
            console.log('🛒 [장바구니] 변환된 첫 번째 item:', transformedItems[0]);
            console.log('🛒 [장바구니] 변환된 첫 번째 item listingId:', transformedItems[0].listingId);
          }
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

        const response = await fetch(`/api/cart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            userId: user.id,
            listing_id: item.id,
            quantity: item.quantity || 1,
            selected_date: item.date || null,
            selected_options: item.selectedOption || null,
            // ✅ 보험 정보 추가
            selected_insurance: item.selectedInsurance || null,
            insurance_fee: item.insuranceFee || 0,
            // ✅ 투어/음식/관광지/이벤트/체험 인원 정보
            num_adults: item.adults !== undefined ? item.adults : (item.guests || 1),
            num_children: item.children !== undefined ? item.children : 0,
            num_infants: item.infants !== undefined ? item.infants : 0,
            // ✅ 연령대별 가격 정보
            adult_price: item.adultPrice || item.price || 0,
            child_price: item.childPrice || 0,
            infant_price: item.infantPrice || 0,
            price_snapshot: item.price || 0
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || '장바구니 추가 실패');
        }

        console.log('✅ [장바구니 추가] API 저장 성공, 장바구니 새로고침 중...');

        // API 성공 후 전체 장바구니 다시 로드 (DB와 동기화)
        const cartResponse = await fetch(`/api/cart?userId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        const cartResult = await cartResponse.json();

        if (cartResult.success) {
          // API 응답을 프론트엔드 형식으로 변환
          const transformedItems = cartResult.data.map((item: any) => {
            let images = [];
            try {
              if (item.images && typeof item.images === 'string' && item.images.trim() !== '') {
                images = JSON.parse(item.images);
              } else if (Array.isArray(item.images)) {
                images = item.images;
              }
            } catch (e) {
              console.error('이미지 파싱 실패:', e, '원본:', item.images);
              images = [];
            }

            // 🔒 CRITICAL: category 강제 설정 (기존 DB 데이터 대응)
            let category = item.category_name || item.category || '';

            // 🔧 category 없으면 상품명으로 팝업 감지
            if (!category || category === 'general') {
              const title = (item.title || '').toLowerCase();
              // 팝업 관련 키워드 또는 퍼플아일랜드 상품 감지
              if (title.includes('popup') || title.includes('팝업') || title.includes('pop') ||
                  title.includes('퍼플아일랜드') || title.includes('purple island') || title.includes('purpleisland')) {
                category = '팝업';
              }
            }

            // 🔒 CRITICAL FIX: 팝업 상품은 무조건 단가 × 수량, 일반 상품은 연령별 계산
            const isPopup = category === '팝업' || category === 'popup';

            let calculatedPrice;
            if (isPopup) {
              // 팝업: DB에 뭐가 저장되어 있든 무시하고 무조건 단가만 사용 (수량은 summary에서 곱함)
              calculatedPrice = item.price_from || 0;
            } else {
              // 일반: 연령별 인원이 있으면 연령별 총 가격 계산
              const hasAgeData = item.num_adults || item.num_children || item.num_infants || item.num_seniors;
              calculatedPrice = hasAgeData ? (
                (item.num_adults || 0) * (item.adult_price || item.price_from || 0) +
                (item.num_children || 0) * (item.child_price || (item.price_from ? item.price_from * 0.7 : 0)) +
                (item.num_infants || 0) * (item.infant_price || (item.price_from ? item.price_from * 0.3 : 0)) +
                (item.num_seniors || 0) * (item.senior_price || item.price_from || 0)
              ) : (item.price_from || 0);
            }

            // 🔍 DEBUG: 가격 계산 로그
            console.log(`💰 [장바구니 추가 후] 가격 계산:`, {
              title: item.title,
              category,
              isPopup,
              price_from: item.price_from,
              calculatedPrice
            });

            return {
              id: item.id,                    // cart_items 테이블의 id
              listingId: item.listing_id,     // ✅ 실제 상품 ID 추가
              title: item.title || '상품',
              price: calculatedPrice,         // ✅ FIX: calculatedPrice 사용
              quantity: item.quantity || 1,
              image: images[0] || '/placeholder.jpg',
              category: category,
              location: item.location || '',
              date: item.selected_date,
              guests: item.num_adults || 1,
              // ✅ 투어/음식/관광지/이벤트/체험 인원 정보
              // 🔒 CRITICAL: 팝업 상품은 무조건 undefined (CartPage에서 인원별 계산 방지)
              adults: isPopup ? undefined : item.num_adults,
              children: isPopup ? undefined : item.num_children,
              infants: isPopup ? undefined : item.num_infants,
              seniors: isPopup ? undefined : item.num_seniors,
              // ✅ 연령대별 가격 정보
              // 🔒 FALLBACK: adult_price가 null이면 price_from 사용
              adultPrice: isPopup ? undefined : (item.adult_price || item.price_from || 0),
              childPrice: isPopup ? undefined : (item.child_price || (item.price_from ? item.price_from * 0.7 : 0)),
              infantPrice: isPopup ? undefined : (item.infant_price || (item.price_from ? item.price_from * 0.3 : 0)),
              seniorPrice: isPopup ? undefined : (item.senior_price || item.price_from || 0),
              // ✅ 보험 정보 추가
              selectedInsurance: item.selectedInsurance || undefined,
              insuranceFee: item.insuranceFee || 0,
              inStock: item.is_active === 1 || item.is_active === true
            };
          });

          setCartState({
            cartItems: transformedItems
          });
          console.log('✅ [장바구니 추가] 장바구니 새로고침 완료:', transformedItems.length, '개 항목');
        } else {
          throw new Error('장바구니 새로고침 실패');
        }
      } catch (error) {
        console.error('❌ [장바구니 추가] 실패:', error);
        throw error;
      }
    } else {
      // 비로그인 사용자는 localStorage만 사용
      console.log('💾 [장바구니 추가] localStorage 사용 (비로그인)');
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
            listingId: item.id!,  // ✅ 비로그인 사용자의 경우 id가 곧 listingId
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
      console.log('✅ [장바구니 추가] localStorage 저장 완료');
    }
  };

  const updateCart = (updatedItems: CartItem[]) => {
    setCartState({ cartItems: updatedItems });
  };

  const removeFromCart = async (itemId: number) => {
    console.log('🗑️ [장바구니 삭제] 시작, cart_item_id:', itemId);

    // 로그인한 사용자는 API를 통해 삭제
    if (isLoggedIn && user?.id) {
      try {
        // ✅ FIX: Authorization 헤더 추가
        const response = await fetch(`/api/cart?itemId=${itemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || '장바구니 제거 실패');
        }

        console.log('✅ [장바구니 삭제] API 삭제 성공');
      } catch (error) {
        console.error('❌ [장바구니 삭제] API 실패:', error);
        throw error; // 에러를 throw해서 상태 업데이트 방지
      }
    }

    // API 성공 후에만 상태 업데이트
    setCartState((prev) => ({
      cartItems: prev.cartItems.filter((item) => item.id !== itemId),
    }));

    console.log('✅ [장바구니 삭제] 상태 업데이트 완료');
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
        const response = await fetch(`/api/cart/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
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

  // 연령별 인원 수 업데이트
  const updateAgeCounts = async (cartItemId: number, updates: {
    adults?: number;
    children?: number;
    infants?: number;
    seniors?: number;
  }) => {
    console.log(`👥 [연령별 인원 변경] cart_item_id: ${cartItemId}`, updates);

    // 로그인한 사용자는 API를 통해 업데이트
    if (isLoggedIn && user?.id) {
      try {
        const response = await fetch(`/api/cart/update?itemId=${cartItemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            userId: user.id,
            num_adults: updates.adults,
            num_children: updates.children,
            num_infants: updates.infants,
            num_seniors: updates.seniors
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || '연령별 인원 업데이트 실패');
        }

        console.log('✅ [연령별 인원 변경] API 업데이트 성공');

        // 상태 업데이트
        setCartState((prev) => ({
          cartItems: prev.cartItems.map((item) =>
            item.id === cartItemId ? { ...item, ...updates } : item
          ),
        }));
      } catch (error) {
        console.error('❌ [연령별 인원 변경] API 업데이트 실패:', error);
        throw error;
      }
    } else {
      // 비로그인 사용자는 상태만 업데이트
      setCartState((prev) => ({
        cartItems: prev.cartItems.map((item) =>
          item.id === cartItemId ? { ...item, ...updates } : item
        ),
      }));
    }
  };

  const clearCart = async () => {
    console.log('🗑️ [장바구니 전체 삭제] 시작');

    // 로그인한 사용자는 API를 통해 삭제
    if (isLoggedIn && user?.id) {
      try {
        // ✅ FIX: Authorization 헤더 추가
        const deletePromises = cartState.cartItems.map(item =>
          fetch(`/api/cart?itemId=${item.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          }).then(res => res.json())
        );

        const results = await Promise.all(deletePromises);
        const failedDeletes = results.filter(r => !r.success);

        if (failedDeletes.length > 0) {
          throw new Error(`${failedDeletes.length}개 항목 삭제 실패`);
        }

        console.log('✅ [장바구니 전체 삭제] API 삭제 성공');
      } catch (error) {
        console.error('❌ [장바구니 전체 삭제] API 실패:', error);
        throw error;
      }
    }

    setCartState({ cartItems: [] });
    console.log('✅ [장바구니 전체 삭제] 완료');
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
    updateAgeCounts,
    clearCart,
    checkout,
    getTotalPrice,
    getTotalItems,
  };
}
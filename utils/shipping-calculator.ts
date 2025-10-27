/**
 * 배송비 계산 시스템
 * - 기본 배송비: 3,000원
 * - 30,000원 이상 무료 배송
 * - 제주/도서산간 추가 배송비
 */

import { getDatabase } from './database.js';

export interface ShippingPolicy {
  id: number;
  policy_name: string;
  base_fee: number;
  free_shipping_threshold: number;
  jeju_extra_fee: number;
  island_extra_fee: number;
  is_default: boolean;
}

export interface ShippingCalculation {
  base_fee: number;
  extra_fee: number;
  total_fee: number;
  free_shipping: boolean;
  policy_name: string;
}

/**
 * 기본 배송 정책 조회
 */
export async function getDefaultShippingPolicy(): Promise<ShippingPolicy | null> {
  const db = getDatabase();

  try {
    const policies = await db.query(`
      SELECT * FROM shipping_policies
      WHERE is_default = TRUE AND is_active = TRUE
      LIMIT 1
    `);

    if (policies.length === 0) {
      // 기본 정책이 없으면 하드코딩된 값 반환
      return {
        id: 0,
        policy_name: '기본 배송비 정책',
        base_fee: 3000,
        free_shipping_threshold: 50000,  // ✅ 5만원 이상 무료 배송
        jeju_extra_fee: 3000,
        island_extra_fee: 5000,
        is_default: true
      };
    }

    return policies[0];

  } catch (error) {
    console.error('❌ [Shipping] Failed to get default policy:', error);
    return null;
  }
}

/**
 * 배송비 계산
 *
 * @param productAmount - 상품 금액 (배송비 제외)
 * @param shippingAddress - 배송 주소 (제주/도서산간 판별용)
 * @param listingShippingFee - 상품별 배송비 (NULL이면 정책 사용)
 * @returns 배송비 계산 결과
 */
export async function calculateShipping(
  productAmount: number,
  shippingAddress?: string,
  listingShippingFee?: number | null
): Promise<ShippingCalculation> {
  // 1. 상품별 배송비가 설정되어 있으면 우선 사용
  if (listingShippingFee !== null && listingShippingFee !== undefined) {
    return {
      base_fee: listingShippingFee,
      extra_fee: 0,
      total_fee: listingShippingFee,
      free_shipping: false,
      policy_name: '상품별 배송비'
    };
  }

  // 2. 정책 조회
  const policy = await getDefaultShippingPolicy();
  if (!policy) {
    // 정책 조회 실패 시 기본값
    return {
      base_fee: 3000,
      extra_fee: 0,
      total_fee: 3000,
      free_shipping: false,
      policy_name: '기본 배송비'
    };
  }

  // 3. 무료 배송 조건 확인
  if (productAmount >= policy.free_shipping_threshold) {
    // 무료 배송 (제주/도서산간 추가 배송비는 부과)
    let extraFee = 0;

    if (shippingAddress) {
      if (isJejuAddress(shippingAddress)) {
        extraFee = policy.jeju_extra_fee;
      } else if (isIslandAddress(shippingAddress)) {
        extraFee = policy.island_extra_fee;
      }
    }

    return {
      base_fee: 0,
      extra_fee: extraFee,
      total_fee: extraFee,
      free_shipping: true,
      policy_name: policy.policy_name
    };
  }

  // 4. 일반 배송비 계산
  let baseFee = policy.base_fee;
  let extraFee = 0;

  if (shippingAddress) {
    if (isJejuAddress(shippingAddress)) {
      extraFee = policy.jeju_extra_fee;
    } else if (isIslandAddress(shippingAddress)) {
      extraFee = policy.island_extra_fee;
    }
  }

  return {
    base_fee: baseFee,
    extra_fee: extraFee,
    total_fee: baseFee + extraFee,
    free_shipping: false,
    policy_name: policy.policy_name
  };
}

/**
 * 제주 주소 판별
 */
function isJejuAddress(address: string): boolean {
  const jejuKeywords = ['제주', '제주시', '제주도', '서귀포'];
  return jejuKeywords.some(keyword => address.includes(keyword));
}

/**
 * 도서산간 주소 판별
 */
function isIslandAddress(address: string): boolean {
  const islandKeywords = [
    '울릉', '독도', '백령', '연평', '대청',
    '신안', '완도', '진도', '고흥', '여수',
    '남해', '거제', '통영', '사천', '창원',
    '인천 옹진', '경기 강화', '전남 신안',
    // 더 많은 도서 지역 추가 가능
  ];
  return islandKeywords.some(keyword => address.includes(keyword));
}

/**
 * 장바구니 전체 배송비 계산
 *
 * @param items - 장바구니 상품 목록
 * @param shippingAddress - 배송 주소
 * @returns 총 배송비
 */
export async function calculateTotalShipping(
  items: Array<{ product_amount: number; shipping_fee?: number | null }>,
  shippingAddress?: string
): Promise<ShippingCalculation> {
  // 모든 상품 금액 합계
  const totalProductAmount = items.reduce((sum, item) => sum + item.product_amount, 0);

  // 상품별 배송비가 설정된 상품이 있는지 확인
  const customShippingItems = items.filter(item => item.shipping_fee !== null && item.shipping_fee !== undefined);

  if (customShippingItems.length > 0) {
    // 상품별 배송비가 있으면 모두 합산
    const customShippingTotal = customShippingItems.reduce((sum, item) => sum + (item.shipping_fee || 0), 0);

    return {
      base_fee: customShippingTotal,
      extra_fee: 0,
      total_fee: customShippingTotal,
      free_shipping: false,
      policy_name: '상품별 배송비'
    };
  }

  // 정책 기반 배송비 계산
  return await calculateShipping(totalProductAmount, shippingAddress);
}

/**
 * 배송비 정책 업데이트 (관리자용)
 */
export async function updateShippingPolicy(
  policyId: number,
  updates: Partial<Omit<ShippingPolicy, 'id' | 'is_default'>>
): Promise<boolean> {
  const db = getDatabase();

  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await db.execute(`
      UPDATE shipping_policies
      SET ${fields}, updated_at = NOW()
      WHERE id = ?
    `, [...values, policyId]);

    console.log(`✅ [Shipping] Policy ${policyId} updated`);
    return true;

  } catch (error) {
    console.error('❌ [Shipping] Failed to update policy:', error);
    return false;
  }
}

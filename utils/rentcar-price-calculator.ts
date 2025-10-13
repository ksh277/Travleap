/**
 * 렌트카 가격 계산 유틸리티
 * - 기본 차량 대여료
 * - 기간별 할인
 * - 요일별 요금
 * - 시즌별 요금
 * - 얼리버드 할인
 * - 보험 상품
 * - 추가 옵션
 */

import { db } from './database-cloud';

interface PriceCalculationParams {
  vehicleId: number;
  vendorId: number;
  pickupDate: Date;
  dropoffDate: Date;
  selectedInsuranceIds?: number[];
  selectedOptionIds?: Array<{ optionId: number; quantity: number }>;
  bookingDate?: Date; // 예약 생성 날짜 (얼리버드 계산용)
}

interface PriceBreakdown {
  // 기본 요금
  baseDailyRate: number;
  days: number;
  baseTotal: number;

  // 할인
  durationDiscount: {
    percentage: number;
    amount: number;
    reason: string;
  } | null;

  dayOfWeekAdjustment: {
    multiplier: number;
    amount: number;
    reason: string;
  } | null;

  seasonAdjustment: {
    multiplier: number;
    amount: number;
    reason: string;
  } | null;

  earlyBirdDiscount: {
    percentage: number;
    amount: number;
    reason: string;
  } | null;

  // 소계 (차량 대여료)
  vehicleSubtotal: number;

  // 보험
  insurances: Array<{
    id: number;
    name: string;
    dailyPrice: number;
    days: number;
    total: number;
  }>;
  insuranceTotal: number;

  // 추가 옵션
  options: Array<{
    id: number;
    name: string;
    dailyPrice: number;
    oneTimePrice: number;
    quantity: number;
    days: number;
    total: number;
  }>;
  optionsTotal: number;

  // 최종 금액
  totalDiscount: number;
  finalPrice: number;
}

/**
 * 렌트카 가격 계산 (모든 정책 반영)
 */
export async function calculateRentcarPrice(
  params: PriceCalculationParams
): Promise<PriceBreakdown> {
  const {
    vehicleId,
    vendorId,
    pickupDate,
    dropoffDate,
    selectedInsuranceIds = [],
    selectedOptionIds = [],
    bookingDate = new Date()
  } = params;

  // 1. 차량 기본 요금 조회
  const vehicleResult = await db.query(
    'SELECT daily_rate_krw FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?',
    [vehicleId, vendorId]
  );

  if (vehicleResult.length === 0) {
    throw new Error('차량을 찾을 수 없습니다.');
  }

  const baseDailyRate = vehicleResult[0].daily_rate_krw;

  // 2. 대여 일수 계산
  const days = Math.ceil(
    (dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days <= 0) {
    throw new Error('유효하지 않은 날짜입니다.');
  }

  // 3. 기본 총액
  let baseTotal = baseDailyRate * days;

  // 4. 요금 정책 조회 (한 번에 모두 조회)
  const policiesResult = await db.query(
    `SELECT * FROM rentcar_pricing_policies
     WHERE vendor_id = ? AND is_active = 1`,
    [vendorId]
  );

  // 5. 기간별 할인 적용
  let durationDiscount: PriceBreakdown['durationDiscount'] = null;
  const durationPolicies = policiesResult
    .filter((p: any) => p.policy_type === 'duration_discount')
    .filter((p: any) => days >= p.min_days && days <= p.max_days)
    .sort((a: any, b: any) => b.discount_percentage - a.discount_percentage); // 최대 할인율 우선

  if (durationPolicies.length > 0) {
    const policy = durationPolicies[0];
    const discountAmount = Math.round(baseTotal * (policy.discount_percentage / 100));
    durationDiscount = {
      percentage: policy.discount_percentage,
      amount: discountAmount,
      reason: `${days}일 대여 (${policy.min_days}~${policy.max_days}일)`
    };
    baseTotal -= discountAmount;
  }

  // 6. 요일별 요금 조정
  let dayOfWeekAdjustment: PriceBreakdown['dayOfWeekAdjustment'] = null;
  const dayOfWeekPolicies = policiesResult.filter(
    (p: any) => p.policy_type === 'day_of_week'
  );

  if (dayOfWeekPolicies.length > 0) {
    let totalMultiplier = 0;
    let adjustmentDays = 0;

    // 대여 기간 동안의 각 요일 체크
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(pickupDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dayName = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
      ][currentDate.getDay()];

      const policy = dayOfWeekPolicies.find((p: any) => p.day_of_week === dayName);
      if (policy && policy.price_multiplier !== 1.0) {
        totalMultiplier += policy.price_multiplier - 1.0; // 추가 비용만 계산
        adjustmentDays++;
      }
    }

    if (adjustmentDays > 0) {
      const avgMultiplier = 1 + totalMultiplier / adjustmentDays;
      const adjustmentAmount = Math.round(baseDailyRate * days * (avgMultiplier - 1.0));
      dayOfWeekAdjustment = {
        multiplier: avgMultiplier,
        amount: adjustmentAmount,
        reason: `주말 ${adjustmentDays}일 포함`
      };
      baseTotal += adjustmentAmount;
    }
  }

  // 7. 시즌별 요금 조정
  let seasonAdjustment: PriceBreakdown['seasonAdjustment'] = null;
  const seasonPolicies = policiesResult.filter((p: any) => p.policy_type === 'season');

  for (const policy of seasonPolicies) {
    const seasonStart = new Date(policy.start_date);
    const seasonEnd = new Date(policy.end_date);

    // 대여 기간이 시즌과 겹치는지 확인
    if (pickupDate <= seasonEnd && dropoffDate >= seasonStart) {
      const adjustmentAmount = Math.round(
        baseDailyRate * days * (policy.season_multiplier - 1.0)
      );
      seasonAdjustment = {
        multiplier: policy.season_multiplier,
        amount: adjustmentAmount,
        reason: policy.season_name
      };
      baseTotal += adjustmentAmount;
      break; // 첫 번째 매칭되는 시즌만 적용
    }
  }

  // 8. 얼리버드 할인
  let earlyBirdDiscount: PriceBreakdown['earlyBirdDiscount'] = null;
  const earlyBirdPolicies = policiesResult.filter(
    (p: any) => p.policy_type === 'early_bird'
  );

  if (earlyBirdPolicies.length > 0) {
    const daysBeforePickup = Math.ceil(
      (pickupDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const policy of earlyBirdPolicies) {
      if (daysBeforePickup >= policy.days_before_pickup) {
        const discountAmount = Math.round(baseTotal * (policy.early_bird_discount / 100));
        earlyBirdDiscount = {
          percentage: policy.early_bird_discount,
          amount: discountAmount,
          reason: `${policy.days_before_pickup}일 전 예약`
        };
        baseTotal -= discountAmount;
        break;
      }
    }
  }

  const vehicleSubtotal = baseTotal;

  // 9. 보험 상품 가격 계산
  const insurances: PriceBreakdown['insurances'] = [];
  let insuranceTotal = 0;

  if (selectedInsuranceIds.length > 0) {
    const insuranceResult = await db.query(
      `SELECT id, insurance_name, daily_price, is_included
       FROM rentcar_insurance_products
       WHERE id IN (${selectedInsuranceIds.join(',')}) AND vendor_id = ? AND is_active = 1`,
      [vendorId]
    );

    for (const insurance of insuranceResult) {
      if (!insurance.is_included) {
        // 기본 포함된 보험은 무료
        const insurancePrice = insurance.daily_price * days;
        insurances.push({
          id: insurance.id,
          name: insurance.insurance_name,
          dailyPrice: insurance.daily_price,
          days,
          total: insurancePrice
        });
        insuranceTotal += insurancePrice;
      }
    }
  }

  // 10. 추가 옵션 가격 계산
  const options: PriceBreakdown['options'] = [];
  let optionsTotal = 0;

  if (selectedOptionIds.length > 0) {
    const optionIds = selectedOptionIds.map((o) => o.optionId);
    const optionResult = await db.query(
      `SELECT id, option_name, daily_price, one_time_price
       FROM rentcar_additional_options
       WHERE id IN (${optionIds.join(',')}) AND vendor_id = ? AND is_active = 1`,
      [vendorId]
    );

    for (const option of optionResult) {
      const selected = selectedOptionIds.find((o) => o.optionId === option.id);
      if (selected) {
        const optionPrice =
          option.daily_price * days * selected.quantity +
          option.one_time_price * selected.quantity;

        options.push({
          id: option.id,
          name: option.option_name,
          dailyPrice: option.daily_price,
          oneTimePrice: option.one_time_price,
          quantity: selected.quantity,
          days,
          total: optionPrice
        });
        optionsTotal += optionPrice;
      }
    }
  }

  // 11. 최종 금액 계산
  const totalDiscount =
    (durationDiscount?.amount || 0) + (earlyBirdDiscount?.amount || 0);

  const finalPrice = vehicleSubtotal + insuranceTotal + optionsTotal;

  return {
    baseDailyRate,
    days,
    baseTotal: baseDailyRate * days,
    durationDiscount,
    dayOfWeekAdjustment,
    seasonAdjustment,
    earlyBirdDiscount,
    vehicleSubtotal,
    insurances,
    insuranceTotal,
    options,
    optionsTotal,
    totalDiscount,
    finalPrice
  };
}

/**
 * 가격 상세 내역을 사용자 친화적 텍스트로 변환
 */
export function formatPriceBreakdown(breakdown: PriceBreakdown): string {
  const lines: string[] = [];

  lines.push(`=== 가격 상세 내역 ===\n`);

  // 기본 요금
  lines.push(`차량 기본 요금: ${breakdown.baseDailyRate.toLocaleString()}원/일`);
  lines.push(`대여 기간: ${breakdown.days}일`);
  lines.push(`소계: ${breakdown.baseTotal.toLocaleString()}원\n`);

  // 할인 및 조정
  if (breakdown.durationDiscount) {
    lines.push(
      `✅ 기간 할인 (${breakdown.durationDiscount.reason}): -${breakdown.durationDiscount.amount.toLocaleString()}원 (${breakdown.durationDiscount.percentage}%)`
    );
  }

  if (breakdown.earlyBirdDiscount) {
    lines.push(
      `✅ 얼리버드 할인 (${breakdown.earlyBirdDiscount.reason}): -${breakdown.earlyBirdDiscount.amount.toLocaleString()}원 (${breakdown.earlyBirdDiscount.percentage}%)`
    );
  }

  if (breakdown.dayOfWeekAdjustment) {
    lines.push(
      `⚠️ 요일별 추가 요금 (${breakdown.dayOfWeekAdjustment.reason}): +${breakdown.dayOfWeekAdjustment.amount.toLocaleString()}원`
    );
  }

  if (breakdown.seasonAdjustment) {
    lines.push(
      `⚠️ 시즌 추가 요금 (${breakdown.seasonAdjustment.reason}): +${breakdown.seasonAdjustment.amount.toLocaleString()}원`
    );
  }

  lines.push(`\n차량 대여료 합계: ${breakdown.vehicleSubtotal.toLocaleString()}원\n`);

  // 보험
  if (breakdown.insurances.length > 0) {
    lines.push(`보험 상품:`);
    breakdown.insurances.forEach((ins) => {
      lines.push(
        `  - ${ins.name}: ${ins.dailyPrice.toLocaleString()}원/일 x ${ins.days}일 = ${ins.total.toLocaleString()}원`
      );
    });
    lines.push(`보험 합계: ${breakdown.insuranceTotal.toLocaleString()}원\n`);
  }

  // 추가 옵션
  if (breakdown.options.length > 0) {
    lines.push(`추가 옵션:`);
    breakdown.options.forEach((opt) => {
      const priceDetail =
        opt.oneTimePrice > 0
          ? `${opt.dailyPrice.toLocaleString()}원/일 x ${opt.days}일 + 1회 ${opt.oneTimePrice.toLocaleString()}원`
          : `${opt.dailyPrice.toLocaleString()}원/일 x ${opt.days}일`;

      lines.push(
        `  - ${opt.name} x ${opt.quantity}개: ${priceDetail} = ${opt.total.toLocaleString()}원`
      );
    });
    lines.push(`옵션 합계: ${breakdown.optionsTotal.toLocaleString()}원\n`);
  }

  // 최종 금액
  lines.push(`총 할인 금액: -${breakdown.totalDiscount.toLocaleString()}원`);
  lines.push(`===================`);
  lines.push(`최종 결제 금액: ${breakdown.finalPrice.toLocaleString()}원`);

  return lines.join('\n');
}

/**
 * 간단한 가격 미리보기 (보험/옵션 제외)
 */
export async function getQuickPriceEstimate(
  vehicleId: number,
  vendorId: number,
  pickupDate: Date,
  dropoffDate: Date
): Promise<{ estimatedPrice: number; days: number }> {
  const breakdown = await calculateRentcarPrice({
    vehicleId,
    vendorId,
    pickupDate,
    dropoffDate
  });

  return {
    estimatedPrice: breakdown.vehicleSubtotal,
    days: breakdown.days
  };
}

/**
 * 사용 예시:
 *
 * // 기본 가격 계산 (차량만)
 * const simplePrice = await getQuickPriceEstimate(
 *   123,
 *   1,
 *   new Date('2025-01-20'),
 *   new Date('2025-01-25')
 * );
 * console.log(`예상 금액: ${simplePrice.estimatedPrice.toLocaleString()}원 (${simplePrice.days}일)`);
 *
 * // 전체 가격 계산 (보험 + 옵션 포함)
 * const fullPrice = await calculateRentcarPrice({
 *   vehicleId: 123,
 *   vendorId: 1,
 *   pickupDate: new Date('2025-01-20'),
 *   dropoffDate: new Date('2025-01-25'),
 *   selectedInsuranceIds: [2, 3], // CDW, 완전자차
 *   selectedOptionIds: [
 *     { optionId: 1, quantity: 1 }, // 네비게이션 1개
 *     { optionId: 2, quantity: 2 }  // 아동 카시트 2개
 *   ],
 *   bookingDate: new Date('2025-01-05') // 15일 전 예약 (얼리버드)
 * });
 *
 * // 가격 상세 출력
 * console.log(formatPriceBreakdown(fullPrice));
 *
 * // 예약 저장 시 DB 업데이트
 * await db.execute(`
 *   INSERT INTO rentcar_bookings
 *   (vehicle_id, base_price, discount_amount, insurance_price,
 *    options_price, final_price, ...)
 *   VALUES (?, ?, ?, ?, ?, ?, ...)
 * `, [
 *   vehicleId,
 *   fullPrice.baseTotal,
 *   fullPrice.totalDiscount,
 *   fullPrice.insuranceTotal,
 *   fullPrice.optionsTotal,
 *   fullPrice.finalPrice,
 *   ...
 * ]);
 */

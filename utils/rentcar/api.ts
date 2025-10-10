/**
 * 렌트카 API 엔드포인트
 *
 * GET  /api/cars/availability
 * POST /api/cars/quote
 * POST /api/cars/booking
 * POST /api/cars/cancel
 */

import { CarRentalService } from './service';
import type {
  CarSearchRequest,
  CarSearchResult,
  QuoteRequest,
  QuoteResponse,
  BookingRequest,
  BookingResponse,
} from './types';

const carService = new CarRentalService();

/**
 * GET /api/cars/availability
 *
 * 차량 검색 API
 */
export async function searchCars(
  params: CarSearchRequest
): Promise<{ success: boolean; data?: CarSearchResult[]; error?: string }> {
  try {
    // 입력 검증
    if (!params.pickupPlaceId || !params.dropoffPlaceId) {
      return {
        success: false,
        error: 'pickupPlaceId and dropoffPlaceId are required',
      };
    }

    if (!params.pickupAt || !params.dropoffAt) {
      return {
        success: false,
        error: 'pickupAt and dropoffAt are required',
      };
    }

    // 픽업·반납 날짜 검증
    const pickup = new Date(params.pickupAt);
    const dropoff = new Date(params.dropoffAt);

    if (pickup >= dropoff) {
      return {
        success: false,
        error: 'dropoffAt must be after pickupAt',
      };
    }

    // 과거 날짜 체크
    if (pickup < new Date()) {
      return {
        success: false,
        error: 'pickupAt cannot be in the past',
      };
    }

    // 차량 검색
    const results = await carService.searchCars(params);

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error('searchCars error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * POST /api/cars/quote
 *
 * Quote API (가격·가용성 재검증)
 */
export async function getQuote(
  params: QuoteRequest
): Promise<QuoteResponse> {
  try {
    if (!params.rateKey) {
      return {
        success: false,
        available: false,
        message: 'rateKey is required',
      };
    }

    return await carService.getQuote(params);
  } catch (error) {
    console.error('getQuote error:', error);
    return {
      success: false,
      available: false,
      message: error instanceof Error ? error.message : 'Quote failed',
    };
  }
}

/**
 * POST /api/cars/booking
 *
 * 예약 생성 API
 */
export async function createBooking(
  params: BookingRequest
): Promise<BookingResponse> {
  try {
    // 입력 검증
    if (!params.rateKey) {
      return {
        success: false,
        error: 'rateKey is required',
        errorCode: 'MISSING_RATE_KEY',
      };
    }

    if (!params.driverInfo || !params.paymentInfo) {
      return {
        success: false,
        error: 'driverInfo and paymentInfo are required',
        errorCode: 'MISSING_REQUIRED_INFO',
      };
    }

    // 운전자 나이 검증 (임시로 21세 미만 거부)
    const dob = new Date(params.driverInfo.dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();

    if (age < 21) {
      return {
        success: false,
        error: 'Driver must be at least 21 years old',
        errorCode: 'DRIVER_TOO_YOUNG',
      };
    }

    // 예약 생성
    return await carService.createBooking(params);
  } catch (error) {
    console.error('createBooking error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Booking failed',
      errorCode: 'BOOKING_FAILED',
    };
  }
}

/**
 * POST /api/cars/cancel
 *
 * 예약 취소 API
 */
export async function cancelBooking(
  supplier: string,
  bookingId: string
): Promise<{ success: boolean; refundAmount?: number; error?: string }> {
  try {
    if (!bookingId) {
      return {
        success: false,
        error: 'bookingId is required',
      };
    }

    const result = await carService.cancelBooking(supplier, bookingId);

    return result;
  } catch (error) {
    console.error('cancelBooking error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cancel failed',
    };
  }
}

/**
 * API 사용 예시 (Express.js)
 *
 * import express from 'express';
 * import { searchCars, getQuote, createBooking, cancelBooking } from './utils/rentcar/api';
 *
 * const app = express();
 * app.use(express.json());
 *
 * // 차량 검색
 * app.get('/api/cars/availability', async (req, res) => {
 *   const params = {
 *     pickupPlaceId: req.query.pickup_place_id as string,
 *     dropoffPlaceId: req.query.dropoff_place_id as string,
 *     pickupAt: req.query.pickup_at as string,
 *     dropoffAt: req.query.dropoff_at as string,
 *     driverAge: Number(req.query.driver_age) || 25,
 *     residentCountry: req.query.resident_country as string || 'KR',
 *     filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
 *   };
 *
 *   const result = await searchCars(params);
 *   res.json(result);
 * });
 *
 * // Quote
 * app.post('/api/cars/quote', async (req, res) => {
 *   const result = await getQuote(req.body);
 *   res.json(result);
 * });
 *
 * // 예약
 * app.post('/api/cars/booking', async (req, res) => {
 *   const result = await createBooking(req.body);
 *   res.json(result);
 * });
 *
 * // 취소
 * app.post('/api/cars/cancel', async (req, res) => {
 *   const { supplier, booking_id } = req.body;
 *   const result = await cancelBooking(supplier, booking_id);
 *   res.json(result);
 * });
 *
 * app.listen(3000, () => console.log('Server running on port 3000'));
 */

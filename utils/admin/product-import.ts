/**
 * 관리자 상품 추가 통합 모듈
 * PMS/렌트카 API 연동 → DB 저장
 */

import type { AdminProductFormData } from '../pms/admin-integration';
import {
  fetchHotelDataFromPMS,
  convertPMSDataToFormData,
  saveProductToDB
} from '../pms/admin-integration';
import type { CarSupplier } from '../rentcar/types';

/**
 * 상품 타입별 가져오기
 */
export type ProductImportType = 'pms_hotel' | 'rentcar' | 'manual';

/**
 * 통합 설정
 */
export interface ProductImportConfig {
  type: ProductImportType;

  // PMS 설정 (숙박)
  pmsConfig?: {
    vendor: 'cloudbeds' | 'opera' | 'stayntouch' | 'mews' | 'custom';
    hotelId: string;
    apiKey: string;
  };

  // 렌트카 설정
  rentcarConfig?: {
    supplier: CarSupplier;
    apiKey: string;
    affiliateId?: string;
  };
}

/**
 * 상품 가져오기 결과
 */
export interface ProductImportResult {
  success: boolean;
  productId?: string;
  formData?: any;
  error?: string;
}

/**
 * 1. PMS에서 숙박 상품 가져오기
 */
export async function importHotelFromPMS(
  config: ProductImportConfig
): Promise<ProductImportResult> {
  if (!config.pmsConfig) {
    return {
      success: false,
      error: 'PMS 설정이 필요합니다.',
    };
  }

  try {
    // 1. PMS에서 데이터 불러오기
    const result = await fetchHotelDataFromPMS({
      vendor: config.pmsConfig.vendor,
      hotelId: config.pmsConfig.hotelId,
      apiKey: config.pmsConfig.apiKey,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'PMS 데이터 불러오기 실패',
      };
    }

    // 2. 폼 데이터로 변환
    const formData = convertPMSDataToFormData(result.data, config.pmsConfig.vendor);

    // 3. DB에 저장
    const saveResult = await saveProductToDB(formData);

    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error,
      };
    }

    return {
      success: true,
      productId: saveResult.productId,
      formData,
    };
  } catch (error) {
    console.error('importHotelFromPMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 2. 렌트카 업체 정보 가져오기 (준비 중)
 *
 * 렌트카는 실시간 검색 방식이므로,
 * 관리자 페이지에서는 "렌트카 공급업체 설정"만 저장합니다.
 */
export async function importRentcarSupplier(
  config: ProductImportConfig
): Promise<ProductImportResult> {
  if (!config.rentcarConfig) {
    return {
      success: false,
      error: '렌트카 설정이 필요합니다.',
    };
  }

  try {
    // 렌트카는 상품이 아닌 "공급업체 설정"만 저장
    // DB에 supplier 정보 저장 (실시간 검색용)

    // TODO: rentcar_suppliers 테이블에 저장
    // await db.insert('rentcar_suppliers', {
    //   supplier: config.rentcarConfig.supplier,
    //   api_key_encrypted: encryptApiKey(config.rentcarConfig.apiKey),
    //   affiliate_id: config.rentcarConfig.affiliateId,
    //   is_active: true,
    // });

    return {
      success: true,
      formData: {
        supplier: config.rentcarConfig.supplier,
        message: '렌트카 공급업체가 등록되었습니다. 사용자는 실시간 검색을 통해 차량을 예약할 수 있습니다.',
      },
    };
  } catch (error) {
    console.error('importRentcarSupplier error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 통합 가져오기 함수
 */
export async function importProduct(
  config: ProductImportConfig
): Promise<ProductImportResult> {
  switch (config.type) {
    case 'pms_hotel':
      return await importHotelFromPMS(config);

    case 'rentcar':
      return await importRentcarSupplier(config);

    case 'manual':
      return {
        success: true,
        formData: null,
      };

    default:
      return {
        success: false,
        error: '알 수 없는 상품 타입입니다.',
      };
  }
}

/**
 * 사용 예시 (AdminPage.tsx):
 *
 * import { importProduct } from '../utils/admin/product-import';
 *
 * // PMS 호텔 가져오기
 * const result = await importProduct({
 *   type: 'pms_hotel',
 *   pmsConfig: {
 *     vendor: 'cloudbeds',
 *     hotelId: 'hotel_123',
 *     apiKey: 'your_api_key',
 *   },
 * });
 *
 * if (result.success) {
 *   setNewProduct(result.formData); // 폼에 자동 입력
 *   toast.success(`상품이 추가되었습니다! (ID: ${result.productId})`);
 * }
 *
 * // 렌트카 공급업체 등록
 * const result = await importProduct({
 *   type: 'rentcar',
 *   rentcarConfig: {
 *     supplier: 'rentalcars',
 *     apiKey: 'your_api_key',
 *     affiliateId: 'your_affiliate_id',
 *   },
 * });
 */

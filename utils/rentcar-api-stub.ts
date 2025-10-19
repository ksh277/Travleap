// Frontend stub for rentcar-api
// This file is used in production builds to replace database-dependent code
// All functions make API calls to /api/rentcar/* endpoints

import type {
  RentcarVendor,
  RentcarVendorFormData,
  RentcarLocation,
  RentcarLocationFormData,
  RentcarVehicle,
  RentcarVehicleFormData,
  RentcarVehicleFilters,
  RentcarVehicleWithVendor,
  RentcarBooking,
  RentcarBookingFormData,
  RentcarBookingFilters,
  RentcarBookingWithDetails,
  RentcarApiResponse,
  RentcarVendorStats,
  RentcarAdminStats,
  RentcarRatePlan,
  RentcarRatePlanFormData,
  RentcarInsurancePlan,
  RentcarInsurancePlanFormData,
  RentcarExtra,
  RentcarExtraFormData
} from '../types/rentcar';

// ============================================
// 1. VENDOR API
// ============================================

export const rentcarVendorApi = {
  getAll: async (): Promise<RentcarApiResponse<RentcarVendor[]>> => {
    try {
      const response = await fetch('/api/rentcar/vendors');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      return {
        success: false,
        error: '벤더 목록 조회에 실패했습니다.'
      };
    }
  },

  getById: async (id: number): Promise<RentcarApiResponse<RentcarVendor>> => {
    try {
      const response = await fetch(`/api/rentcar/vendors/${id}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch vendor:', error);
      return {
        success: false,
        error: '벤더 조회에 실패했습니다.'
      };
    }
  },

  create: async (data: RentcarVendorFormData): Promise<RentcarApiResponse<RentcarVendor>> => {
    try {
      const response = await fetch('/api/rentcar/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to create vendor:', error);
      return {
        success: false,
        error: '벤더 등록에 실패했습니다.'
      };
    }
  },

  update: async (id: number, data: Partial<RentcarVendorFormData>): Promise<RentcarApiResponse<RentcarVendor>> => {
    try {
      const response = await fetch(`/api/admin/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to update vendor:', error);
      return {
        success: false,
        error: '벤더 수정에 실패했습니다.'
      };
    }
  },

  delete: async (id: number): Promise<RentcarApiResponse<null>> => {
    try {
      const response = await fetch(`/api/admin/vendors/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      return {
        success: false,
        error: '벤더 삭제에 실패했습니다.'
      };
    }
  },

  updateStatus: async (id: number, status: 'active' | 'suspended' | 'pending'): Promise<RentcarApiResponse<RentcarVendor>> => {
    try {
      const response = await fetch(`/api/rentcar/vendors/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to update vendor status:', error);
      return {
        success: false,
        error: '벤더 상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 2. LOCATION API
// ============================================

export const rentcarLocationApi = {
  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarLocation[]>> => {
    try {
      const response = await fetch(`/api/rentcar/locations?vendor_id=${vendorId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      return {
        success: false,
        error: '지점 목록 조회에 실패했습니다.'
      };
    }
  },

  create: async (vendorId: number, data: RentcarLocationFormData): Promise<RentcarApiResponse<RentcarLocation>> => {
    try {
      const response = await fetch('/api/rentcar/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, vendor_id: vendorId })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to create location:', error);
      return {
        success: false,
        error: '지점 등록에 실패했습니다.'
      };
    }
  },

  update: async (id: number, data: Partial<RentcarLocationFormData>): Promise<RentcarApiResponse<RentcarLocation>> => {
    try {
      const response = await fetch(`/api/rentcar/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to update location:', error);
      return {
        success: false,
        error: '지점 수정에 실패했습니다.'
      };
    }
  },

  delete: async (id: number): Promise<RentcarApiResponse<null>> => {
    try {
      const response = await fetch(`/api/rentcar/locations/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to delete location:', error);
      return {
        success: false,
        error: '지점 삭제에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 3. VEHICLE API
// ============================================

export const rentcarVehicleApi = {
  getAll: async (filters?: RentcarVehicleFilters): Promise<RentcarApiResponse<RentcarVehicleWithVendor[]>> => {
    try {
      const params = new URLSearchParams();
      if (filters?.vendor_id) params.append('vendor_id', filters.vendor_id.toString());
      if (filters?.vehicle_class) filters.vehicle_class.forEach(c => params.append('vehicle_class[]', c));
      if (filters?.fuel_type) filters.fuel_type.forEach(f => params.append('fuel_type[]', f));
      if (filters?.seating_capacity) params.append('seating_capacity', filters.seating_capacity.toString());
      if (filters?.min_price) params.append('min_price', filters.min_price.toString());
      if (filters?.max_price) params.append('max_price', filters.max_price.toString());
      if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters?.is_featured) params.append('is_featured', 'true');

      const response = await fetch(`/api/rentcar/vehicles?${params.toString()}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      return {
        success: false,
        error: '차량 목록 조회에 실패했습니다.'
      };
    }
  },

  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarVehicle[]>> => {
    try {
      const response = await fetch(`/api/rentcar/vehicles?vendor_id=${vendorId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      return {
        success: false,
        error: '차량 목록 조회에 실패했습니다.'
      };
    }
  },

  getById: async (id: number): Promise<RentcarApiResponse<RentcarVehicleWithVendor>> => {
    try {
      const response = await fetch(`/api/rentcar/vehicles/${id}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch vehicle:', error);
      return {
        success: false,
        error: '차량 조회에 실패했습니다.'
      };
    }
  },

  create: async (vendorId: number, data: RentcarVehicleFormData): Promise<RentcarApiResponse<RentcarVehicle>> => {
    try {
      const response = await fetch('/api/rentcar/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, vendor_id: vendorId })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      return {
        success: false,
        error: '차량 등록에 실패했습니다.'
      };
    }
  },

  update: async (id: number, data: Partial<RentcarVehicleFormData>): Promise<RentcarApiResponse<RentcarVehicle>> => {
    try {
      const response = await fetch(`/api/rentcar/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to update vehicle:', error);
      return {
        success: false,
        error: '차량 수정에 실패했습니다.'
      };
    }
  },

  delete: async (id: number): Promise<RentcarApiResponse<null>> => {
    try {
      const response = await fetch(`/api/rentcar/vehicles/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      return {
        success: false,
        error: '차량 삭제에 실패했습니다.'
      };
    }
  },

  toggleActive: async (id: number, isActive: boolean): Promise<RentcarApiResponse<null>> => {
    try {
      const response = await fetch(`/api/rentcar/vehicles/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to toggle vehicle:', error);
      return {
        success: false,
        error: '차량 상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 4. BOOKING API
// ============================================

export const rentcarBookingApi = {
  getAll: async (filters?: RentcarBookingFilters): Promise<RentcarApiResponse<RentcarBookingWithDetails[]>> => {
    try {
      const params = new URLSearchParams();
      if (filters?.vendor_id) params.append('vendor_id', filters.vendor_id.toString());
      if (filters?.status) filters.status.forEach(s => params.append('status[]', s));
      if (filters?.payment_status) filters.payment_status.forEach(p => params.append('payment_status[]', p));
      if (filters?.pickup_date_from) params.append('pickup_date_from', filters.pickup_date_from);
      if (filters?.pickup_date_to) params.append('pickup_date_to', filters.pickup_date_to);
      if (filters?.search) params.append('search', filters.search);

      const response = await fetch(`/api/rentcar/bookings?${params.toString()}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      return {
        success: false,
        error: '예약 목록 조회에 실패했습니다.'
      };
    }
  },

  create: async (vendorId: number, userId: number, data: RentcarBookingFormData): Promise<RentcarApiResponse<RentcarBooking>> => {
    try {
      const response = await fetch('/api/rentcar/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, vendor_id: vendorId, user_id: userId })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to create booking:', error);
      return {
        success: false,
        error: '예약 생성에 실패했습니다.'
      };
    }
  },

  updateStatus: async (id: number, status: string): Promise<RentcarApiResponse<null>> => {
    try {
      const response = await fetch(`/api/rentcar/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to update booking status:', error);
      return {
        success: false,
        error: '예약 상태 변경에 실패했습니다.'
      };
    }
  },

  checkAvailability: async (
    pickupDate: string,
    returnDate: string
  ): Promise<RentcarApiResponse<{ unavailableVehicleIds: number[] }>> => {
    try {
      const response = await fetch(`/api/rentcar/bookings/availability?pickup_date=${pickupDate}&return_date=${returnDate}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to check availability:', error);
      return {
        success: false,
        error: '예약 가능 여부 확인에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 5. STATISTICS API
// ============================================

export const rentcarStatsApi = {
  getVendorStats: async (vendorId: number): Promise<RentcarApiResponse<RentcarVendorStats>> => {
    try {
      const response = await fetch(`/api/rentcar/stats/vendor/${vendorId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch vendor stats:', error);
      return {
        success: false,
        error: '통계 조회에 실패했습니다.'
      };
    }
  },

  getDashboardStats: async (dateRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<RentcarApiResponse<any>> => {
    try {
      const response = await fetch(`/api/rentcar/stats/dashboard?range=${dateRange}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      return {
        success: false,
        error: '대시보드 통계 조회에 실패했습니다.'
      };
    }
  },

  getAdminStats: async (): Promise<RentcarApiResponse<Partial<RentcarAdminStats>>> => {
    try {
      const response = await fetch('/api/rentcar/stats/admin');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      return {
        success: false,
        error: '통계 조회에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 6. RATE PLANS API
// ============================================

export const rentcarRatePlanApi = {
  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarRatePlan[]>> => {
    try {
      const response = await fetch(`/api/rentcar/rate-plans?vendor_id=${vendorId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch rate plans:', error);
      return {
        success: false,
        error: '요금제 조회에 실패했습니다.'
      };
    }
  },

  getActiveRatePlan: async (
    vendorId: number,
    vehicleId: number | null,
    vehicleClass: string | null,
    startDate: string
  ): Promise<RentcarApiResponse<RentcarRatePlan | null>> => {
    try {
      const params = new URLSearchParams({
        vendor_id: vendorId.toString(),
        start_date: startDate
      });
      if (vehicleId) params.append('vehicle_id', vehicleId.toString());
      if (vehicleClass) params.append('vehicle_class', vehicleClass);

      const response = await fetch(`/api/rentcar/rate-plans/active?${params.toString()}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get active rate plan:', error);
      return {
        success: false,
        error: '활성 요금제 조회에 실패했습니다.'
      };
    }
  },

  create: async (vendorId: number, data: RentcarRatePlanFormData): Promise<RentcarApiResponse<RentcarRatePlan>> => {
    try {
      const response = await fetch('/api/rentcar/rate-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, vendor_id: vendorId })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to create rate plan:', error);
      return {
        success: false,
        error: '요금제 등록에 실패했습니다.'
      };
    }
  },

  update: async (id: number, data: RentcarRatePlanFormData): Promise<RentcarApiResponse<RentcarRatePlan>> => {
    try {
      const response = await fetch(`/api/rentcar/rate-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to update rate plan:', error);
      return {
        success: false,
        error: '요금제 수정에 실패했습니다.'
      };
    }
  },

  delete: async (id: number): Promise<RentcarApiResponse<void>> => {
    try {
      const response = await fetch(`/api/rentcar/rate-plans/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to delete rate plan:', error);
      return {
        success: false,
        error: '요금제 삭제에 실패했습니다.'
      };
    }
  },

  toggleActive: async (id: number, isActive: boolean): Promise<RentcarApiResponse<RentcarRatePlan>> => {
    try {
      const response = await fetch(`/api/rentcar/rate-plans/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to toggle rate plan status:', error);
      return {
        success: false,
        error: '상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 7. INSURANCE PLANS API
// ============================================

export const rentcarInsuranceApi = {
  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarInsurancePlan[]>> => {
    try {
      const response = await fetch(`/api/rentcar/insurance?vendor_id=${vendorId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch insurance plans:', error);
      return {
        success: false,
        error: '보험 상품 조회에 실패했습니다.'
      };
    }
  },

  getActive: async (vendorId: number): Promise<RentcarApiResponse<RentcarInsurancePlan[]>> => {
    try {
      const response = await fetch(`/api/rentcar/insurance?vendor_id=${vendorId}&active=true`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch active insurance plans:', error);
      return {
        success: false,
        error: '활성 보험 상품 조회에 실패했습니다.'
      };
    }
  },

  create: async (vendorId: number, data: RentcarInsurancePlanFormData): Promise<RentcarApiResponse<RentcarInsurancePlan>> => {
    try {
      const response = await fetch('/api/rentcar/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, vendor_id: vendorId })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to create insurance plan:', error);
      return {
        success: false,
        error: '보험 상품 등록에 실패했습니다.'
      };
    }
  },

  update: async (id: number, data: RentcarInsurancePlanFormData): Promise<RentcarApiResponse<RentcarInsurancePlan>> => {
    try {
      const response = await fetch(`/api/rentcar/insurance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to update insurance plan:', error);
      return {
        success: false,
        error: '보험 상품 수정에 실패했습니다.'
      };
    }
  },

  delete: async (id: number): Promise<RentcarApiResponse<void>> => {
    try {
      const response = await fetch(`/api/rentcar/insurance/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to delete insurance plan:', error);
      return {
        success: false,
        error: '보험 상품 삭제에 실패했습니다.'
      };
    }
  },

  toggleActive: async (id: number, isActive: boolean): Promise<RentcarApiResponse<RentcarInsurancePlan>> => {
    try {
      const response = await fetch(`/api/rentcar/insurance/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to toggle insurance status:', error);
      return {
        success: false,
        error: '상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 8. EXTRAS API
// ============================================

export const rentcarExtrasApi = {
  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarExtra[]>> => {
    try {
      const response = await fetch(`/api/rentcar/extras?vendor_id=${vendorId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch extras:', error);
      return {
        success: false,
        error: '부가 옵션 조회에 실패했습니다.'
      };
    }
  },

  getActive: async (vendorId: number): Promise<RentcarApiResponse<RentcarExtra[]>> => {
    try {
      const response = await fetch(`/api/rentcar/extras?vendor_id=${vendorId}&active=true`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch active extras:', error);
      return {
        success: false,
        error: '활성 부가 옵션 조회에 실패했습니다.'
      };
    }
  },

  create: async (vendorId: number, data: RentcarExtraFormData): Promise<RentcarApiResponse<RentcarExtra>> => {
    try {
      const response = await fetch('/api/rentcar/extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, vendor_id: vendorId })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to create extra:', error);
      return {
        success: false,
        error: '부가 옵션 등록에 실패했습니다.'
      };
    }
  },

  update: async (id: number, data: RentcarExtraFormData): Promise<RentcarApiResponse<RentcarExtra>> => {
    try {
      const response = await fetch(`/api/rentcar/extras/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to update extra:', error);
      return {
        success: false,
        error: '부가 옵션 수정에 실패했습니다.'
      };
    }
  },

  delete: async (id: number): Promise<RentcarApiResponse<void>> => {
    try {
      const response = await fetch(`/api/rentcar/extras/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to delete extra:', error);
      return {
        success: false,
        error: '부가 옵션 삭제에 실패했습니다.'
      };
    }
  },

  toggleActive: async (id: number, isActive: boolean): Promise<RentcarApiResponse<RentcarExtra>> => {
    try {
      const response = await fetch(`/api/rentcar/extras/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to toggle extra status:', error);
      return {
        success: false,
        error: '상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// Export all APIs
// ============================================

export const rentcarApi = {
  vendors: rentcarVendorApi,
  locations: rentcarLocationApi,
  vehicles: rentcarVehicleApi,
  bookings: rentcarBookingApi,
  stats: rentcarStatsApi,
  ratePlans: rentcarRatePlanApi,
  insurance: rentcarInsuranceApi,
  extras: rentcarExtrasApi
};

export default rentcarApi;

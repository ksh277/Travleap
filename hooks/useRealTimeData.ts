import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';

// 🚀 실시간 데이터 동기화 훅
// 관리자가 상품을 추가/수정하면 모든 페이지에 자동으로 반영

interface DataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

interface UseRealTimeDataOptions {
  refreshInterval?: number; // 자동 새로고침 간격 (ms)
  enablePolling?: boolean; // 폴링 활성화 여부
}

// 전역 이벤트 시스템
class DataEventManager {
  private listeners: { [key: string]: (() => void)[] } = {};

  subscribe(event: string, callback: () => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // cleanup 함수 반환
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string) {
    console.log(`📡 실시간 데이터 이벤트 발생: ${event}`);
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback());
    }
  }
}

export const dataEvents = new DataEventManager();

export function useRealTimeListings(options: UseRealTimeDataOptions = {}) {
  const { refreshInterval = 30000, enablePolling = true } = options;

  const [state, setState] = useState<DataState<any>>({
    data: [],
    loading: true,
    error: null,
    lastUpdated: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await api.getListings({ limit: 100 });

      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          lastUpdated: Date.now()
        });
        console.log(`✅ 실시간 상품 데이터 로드 완료: ${response.data.length}개`);
      } else {
        throw new Error('데이터 로드 실패');
      }
    } catch (error) {
      console.error('❌ 실시간 데이터 로드 오류:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      }));
    }
  }, []);

  // 수동 새로고침
  const refresh = useCallback(() => {
    console.log('🔄 수동 데이터 새로고침 요청');
    fetchData();
  }, [fetchData]);

  // 폴링 시작/중지
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;

    console.log(`🔄 실시간 폴링 시작 (${refreshInterval}ms 간격)`);
    intervalRef.current = setInterval(fetchData, refreshInterval);
  }, [fetchData, refreshInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      console.log('⏹️ 실시간 폴링 중지');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 컴포넌트 마운트/언마운트 시 동작
  useEffect(() => {
    // 초기 데이터 로드
    fetchData();

    // 실시간 이벤트 구독
    const unsubscribeCreate = dataEvents.subscribe('listing:created', fetchData);
    const unsubscribeUpdate = dataEvents.subscribe('listing:updated', fetchData);
    const unsubscribeDelete = dataEvents.subscribe('listing:deleted', fetchData);

    // 폴링 시작
    if (enablePolling) {
      startPolling();
    }

    // 페이지 가시성 변경 시 폴링 제어
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (enablePolling) {
        startPolling();
        fetchData(); // 페이지가 다시 보일 때 즉시 새로고침
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // cleanup
    return () => {
      stopPolling();
      unsubscribeCreate();
      unsubscribeUpdate();
      unsubscribeDelete();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, enablePolling, startPolling, stopPolling]);

  return {
    ...state,
    refresh,
    startPolling,
    stopPolling,
    isPolling: intervalRef.current !== null
  };
}

export function useRealTimePartners(options: UseRealTimeDataOptions = {}) {
  const { refreshInterval = 30000, enablePolling = true } = options;

  const [state, setState] = useState<DataState<any>>({
    data: [],
    loading: true,
    error: null,
    lastUpdated: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await api.getPartners();

      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          lastUpdated: Date.now()
        });
        console.log(`✅ 실시간 파트너 데이터 로드 완료: ${response.data.length}개`);
      } else {
        setState({
          data: [],
          loading: false,
          error: null,
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      console.error('❌ 실시간 파트너 데이터 로드 오류:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      }));
    }
  }, []);

  // 수동 새로고침
  const refresh = useCallback(() => {
    console.log('🔄 파트너 데이터 수동 새로고침');
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    const unsubscribeCreate = dataEvents.subscribe('partner:created', fetchData);
    const unsubscribeUpdate = dataEvents.subscribe('partner:updated', fetchData);
    const unsubscribeDelete = dataEvents.subscribe('partner:deleted', fetchData);

    if (enablePolling) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      unsubscribeCreate();
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [fetchData, enablePolling, refreshInterval]);

  return {
    ...state,
    refresh
  };
}

// 데이터 변경 알림 헬퍼 함수들
export const notifyDataChange = {
  listingCreated: () => dataEvents.emit('listing:created'),
  listingUpdated: () => dataEvents.emit('listing:updated'),
  listingDeleted: () => dataEvents.emit('listing:deleted'),
  partnerCreated: () => dataEvents.emit('partner:created'),
  partnerUpdated: () => dataEvents.emit('partner:updated'),
  partnerDeleted: () => dataEvents.emit('partner:deleted'),
};

// 전체 데이터 새로고침
export const refreshAllData = () => {
  console.log('🌐 전체 데이터 새로고침 요청');
  dataEvents.emit('listing:updated');
  dataEvents.emit('partner:updated');
};

// 범용 실시간 데이터 훅 (이벤트 구독용)
export function useRealTimeData(eventName: string, callback: () => void) {
  useEffect(() => {
    const unsubscribe = dataEvents.subscribe(eventName, callback);
    return unsubscribe;
  }, [eventName, callback]);
}
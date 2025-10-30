/**
 * 관리자 알림 벨 컴포넌트
 * - 읽지 않은 알림 개수 표시
 * - 클릭 시 알림 목록 드롭다운
 * - 알림 읽음 처리 및 삭제
 */

import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle } from 'lucide-react';

interface Notification {
  id: number;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 알림 로드
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notifications?limit=20');
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('❌ [NotificationBell] 알림 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드 및 30초마다 폴링
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // 알림 읽음 처리
  const markAsRead = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'PATCH'
      });

      if (response.ok) {
        setNotifications(notifications.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('❌ [NotificationBell] 읽음 처리 실패:', error);
    }
  };

  // 알림 삭제
  const deleteNotification = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const notification = notifications.find(n => n.id === id);
        setNotifications(notifications.filter(n => n.id !== id));
        if (notification && !notification.is_read) {
          setUnreadCount(Math.max(0, unreadCount - 1));
        }
      }
    } catch (error) {
      console.error('❌ [NotificationBell] 삭제 실패:', error);
    }
  };

  // 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  return (
    <div className="relative">
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="알림"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <>
          {/* 오버레이 (클릭 시 닫기) */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 알림 목록 */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            {/* 헤더 */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                알림 {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 알림 목록 */}
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2" />
                  로딩 중...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>알림이 없습니다</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* 우선순위 뱃지 */}
                        {notification.priority !== 'LOW' && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(
                              notification.priority
                            )} mb-1`}
                          >
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {notification.priority}
                          </span>
                        )}

                        {/* 제목 */}
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {notification.title}
                        </p>

                        {/* 메시지 */}
                        <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                          {notification.message}
                        </p>

                        {/* 시간 */}
                        <p className="text-xs text-gray-400">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-1">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="읽음 처리"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="삭제"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 메타데이터 (CRITICAL인 경우) */}
                    {notification.priority === 'CRITICAL' && notification.metadata && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(notification.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* 푸터 */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 text-center">
                <button
                  onClick={loadNotifications}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  새로고침
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

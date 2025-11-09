import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import {
  Activity,
  RefreshCw,
  Calendar,
  User,
  Shield,
  LogIn,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  log_type: string;
  log_source: string;
  user_email?: string;
  user_name?: string;
}

interface Stats {
  total_logs: number;
  admin_logs: number;
  login_logs: number;
  unique_users: number;
}

export function AdminActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logType, setLogType] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 활동 로그 로드
  const loadLogs = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (logType) params.append('type', logType);
      if (userId) params.append('user_id', userId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/activity-logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
        setStats(data.stats);
        toast.success(`${data.data.length}개 활동 로그 로드 완료`);
      } else {
        toast.error('활동 로그 로드 실패: ' + data.error);
      }
    } catch (error) {
      console.error('활동 로그 로드 오류:', error);
      toast.error('활동 로그를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'login':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'login':
        return <LogIn className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            활동 로그
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            관리자 및 사용자 활동 기록
          </p>
        </div>
        <Button onClick={loadLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>로그 타입</Label>
              <select
                className="w-full px-3 py-2 border rounded-md mt-1"
                value={logType}
                onChange={(e) => setLogType(e.target.value)}
              >
                <option value="">전체</option>
                <option value="admin">관리자 활동</option>
                <option value="login">로그인</option>
              </select>
            </div>
            <div>
              <Label>사용자 ID</Label>
              <Input
                type="number"
                placeholder="사용자 ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div>
              <Label>시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadLogs} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                조회
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">총 로그</p>
                  <p className="text-2xl font-bold">{stats.total_logs}</p>
                </div>
                <Activity className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">관리자 활동</p>
                  <p className="text-2xl font-bold">{stats.admin_logs}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">로그인 기록</p>
                  <p className="text-2xl font-bold">{stats.login_logs}</p>
                </div>
                <LogIn className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">고유 사용자</p>
                  <p className="text-2xl font-bold">{stats.unique_users}</p>
                </div>
                <User className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 로그 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>활동 기록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">타입</th>
                  <th className="text-left p-3">사용자</th>
                  <th className="text-left p-3">액션</th>
                  <th className="text-left p-3">상세</th>
                  <th className="text-left p-3">IP 주소</th>
                  <th className="text-left p-3">시간</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      활동 로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={`${log.log_source}-${log.id}`} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <Badge className={getLogTypeColor(log.log_type)}>
                          <span className="flex items-center gap-1">
                            {getLogTypeIcon(log.log_type)}
                            {log.log_type}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{log.user_name || `User #${log.user_id}`}</p>
                          <p className="text-xs text-gray-500">{log.user_email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="p-3">
                        <p className="text-sm max-w-md truncate" title={log.details}>
                          {log.details}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-mono">{log.ip_address || 'N/A'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-500">
                          {new Date(log.created_at).toLocaleString('ko-KR')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 숙박업체 전용 대시보드
 *
 * 기능:
 * - 자기 업체 숙소만 조회
 * - 객실 및 요금 관리
 * - 예약 현황 조회
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Hotel,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Loader2,
  LogOut,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { db } from '../utils/database-cloud';

interface Lodging {
  id: number;
  vendor_id: number;
  name: string;
  type: string;
  city: string;
  is_active: boolean;
  room_count?: number;
}

interface VendorInfo {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  is_verified: boolean;
}

export function VendorLodgingDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [lodgings, setLodgings] = useState<Lodging[]>([]);
  const [activeTab, setActiveTab] = useState('lodgings');

  useEffect(() => {
    loadVendorData();
  }, [user?.id]);

  const loadVendorData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // 1. 업체 정보 조회
      const vendorResult = await db.query(`
        SELECT * FROM rentcar_vendors WHERE user_id = ? LIMIT 1
      `, [user.id]);

      if (vendorResult.length === 0) {
        toast.error('업체 정보를 찾을 수 없습니다.');
        navigate('/login');
        return;
      }

      const vendor = vendorResult[0];
      setVendorInfo(vendor);

      // 2. 숙소 목록 조회
      const lodgingsResult = await db.query(`
        SELECT
          l.*,
          COUNT(r.id) as room_count
        FROM lodgings l
        LEFT JOIN rooms r ON l.id = r.lodging_id
        WHERE l.vendor_id = ?
        GROUP BY l.id
        ORDER BY l.created_at DESC
      `, [vendor.id]);

      setLodgings(lodgingsResult);

      console.log(`✅ 숙박 업체 데이터 로드 완료: ${vendor.name}`);
      console.log(`   숙소: ${lodgingsResult.length}개`);

    } catch (error) {
      console.error('업체 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('로그아웃되었습니다.');
  };

  const handleDeleteLodging = async (lodgingId: number) => {
    if (!confirm('정말 이 숙소를 삭제하시겠습니까? 모든 객실 정보도 함께 삭제됩니다.')) return;

    try {
      await db.execute(`
        DELETE FROM lodgings WHERE id = ? AND vendor_id = ?
      `, [lodgingId, vendorInfo?.id]);

      toast.success('숙소가 삭제되었습니다.');
      loadVendorData();
    } catch (error) {
      console.error('숙소 삭제 실패:', error);
      toast.error('숙소 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!vendorInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>업체 정보 없음</CardTitle>
            <CardDescription>업체 정보를 찾을 수 없습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>로그인 페이지로</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
              <Hotel className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{vendorInfo.name}</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                숙박업체 대시보드
                {vendorInfo.is_verified && (
                  <Badge variant="default" className="ml-2">인증됨</Badge>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                등록 숙소
              </CardTitle>
              <Hotel className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{lodgings.length}개</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                총 객실
              </CardTitle>
              <Calendar className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {lodgings.reduce((sum, l) => sum + (l.room_count || 0), 0)}개
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                이번 달 예약
              </CardTitle>
              <DollarSign className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0건</div>
              <p className="text-xs text-gray-500 mt-1">준비 중</p>
            </CardContent>
          </Card>
        </div>

        {/* 탭 메뉴 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="lodgings">숙소 관리</TabsTrigger>
            <TabsTrigger value="bookings">예약 관리</TabsTrigger>
          </TabsList>

          {/* 숙소 관리 */}
          <TabsContent value="lodgings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>숙소 목록</CardTitle>
                  <CardDescription>등록된 숙소 {lodgings.length}개</CardDescription>
                </div>
                <Button onClick={() => toast.info('숙소 추가 기능은 준비 중입니다.')}>
                  <Plus className="w-4 h-4 mr-2" />
                  숙소 추가
                </Button>
              </CardHeader>
              <CardContent>
                {lodgings.length === 0 ? (
                  <div className="text-center py-12">
                    <Hotel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">등록된 숙소가 없습니다.</p>
                    <Button onClick={() => toast.info('숙소 추가 기능은 준비 중입니다.')}>
                      <Plus className="w-4 h-4 mr-2" />
                      첫 숙소 등록하기
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>숙소명</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>위치</TableHead>
                        <TableHead>객실 수</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lodgings.map((lodging) => (
                        <TableRow key={lodging.id}>
                          <TableCell className="font-medium">
                            {lodging.name}
                          </TableCell>
                          <TableCell>{lodging.type}</TableCell>
                          <TableCell>{lodging.city}</TableCell>
                          <TableCell>{lodging.room_count || 0}개</TableCell>
                          <TableCell>
                            <Badge variant={lodging.is_active ? 'default' : 'secondary'}>
                              {lodging.is_active ? '운영중' : '휴업'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast.info('수정 기능은 준비 중입니다.')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteLodging(lodging.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 예약 관리 */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>예약 목록</CardTitle>
                <CardDescription>예약 관리 기능은 준비 중입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">예약 관리 기능은 곧 제공됩니다.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default VendorLodgingDashboard;

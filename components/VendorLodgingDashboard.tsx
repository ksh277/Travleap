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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import {
  Hotel,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Loader2,
  LogOut,
  Building2,
  X,
  Upload,
  Download,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { db } from '../utils/database-cloud';
import { PMSIntegrationManager } from '../utils/pms-integrations';

interface Lodging {
  id: number;
  vendor_id: number;
  name: string;
  type: string;
  city: string;
  address?: string;
  description?: string;
  phone?: string;
  email?: string;
  checkin_time?: string;
  checkout_time?: string;
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

interface Booking {
  id: number;
  room_id: number;
  lodging_id: number;
  lodging_name: string;
  room_name: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export function VendorLodgingDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [lodgings, setLodgings] = useState<Lodging[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('lodgings');

  // 숙소 추가/수정 Dialog
  const [isLodgingDialogOpen, setIsLodgingDialogOpen] = useState(false);
  const [editingLodging, setEditingLodging] = useState<Lodging | null>(null);
  const [lodgingForm, setLodgingForm] = useState({
    name: '',
    type: 'hotel',
    city: '신안군',
    address: '',
    description: '',
    phone: '',
    email: '',
    checkin_time: '15:00',
    checkout_time: '11:00',
    is_active: true
  });

  // CSV 업로드
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  // PMS 연동
  const [isPmsDialogOpen, setIsPmsDialogOpen] = useState(false);
  const [pmsConfig, setPmsConfig] = useState({
    provider: '',
    api_key: '',
    api_secret: '',
    property_id: ''
  });

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

      // 3. 예약 목록 조회
      const bookingsResult = await db.query(`
        SELECT
          lb.*,
          l.name as lodging_name,
          r.name as room_name
        FROM lodging_bookings lb
        JOIN lodgings l ON lb.lodging_id = l.id
        JOIN rooms r ON lb.room_id = r.id
        WHERE l.vendor_id = ?
        ORDER BY lb.created_at DESC
        LIMIT 100
      `, [vendor.id]);

      setBookings(bookingsResult);

      console.log(`✅ 숙박 업체 데이터 로드 완료: ${vendor.name}`);
      console.log(`   숙소: ${lodgingsResult.length}개`);
      console.log(`   예약: ${bookingsResult.length}건`);

    } catch (error) {
      console.error('업체 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openAddLodgingDialog = () => {
    setEditingLodging(null);
    setLodgingForm({
      name: '',
      type: 'hotel',
      city: '신안군',
      address: '',
      description: '',
      phone: '',
      email: '',
      checkin_time: '15:00',
      checkout_time: '11:00',
      is_active: true
    });
    setIsLodgingDialogOpen(true);
  };

  const openEditLodgingDialog = (lodging: Lodging) => {
    setEditingLodging(lodging);
    setLodgingForm({
      name: lodging.name,
      type: lodging.type,
      city: lodging.city,
      address: lodging.address || '',
      description: lodging.description || '',
      phone: lodging.phone || '',
      email: lodging.email || '',
      checkin_time: lodging.checkin_time || '15:00',
      checkout_time: lodging.checkout_time || '11:00',
      is_active: lodging.is_active
    });
    setIsLodgingDialogOpen(true);
  };

  const handleSaveLodging = async () => {
    if (!lodgingForm.name.trim()) {
      toast.error('숙소 이름을 입력해주세요.');
      return;
    }

    try {
      if (editingLodging) {
        // 수정
        await db.execute(`
          UPDATE lodgings SET
            name = ?, type = ?, city = ?, address = ?,
            description = ?, phone = ?, email = ?,
            checkin_time = ?, checkout_time = ?, is_active = ?,
            updated_at = NOW()
          WHERE id = ? AND vendor_id = ?
        `, [
          lodgingForm.name, lodgingForm.type, lodgingForm.city, lodgingForm.address,
          lodgingForm.description, lodgingForm.phone, lodgingForm.email,
          lodgingForm.checkin_time, lodgingForm.checkout_time, lodgingForm.is_active,
          editingLodging.id, vendorInfo?.id
        ]);
        toast.success('숙소 정보가 수정되었습니다.');
      } else {
        // 추가
        await db.execute(`
          INSERT INTO lodgings (
            vendor_id, name, type, city, address, description,
            phone, email, checkin_time, checkout_time, is_active,
            timezone, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Asia/Seoul', NOW(), NOW())
        `, [
          vendorInfo?.id, lodgingForm.name, lodgingForm.type, lodgingForm.city,
          lodgingForm.address, lodgingForm.description, lodgingForm.phone,
          lodgingForm.email, lodgingForm.checkin_time, lodgingForm.checkout_time,
          lodgingForm.is_active
        ]);
        toast.success('숙소가 등록되었습니다.');
      }

      setIsLodgingDialogOpen(false);
      loadVendorData();
    } catch (error) {
      console.error('숙소 저장 실패:', error);
      toast.error('숙소 저장에 실패했습니다.');
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

  // CSV 파일 선택
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const data = rows.slice(1).filter(row => row.length > 1).map(row => {
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header.trim()] = row[i]?.trim() || '';
        });
        return obj;
      });
      setCsvPreview(data);
    };
    reader.readAsText(file);
  };

  // CSV 템플릿 다운로드
  const downloadCsvTemplate = () => {
    const template = `name,type,city,address,description,phone,email,checkin_time,checkout_time,room_name,room_type,base_price,max_occupancy,bed_type,room_size_sqm,amenities,images
신안 그랜드 호텔,hotel,신안군,전라남도 신안군 압해읍 중앙로 123,신안의 중심에 위치한 프리미엄 비즈니스 호텔,061-240-1000,info@sinangrand.com,15:00,11:00,디럭스 더블룸,deluxe,120000,2,더블,32,WiFi|에어컨|냉장고|TV|금고|미니바,https://example.com/hotel1.jpg
바다뷰 펜션,pension,신안군,전라남도 신안군 증도면 해안로 456,증도 앞바다가 한눈에 보이는 오션뷰 펜션,061-275-2000,contact@oceanview.com,14:00,11:00,오션뷰 스탠다드,standard,80000,2,더블,28,WiFi|에어컨|냉장고|TV|발코니,https://example.com/pension1.jpg`;

    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lodging_template.csv';
    link.click();
    toast.success('CSV 템플릿이 다운로드되었습니다.');
  };

  // CSV 업로드 실행
  const handleCsvUpload = async () => {
    if (!vendorInfo?.id) return;
    if (csvPreview.length === 0) {
      toast.error('업로드할 데이터가 없습니다.');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      const lodgingMap = new Map<string, number>(); // 숙소명 -> lodging_id

      for (const row of csvPreview) {
        try {
          // 1. 숙소가 이미 있는지 확인 (같은 이름)
          let lodgingId = lodgingMap.get(row.name);

          if (!lodgingId) {
            // 기존 숙소 확인
            const existing = await db.query(`
              SELECT id FROM lodgings WHERE vendor_id = ? AND name = ? LIMIT 1
            `, [vendorInfo.id, row.name]);

            if (existing.length > 0) {
              lodgingId = existing[0].id;
            } else {
              // 새 숙소 생성
              const lodgingResult = await db.execute(`
                INSERT INTO lodgings (
                  vendor_id, name, type, city, address, description,
                  phone, email, checkin_time, checkout_time, is_active,
                  timezone, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Asia/Seoul', NOW(), NOW())
              `, [
                vendorInfo.id,
                row.name,
                row.type || 'hotel',
                row.city || '신안군',
                row.address || '',
                row.description || '',
                row.phone || '',
                row.email || '',
                row.checkin_time || '15:00',
                row.checkout_time || '11:00'
              ]);
              lodgingId = lodgingResult.insertId!;
            }

            lodgingMap.set(row.name, lodgingId);
          }

          // 2. 객실 생성
          await db.execute(`
            INSERT INTO rooms (
              lodging_id, name, room_type, base_price, max_occupancy,
              bed_type, room_size_sqm, amenities, images,
              is_available, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
          `, [
            lodgingId,
            row.room_name || '객실',
            row.room_type || 'standard',
            parseFloat(row.base_price) || 50000,
            parseInt(row.max_occupancy) || 2,
            row.bed_type || '더블',
            parseFloat(row.room_size_sqm) || 20,
            row.amenities || '',
            row.images || ''
          ]);

          successCount++;
        } catch (error) {
          console.error('Row upload error:', error);
          errorCount++;
        }
      }

      toast.success(`업로드 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);
      setIsCsvDialogOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      loadVendorData();
    } catch (error) {
      console.error('CSV 업로드 실패:', error);
      toast.error('CSV 업로드 중 오류가 발생했습니다.');
    }
  };

  // PMS 연동 및 동기화
  const handlePmsConnect = async () => {
    if (!pmsConfig.provider || !pmsConfig.api_key) {
      toast.error('PMS 제공자와 API 키를 입력해주세요.');
      return;
    }

    if (!pmsConfig.property_id) {
      toast.error('Property ID를 입력해주세요.');
      return;
    }

    try {
      toast.info('PMS 연동을 시작합니다...');

      // 1. 벤더 정보에 PMS 설정 저장
      await db.execute(`
        UPDATE rentcar_vendors
        SET pms_provider = ?, pms_api_key = ?, pms_property_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [pmsConfig.provider, pmsConfig.api_key, pmsConfig.property_id, vendorInfo?.id]);

      // 2. PMS Integration Manager 생성
      const pmsManager = new PMSIntegrationManager({
        provider: pmsConfig.provider,
        api_key: pmsConfig.api_key,
        api_secret: pmsConfig.api_secret,
        property_id: pmsConfig.property_id
      });

      // 3. PMS에서 데이터 가져와서 동기화
      toast.info('PMS에서 데이터를 가져오는 중...');
      const result = await pmsManager.syncLodgingData(vendorInfo!.id);

      if (result.success) {
        toast.success(`✅ ${result.message}`);
        setIsPmsDialogOpen(false);

        // 데이터 새로고침
        setTimeout(() => {
          loadVendorData();
        }, 1000);
      } else {
        toast.error(`❌ ${result.message}`);
        if (result.errors && result.errors.length > 0) {
          console.error('PMS 동기화 오류:', result.errors);
        }
      }
    } catch (error: any) {
      console.error('PMS 연동 실패:', error);
      toast.error(`PMS 연동에 실패했습니다: ${error.message}`);
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
                총 예약
              </CardTitle>
              <DollarSign className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{bookings.length}건</div>
              <p className="text-xs text-gray-500 mt-1">
                CONFIRMED: {bookings.filter(b => b.status === 'CONFIRMED').length}건
              </p>
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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsPmsDialogOpen(true)}>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    PMS 연동
                  </Button>
                  <Button variant="outline" onClick={() => setIsCsvDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    CSV 업로드
                  </Button>
                  <Button onClick={openAddLodgingDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    숙소 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {lodgings.length === 0 ? (
                  <div className="text-center py-12">
                    <Hotel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">등록된 숙소가 없습니다.</p>
                    <Button onClick={openAddLodgingDialog}>
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
                                onClick={() => openEditLodgingDialog(lodging)}
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
                <CardDescription>등록된 예약 {bookings.length}건</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">아직 예약이 없습니다.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>예약번호</TableHead>
                        <TableHead>숙소/객실</TableHead>
                        <TableHead>투숙객</TableHead>
                        <TableHead>체크인/아웃</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>결제</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-sm">
                            #{booking.id}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{booking.lodging_name}</div>
                            <div className="text-sm text-gray-500">{booking.room_name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{booking.guest_name}</div>
                            <div className="text-sm text-gray-500">{booking.guest_phone}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(booking.checkin_date).toLocaleDateString('ko-KR')}
                            </div>
                            <div className="text-sm text-gray-500">
                              ~ {new Date(booking.checkout_date).toLocaleDateString('ko-KR')}
                            </div>
                            <div className="text-xs text-gray-400">{booking.nights}박</div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {booking.total_price.toLocaleString()}원
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                booking.status === 'CONFIRMED' ? 'default' :
                                booking.status === 'HOLD' ? 'secondary' :
                                booking.status === 'CANCELLED' ? 'destructive' :
                                'outline'
                              }
                            >
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                booking.payment_status === 'captured' ? 'default' :
                                booking.payment_status === 'pending' ? 'secondary' :
                                'outline'
                              }
                            >
                              {booking.payment_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 숙소 추가/수정 Dialog */}
        <Dialog open={isLodgingDialogOpen} onOpenChange={setIsLodgingDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLodging ? '숙소 정보 수정' : '새 숙소 등록'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">숙소명 *</Label>
                  <Input
                    id="name"
                    value={lodgingForm.name}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, name: e.target.value })}
                    placeholder="예: 신안 오션뷰 펜션"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">숙소 유형</Label>
                  <Select
                    value={lodgingForm.type}
                    onValueChange={(value) => setLodgingForm({ ...lodgingForm, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotel">호텔</SelectItem>
                      <SelectItem value="motel">모텔</SelectItem>
                      <SelectItem value="pension">펜션</SelectItem>
                      <SelectItem value="guesthouse">게스트하우스</SelectItem>
                      <SelectItem value="resort">리조트</SelectItem>
                      <SelectItem value="camping">캠핑장</SelectItem>
                      <SelectItem value="hostel">호스텔</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">도시</Label>
                  <Input
                    id="city"
                    value={lodgingForm.city}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, city: e.target.value })}
                    placeholder="신안군"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    value={lodgingForm.phone}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, phone: e.target.value })}
                    placeholder="061-123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  value={lodgingForm.address}
                  onChange={(e) => setLodgingForm({ ...lodgingForm, address: e.target.value })}
                  placeholder="전라남도 신안군..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={lodgingForm.email}
                  onChange={(e) => setLodgingForm({ ...lodgingForm, email: e.target.value })}
                  placeholder="info@lodging.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">소개</Label>
                <Textarea
                  id="description"
                  value={lodgingForm.description}
                  onChange={(e) => setLodgingForm({ ...lodgingForm, description: e.target.value })}
                  placeholder="숙소에 대한 간단한 소개를 입력하세요..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkin_time">체크인 시간</Label>
                  <Input
                    id="checkin_time"
                    type="time"
                    value={lodgingForm.checkin_time}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, checkin_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout_time">체크아웃 시간</Label>
                  <Input
                    id="checkout_time"
                    type="time"
                    value={lodgingForm.checkout_time}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, checkout_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={lodgingForm.is_active}
                  onChange={(e) => setLodgingForm({ ...lodgingForm, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active">운영 중</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsLodgingDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveLodging}>
                {editingLodging ? '수정' : '등록'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* CSV 업로드 Dialog */}
        <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>CSV 파일로 숙소/객실 대량 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadCsvTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  템플릿 다운로드
                </Button>
                <div>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="max-w-xs"
                  />
                </div>
              </div>

              {csvPreview.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">미리보기 ({csvPreview.length}개 행)</h4>
                  <div className="max-h-96 overflow-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>숙소명</TableHead>
                          <TableHead>유형</TableHead>
                          <TableHead>객실명</TableHead>
                          <TableHead>가격</TableHead>
                          <TableHead>인원</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreview.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.type}</TableCell>
                            <TableCell>{row.room_name}</TableCell>
                            <TableCell>{parseInt(row.base_price).toLocaleString()}원</TableCell>
                            <TableCell>{row.max_occupancy}명</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {csvPreview.length > 10 && (
                      <p className="text-sm text-gray-500 p-2">
                        ... 외 {csvPreview.length - 10}개 행
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsCsvDialogOpen(false);
                setCsvFile(null);
                setCsvPreview([]);
              }}>
                취소
              </Button>
              <Button onClick={handleCsvUpload} disabled={csvPreview.length === 0}>
                <Upload className="w-4 h-4 mr-2" />
                업로드 ({csvPreview.length}개)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* PMS 연동 Dialog */}
        <Dialog open={isPmsDialogOpen} onOpenChange={setIsPmsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>PMS (Property Management System) 연동</DialogTitle>
              <CardDescription>
                기존 PMS 시스템의 API 키를 등록하면 자동으로 숙소/객실 정보를 가져옵니다.
              </CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pms_provider">PMS 제공자</Label>
                <Select
                  value={pmsConfig.provider}
                  onValueChange={(value) => setPmsConfig({ ...pmsConfig, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="PMS 시스템 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eZee">eZee Absolute</SelectItem>
                    <SelectItem value="Opera">Oracle Opera</SelectItem>
                    <SelectItem value="Cloudbeds">Cloudbeds</SelectItem>
                    <SelectItem value="Mews">Mews Systems</SelectItem>
                    <SelectItem value="RMS">RMS Cloud</SelectItem>
                    <SelectItem value="SiteMinder">SiteMinder</SelectItem>
                    <SelectItem value="Amadeus">Amadeus Hospitality</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={pmsConfig.api_key}
                  onChange={(e) => setPmsConfig({ ...pmsConfig, api_key: e.target.value })}
                  placeholder="PMS에서 발급받은 API 키를 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_secret">API Secret (선택)</Label>
                <Input
                  id="api_secret"
                  type="password"
                  value={pmsConfig.api_secret}
                  onChange={(e) => setPmsConfig({ ...pmsConfig, api_secret: e.target.value })}
                  placeholder="API Secret이 있는 경우 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_id">Property ID</Label>
                <Input
                  id="property_id"
                  value={pmsConfig.property_id}
                  onChange={(e) => setPmsConfig({ ...pmsConfig, property_id: e.target.value })}
                  placeholder="PMS에서 부여한 Property ID"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="font-medium text-blue-900 mb-2">🔒 지원되는 PMS 시스템</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• eZee Absolute - 전 세계 5,000+ 호텔 사용</li>
                  <li>• Oracle Opera - 글로벌 체인 호텔 표준</li>
                  <li>• Cloudbeds - 클라우드 기반 올인원 솔루션</li>
                  <li>• Mews Systems - 유럽 최대 PMS</li>
                  <li>• RMS Cloud - 아시아/태평양 지역 선호</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2">
                  * 현재는 설정만 저장되며, 실제 API 연동은 개발 중입니다. CSV 업로드를 이용해주세요.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPmsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handlePmsConnect}>
                <LinkIcon className="w-4 h-4 mr-2" />
                연동 설정 저장
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default VendorLodgingDashboard;

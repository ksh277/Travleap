import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Building2,
  Bed,
  Star,
  Check,
  X,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

export const AccommodationManagement: React.FC = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('partners');
  const [showAddPartnerDialog, setShowAddPartnerDialog] = useState(false);
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false);

  // CSV 관련 state
  const [isVendorCsvUploadOpen, setIsVendorCsvUploadOpen] = useState(false);
  const [isRoomCsvUploadOpen, setIsRoomCsvUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  // 페이지네이션 state
  const [vendorCurrentPage, setVendorCurrentPage] = useState(1);
  const [vendorItemsPerPage] = useState(10);
  const [roomCurrentPage, setRoomCurrentPage] = useState(1);
  const [roomItemsPerPage] = useState(10);

  // 이미지 업로드 state
  const [logoImageFile, setLogoImageFile] = useState<File | null>(null);
  const [logoImagePreview, setLogoImagePreview] = useState<string>('');
  const [roomImageFiles, setRoomImageFiles] = useState<File[]>([]);
  const [roomImagePreviews, setRoomImagePreviews] = useState<string[]>([]);

  const [newPartnerForm, setNewPartnerForm] = useState({
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    tier: 'basic',
    logo_url: ''
  });
  const [newRoomForm, setNewRoomForm] = useState({
    listing_name: '',
    description: '',
    location: '',
    address: '',
    price_from: '',
    images: ''
  });

  // Load data
  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      // 숙박 벤더 전용 API 사용
      const response = await fetch('/api/admin/accommodation-vendors');
      const result = await response.json();
      if (result.success && result.data) {
        console.log(`✅ 숙박 업체 ${result.data.length}개 로드됨`);
        setPartners(result.data);
      } else {
        toast.error('업체 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to load partners:', error);
      toast.error('업체 목록을 불러올 수 없습니다.');
    }
  };

  const loadRooms = async (partnerId: number) => {
    try {
      const response = await fetch(`/api/accommodations/${partnerId}`);
      const result = await response.json();
      if (result.success && result.data?.rooms) {
        setRooms(result.data.rooms);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
      toast.error('객실 목록을 불러올 수 없습니다.');
    }
  };

  const deletePartner = async (partnerId: number, businessName: string) => {
    if (!confirm(`정말로 "${businessName}" 업체를 삭제하시겠습니까?\n\n관련된 모든 객실 데이터도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/accommodation-vendors/${partnerId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('업체가 삭제되었습니다.');
        loadPartners(); // 목록 새로고침
        if (selectedPartnerId === partnerId) {
          setSelectedPartnerId(null);
          setRooms([]);
        }
      } else {
        toast.error(result.error || '업체 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete partner:', error);
      toast.error('업체 삭제 중 오류가 발생했습니다.');
    }
  };

  const deleteRoom = async (roomId: number, roomName: string) => {
    if (!confirm(`정말로 "${roomName}" 객실을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('객실이 삭제되었습니다.');
        if (selectedPartnerId) {
          loadRooms(selectedPartnerId); // 객실 목록 새로고침
        }
      } else {
        toast.error(result.error || '객실 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
      toast.error('객실 삭제 중 오류가 발생했습니다.');
    }
  };

  // 벤더 로고 이미지 업로드
  const handleLogoImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    setLogoImageFile(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoImagePreview(base64);
      setNewPartnerForm({ ...newPartnerForm, logo_url: base64 });
    };
    reader.readAsDataURL(file);
  };

  // 객실 이미지 업로드 (다중)
  const handleRoomImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 파일 타입 검증
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('각 이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    setRoomImageFiles(files);

    // 미리보기 생성
    const previews: string[] = [];
    let loadedCount = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        loadedCount++;

        if (loadedCount === files.length) {
          setRoomImagePreviews(previews);
          setNewRoomForm({ ...newRoomForm, images: JSON.stringify(previews) });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const addPartner = async () => {
    try {
      const response = await fetch('/api/admin/accommodation-vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPartnerForm)
      });
      const result = await response.json();

      if (result.success) {
        toast.success('업체가 추가되었습니다.');
        setShowAddPartnerDialog(false);
        setNewPartnerForm({
          business_name: '',
          contact_name: '',
          phone: '',
          email: '',
          tier: 'basic',
          logo_url: ''
        });
        setLogoImageFile(null);
        setLogoImagePreview('');
        loadPartners();
      } else {
        toast.error(result.message || '업체 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to add partner:', error);
      toast.error('업체 추가 중 오류가 발생했습니다.');
    }
  };

  const addRoom = async () => {
    if (!selectedPartnerId) {
      toast.error('업체를 먼저 선택해주세요.');
      return;
    }

    try {
      const roomData = {
        ...newRoomForm,
        price_from: parseFloat(newRoomForm.price_from),
        images: newRoomForm.images ? JSON.parse(newRoomForm.images) : []
      };

      const response = await fetch(`/api/admin/lodging/vendors/${selectedPartnerId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      });
      const result = await response.json();

      if (result.success) {
        toast.success('객실이 추가되었습니다.');
        setShowAddRoomDialog(false);
        setNewRoomForm({
          listing_name: '',
          description: '',
          location: '',
          address: '',
          price_from: '',
          images: ''
        });
        loadRooms(selectedPartnerId);
      } else {
        toast.error(result.message || '객실 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to add room:', error);
      toast.error('객실 추가 중 오류가 발생했습니다.');
    }
  };

  // CSV 파일 처리
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('CSV 파일만 업로드 가능합니다.');
      return;
    }

    setCsvFile(file);

    // CSV 미리보기
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj: any, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {});
      });
      setCsvPreview(preview);
    };
    reader.readAsText(file);
  };

  // 벤더 CSV 업로드
  const handleVendorCsvUpload = async () => {
    if (!csvFile) {
      toast.error('CSV 파일을 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const response = await fetch('/api/admin/accommodation-vendors/csv-upload', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (result.success) {
        toast.success(`${result.count || 0}개 벤더가 추가되었습니다.`);
        setIsVendorCsvUploadOpen(false);
        setCsvFile(null);
        setCsvPreview([]);
        loadPartners();
      } else {
        toast.error(result.error || 'CSV 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('CSV upload failed:', error);
      toast.error('CSV 업로드 중 오류가 발생했습니다.');
    }
  };

  // CSV 템플릿 다운로드
  const downloadVendorCsvTemplate = () => {
    const csvContent = `business_name,brand_name,business_number,contact_name,contact_email,contact_phone,description,status
신안호텔,신안호텔,123-45-67890,홍길동,hotel@example.com,010-1234-5678,편안한 숙박 시설,active
섬펜션,섬펜션,234-56-78901,김철수,pension@example.com,010-2345-6789,바다 전망 펜션,active`;

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'accommodation_vendors_template.csv';
    link.click();
  };

  useEffect(() => {
    if (selectedPartnerId) {
      loadRooms(selectedPartnerId);
      setActiveTab('rooms'); // Auto-switch to rooms tab
    }
  }, [selectedPartnerId]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid grid-cols-3 w-full max-w-2xl">
        <TabsTrigger value="partners">업체 관리</TabsTrigger>
        <TabsTrigger value="rooms">객실 관리</TabsTrigger>
        <TabsTrigger value="bookings">예약 관리</TabsTrigger>
      </TabsList>

      {/* 업체 관리 */}
      <TabsContent value="partners" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>숙박 업체 관리</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadVendorCsvTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV 템플릿
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsVendorCsvUploadOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  CSV 업로드
                </Button>
                <Button
                  className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                  onClick={() => setShowAddPartnerDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  업체 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="업체명 검색..."
                  className="pl-10"
                  value={partnerSearchQuery}
                  onChange={(e) => setPartnerSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>업체 ID</TableHead>
                    <TableHead>업체명</TableHead>
                    <TableHead>객실 수</TableHead>
                    <TableHead>최저가</TableHead>
                    <TableHead>평점</TableHead>
                    <TableHead>리뷰 수</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filtered = partners.filter(p => p.business_name?.toLowerCase().includes(partnerSearchQuery.toLowerCase()));
                    const startIndex = (vendorCurrentPage - 1) * vendorItemsPerPage;
                    const paginatedPartners = filtered.slice(startIndex, startIndex + vendorItemsPerPage);
                    return paginatedPartners.map((partner) => (
                      <TableRow key={partner.partner_id}>
                        <TableCell className="font-medium">{partner.partner_id}</TableCell>
                        <TableCell>{partner.business_name}</TableCell>
                        <TableCell>{partner.room_count}</TableCell>
                        <TableCell>₩{partner.min_price?.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            {partner.avg_rating || '0.0'}
                          </div>
                        </TableCell>
                        <TableCell>{partner.total_reviews || 0}</TableCell>
                        <TableCell>
                          <Badge className={partner.is_verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {partner.is_verified ? '승인' : '대기'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPartnerId(partner.partner_id)}
                              title="객실 보기"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" title="업체 수정">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deletePartner(partner.partner_id, partner.business_name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="업체 삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            {(() => {
              const filtered = partners.filter(p => p.business_name?.toLowerCase().includes(partnerSearchQuery.toLowerCase()));
              const totalPages = Math.ceil(filtered.length / vendorItemsPerPage);

              if (totalPages > 1) {
                return (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      총 {filtered.length}개 벤더 (페이지 {vendorCurrentPage} / {totalPages})
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setVendorCurrentPage(prev => Math.max(1, prev - 1))} disabled={vendorCurrentPage === 1}>이전</Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = totalPages <= 5 ? i + 1 : vendorCurrentPage <= 3 ? i + 1 : vendorCurrentPage >= totalPages - 2 ? totalPages - 4 + i : vendorCurrentPage - 2 + i;
                        return <Button key={pageNum} variant={vendorCurrentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setVendorCurrentPage(pageNum)} className={vendorCurrentPage === pageNum ? "bg-[#8B5FBF] hover:bg-[#7A4FB5]" : ""}>{pageNum}</Button>;
                      })}
                      <Button variant="outline" size="sm" onClick={() => setVendorCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={vendorCurrentPage === totalPages}>다음</Button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 객실 관리 */}
      <TabsContent value="rooms" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>객실 관리</CardTitle>
              <div className="flex gap-2">
                <Select
                  value={selectedPartnerId?.toString() || 'none'}
                  onValueChange={(value) => setSelectedPartnerId(value === 'none' ? null : parseInt(value))}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="업체 선택 (필수)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">업체 선택 (필수)</SelectItem>
                    {partners.map((partner) => (
                      <SelectItem key={partner.partner_id} value={partner.partner_id.toString()}>
                        {partner.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                  disabled={!selectedPartnerId}
                  onClick={() => setShowAddRoomDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  객실 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPartnerId ? (
              <div className="text-center py-12 text-gray-500">
                <Bed className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>업체를 선택하면 객실 목록이 표시됩니다.</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="객실명 검색..."
                      className="pl-10"
                      value={roomSearchQuery}
                      onChange={(e) => setRoomSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>객실 ID</TableHead>
                        <TableHead>객실명</TableHead>
                        <TableHead>타입</TableHead>
                        <TableHead>최대 인원</TableHead>
                        <TableHead>기본 가격</TableHead>
                        <TableHead>조식 포함</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const filtered = rooms.filter(r => r.name?.toLowerCase().includes(roomSearchQuery.toLowerCase()));
                        const startIndex = (roomCurrentPage - 1) * roomItemsPerPage;
                        const paginatedRooms = filtered.slice(startIndex, startIndex + roomItemsPerPage);
                        return paginatedRooms.map((room) => (
                          <TableRow key={room.id}>
                            <TableCell className="font-medium">{room.id}</TableCell>
                            <TableCell>{room.name}</TableCell>
                            <TableCell>{room.room_type}</TableCell>
                            <TableCell>{room.capacity}명</TableCell>
                            <TableCell>₩{room.base_price_per_night?.toLocaleString()}</TableCell>
                            <TableCell>
                              {room.breakfast_included ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-gray-300" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={room.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {room.is_available ? '사용 가능' : '사용 불가'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="객실 수정"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteRoom(room.id, room.name)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="객실 삭제"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                {(() => {
                  const filtered = rooms.filter(r => r.name?.toLowerCase().includes(roomSearchQuery.toLowerCase()));
                  const totalPages = Math.ceil(filtered.length / roomItemsPerPage);

                  if (totalPages > 1) {
                    return (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                          총 {filtered.length}개 객실 (페이지 {roomCurrentPage} / {totalPages})
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setRoomCurrentPage(prev => Math.max(1, prev - 1))} disabled={roomCurrentPage === 1}>이전</Button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = totalPages <= 5 ? i + 1 : roomCurrentPage <= 3 ? i + 1 : roomCurrentPage >= totalPages - 2 ? totalPages - 4 + i : roomCurrentPage - 2 + i;
                            return <Button key={pageNum} variant={roomCurrentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setRoomCurrentPage(pageNum)} className={roomCurrentPage === pageNum ? "bg-[#8B5FBF] hover:bg-[#7A4FB5]" : ""}>{pageNum}</Button>;
                          })}
                          <Button variant="outline" size="sm" onClick={() => setRoomCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={roomCurrentPage === totalPages}>다음</Button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 예약 관리 */}
      <TabsContent value="bookings" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>숙박 예약 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <p>숙박 예약 관리 기능이 곧 추가됩니다.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 업체 추가 다이얼로그 */}
      <Dialog open={showAddPartnerDialog} onOpenChange={setShowAddPartnerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 숙박 업체 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>업체명 *</Label>
                <Input
                  value={newPartnerForm.business_name}
                  onChange={(e) => setNewPartnerForm({...newPartnerForm, business_name: e.target.value})}
                  placeholder="예: 신안 바다뷰 펜션"
                />
              </div>
              <div>
                <Label>담당자명 *</Label>
                <Input
                  value={newPartnerForm.contact_name}
                  onChange={(e) => setNewPartnerForm({...newPartnerForm, contact_name: e.target.value})}
                  placeholder="예: 홍길동"
                />
              </div>
              <div>
                <Label>전화번호 *</Label>
                <Input
                  value={newPartnerForm.phone}
                  onChange={(e) => setNewPartnerForm({...newPartnerForm, phone: e.target.value})}
                  placeholder="예: 010-1234-5678"
                />
              </div>
              <div>
                <Label>이메일 *</Label>
                <Input
                  type="email"
                  value={newPartnerForm.email}
                  onChange={(e) => setNewPartnerForm({...newPartnerForm, email: e.target.value})}
                  placeholder="예: partner@example.com"
                />
              </div>
              <div>
                <Label>등급</Label>
                <Select value={newPartnerForm.tier} onValueChange={(value) => setNewPartnerForm({...newPartnerForm, tier: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddPartnerDialog(false)}>
                취소
              </Button>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={addPartner}
                disabled={!newPartnerForm.business_name || !newPartnerForm.contact_name || !newPartnerForm.phone || !newPartnerForm.email}
              >
                추가
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 객실 추가 다이얼로그 */}
      <Dialog open={showAddRoomDialog} onOpenChange={setShowAddRoomDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 객실 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>객실명 *</Label>
                <Input
                  value={newRoomForm.listing_name}
                  onChange={(e) => setNewRoomForm({...newRoomForm, listing_name: e.target.value})}
                  placeholder="예: 오션뷰 스위트"
                />
              </div>
              <div>
                <Label>지역 *</Label>
                <Input
                  value={newRoomForm.location}
                  onChange={(e) => setNewRoomForm({...newRoomForm, location: e.target.value})}
                  placeholder="예: 신안군"
                />
              </div>
              <div className="col-span-2">
                <Label>주소 *</Label>
                <Input
                  value={newRoomForm.address}
                  onChange={(e) => setNewRoomForm({...newRoomForm, address: e.target.value})}
                  placeholder="예: 전라남도 신안군 증도면 해안로 123"
                />
              </div>
              <div className="col-span-2">
                <Label>설명</Label>
                <Textarea
                  value={newRoomForm.description}
                  onChange={(e) => setNewRoomForm({...newRoomForm, description: e.target.value})}
                  placeholder="객실 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div>
                <Label>가격 (원) *</Label>
                <Input
                  type="number"
                  value={newRoomForm.price_from}
                  onChange={(e) => setNewRoomForm({...newRoomForm, price_from: e.target.value})}
                  placeholder="예: 150000"
                />
              </div>
              <div className="col-span-2">
                <Label>이미지 URL (JSON 배열)</Label>
                <Input
                  value={newRoomForm.images}
                  onChange={(e) => setNewRoomForm({...newRoomForm, images: e.target.value})}
                  placeholder='예: ["https://example.com/image.jpg"]'
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddRoomDialog(false)}>
                취소
              </Button>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={addRoom}
                disabled={!newRoomForm.listing_name || !newRoomForm.location || !newRoomForm.address || !newRoomForm.price_from}
              >
                추가
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV 업로드 다이얼로그 */}
      <Dialog open={isVendorCsvUploadOpen} onOpenChange={setIsVendorCsvUploadOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>벤더 CSV 일괄 업로드</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>CSV 파일 선택</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-2">
                CSV 템플릿을 다운로드하여 양식에 맞게 작성 후 업로드하세요.
              </p>
            </div>

            {csvPreview.length > 0 && (
              <div>
                <Label>미리보기 (최대 5개)</Label>
                <div className="mt-2 border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(csvPreview[0]).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value: any, i) => (
                            <TableCell key={i}>{value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsVendorCsvUploadOpen(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                }}
              >
                취소
              </Button>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={handleVendorCsvUpload}
                disabled={!csvFile}
              >
                <Upload className="h-4 w-4 mr-2" />
                업로드
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

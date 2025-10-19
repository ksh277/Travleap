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
  X
} from 'lucide-react';
import { toast } from 'sonner';

export const AccommodationManagement: React.FC = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('partners');

  // Load data
  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const response = await fetch('/api/accommodations');
      const result = await response.json();
      if (result.success && result.data) {
        setPartners(result.data);
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
              <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">
                <Plus className="h-4 w-4 mr-2" />
                업체 추가
              </Button>
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
                  {partners
                    .filter(p => p.business_name?.toLowerCase().includes(partnerSearchQuery.toLowerCase()))
                    .map((partner) => (
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
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
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
                      {rooms
                        .filter(r => r.name?.toLowerCase().includes(roomSearchQuery.toLowerCase()))
                        .map((room) => (
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
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
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
    </Tabs>
  );
};

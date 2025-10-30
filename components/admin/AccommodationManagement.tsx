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
import type {
  AccommodationVendor,
  AccommodationRoom,
  AccommodationBooking,
  AccommodationVendorFormData,
  AccommodationRoomFormData
} from '../../types/accommodation';

export const AccommodationManagement: React.FC = () => {
  const [partners, setPartners] = useState<AccommodationVendor[]>([]);
  const [rooms, setRooms] = useState<AccommodationRoom[]>([]);
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

  // 예약 관리 state
  const [bookings, setBookings] = useState<AccommodationBooking[]>([]);
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingCurrentPage, setBookingCurrentPage] = useState(1);
  const [bookingItemsPerPage] = useState(10);

  const [selectedVendor, setSelectedVendor] = useState<AccommodationVendor | null>(null);
  const [newPartnerForm, setNewPartnerForm] = useState<Omit<AccommodationVendorFormData, 'tier'> & { password?: string }>({
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    password: '',
    logo_url: '',
    pms_provider: '',
    pms_api_key: '',
    pms_property_id: ''
  });
  const [selectedRoom, setSelectedRoom] = useState<AccommodationRoom | null>(null);
  const [newRoomForm, setNewRoomForm] = useState<AccommodationRoomFormData>({
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
    loadBookings();
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
      // 관리자는 is_published 필터 없이 모든 객실을 볼 수 있어야 함
      console.log(`📥 객실 목록 로드 중... (vendor_id: ${partnerId})`);
      const response = await fetch(`/api/admin/accommodation-rooms?vendor_id=${partnerId}`);
      const result = await response.json();

      console.log(`✅ 객실 목록 로드 완료:`, {
        success: result.success,
        count: result.data?.length || 0,
        rooms: result.data
      });

      if (result.success && result.data) {
        // API 응답 형식 매핑
        const mappedRooms = result.data.map((room: any) => {
          // images 파싱 (DB에서 JSON 문자열로 저장됨)
          let imagesArray: string[] = [];
          try {
            if (room.images) {
              imagesArray = typeof room.images === 'string'
                ? JSON.parse(room.images)
                : room.images;
            }
          } catch (e) {
            console.warn('Failed to parse images for room:', room.id);
          }

          return {
            id: room.id,
            name: room.room_name || room.title,
            listing_name: room.room_name || room.title,
            description: room.description,
            location: room.location || '',
            address: room.address || '',
            price_from: room.price_from || 0,
            base_price_per_night: room.base_price_per_night || room.price_from || 0,
            images: imagesArray,
            is_available: room.is_available
          };
        });

        console.log(`📋 매핑된 객실 데이터:`, mappedRooms);
        setRooms(mappedRooms);
      }
    } catch (error) {
      console.error('❌ 객실 목록 로드 실패:', error);
      toast.error('객실 목록을 불러올 수 없습니다.');
    }
  };

  const loadBookings = async () => {
    try {
      const response = await fetch('/api/admin/accommodation-bookings');
      const result = await response.json();
      if (result.success && result.data) {
        console.log(`✅ 예약 ${result.data.length}개 로드됨`);
        setBookings(result.data);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
      // 에러는 조용히 처리 (예약 기능이 아직 없을 수 있음)
    }
  };

  const handleUpdateBookingStatus = async (bookingId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/accommodation-bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();

      if (result.success) {
        toast.success('예약 상태가 변경되었습니다.');
        loadBookings();
      } else {
        toast.error(result.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update booking status:', error);
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateVendorStatus = async (vendorId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/accommodation-vendors/${vendorId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();

      if (result.success) {
        toast.success('업체 상태가 변경되었습니다.');
        loadPartners();
      } else {
        toast.error(result.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update vendor status:', error);
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleToggleRoomActive = async (roomId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/rooms/${roomId}/toggle-active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const result = await response.json();

      if (result.success) {
        toast.success(currentStatus ? '객실이 비활성화되었습니다.' : '객실이 활성화되었습니다.');
        if (selectedPartnerId) {
          loadRooms(selectedPartnerId);
        }
      } else {
        toast.error(result.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to toggle room status:', error);
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handlePmsSync = async (vendorId: number, vendorName: string) => {
    const confirmMessage = `"${vendorName}" 업체의 PMS에서 객실 데이터를 동기화하시겠습니까?\n\n이 작업은 업체의 PMS 서버에서 객실 목록과 예약 정보를 가져와 자동으로 등록/업데이트합니다.`;

    if (!confirm(confirmMessage)) return;

    const loadingToast = toast.loading('PMS에서 데이터를 가져오는 중...');

    try {
      const response = await fetch(`/api/admin/accommodation/sync/${vendorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(data.message || 'PMS 동기화가 완료되었습니다.');
        if (data.data?.errors && data.data.errors.length > 0) {
          console.warn('일부 객실 동기화 실패:', data.data.errors);
        }
        loadPartners();
        if (selectedPartnerId) {
          loadRooms(selectedPartnerId);
        }
      } else {
        toast.error(data.message || 'PMS 동기화에 실패했습니다.');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('PMS 동기화 중 오류가 발생했습니다.');
      console.error('PMS sync error:', error);
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
  const handleLogoImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // 미리보기 생성 (로컬)
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Vercel Blob에 업로드
    try {
      toast.info('로고 이미지를 업로드하는 중...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'accommodation/logos');

      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.success && uploadResult.url) {
        setNewPartnerForm({ ...newPartnerForm, logo_url: uploadResult.url });
        toast.success('로고 이미지가 업로드되었습니다.');
      } else {
        toast.error('로고 이미지 업로드에 실패했습니다.');
        console.error('Upload error:', uploadResult.error);
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('로고 이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  // 객실 이미지 업로드 (다중)
  const handleRoomImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // 미리보기 생성 (로컬)
    const previews: string[] = [];
    let loadedCount = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        loadedCount++;

        if (loadedCount === files.length) {
          setRoomImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });

    // Vercel Blob에 업로드
    try {
      toast.info(`${files.length}개의 객실 이미지를 업로드하는 중...`);

      const imageUrls: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'accommodation/rooms');

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });

        const uploadResult = await uploadResponse.json();

        if (uploadResult.success && uploadResult.url) {
          imageUrls.push(uploadResult.url);
        } else {
          console.error('Upload error:', uploadResult.error);
        }
      }

      if (imageUrls.length > 0) {
        setNewRoomForm({ ...newRoomForm, images: JSON.stringify(imageUrls) });
        toast.success(`${imageUrls.length}개의 이미지가 업로드되었습니다.`);
      } else {
        toast.error('이미지 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('Room images upload error:', error);
      toast.error('이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  const handleOpenVendorDialog = (vendor?: any) => {
    if (vendor) {
      setSelectedVendor(vendor);
      setNewPartnerForm({
        business_name: vendor.business_name || '',
        contact_name: vendor.contact_name || '',
        phone: vendor.contact_phone || vendor.phone || '',
        email: vendor.contact_email || vendor.email || '',
        password: '',
        logo_url: vendor.logo_url || '',
        pms_provider: vendor.pms_provider || '',
        pms_api_key: vendor.pms_api_key || '',
        pms_property_id: vendor.pms_property_id || ''
      });
      setLogoImagePreview(vendor.logo_url || '');
    } else {
      setSelectedVendor(null);
      setNewPartnerForm({
        business_name: '',
        contact_name: '',
        phone: '',
        email: '',
        password: '',
        logo_url: '',
        pms_provider: '',
        pms_api_key: '',
        pms_property_id: ''
      });
      setLogoImagePreview('');
    }
    setLogoImageFile(null);
    setShowAddPartnerDialog(true);
  };

  const addPartner = async () => {
    try {
      const url = selectedVendor
        ? `/api/admin/accommodation-vendors/${selectedVendor.id || selectedVendor.partner_id}`
        : '/api/admin/accommodation-vendors';

      const method = selectedVendor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPartnerForm)
      });
      const result = await response.json();

      if (result.success) {
        toast.success(selectedVendor ? '업체가 수정되었습니다.' : '업체가 추가되었습니다.');
        setShowAddPartnerDialog(false);
        setSelectedVendor(null);
        setNewPartnerForm({
          business_name: '',
          contact_name: '',
          phone: '',
          email: '',
          password: '',
          logo_url: '',
          pms_provider: '',
          pms_api_key: '',
          pms_property_id: ''
        });
        setLogoImageFile(null);
        setLogoImagePreview('');
        loadPartners();
      } else {
        toast.error(result.message || (selectedVendor ? '업체 수정에 실패했습니다.' : '업체 추가에 실패했습니다.'));
      }
    } catch (error) {
      console.error('Failed to save partner:', error);
      toast.error('업체 저장 중 오류가 발생했습니다.');
    }
  };

  const handleOpenRoomDialog = (room?: any) => {
    if (room) {
      setSelectedRoom(room);
      setNewRoomForm({
        listing_name: room.name || room.listing_name || '',
        description: room.description || '',
        location: room.location || '',
        address: room.address || '',
        price_from: room.base_price_per_night?.toString() || room.price_from || '',
        images: room.images ? JSON.stringify(room.images) : ''
      });
      if (room.images && Array.isArray(room.images)) {
        setRoomImagePreviews(room.images);
      }
    } else {
      setSelectedRoom(null);
      setNewRoomForm({
        listing_name: '',
        description: '',
        location: '',
        address: '',
        price_from: '',
        images: ''
      });
      setRoomImagePreviews([]);
    }
    setRoomImageFiles([]);
    setShowAddRoomDialog(true);
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

      const url = selectedRoom
        ? `/api/admin/rooms/${selectedRoom.id}`
        : `/api/admin/lodging/vendors/${selectedPartnerId}/rooms`;

      const method = selectedRoom ? 'PUT' : 'POST';

      console.log(`📝 [${method}] 객실 저장 시도:`, {
        url,
        roomId: selectedRoom?.id,
        roomData
      });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      });
      const result = await response.json();

      console.log(`✅ 객실 저장 응답:`, result);

      if (result.success) {
        toast.success(selectedRoom ? '객실이 수정되었습니다.' : '객실이 추가되었습니다.');
        setShowAddRoomDialog(false);
        setSelectedRoom(null);
        setNewRoomForm({
          listing_name: '',
          description: '',
          location: '',
          address: '',
          price_from: '',
          images: ''
        });
        setRoomImageFiles([]);
        setRoomImagePreviews([]);

        console.log(`🔄 객실 목록 새로고침 중... (vendor_id: ${selectedPartnerId})`);
        await loadRooms(selectedPartnerId);
      } else {
        console.error('❌ 객실 저장 실패:', result);
        toast.error(result.message || (selectedRoom ? '객실 수정에 실패했습니다.' : '객실 추가에 실패했습니다.'));
      }
    } catch (error) {
      console.error('❌ 객실 저장 중 오류:', error);
      toast.error('객실 저장 중 오류가 발생했습니다.');
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

  // 객실 CSV 템플릿 다운로드
  const downloadRoomCsvTemplate = () => {
    const csvContent = `room_name,room_type,capacity,base_price,breakfast_included,description
디럭스 더블룸,deluxe,2,150000,true,편안한 더블 침대와 바다 전망
스탠다드 트윈룸,standard,2,120000,false,두 개의 싱글 침대`;

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'accommodation_rooms_template.csv';
    link.click();
  };

  // 객실 CSV 업로드
  const handleRoomCsvUpload = async () => {
    if (!csvFile || !selectedPartnerId) {
      toast.error('CSV 파일과 업체를 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('vendor_id', selectedPartnerId.toString());

    try {
      const response = await fetch('/api/admin/accommodation-rooms/csv-upload', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (result.success) {
        toast.success(`${result.count || 0}개 객실이 추가되었습니다.`);
        setIsRoomCsvUploadOpen(false);
        setCsvFile(null);
        setCsvPreview([]);
        loadRooms(selectedPartnerId);
      } else {
        toast.error(result.error || 'CSV 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('CSV upload failed:', error);
      toast.error('CSV 업로드 중 오류가 발생했습니다.');
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
      <TabsList className="grid grid-cols-3 w-full max-w-3xl">
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
                  onClick={() => handleOpenVendorDialog()}
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
                          <Select
                            value={partner.status || 'pending'}
                            onValueChange={(value) => handleUpdateVendorStatus(partner.id || partner.partner_id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">대기</SelectItem>
                              <SelectItem value="active">활성</SelectItem>
                              <SelectItem value="suspended">정지</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {partner.pms_provider && partner.pms_api_key && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePmsSync(partner.id || partner.partner_id, partner.business_name)}
                                title="PMS 동기화"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPartnerId(partner.partner_id)}
                              title="객실 보기"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenVendorDialog(partner)}
                              title="업체 수정"
                            >
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
                  variant="outline"
                  disabled={!selectedPartnerId}
                  onClick={() => setIsRoomCsvUploadOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  CSV 업로드
                </Button>
                <Button
                  className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                  disabled={!selectedPartnerId}
                  onClick={() => handleOpenRoomDialog()}
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleRoomActive(room.id, room.is_available || room.is_active)}
                                className={room.is_available || room.is_active ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}
                              >
                                {room.is_available || room.is_active ? '활성' : '비활성'}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenRoomDialog(room)}
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
            <div className="mb-4 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="예약자명, 업체명, 객실명 검색..."
                  className="pl-10"
                  value={bookingSearchQuery}
                  onChange={(e) => setBookingSearchQuery(e.target.value)}
                />
              </div>
              <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                  <SelectItem value="confirmed">확정</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>예약 ID</TableHead>
                    <TableHead>예약자</TableHead>
                    <TableHead>업체명</TableHead>
                    <TableHead>객실명</TableHead>
                    <TableHead>체크인</TableHead>
                    <TableHead>체크아웃</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filtered = bookings.filter(booking => {
                      const matchesSearch = !bookingSearchQuery ||
                        booking.customer_name?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                        booking.vendor_name?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                        booking.room_name?.toLowerCase().includes(bookingSearchQuery.toLowerCase());
                      const matchesStatus = bookingStatusFilter === 'all' || booking.status === bookingStatusFilter;
                      return matchesSearch && matchesStatus;
                    });

                    const startIndex = (bookingCurrentPage - 1) * bookingItemsPerPage;
                    const paginatedBookings = filtered.slice(startIndex, startIndex + bookingItemsPerPage);

                    if (paginatedBookings.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            예약 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return paginatedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">#{booking.id}</TableCell>
                        <TableCell>{booking.customer_name || '알 수 없음'}</TableCell>
                        <TableCell>{booking.vendor_name || '-'}</TableCell>
                        <TableCell>{booking.room_name || '-'}</TableCell>
                        <TableCell>{booking.check_in_date || '-'}</TableCell>
                        <TableCell>{booking.check_out_date || '-'}</TableCell>
                        <TableCell>₩{booking.total_price?.toLocaleString() || 0}</TableCell>
                        <TableCell>
                          <Select
                            value={booking.status || 'pending'}
                            onValueChange={(value) => handleUpdateBookingStatus(booking.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">대기중</SelectItem>
                              <SelectItem value="confirmed">확정</SelectItem>
                              <SelectItem value="cancelled">취소</SelectItem>
                              <SelectItem value="completed">완료</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                toast.info('예약 상세 보기 기능은 준비중입니다.');
                              }}
                              title="상세 보기"
                            >
                              <Eye className="h-4 w-4" />
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
              const filtered = bookings.filter(booking => {
                const matchesSearch = !bookingSearchQuery ||
                  booking.customer_name?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                  booking.vendor_name?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                  booking.room_name?.toLowerCase().includes(bookingSearchQuery.toLowerCase());
                const matchesStatus = bookingStatusFilter === 'all' || booking.status === bookingStatusFilter;
                return matchesSearch && matchesStatus;
              });
              const totalPages = Math.ceil(filtered.length / bookingItemsPerPage);

              if (totalPages > 1) {
                return (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      총 {filtered.length}개 예약 (페이지 {bookingCurrentPage} / {totalPages})
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setBookingCurrentPage(prev => Math.max(1, prev - 1))} disabled={bookingCurrentPage === 1}>이전</Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = totalPages <= 5 ? i + 1 : bookingCurrentPage <= 3 ? i + 1 : bookingCurrentPage >= totalPages - 2 ? totalPages - 4 + i : bookingCurrentPage - 2 + i;
                        return <Button key={pageNum} variant={bookingCurrentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setBookingCurrentPage(pageNum)} className={bookingCurrentPage === pageNum ? "bg-[#8B5FBF] hover:bg-[#7A4FB5]" : ""}>{pageNum}</Button>;
                      })}
                      <Button variant="outline" size="sm" onClick={() => setBookingCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={bookingCurrentPage === totalPages}>다음</Button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 업체 추가 다이얼로그 */}
      <Dialog open={showAddPartnerDialog} onOpenChange={setShowAddPartnerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVendor ? '숙박 업체 수정' : '새 숙박 업체 추가'}</DialogTitle>
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
                <Label>비밀번호 *</Label>
                <Input
                  type="password"
                  value={newPartnerForm.password}
                  onChange={(e) => setNewPartnerForm({...newPartnerForm, password: e.target.value})}
                  placeholder="임시 비밀번호 입력"
                />
              </div>
              <div className="col-span-2">
                <Label>로고 이미지</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoImageChange}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">최대 5MB, JPG/PNG 형식</p>
                {logoImagePreview && (
                  <div className="mt-2">
                    <img
                      src={logoImagePreview}
                      alt="로고 미리보기"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* PMS 연동 설정 */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">PMS API 연동 설정 (선택)</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>PMS 제공업체</Label>
                  <Select
                    value={newPartnerForm.pms_provider || 'none'}
                    onValueChange={(value) => setNewPartnerForm({ ...newPartnerForm, pms_provider: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      <SelectItem value="cloudbeds">CloudBeds</SelectItem>
                      <SelectItem value="opera">Oracle Opera</SelectItem>
                      <SelectItem value="mews">Mews</SelectItem>
                      <SelectItem value="ezee">eZee</SelectItem>
                      <SelectItem value="custom">기타 (Custom API)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newPartnerForm.pms_provider && newPartnerForm.pms_provider !== 'none' && (
                  <>
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={newPartnerForm.pms_api_key || ''}
                        onChange={(e) => setNewPartnerForm({ ...newPartnerForm, pms_api_key: e.target.value })}
                        placeholder="PMS API 인증 키"
                      />
                    </div>
                    <div>
                      <Label>Property ID</Label>
                      <Input
                        value={newPartnerForm.pms_property_id || ''}
                        onChange={(e) => setNewPartnerForm({ ...newPartnerForm, pms_property_id: e.target.value })}
                        placeholder="숙소 고유 ID"
                      />
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                PMS 연동 시 객실 목록과 예약 정보를 자동으로 동기화합니다.
              </p>
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
                {selectedVendor ? '수정' : '추가'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 객실 추가 다이얼로그 */}
      <Dialog open={showAddRoomDialog} onOpenChange={setShowAddRoomDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRoom ? '객실 수정' : '새 객실 추가'}</DialogTitle>
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
                <Label>객실 이미지 (다중 선택 가능)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleRoomImagesChange}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">최대 5MB, 여러 이미지 선택 가능</p>
                {roomImagePreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {roomImagePreviews.map((preview, index) => (
                      <img
                        key={index}
                        src={preview}
                        alt={`객실 이미지 ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
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
                {selectedRoom ? '수정' : '추가'}
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

      {/* 객실 CSV 업로드 다이얼로그 */}
      <Dialog open={isRoomCsvUploadOpen} onOpenChange={setIsRoomCsvUploadOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>객실 CSV 일괄 업로드</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">
                선택된 업체: <strong>{partners.find(p => p.partner_id === selectedPartnerId)?.business_name || '없음'}</strong>
              </p>
            </div>

            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadRoomCsvTemplate}
                className="mb-2"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV 템플릿 다운로드
              </Button>
            </div>

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
                  setIsRoomCsvUploadOpen(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                }}
              >
                취소
              </Button>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={handleRoomCsvUpload}
                disabled={!csvFile || !selectedPartnerId}
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

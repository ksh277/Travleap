/**
 * 관리자용 사고 관리 대시보드
 * - 전체 사고 목록 조회
 * - 상태별 필터링
 * - 처리 담당자 배정
 * - 보험 청구 처리
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  AlertTriangle,
  Loader2,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AccidentReport {
  id: number;
  report_number: string;
  booking_number: string;
  accident_datetime: string;
  accident_type: string;
  severity: string;
  status: string;
  location_address: string;
  description: string;
  customer_name: string;
  customer_phone: string;
  vehicle: {
    name: string;
    license_plate: string;
  };
  vendor: {
    name: string;
    phone: string;
    email: string;
  };
  insurance_claim_filed: boolean;
  insurance_company?: string;
  estimated_damage_krw?: number;
  created_at: string;
}

export default function AccidentManagement() {
  const [reports, setReports] = useState<AccidentReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<AccidentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AccidentReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  // 필터
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // 업데이트 폼
  const [updateForm, setUpdateForm] = useState({
    status: '',
    resolution_notes: '',
    insurance_claim_filed: false,
    insurance_company: '',
    insurance_claim_number: '',
    estimated_damage_krw: ''
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter, severityFilter]);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/admin/rentcar/accidents');
      const result = await response.json();

      if (result.success) {
        setReports(result.data);
      } else {
        toast.error('사고 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('사고 목록 조회 오류:', error);
      toast.error('사고 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(r => r.severity === severityFilter);
    }

    setFilteredReports(filtered);
  };

  const handleViewDetail = (report: AccidentReport) => {
    setSelectedReport(report);
    setIsDetailOpen(true);
  };

  const handleOpenUpdate = (report: AccidentReport) => {
    setSelectedReport(report);
    setUpdateForm({
      status: report.status,
      resolution_notes: '',
      insurance_claim_filed: report.insurance_claim_filed,
      insurance_company: report.insurance_company || '',
      insurance_claim_number: '',
      estimated_damage_krw: report.estimated_damage_krw?.toString() || ''
    });
    setIsUpdateOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedReport) return;

    try {
      const response = await fetch(`/api/admin/rentcar/accidents/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: updateForm.status,
          resolution_notes: updateForm.resolution_notes || undefined,
          insurance_claim_filed: updateForm.insurance_claim_filed,
          insurance_company: updateForm.insurance_company || undefined,
          insurance_claim_number: updateForm.insurance_claim_number || undefined,
          estimated_damage_krw: updateForm.estimated_damage_krw ? parseInt(updateForm.estimated_damage_krw) : undefined
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('사고 신고가 업데이트되었습니다.');
        setIsUpdateOpen(false);
        fetchReports();
      } else {
        toast.error(result.error || '업데이트 실패');
      }
    } catch (error) {
      console.error('업데이트 오류:', error);
      toast.error('업데이트 중 오류가 발생했습니다.');
    }
  };

  const getAccidentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      collision: '접촉사고',
      scratch: '긁힘/찍힘',
      breakdown: '차량고장',
      theft: '도난/분실',
      other: '기타'
    };
    return labels[type] || type;
  };

  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { label: string; className: string }> = {
      minor: { label: '경미', className: 'bg-gray-100 text-gray-800' },
      moderate: { label: '보통', className: 'bg-yellow-100 text-yellow-800' },
      severe: { label: '심각', className: 'bg-red-100 text-red-800' }
    };
    const { label, className } = config[severity] || config.minor;
    return <Badge className={className}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      reported: { label: '신고접수', className: 'bg-blue-100 text-blue-800' },
      investigating: { label: '조사중', className: 'bg-purple-100 text-purple-800' },
      claim_filed: { label: '보험청구', className: 'bg-orange-100 text-orange-800' },
      resolved: { label: '처리완료', className: 'bg-green-100 text-green-800' },
      closed: { label: '종료', className: 'bg-gray-100 text-gray-800' }
    };
    const { label, className } = config[status] || config.reported;
    return <Badge className={className}>{label}</Badge>;
  };

  const stats = {
    total: reports.length,
    reported: reports.filter(r => r.status === 'reported').length,
    investigating: reports.filter(r => r.status === 'investigating').length,
    resolved: reports.filter(r => r.status === 'resolved' || r.status === 'closed').length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          사고 신고 관리
        </h1>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">전체 신고</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.reported}</div>
            <p className="text-sm text-muted-foreground">신규 접수</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.investigating}</div>
            <p className="text-sm text-muted-foreground">조사 중</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-sm text-muted-foreground">처리 완료</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>상태</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="reported">신고접수</SelectItem>
                  <SelectItem value="investigating">조사중</SelectItem>
                  <SelectItem value="claim_filed">보험청구</SelectItem>
                  <SelectItem value="resolved">처리완료</SelectItem>
                  <SelectItem value="closed">종료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>심각도</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="minor">경미</SelectItem>
                  <SelectItem value="moderate">보통</SelectItem>
                  <SelectItem value="severe">심각</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사고 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>사고 신고 목록 ({filteredReports.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>신고번호</TableHead>
                <TableHead>예약번호</TableHead>
                <TableHead>사고일시</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>심각도</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>차량</TableHead>
                <TableHead>고객</TableHead>
                <TableHead>업체</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    사고 신고가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono text-sm">{report.report_number}</TableCell>
                    <TableCell className="font-mono text-sm">{report.booking_number}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(report.accident_datetime), 'MM/dd HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm">{getAccidentTypeLabel(report.accident_type)}</TableCell>
                    <TableCell>{getSeverityBadge(report.severity)}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-sm">
                      <div>{report.vehicle.name}</div>
                      <div className="text-xs text-muted-foreground">{report.vehicle.license_plate}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{report.customer_name}</div>
                      <div className="text-xs text-muted-foreground">
                        <a href={`tel:${report.customer_phone}`} className="text-blue-600 hover:underline">
                          {report.customer_phone}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{report.vendor.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenUpdate(report)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 상세 보기 모달 */}
      {selectedReport && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>사고 신고 상세 - {selectedReport.report_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>예약번호</Label>
                  <p className="font-mono">{selectedReport.booking_number}</p>
                </div>
                <div>
                  <Label>사고 유형</Label>
                  <p>{getAccidentTypeLabel(selectedReport.accident_type)}</p>
                </div>
              </div>
              <div>
                <Label>사고 장소</Label>
                <p>{selectedReport.location_address || '정보 없음'}</p>
              </div>
              <div>
                <Label>사고 경위</Label>
                <p className="whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                  {selectedReport.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>차량</Label>
                  <p>{selectedReport.vehicle.name} ({selectedReport.vehicle.license_plate})</p>
                </div>
                <div>
                  <Label>업체</Label>
                  <p>{selectedReport.vendor.name}</p>
                  <p className="text-sm text-muted-foreground">
                    <a href={`tel:${selectedReport.vendor.phone}`} className="text-blue-600 hover:underline">
                      {selectedReport.vendor.phone}
                    </a>
                  </p>
                </div>
              </div>
              {selectedReport.insurance_claim_filed && (
                <div>
                  <Label>보험 처리</Label>
                  <p className="text-green-600 font-medium">보험 청구 완료</p>
                  {selectedReport.insurance_company && (
                    <p className="text-sm">보험사: {selectedReport.insurance_company}</p>
                  )}
                  {selectedReport.estimated_damage_krw && (
                    <p className="text-sm">예상 손해액: {selectedReport.estimated_damage_krw.toLocaleString()}원</p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 업데이트 모달 */}
      {selectedReport && (
        <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>사고 신고 처리 - {selectedReport.report_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>상태 변경</Label>
                <Select value={updateForm.status} onValueChange={(value) => setUpdateForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reported">신고 접수</SelectItem>
                    <SelectItem value="investigating">조사 중</SelectItem>
                    <SelectItem value="claim_filed">보험 청구</SelectItem>
                    <SelectItem value="resolved">처리 완료</SelectItem>
                    <SelectItem value="closed">종료</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>처리 내역</Label>
                <Textarea
                  placeholder="사고 처리 내역을 입력하세요..."
                  value={updateForm.resolution_notes}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, resolution_notes: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="insurance_claim_filed"
                  checked={updateForm.insurance_claim_filed}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, insurance_claim_filed: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="insurance_claim_filed" className="cursor-pointer">
                  보험 청구 완료
                </Label>
              </div>

              {updateForm.insurance_claim_filed && (
                <>
                  <div>
                    <Label>보험사</Label>
                    <Input
                      placeholder="예: 삼성화재"
                      value={updateForm.insurance_company}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, insurance_company: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>보험 청구 번호</Label>
                    <Input
                      placeholder="청구 번호 입력"
                      value={updateForm.insurance_claim_number}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, insurance_claim_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>예상 손해액 (원)</Label>
                    <Input
                      type="number"
                      placeholder="1000000"
                      value={updateForm.estimated_damage_krw}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, estimated_damage_krw: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateOpen(false)}>
                취소
              </Button>
              <Button onClick={handleUpdate}>
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

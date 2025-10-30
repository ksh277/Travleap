/**
 * 렌트카 사고 신고 상세 페이지
 * - 신고 내역 상세 조회
 * - 진행 상태 타임라인
 * - 보험사 연락처 표시
 * - 추가 증거 업로드
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Phone,
  User,
  Car,
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Camera,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AccidentReport {
  id: number;
  report_number: string;
  booking_id: number;
  booking_number: string;
  accident_datetime: string;
  accident_type: string;
  severity: string;
  status: string;
  description: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
  other_party_name?: string;
  other_party_phone?: string;
  other_party_vehicle?: string;
  police_report_filed: boolean;
  police_report_number?: string;
  insurance_claim_filed: boolean;
  insurance_company?: string;
  insurance_claim_number?: string;
  estimated_damage_krw?: number;
  photos: string[];
  videos: string[];
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  vendor_notified_at?: string;
  insurance_notified_at?: string;
  admin_notified_at?: string;
  vehicle: {
    name: string;
    license_plate: string;
  };
  vendor: {
    name: string;
    phone: string;
  };
}

export default function AccidentReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState<AccidentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportDetail();
  }, [reportId]);

  const fetchReportDetail = async () => {
    try {
      const response = await fetch(
        `/api/rentcar/accident/${reportId}?user_id=${user?.id}`
      );
      const result = await response.json();

      if (result.success) {
        setReport(result.data);
      } else {
        toast.error(result.error || '사고 신고를 찾을 수 없습니다.');
        navigate('/my-page');
      }
    } catch (error) {
      console.error('사고 신고 조회 오류:', error);
      toast.error('사고 신고를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAccidentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      collision: '접촉 사고',
      scratch: '긁힘/찍힘',
      breakdown: '차량 고장',
      theft: '도난/분실',
      other: '기타'
    };
    return labels[type] || type;
  };

  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      minor: { label: '경미', variant: 'secondary' },
      moderate: { label: '보통', variant: 'default' },
      severe: { label: '심각', variant: 'destructive' }
    };
    const { label, variant } = config[severity] || config.minor;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      reported: { label: '신고 접수', variant: 'secondary' },
      investigating: { label: '조사 중', variant: 'default' },
      claim_filed: { label: '보험 청구 완료', variant: 'default' },
      resolved: { label: '처리 완료', variant: 'outline' },
      closed: { label: '종료', variant: 'outline' }
    };
    const { label, variant } = config[status] || config.reported;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">사고 신고를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/my-page')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        내 예약으로 돌아가기
      </Button>

      {/* 헤더 */}
      <Card className="mb-6 border-red-200 bg-red-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              사고 신고 #{report.report_number}
            </CardTitle>
            {getStatusBadge(report.status)}
          </div>
          <div className="text-sm text-muted-foreground">
            예약번호: {report.booking_number} | 차량: {report.vehicle.name} ({report.vehicle.license_plate})
          </div>
        </CardHeader>
      </Card>

      {/* 기본 정보 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>사고 기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">사고 유형</p>
              <p className="font-medium">{getAccidentTypeLabel(report.accident_type)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">심각도</p>
              <p>{getSeverityBadge(report.severity)}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              사고 발생 일시
            </div>
            <p className="font-medium">
              {format(new Date(report.accident_datetime), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
            </p>
          </div>

          {report.location_address && (
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                사고 장소
              </div>
              <p className="font-medium">{report.location_address}</p>
              {report.location_lat && report.location_lng && (
                <a
                  href={`https://www.google.com/maps?q=${report.location_lat},${report.location_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  지도에서 보기 →
                </a>
              )}
            </div>
          )}

          <Separator />

          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              사고 경위
            </div>
            <p className="whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{report.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* 상대방 정보 */}
      {(report.other_party_name || report.other_party_phone || report.other_party_vehicle) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              상대방 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.other_party_name && (
              <div>
                <p className="text-sm text-muted-foreground">이름</p>
                <p className="font-medium">{report.other_party_name}</p>
              </div>
            )}
            {report.other_party_phone && (
              <div>
                <p className="text-sm text-muted-foreground">전화번호</p>
                <p className="font-medium">{report.other_party_phone}</p>
              </div>
            )}
            {report.other_party_vehicle && (
              <div>
                <p className="text-sm text-muted-foreground">차량 번호</p>
                <p className="font-medium">{report.other_party_vehicle}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 경찰 신고 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            경찰 신고
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.police_report_filed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">경찰 신고 완료</span>
              </div>
              {report.police_report_number && (
                <p className="text-sm">
                  접수번호: <span className="font-mono font-medium">{report.police_report_number}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-5 w-5" />
              <span>경찰 신고 없음</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 보험 처리 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            보험 처리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.insurance_claim_filed ? (
            <>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">보험 청구 완료</span>
              </div>
              {report.insurance_company && (
                <div>
                  <p className="text-sm text-muted-foreground">보험사</p>
                  <p className="font-medium">{report.insurance_company}</p>
                </div>
              )}
              {report.insurance_claim_number && (
                <div>
                  <p className="text-sm text-muted-foreground">보험 청구 번호</p>
                  <p className="font-mono font-medium">{report.insurance_claim_number}</p>
                </div>
              )}
              {report.estimated_damage_krw && (
                <div>
                  <p className="text-sm text-muted-foreground">예상 손해액</p>
                  <p className="font-medium text-lg">
                    {report.estimated_damage_krw.toLocaleString()}원
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-5 w-5" />
              <span>보험 청구 대기 중</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 업체 정보 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            렌터카 업체
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">업체명</p>
            <p className="font-medium">{report.vendor.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">연락처</p>
            <a href={`tel:${report.vendor.phone}`} className="font-medium text-blue-600 hover:underline">
              <Phone className="inline h-4 w-4 mr-1" />
              {report.vendor.phone}
            </a>
          </div>
        </CardContent>
      </Card>

      {/* 처리 내역 */}
      {report.resolution_notes && (
        <Card className="mb-6 border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              처리 내역
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{report.resolution_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* 타임라인 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            처리 타임라인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <div className="h-full w-px bg-border" />
              </div>
              <div className="pb-4">
                <p className="font-medium">사고 신고 접수</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(report.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                </p>
              </div>
            </div>

            {report.vendor_notified_at && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <div className="h-full w-px bg-border" />
                </div>
                <div className="pb-4">
                  <p className="font-medium">업체 알림 발송</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(report.vendor_notified_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                  </p>
                </div>
              </div>
            )}

            {report.insurance_notified_at && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <div className="h-full w-px bg-border" />
                </div>
                <div className="pb-4">
                  <p className="font-medium">보험사 통보</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(report.insurance_notified_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${report.status === 'closed' ? 'bg-primary' : 'bg-border'}`} />
              </div>
              <div>
                <p className={`font-medium ${report.status === 'closed' ? '' : 'text-muted-foreground'}`}>
                  처리 완료
                </p>
                {report.status === 'closed' && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(report.updated_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 안내 메시지 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>안내:</strong> 사고 처리 진행 상황은 등록하신 연락처로 안내됩니다.
          추가 문의는 렌터카 업체로 직접 연락해주세요.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Plus, Minus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: number;
  email: string;
  name: string;
  points: number;
}

interface PointAdjustmentDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PointAdjustmentDialog({ user, isOpen, onClose, onSuccess }: PointAdjustmentDialogProps) {
  const [pointsChange, setPointsChange] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const handleAdjust = async () => {
    if (!user) return;

    if (!pointsChange || parseInt(pointsChange) === 0) {
      toast.error('포인트 변경 값을 입력해주세요');
      return;
    }

    if (!reason.trim()) {
      toast.error('조정 사유를 입력해주세요');
      return;
    }

    try {
      setIsAdjusting(true);

      const response = await fetch('/api/admin/adjust-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          points_change: parseInt(pointsChange),
          reason: reason.trim(),
          admin_id: 'admin' // 실제로는 로그인한 관리자 ID를 사용
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`포인트가 ${data.data.points_change > 0 ? '+' : ''}${data.data.points_change}P 조정되었습니다`);
        setPointsChange('');
        setReason('');
        onSuccess();
        onClose();
      } else {
        toast.error('포인트 조정 실패: ' + data.error);
      }
    } catch (error) {
      console.error('포인트 조정 오류:', error);
      toast.error('포인트 조정 중 오류가 발생했습니다');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleQuickAdd = (amount: number) => {
    setPointsChange(amount.toString());
  };

  const handleQuickSubtract = (amount: number) => {
    setPointsChange((-amount).toString());
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>포인트 수동 조정</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 사용자 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">사용자</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">이메일</span>
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">현재 포인트</span>
              <Badge className="text-base font-bold">{user.points.toLocaleString()}P</Badge>
            </div>
          </div>

          {/* 빠른 조정 */}
          <div>
            <Label className="mb-2">빠른 조정</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(1000)}
                className="text-green-600"
              >
                <Plus className="h-3 w-3 mr-1" />
                1,000P
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(5000)}
                className="text-green-600"
              >
                <Plus className="h-3 w-3 mr-1" />
                5,000P
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(10000)}
                className="text-green-600"
              >
                <Plus className="h-3 w-3 mr-1" />
                10,000P
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSubtract(1000)}
                className="text-red-600"
              >
                <Minus className="h-3 w-3 mr-1" />
                1,000P
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSubtract(5000)}
                className="text-red-600"
              >
                <Minus className="h-3 w-3 mr-1" />
                5,000P
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSubtract(10000)}
                className="text-red-600"
              >
                <Minus className="h-3 w-3 mr-1" />
                10,000P
              </Button>
            </div>
          </div>

          {/* 포인트 변경 값 */}
          <div>
            <Label htmlFor="pointsChange">포인트 변경 값</Label>
            <Input
              id="pointsChange"
              type="number"
              placeholder="증가는 양수, 감소는 음수 입력"
              value={pointsChange}
              onChange={(e) => setPointsChange(e.target.value)}
              className="mt-1"
            />
            {pointsChange && (
              <p className="text-sm text-gray-500 mt-1">
                변경 후: {(user.points + parseInt(pointsChange || '0')).toLocaleString()}P
              </p>
            )}
          </div>

          {/* 조정 사유 */}
          <div>
            <Label htmlFor="reason">조정 사유 (필수)</Label>
            <Textarea
              id="reason"
              placeholder="포인트 조정 사유를 입력하세요 (예: 고객 서비스 보상, 이벤트 지급, 오류 수정 등)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isAdjusting}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleAdjust}
              className="flex-1 bg-[#8B5FBF] hover:bg-[#7A4FB5]"
              disabled={isAdjusting}
            >
              {isAdjusting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '포인트 조정'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

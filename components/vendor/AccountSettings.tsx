/**
 * 공통 계정 설정 컴포넌트
 * 벤더/파트너 대시보드에서 자기 계정 정보(이메일, 비밀번호) 수정에 사용
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { User, Mail, Lock, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function AccountSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const handleSubmit = async () => {
    // 비밀번호 변경 시 검증
    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        toast.error('새 비밀번호는 6자 이상이어야 합니다');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error('새 비밀번호가 일치하지 않습니다');
        return;
      }
      if (!formData.currentPassword) {
        toast.error('현재 비밀번호를 입력해주세요');
        return;
      }
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const payload: any = {};

      if (formData.email && formData.email !== user?.email) {
        payload.email = formData.email;
      }
      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      if (Object.keys(payload).length === 0) {
        toast.error('변경할 내용이 없습니다');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/admin/accounts/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('계정 정보가 수정되었습니다');
        // 비밀번호 필드 초기화
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        toast.error(data.message || '수정에 실패했습니다');
      }
    } catch (error) {
      console.error('계정 수정 오류:', error);
      toast.error('계정 수정 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          내 계정
        </CardTitle>
        <CardDescription>
          이메일, 비밀번호 등 계정 정보를 수정합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              기본 정보
            </h3>
            <div>
              <Label>아이디</Label>
              <Input value={user?.username || ''} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>이름</Label>
              <Input value={user?.name || ''} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>이메일</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* 비밀번호 변경 */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              비밀번호 변경
            </h3>
            <div>
              <Label>현재 비밀번호</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="현재 비밀번호 입력"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>새 비밀번호</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="새 비밀번호 (6자 이상)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>새 비밀번호 확인</Label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="새 비밀번호 다시 입력"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default AccountSettings;

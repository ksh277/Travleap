import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Settings, Mail, Save, RefreshCw, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  category: string;
  dataType: string;
  description: string;
}

interface GroupedSettings {
  [category: string]: SystemSetting[];
}

export function AdminSystemSettings() {
  const [settings, setSettings] = useState<GroupedSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<{ [key: string]: string }>({});
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');

  // 설정 로드
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/system-settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);

        // admin_emails 파싱
        const emailSetting = data.settings.find((s: SystemSetting) => s.key === 'admin_emails');
        if (emailSetting) {
          try {
            const emails = JSON.parse(emailSetting.value);
            setAdminEmails(Array.isArray(emails) ? emails : []);
          } catch (e) {
            setAdminEmails([]);
          }
        }
      } else {
        toast.error('설정 로드 실패: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 설정 값 변경
  const handleValueChange = (key: string, value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 이메일 추가
  const handleAddEmail = () => {
    const email = newEmail.trim();
    if (!email) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }

    if (adminEmails.includes(email)) {
      toast.error('이미 추가된 이메일입니다.');
      return;
    }

    setAdminEmails([...adminEmails, email]);
    setNewEmail('');
  };

  // 이메일 삭제
  const handleRemoveEmail = (email: string) => {
    setAdminEmails(adminEmails.filter((e) => e !== email));
  };

  // 설정 저장
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      const settingsToUpdate = [];

      // 편집된 일반 설정
      for (const [key, value] of Object.entries(editedValues)) {
        settingsToUpdate.push({ key, value });
      }

      // 관리자 이메일 (항상 업데이트)
      settingsToUpdate.push({
        key: 'admin_emails',
        value: JSON.stringify(adminEmails),
      });

      if (settingsToUpdate.length === 0) {
        toast.info('변경된 설정이 없습니다.');
        return;
      }

      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: settingsToUpdate }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${data.updatedCount}개 설정이 업데이트되었습니다.`);
        setEditedValues({});
        await loadSettings(); // 설정 다시 로드
      } else {
        toast.error('설정 저장 실패: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 설정 값 가져오기 (편집된 값 우선)
  const getSettingValue = (key: string, originalValue: string) => {
    return editedValues[key] !== undefined ? editedValues[key] : originalValue;
  };

  // Boolean 토글
  const renderBooleanToggle = (setting: SystemSetting) => {
    const currentValue = getSettingValue(setting.key, setting.value);
    const isTrue = currentValue === 'true';

    return (
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Label className="font-medium">{setting.description}</Label>
          <p className="text-xs text-gray-500 mt-1">{setting.key}</p>
        </div>
        <Button
          variant={isTrue ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleValueChange(setting.key, isTrue ? 'false' : 'true')}
        >
          {isTrue ? '활성화' : '비활성화'}
        </Button>
      </div>
    );
  };

  // Number 입력
  const renderNumberInput = (setting: SystemSetting) => {
    const currentValue = getSettingValue(setting.key, setting.value);

    return (
      <div>
        <Label className="font-medium">{setting.description}</Label>
        <p className="text-xs text-gray-500 mb-2">{setting.key}</p>
        <Input
          type="number"
          value={currentValue}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          placeholder="숫자 입력"
        />
      </div>
    );
  };

  // String 입력
  const renderStringInput = (setting: SystemSetting) => {
    const currentValue = getSettingValue(setting.key, setting.value);

    return (
      <div>
        <Label className="font-medium">{setting.description}</Label>
        <p className="text-xs text-gray-500 mb-2">{setting.key}</p>
        <Input
          type="text"
          value={currentValue}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          placeholder="값 입력"
        />
      </div>
    );
  };

  // JSON (admin_emails는 별도 처리)
  const renderJsonInput = (setting: SystemSetting) => {
    if (setting.key === 'admin_emails') {
      return null; // 별도 섹션에서 처리
    }

    const currentValue = getSettingValue(setting.key, setting.value);

    return (
      <div>
        <Label className="font-medium">{setting.description}</Label>
        <p className="text-xs text-gray-500 mb-2">{setting.key}</p>
        <Input
          type="text"
          value={currentValue}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          placeholder="JSON 형식"
        />
      </div>
    );
  };

  // 설정 렌더링
  const renderSetting = (setting: SystemSetting) => {
    if (setting.key === 'admin_emails') return null;

    switch (setting.dataType) {
      case 'boolean':
        return renderBooleanToggle(setting);
      case 'number':
        return renderNumberInput(setting);
      case 'json':
        return renderJsonInput(setting);
      default:
        return renderStringInput(setting);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            시스템 설정
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            사이트 전체 설정 및 이메일 알림 관리
          </p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              설정 저장
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            이메일 설정
          </TabsTrigger>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            일반 설정
          </TabsTrigger>
        </TabsList>

        {/* 이메일 설정 탭 */}
        <TabsContent value="email" className="space-y-6 mt-6">
          {/* 관리자 이메일 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                관리자 이메일 주소
              </CardTitle>
              <p className="text-sm text-gray-500">
                주문, 환불, 결제 알림을 받을 이메일 주소를 추가하세요.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 이메일 입력 */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                />
                <Button onClick={handleAddEmail} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  추가
                </Button>
              </div>

              {/* 이메일 목록 */}
              <div className="space-y-2">
                {adminEmails.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    등록된 이메일이 없습니다.
                  </p>
                ) : (
                  adminEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEmail(email)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  💡 추가된 이메일 주소로 주문 알림, 환불 알림, 결제 알림이 전송됩니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 이메일 알림 설정 */}
          {settings.email && (
            <Card>
              <CardHeader>
                <CardTitle>알림 설정</CardTitle>
                <p className="text-sm text-gray-500">
                  어떤 이벤트에 대해 이메일 알림을 받을지 설정하세요.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.email
                  .filter((s) => s.key !== 'admin_emails' && s.dataType === 'boolean')
                  .map((setting) => (
                    <div
                      key={setting.key}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {renderSetting(setting)}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* SMTP 설정 (선택사항) */}
          {settings.email && (
            <Card>
              <CardHeader>
                <CardTitle>SMTP 설정 (선택사항)</CardTitle>
                <p className="text-sm text-gray-500">
                  커스텀 SMTP 서버를 사용하려면 설정하세요. 비워두면 기본 메일 서비스를 사용합니다.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.email
                  .filter(
                    (s) =>
                      s.key !== 'admin_emails' &&
                      s.dataType !== 'boolean' &&
                      (s.key.includes('smtp') || s.key === 'support_email')
                  )
                  .map((setting) => (
                    <div key={setting.key}>{renderSetting(setting)}</div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 일반 설정 탭 */}
        <TabsContent value="general" className="space-y-6 mt-6">
          {Object.entries(settings)
            .filter(([category]) => category !== 'email')
            .map(([category, categorySettings]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category} 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categorySettings.map((setting) => (
                    <div key={setting.key}>{renderSetting(setting)}</div>
                  ))}
                </CardContent>
              </Card>
            ))}

          {Object.keys(settings).filter((cat) => cat !== 'email').length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>일반 설정이 없습니다.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 저장 버튼 (하단 고정) */}
      <div className="sticky bottom-0 bg-white border-t pt-4 pb-2">
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={isSaving} size="lg">
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                모든 설정 저장
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MoveUp, MoveDown, ExternalLink } from 'lucide-react';
import { ImageUploadComponent } from './ImageUploadComponent';

interface Activity {
  id?: number;
  image_url: string;
  title: string;
  link_url?: string;
  size: 'large' | 'small';
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export function ActivityManagement() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Activity>({
    image_url: '',
    title: '',
    link_url: '',
    size: 'small',
    display_order: 0,
    is_active: true
  });

  // 액티비티 목록 로드
  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/activities');
      const data = await response.json();

      if (data.success && data.activities) {
        setActivities(data.activities);
      } else {
        toast.error('액티비티 목록을 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error('액티비티 로드 실패:', error);
      toast.error('액티비티 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      image_url: '',
      title: '',
      link_url: '',
      size: 'small',
      display_order: activities.length,
      is_active: true
    });
    setEditingActivity(null);
    setShowForm(false);
  };

  // 새 액티비티 추가 버튼
  const handleAddNew = () => {
    resetForm();
    setFormData({
      ...formData,
      display_order: activities.length
    });
    setShowForm(true);
  };

  // 액티비티 수정 버튼
  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData(activity);
    setShowForm(true);
  };

  // 액티비티 저장 (생성/수정)
  const handleSave = async () => {
    if (!formData.image_url.trim()) {
      toast.error('액티비티 이미지를 선택해주세요.');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('액티비티 제목을 입력해주세요.');
      return;
    }

    try {
      const url = editingActivity
        ? `/api/admin/activities/${editingActivity.id}`
        : '/api/admin/activities';

      const method = editingActivity ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingActivity ? '액티비티가 수정되었습니다.' : '액티비티가 추가되었습니다.');
        await loadActivities();
        resetForm();
      } else {
        toast.error(data.error || '액티비티 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('액티비티 저장 실패:', error);
      toast.error('액티비티 저장 중 오류가 발생했습니다.');
    }
  };

  // 액티비티 삭제
  const handleDelete = async (id: number) => {
    if (!confirm('이 액티비티를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/activities/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('액티비티가 삭제되었습니다.');
        await loadActivities();
      } else {
        toast.error(data.error || '액티비티 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('액티비티 삭제 실패:', error);
      toast.error('액티비티 삭제 중 오류가 발생했습니다.');
    }
  };

  // 액티비티 순서 변경
  const handleReorder = async (activity: Activity, direction: 'up' | 'down') => {
    const currentIndex = activities.findIndex(a => a.id === activity.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === activities.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newActivities = [...activities];
    [newActivities[currentIndex], newActivities[newIndex]] = [newActivities[newIndex], newActivities[currentIndex]];

    // 순서 업데이트
    const updates = newActivities.map((a, index) => ({
      id: a.id!,
      display_order: index
    }));

    try {
      const response = await fetch('/api/admin/activities/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: updates })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('액티비티 순서가 변경되었습니다.');
        await loadActivities();
      } else {
        toast.error(data.error || '액티비티 순서 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('액티비티 순서 변경 실패:', error);
      toast.error('액티비티 순서 변경 중 오류가 발생했습니다.');
    }
  };

  // 이미지 업로드 완료 핸들러
  const handleImageUpload = (url: string) => {
    setFormData({ ...formData, image_url: url });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>홈페이지 액티비티 관리</CardTitle>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              새 액티비티 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 액티비티 목록 */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              액티비티 목록을 불러오는 중...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              등록된 액티비티가 없습니다. 새 액티비티를 추가해보세요.
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <Card key={activity.id} className="overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    {/* 액티비티 이미지 썸네일 */}
                    <div className="w-32 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={activity.image_url}
                        alt={activity.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 액티비티 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          {activity.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          activity.size === 'large'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {activity.size === 'large' ? '큰 이미지' : '작은 이미지'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          activity.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {activity.is_active ? '활성' : '비활성'}
                        </span>
                      </div>
                      {activity.link_url && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate">{activity.link_url}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        순서: {index + 1} / {activities.length}
                      </p>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="flex items-center gap-2">
                      {/* 순서 변경 */}
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReorder(activity, 'up')}
                          disabled={index === 0}
                          className="h-7 w-7 p-0"
                        >
                          <MoveUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReorder(activity, 'down')}
                          disabled={index === activities.length - 1}
                          className="h-7 w-7 p-0"
                        >
                          <MoveDown className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* 수정/삭제 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(activity)}
                        className="gap-1"
                      >
                        <Pencil className="h-3 w-3" />
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(activity.id!)}
                        className="gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 액티비티 추가/수정 폼 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingActivity ? '액티비티 수정' : '새 액티비티 추가'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 이미지 업로드 */}
            <div className="space-y-2">
              <Label>액티비티 이미지 *</Label>
              <ImageUploadComponent
                onUploadComplete={handleImageUpload}
                existingImageUrl={formData.image_url}
              />
              {formData.image_url && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img
                    src={formData.image_url}
                    alt="미리보기"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>

            {/* 액티비티 제목 */}
            <div className="space-y-2">
              <Label htmlFor="title">액티비티 제목 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="액티비티 제목을 입력하세요"
              />
            </div>

            {/* 링크 URL */}
            <div className="space-y-2">
              <Label htmlFor="link_url">클릭 시 이동할 URL (선택)</Label>
              <Input
                id="link_url"
                value={formData.link_url || ''}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="/category/tour 또는 https://example.com"
              />
              <p className="text-xs text-gray-500">
                내부 링크는 /로 시작하며, 외부 링크는 https://로 시작합니다
              </p>
            </div>

            {/* 이미지 크기 */}
            <div className="space-y-2">
              <Label htmlFor="size">이미지 크기 *</Label>
              <Select
                value={formData.size}
                onValueChange={(value: 'large' | 'small') => setFormData({ ...formData, size: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="이미지 크기 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="large">큰 이미지 (2칸 차지)</SelectItem>
                  <SelectItem value="small">작은 이미지 (1칸 차지)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                큰 이미지는 그리드에서 2칸을 차지하며, 작은 이미지는 1칸을 차지합니다
              </p>
            </div>

            {/* 활성화 여부 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">액티비티 활성화</Label>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                {editingActivity ? '수정 완료' : '액티비티 추가'}
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

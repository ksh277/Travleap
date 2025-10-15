import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Mail, Trash2, Send, Users, CheckCircle, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface Subscriber {
  id: number;
  email: string;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at?: string;
}

interface Campaign {
  id: number;
  subject: string;
  content: string;
  sent_count: number;
  created_at: string;
  sent_at?: string;
  status: 'draft' | 'sent';
}

export function NewsletterManagement() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subscribers');

  // 캠페인 폼
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    subject: '',
    content: ''
  });

  // 구독자 목록 로드
  const loadSubscribers = async () => {
    try {
      const response = await fetch('/api/admin/newsletter/subscribers');
      const data = await response.json();

      if (data.success && data.subscribers) {
        setSubscribers(data.subscribers);
      } else {
        toast.error('구독자 목록을 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error('구독자 로드 실패:', error);
      toast.error('구독자 목록 조회 중 오류가 발생했습니다.');
    }
  };

  // 캠페인 목록 로드
  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/admin/newsletter/campaigns');
      const data = await response.json();

      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
      } else {
        toast.error('캠페인 목록을 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error('캠페인 로드 실패:', error);
      toast.error('캠페인 목록 조회 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadSubscribers(), loadCampaigns()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // 구독자 삭제
  const handleDeleteSubscriber = async (id: number) => {
    if (!confirm('이 구독자를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/newsletter/subscribers/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('구독자가 삭제되었습니다.');
        await loadSubscribers();
      } else {
        toast.error(data.error || '구독자 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('구독자 삭제 실패:', error);
      toast.error('구독자 삭제 중 오류가 발생했습니다.');
    }
  };

  // 캠페인 생성
  const handleCreateCampaign = async () => {
    if (!campaignForm.subject.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }

    if (!campaignForm.content.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: campaignForm.subject,
          content: campaignForm.content,
          status: 'draft'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('캠페인이 생성되었습니다.');
        setCampaignForm({ subject: '', content: '' });
        setShowCampaignForm(false);
        await loadCampaigns();
      } else {
        toast.error(data.error || '캠페인 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('캠페인 생성 실패:', error);
      toast.error('캠페인 생성 중 오류가 발생했습니다.');
    }
  };

  // 캠페인 발송
  const handleSendCampaign = async (campaignId: number) => {
    const activeSubscribers = subscribers.filter(s => s.is_active);

    if (activeSubscribers.length === 0) {
      toast.error('발송할 활성 구독자가 없습니다.');
      return;
    }

    if (!confirm(`${activeSubscribers.length}명의 구독자에게 이메일을 발송하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/admin/newsletter/campaigns/${campaignId}/send`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || '이메일이 발송되었습니다.');
        await loadCampaigns();
      } else {
        toast.error(data.error || '이메일 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('이메일 발송 실패:', error);
      toast.error('이메일 발송 중 오류가 발생했습니다.');
    }
  };

  // 캠페인 삭제
  const handleDeleteCampaign = async (id: number) => {
    if (!confirm('이 캠페인을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/newsletter/campaigns/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('캠페인이 삭제되었습니다.');
        await loadCampaigns();
      } else {
        toast.error(data.error || '캠페인 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('캠페인 삭제 실패:', error);
      toast.error('캠페인 삭제 중 오류가 발생했습니다.');
    }
  };

  const activeSubscribers = subscribers.filter(s => s.is_active);
  const inactiveSubscribers = subscribers.filter(s => !s.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>뉴스레터 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="subscribers">
                <Users className="h-4 w-4 mr-2" />
                구독자 ({subscribers.length})
              </TabsTrigger>
              <TabsTrigger value="campaigns">
                <Mail className="h-4 w-4 mr-2" />
                캠페인 ({campaigns.length})
              </TabsTrigger>
            </TabsList>

            {/* 구독자 탭 */}
            <TabsContent value="subscribers" className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  구독자 목록을 불러오는 중...
                </div>
              ) : (
                <>
                  {/* 통계 */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">활성 구독자</p>
                            <p className="text-2xl font-bold text-green-600">{activeSubscribers.length}</p>
                          </div>
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">비활성 구독자</p>
                            <p className="text-2xl font-bold text-gray-600">{inactiveSubscribers.length}</p>
                          </div>
                          <XCircle className="h-8 w-8 text-gray-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 구독자 목록 */}
                  {subscribers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      등록된 구독자가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subscribers.map((subscriber) => (
                        <Card key={subscriber.id}>
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="font-medium">{subscriber.email}</p>
                                  <p className="text-xs text-gray-500">
                                    구독일: {new Date(subscriber.subscribed_at).toLocaleDateString('ko-KR')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  subscriber.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {subscriber.is_active ? '활성' : '비활성'}
                                </span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteSubscriber(subscriber.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* 캠페인 탭 */}
            <TabsContent value="campaigns" className="space-y-4">
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => setShowCampaignForm(!showCampaignForm)}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {showCampaignForm ? '취소' : '새 캠페인 작성'}
                </Button>
              </div>

              {/* 캠페인 작성 폼 */}
              {showCampaignForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">새 캠페인 작성</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="subject">이메일 제목</Label>
                      <Input
                        id="subject"
                        value={campaignForm.subject}
                        onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                        placeholder="이메일 제목을 입력하세요"
                      />
                    </div>
                    <div>
                      <Label htmlFor="content">이메일 내용</Label>
                      <Textarea
                        id="content"
                        value={campaignForm.content}
                        onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
                        placeholder="이메일 내용을 입력하세요"
                        rows={8}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        HTML 형식도 지원됩니다
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateCampaign} className="flex-1">
                        캠페인 생성
                      </Button>
                      <Button
                        onClick={() => {
                          setCampaignForm({ subject: '', content: '' });
                          setShowCampaignForm(false);
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        취소
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 캠페인 목록 */}
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  캠페인 목록을 불러오는 중...
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  생성된 캠페인이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{campaign.subject}</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                              생성일: {new Date(campaign.created_at).toLocaleString('ko-KR')}
                            </p>
                            {campaign.sent_at && (
                              <p className="text-sm text-gray-500">
                                발송일: {new Date(campaign.sent_at).toLocaleString('ko-KR')}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded text-xs font-medium ${
                            campaign.status === 'sent'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {campaign.status === 'sent' ? `발송완료 (${campaign.sent_count}명)` : '초안'}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <p className="text-sm whitespace-pre-wrap">{campaign.content}</p>
                        </div>
                        <div className="flex gap-2">
                          {campaign.status === 'draft' && (
                            <Button
                              onClick={() => handleSendCampaign(campaign.id)}
                              className="gap-2"
                            >
                              <Send className="h-4 w-4" />
                              이메일 발송 ({activeSubscribers.length}명)
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            삭제
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

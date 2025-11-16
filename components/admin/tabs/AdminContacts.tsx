import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Textarea } from '../../ui/textarea';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Search, RefreshCw, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  category?: string;
  priority?: string;
  status: string;
  response?: string;
  responded_at?: string;
  created_at: string;
  updated_at?: string;
}

export function AdminContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [isLoading, setIsLoading] = useState(true);

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // 답변 Dialog 상태
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadContacts = async () => {
    try {
      setIsLoading(true);

      // API 요청 파라미터 구성
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/contacts?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const contactsData = data.data || [];
        setContacts(contactsData);
        setFilteredContacts(contactsData);

        // 페이지네이션 계산
        if (data.pagination) {
          setTotalPages(Math.ceil(data.pagination.total / itemsPerPage));
        }
      } else {
        throw new Error(data.error || 'Failed to load contacts');
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('문의 목록을 불러오는데 실패했습니다.');
      setContacts([]);
      setFilteredContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 답변 Dialog 열기
  const openReplyDialog = (contact: Contact) => {
    setSelectedContact(contact);
    setReplyText(contact.response || ''); // 기존 답변이 있으면 자동으로 채움
    setSendEmail(true);
    setIsReplyDialogOpen(true);
  };

  // 답변 제출
  const handleSubmitReply = async () => {
    if (!selectedContact || !replyText.trim()) {
      toast.error('답변 내용을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/contact-replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: selectedContact.id,
          reply_text: replyText.trim(),
          admin_name: '관리자',
          send_email: sendEmail
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '답변 등록에 실패했습니다.');
      }

      toast.success('답변이 성공적으로 등록되었습니다.' + (sendEmail ? ' 이메일이 발송되었습니다.' : ''));
      setIsReplyDialogOpen(false);
      setSelectedContact(null);
      setReplyText('');

      // 문의 목록 새로고침
      await loadContacts();
    } catch (error) {
      console.error('Failed to submit reply:', error);
      toast.error(error instanceof Error ? error.message : '답변 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    let filtered = contacts;

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact.subject && contact.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        contact.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 정렬
    if (sortBy === 'date') {
      filtered = [...filtered].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === 'priority') {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      filtered = [...filtered].sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99;
        return aPriority - bPriority;
      });
    }

    setFilteredContacts(filtered);
  }, [searchQuery, sortBy, contacts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">문의 관리</h2>
          <p className="text-gray-600">고객 문의를 관리하세요</p>
        </div>
        <Button onClick={loadContacts} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* 첫 번째 줄: 검색 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="이름, 이메일, 제목, 내용 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 두 번째 줄: 필터 & 정렬 */}
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="new">신규</SelectItem>
                  <SelectItem value="in_progress">처리중</SelectItem>
                  <SelectItem value="resolved">해결됨</SelectItem>
                  <SelectItem value="closed">종료됨</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  <SelectItem value="general">일반 문의</SelectItem>
                  <SelectItem value="booking">예약 문의</SelectItem>
                  <SelectItem value="technical">기술 지원</SelectItem>
                  <SelectItem value="partnership">파트너십</SelectItem>
                  <SelectItem value="complaint">불만/건의</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: 'date' | 'priority') => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">최신순</SelectItem>
                  <SelectItem value="priority">우선순위순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">문의를 불러오는 중...</p>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <h3 className="font-semibold">{contact.subject || '(제목 없음)'}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.priority && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            contact.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            contact.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            contact.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {contact.priority === 'urgent' ? '긴급' :
                             contact.priority === 'high' ? '높음' :
                             contact.priority === 'medium' ? '보통' : '낮음'}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs ${
                          contact.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          contact.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          contact.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {contact.status === 'resolved' ? '해결됨' :
                           contact.status === 'in_progress' ? '처리중' :
                           contact.status === 'closed' ? '종료됨' : '신규'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {contact.category && (
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                          {contact.category === 'general' ? '일반' :
                           contact.category === 'booking' ? '예약' :
                           contact.category === 'technical' ? '기술' :
                           contact.category === 'partnership' ? '파트너십' :
                           contact.category === 'complaint' ? '불만/건의' : contact.category}
                        </span>
                      )}
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{contact.name}</span>
                        {' '}(<a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>)
                        {contact.phone && <span className="ml-2 text-gray-500">{contact.phone}</span>}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{contact.message}</p>
                    {contact.response && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
                        <strong>답변:</strong> {contact.response.substring(0, 100)}...
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        {new Date(contact.created_at).toLocaleDateString('ko-KR')} {new Date(contact.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => openReplyDialog(contact)}>
                        <Send className="h-3 w-3 mr-1" />
                        {contact.response ? '답변 수정' : '답변하기'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">문의가 없습니다</p>
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 답변 Dialog */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>문의 답변하기</DialogTitle>
          </DialogHeader>

          {selectedContact && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg">{selectedContact.subject || '(제목 없음)'}</h4>
                  <div className="flex items-center gap-2">
                    {selectedContact.priority && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        selectedContact.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        selectedContact.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        selectedContact.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedContact.priority === 'urgent' ? '긴급' :
                         selectedContact.priority === 'high' ? '높음' :
                         selectedContact.priority === 'medium' ? '보통' : '낮음'}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedContact.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      selectedContact.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      selectedContact.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedContact.status === 'resolved' ? '해결됨' :
                       selectedContact.status === 'in_progress' ? '처리중' :
                       selectedContact.status === 'closed' ? '종료됨' : '신규'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedContact.category && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                      {selectedContact.category === 'general' ? '일반' :
                       selectedContact.category === 'booking' ? '예약' :
                       selectedContact.category === 'technical' ? '기술' :
                       selectedContact.category === 'partnership' ? '파트너십' :
                       selectedContact.category === 'complaint' ? '불만/건의' : selectedContact.category}
                    </span>
                  )}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{selectedContact.name}</span> (<a href={`mailto:${selectedContact.email}`} className="text-blue-600 hover:underline">{selectedContact.email}</a>)
                    {selectedContact.phone && <span className="ml-2">{selectedContact.phone}</span>}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  접수: {new Date(selectedContact.created_at).toLocaleString('ko-KR')}
                  {selectedContact.responded_at && (
                    <span className="ml-4">답변: {new Date(selectedContact.responded_at).toLocaleString('ko-KR')}</span>
                  )}
                </div>
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm font-semibold mb-1">문의 내용:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedContact.message}</p>
                </div>
                {selectedContact.response && (
                  <div className="border-t pt-2 mt-2 bg-blue-50 p-3 rounded">
                    <p className="text-sm font-semibold mb-1 text-blue-900">이전 답변:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedContact.response}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply">답변 내용 *</Label>
                <Textarea
                  id="reply"
                  placeholder="고객에게 전달할 답변을 작성해주세요..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">{replyText.length} / 최소 10자 이상</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                />
                <Label
                  htmlFor="sendEmail"
                  className="text-sm font-normal cursor-pointer"
                >
                  고객 이메일({selectedContact.email})로 답변 발송
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReplyDialogOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmitReply}
              disabled={isSubmitting || !replyText.trim() || replyText.length < 10}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  답변 등록 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  답변 등록
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

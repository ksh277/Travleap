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
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export function AdminContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // 답변 Dialog 상태
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/contacts');
      const data = await response.json();
      setContacts(data.data || []);
      setFilteredContacts(data.data || []);
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
    setReplyText('');
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
  }, []);

  useEffect(() => {
    let filtered = contacts;

    if (searchQuery) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => contact.status === statusFilter);
    }

    setFilteredContacts(filtered);
  }, [searchQuery, statusFilter, contacts]);

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
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="이름, 이메일, 제목 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="new">신규</SelectItem>
                <SelectItem value="in_progress">처리중</SelectItem>
                <SelectItem value="resolved">해결됨</SelectItem>
              </SelectContent>
            </Select>
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
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <h3 className="font-semibold">{contact.subject}</h3>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        contact.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        contact.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {contact.status === 'resolved' ? '해결됨' :
                         contact.status === 'in_progress' ? '처리중' : '신규'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{contact.name}</span> (<a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>)
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{contact.message}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        {new Date(contact.created_at).toLocaleDateString('ko-KR')}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => openReplyDialog(contact)}>
                        <Send className="h-3 w-3 mr-1" />
                        답변하기
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
                  <h4 className="font-semibold text-lg">{selectedContact.subject}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    selectedContact.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    selectedContact.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedContact.status === 'resolved' ? '해결됨' :
                     selectedContact.status === 'in_progress' ? '처리중' : '신규'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{selectedContact.name}</span> (<a href={`mailto:${selectedContact.email}`} className="text-blue-600 hover:underline">{selectedContact.email}</a>)
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(selectedContact.created_at).toLocaleString('ko-KR')}
                </div>
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedContact.message}</p>
                </div>
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

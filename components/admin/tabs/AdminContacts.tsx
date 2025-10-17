import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Search, RefreshCw, Mail } from 'lucide-react';

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

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/contacts');
      const data = await response.json();
      setContacts(data.contacts || []);
      setFilteredContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
      setFilteredContacts([]);
    } finally {
      setIsLoading(false);
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
                      <span className="font-medium">{contact.name}</span> ({contact.email})
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{contact.message}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        {new Date(contact.created_at).toLocaleDateString('ko-KR')}
                      </span>
                      <Button size="sm" variant="outline">
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
    </div>
  );
}

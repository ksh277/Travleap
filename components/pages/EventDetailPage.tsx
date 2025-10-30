/**
 * 행사 상세 페이지
 * Phase 6: 행사 시스템
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  MapPin, Clock, Calendar, AlertTriangle, Ticket,
  Loader2, Heart, Share2, ChevronLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

interface Event {
  id: number;
  title: string;
  description: string;
  event_type: string;
  genre: string;
  start_datetime: string;
  end_datetime: string;
  doors_open_time: string;
  venue_name: string;
  venue_address: string;
  total_capacity: number;
  tickets_remaining: number;
  age_restriction: string;
  has_seats: boolean;
  performers: string[];
  general_price_krw: number;
  vip_price_krw: number;
  poster_url: string;
  running_time_minutes: number;
  intermission: boolean;
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const [ticketType, setTicketType] = useState<'general' | 'vip'>('general');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/event/list?limit=1`);
        const result = await response.json();

        if (result.success) {
          setEvent(result.data[0]);
        } else {
          setError('행사 정보를 찾을 수 없습니다');
        }
      } catch (err) {
        setError('정보를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const calculateTotal = () => {
    if (!event) return 0;
    const price = ticketType === 'vip' ? event.vip_price_krw : event.general_price_krw;
    return price * quantity;
  };

  const handleBooking = () => {
    if (!event) return;

    navigate(`/event/booking/${event.id}`, {
      state: {
        event,
        ticketType,
        quantity,
        totalPrice: calculateTotal()
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-600">{error}</p>
        <Button onClick={() => navigate('/event')}>목록으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setIsFavorite(!isFavorite)}>
                <Heart className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                <ImageWithFallback
                  src={event.poster_url}
                  alt={event.title}
                  className="w-full h-96 object-cover"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{event.title}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge>{event.event_type}</Badge>
                  {event.genre && <Badge variant="outline">{event.genre}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">{event.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(event.start_datetime), 'yyyy년 M월 d일 (E) HH:mm', { locale: ko })}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.venue_name} ({event.venue_address})
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    런닝타임 {event.running_time_minutes}분 {event.intermission && '(인터미션 포함)'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    남은 좌석: {event.tickets_remaining}석
                  </div>
                </div>

                {event.performers.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">출연진</h4>
                    <div className="flex flex-wrap gap-2">
                      {event.performers.map((performer, idx) => (
                        <Badge key={idx} variant="outline">{performer}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {event.age_restriction && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{event.age_restriction}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>티켓 예매</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!event.has_seats && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">티켓 종류</label>
                      <div className="space-y-2">
                        <div
                          className={`p-3 border-2 rounded-lg cursor-pointer ${
                            ticketType === 'general' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                          onClick={() => setTicketType('general')}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">일반석</span>
                            <span className="text-lg font-bold">{event.general_price_krw.toLocaleString()}원</span>
                          </div>
                        </div>
                        {event.vip_price_krw && (
                          <div
                            className={`p-3 border-2 rounded-lg cursor-pointer ${
                              ticketType === 'vip' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                            onClick={() => setTicketType('vip')}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">VIP석</span>
                              <span className="text-lg font-bold">{event.vip_price_krw.toLocaleString()}원</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">수량</label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center">{quantity}</span>
                        <Button
                          variant="outline"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {event.has_seats && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-4">
                      좌석 선택은 예매 페이지에서 진행됩니다
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">총 금액</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {calculateTotal().toLocaleString()}원
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={event.tickets_remaining === 0}
                >
                  {event.tickets_remaining === 0 ? '매진' : '예매하기'}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  예매 후 입장 시 QR 티켓을 제시해주세요
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

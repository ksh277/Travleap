import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Brain,
  MapPin,
  Calendar,
  DollarSign,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  ArrowLeft,
  FolderHeart
} from 'lucide-react';
import { toast } from 'sonner';

interface CourseItem {
  id: number;
  listing_id: number;
  item_order: number;
  day_number: number;
  reason: string;
  title: string;
  category: string;
  short_description: string;
  price_from: number;
  location: string;
  lat: number;
  lng: number;
  images: string[];
  rating_avg: number;
}

interface Course {
  id: number;
  course_name: string;
  description: string;
  travel_style: string[];
  budget: number;
  duration: number;
  group_size: number;
  total_price: number;
  match_percentage: number;
  tips: string[];
  item_count: number;
  created_at: string;
  items: CourseItem[];
}

export function MyCoursesPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const mapRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const googleMapsRef = useRef<{ [key: number]: google.maps.Map | null }>({});

  useEffect(() => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다');
      navigate('/login');
      return;
    }

    fetchCourses();
  }, [isLoggedIn]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/my/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      if (data.success) {
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('코스 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCourse = async (courseId: number) => {
    if (!confirm('이 코스를 삭제하시겠습니까?')) return;

    setDeletingId(courseId);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/my/courses?id=${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete course');
      }

      setCourses(prev => prev.filter(c => c.id !== courseId));
      toast.success('코스가 삭제되었습니다');
    } catch (error) {
      console.error('Failed to delete course:', error);
      toast.error('코스 삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (courseId: number) => {
    setExpandedCourse(prev => prev === courseId ? null : courseId);
  };

  // 코스 확장 시 지도 초기화
  useEffect(() => {
    if (expandedCourse === null) return;

    const course = courses.find(c => c.id === expandedCourse);
    if (!course || !course.items || course.items.length === 0) return;

    const mapContainer = mapRefs.current[expandedCourse];
    if (!mapContainer) return;

    const initMap = () => {
      const items = course.items.filter(item => item.lat && item.lng);
      if (items.length === 0) return;

      const avgLat = items.reduce((sum, item) => sum + item.lat, 0) / items.length;
      const avgLng = items.reduce((sum, item) => sum + item.lng, 0) / items.length;

      const map = new google.maps.Map(mapContainer, {
        center: { lat: avgLat, lng: avgLng },
        zoom: 11,
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
      });

      googleMapsRef.current[expandedCourse] = map;

      // 마커 추가
      items.forEach((item, index) => {
        new google.maps.Marker({
          position: { lat: item.lat, lng: item.lng },
          map,
          title: item.title,
          label: {
            text: `${index + 1}`,
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 20,
            fillColor: '#EF4444',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3
          }
        });
      });

      // Polyline 추가
      const path = items.map(item => ({ lat: item.lat, lng: item.lng }));
      new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#EF4444',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: 1
          },
          offset: '50%',
          repeat: '100px'
        }]
      }).setMap(map);

      // 경계 맞추기
      const bounds = new google.maps.LatLngBounds();
      items.forEach(item => bounds.extend({ lat: item.lat, lng: item.lng }));
      map.fitBounds(bounds);
    };

    if (window.google && window.google.maps) {
      setTimeout(initMap, 100);
    }
  }, [expandedCourse, courses]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <FolderHeart className="h-12 w-12 mr-3" />
              <h1 className="text-4xl font-bold">내 코스</h1>
            </div>
            <p className="text-xl opacity-90">
              저장한 AI 추천 코스 목록
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 뒤로 가기 */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로 가기
        </Button>

        {courses.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FolderHeart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                저장된 코스가 없습니다
              </h3>
              <p className="text-gray-500 mb-4">
                AI 코스 추천에서 마음에 드는 코스를 저장해보세요
              </p>
              <Button
                onClick={() => navigate('/ai-course')}
                className="bg-red-500 hover:bg-red-600"
              >
                <Brain className="h-4 w-4 mr-2" />
                AI 코스 추천 받기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {courses.map(course => (
              <Card key={course.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* 코스 헤더 */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpand(course.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold">{course.course_name}</h3>
                          <Badge className="bg-green-500 text-white">
                            {course.match_percentage}% 매칭
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{course.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {course.duration === 1 ? '당일치기' : `${course.duration - 1}박 ${course.duration}일`}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {course.total_price.toLocaleString()}원
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {course.item_count}개 장소
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(course.created_at)} 저장
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCourse(course.id);
                          }}
                          disabled={deletingId === course.id}
                          className="text-red-500 hover:text-red-700"
                        >
                          {deletingId === course.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                        {expandedCourse === course.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 확장된 상세 내용 */}
                  {expandedCourse === course.id && (
                    <div className="border-t bg-gray-50 p-6">
                      {/* 지도 */}
                      <div
                        ref={el => mapRefs.current[course.id] = el}
                        className="w-full h-[300px] rounded-lg border border-gray-200 mb-6"
                      />

                      {/* 상품 목록 */}
                      <div className="space-y-3">
                        {course.items.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex gap-4 p-4 bg-white rounded-lg border"
                          >
                            <div className="flex-shrink-0 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">{item.title}</h4>
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    {item.category}
                                  </Badge>
                                </div>
                                <span className="text-red-600 font-bold">
                                  ₩{item.price_from?.toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{item.location}</p>
                              {item.reason && (
                                <p className="text-sm text-blue-600 mt-2 bg-blue-50 p-2 rounded">
                                  💡 {item.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 여행 팁 */}
                      {course.tips && course.tips.length > 0 && (
                        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                          <h4 className="font-bold mb-2">💡 여행 팁</h4>
                          <ul className="text-sm space-y-1">
                            {course.tips.map((tip, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-2" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

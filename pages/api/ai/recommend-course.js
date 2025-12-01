import { connect } from '@planetscale/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json({ error: 'Preferences required' });
    }

    const db = connect({ url: process.env.DATABASE_URL });

    // 1. 좌표 있는 상품 가져오기 (팝업 제외)
    const result = await db.execute(`
      SELECT
        id,
        category,
        title,
        description_md,
        short_description,
        price_from,
        price_to,
        currency,
        images,
        lat,
        lng,
        location,
        address,
        duration,
        rating_avg,
        rating_count,
        view_count,
        booking_count,
        tags,
        highlights,
        amenities,
        included,
        excluded
      FROM listings
      WHERE is_published = 1
        AND is_active = 1
        AND lat IS NOT NULL
        AND lng IS NOT NULL
        AND category != '팝업'
        AND category IS NOT NULL
      ORDER BY booking_count DESC, view_count DESC, rating_avg DESC
      LIMIT 50
    `);

    const listings = result.rows.map(listing => {
      let images = [];
      let tags = [];
      let highlights = [];

      try {
        images = typeof listing.images === 'string' ? JSON.parse(listing.images || '[]') : (listing.images || []);
      } catch (e) {
        console.warn('Failed to parse images:', e);
      }

      try {
        tags = typeof listing.tags === 'string' ? JSON.parse(listing.tags || '[]') : (listing.tags || []);
      } catch (e) {
        console.warn('Failed to parse tags:', e);
      }

      try {
        highlights = typeof listing.highlights === 'string' ? JSON.parse(listing.highlights || '[]') : (listing.highlights || []);
      } catch (e) {
        console.warn('Failed to parse highlights:', e);
      }

      return {
        ...listing,
        popularityScore: (listing.booking_count || 0) * 1000 + (listing.view_count || 0) * 10 + (listing.rating_avg || 0) * 100,
        images,
        tags,
        highlights
      };
    });

    console.log(`📦 Found ${listings.length} products for AI recommendation`);

    // 상품이 없으면 에러 반환
    if (listings.length === 0) {
      console.warn('⚠️  No listings found for AI recommendations');
      return res.status(200).json({
        success: true,
        method: 'fallback',
        recommendations: []
      });
    }

    // 2. AI API 키 확인 (Gemini 우선, OpenAI 대체)
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey && geminiKey.startsWith('AIza')) {
      // Gemini API 사용
      console.log('🤖 Using Gemini API for recommendations');
      const aiRecommendations = await generateGeminiRecommendations(listings, preferences, geminiKey);
      return res.status(200).json({
        success: true,
        method: 'gemini',
        recommendations: aiRecommendations
      });
    } else if (openaiKey && openaiKey.startsWith('sk-')) {
      // OpenAI API 사용
      console.log('🤖 Using OpenAI API for recommendations');
      const aiRecommendations = await generateOpenAIRecommendations(listings, preferences, openaiKey);
      return res.status(200).json({
        success: true,
        method: 'openai',
        recommendations: aiRecommendations
      });
    } else {
      // 스마트 필터링 사용 (AI 키 없을 때)
      console.log('🧠 Using smart filtering (No AI API key configured)');
      const smartRecommendations = generateSmartRecommendations(listings, preferences);
      return res.status(200).json({
        success: true,
        method: 'smart-filter',
        recommendations: smartRecommendations
      });
    }

  } catch (error) {
    console.error('❌ Error generating AI recommendations:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Gemini API로 추천 생성
async function generateGeminiRecommendations(listings, preferences, apiKey) {
  try {
    const prompt = `
당신은 신안군 여행 전문 AI 플래너입니다. 사용자의 선호도에 맞는 최적의 여행 코스를 추천해주세요.

다음 상품들로 ${preferences.duration || 2}일 여행 코스를 추천해주세요.

여행 선호도:
- 여행 스타일: ${preferences.travelStyle?.join(', ') || '미지정'}
- 예산: ${preferences.budget?.[0]?.toLocaleString() || '미지정'}원
- 인원: ${preferences.groupSize || 2}명
- 관심사: ${preferences.interests?.join(', ') || '미지정'}

사용 가능한 상품 (JSON):
${JSON.stringify(listings.slice(0, 20).map(l => ({
  id: l.id,
  category: l.category,
  title: l.title,
  description: l.short_description,
  price: l.price_from,
  location: l.location,
  lat: l.lat,
  lng: l.lng,
  rating: l.rating_avg,
  tags: l.tags
})))}

다음 JSON 형식으로 4-6개 상품을 선택하여 추천해주세요. 반드시 JSON만 출력하세요:
{
  "course_name": "코스 이름",
  "total_duration": "${preferences.duration || 2}일",
  "total_price": 총가격숫자,
  "description": "코스 설명",
  "recommendations": [
    {
      "listing_id": 상품ID숫자,
      "order": 순서숫자,
      "day": 몇일차숫자,
      "reason": "추천 이유"
    }
  ],
  "tips": ["여행 팁1", "여행 팁2"]
}
`.trim();

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      throw new Error('Empty response from Gemini');
    }

    console.log('Gemini raw response:', aiResponse.substring(0, 500));

    // JSON 파싱 (```json ... ``` 형식 처리)
    let jsonStr = aiResponse;
    const jsonBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1];
    } else {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    const recommendation = JSON.parse(jsonStr);

    // 추천된 상품 상세 정보 매핑
    const enrichedRecommendations = recommendation.recommendations.map(rec => {
      const listing = listings.find(l => l.id === rec.listing_id);
      return {
        ...rec,
        listing: listing || null
      };
    }).filter(rec => rec.listing !== null);

    if (enrichedRecommendations.length === 0) {
      throw new Error('No valid listings in AI recommendations');
    }

    return [{
      id: 'gemini-1',
      courseName: recommendation.course_name,
      description: recommendation.description,
      totalDuration: recommendation.total_duration,
      totalPrice: recommendation.total_price || enrichedRecommendations.reduce((sum, r) => sum + (r.listing?.price_from || 0), 0),
      recommendations: enrichedRecommendations,
      tips: recommendation.tips || [],
      matchPercentage: 95 + Math.floor(Math.random() * 5),
      method: 'gemini'
    }];

  } catch (error) {
    console.error('Gemini API failed, falling back to smart filtering:', error);
    return generateSmartRecommendations(listings, preferences);
  }
}

// OpenAI API로 추천 생성
async function generateOpenAIRecommendations(listings, preferences, apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '당신은 신안군 여행 전문 AI 플래너입니다. 사용자의 선호도에 맞는 최적의 여행 코스를 추천해주세요.'
          },
          {
            role: 'user',
            content: `
다음 상품들로 ${preferences.duration || 2}일 여행 코스를 추천해주세요.

여행 선호도:
- 여행 스타일: ${preferences.travelStyle?.join(', ') || '미지정'}
- 예산: ${preferences.budget?.[0]?.toLocaleString() || '미지정'}원
- 인원: ${preferences.groupSize || 2}명
- 관심사: ${preferences.interests?.join(', ') || '미지정'}

사용 가능한 상품 (JSON):
${JSON.stringify(listings.slice(0, 20).map(l => ({
  id: l.id,
  category: l.category,
  title: l.title,
  description: l.short_description,
  price: l.price_from,
  location: l.location,
  lat: l.lat,
  lng: l.lng,
  rating: l.rating_avg,
  tags: l.tags
})))}

다음 JSON 형식으로 4-6개 상품을 선택하여 추천해주세요:
{
  "course_name": "코스 이름",
  "total_duration": "${preferences.duration || 2}일",
  "total_price": 총 가격(숫자),
  "description": "코스 설명",
  "recommendations": [
    {
      "listing_id": 상품ID,
      "order": 순서(1부터),
      "day": 몇일차,
      "reason": "추천 이유"
    }
  ],
  "tips": ["여행 팁1", "여행 팁2"]
}
            `.trim()
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // JSON 파싱
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const recommendation = JSON.parse(jsonMatch[0]);

    // 추천된 상품 상세 정보 매핑
    const enrichedRecommendations = recommendation.recommendations.map(rec => {
      const listing = listings.find(l => l.id === rec.listing_id);
      return {
        ...rec,
        listing: listing || null
      };
    });

    return [{
      id: 'ai-1',
      courseName: recommendation.course_name,
      description: recommendation.description,
      totalDuration: recommendation.total_duration,
      totalPrice: recommendation.total_price,
      recommendations: enrichedRecommendations,
      tips: recommendation.tips || [],
      matchPercentage: 98,
      method: 'openai'
    }];

  } catch (error) {
    console.error('OpenAI API failed, falling back to smart filtering:', error);
    return generateSmartRecommendations(listings, preferences);
  }
}

// 스마트 필터링으로 추천 생성 (OpenAI 없을 때)
function generateSmartRecommendations(listings, preferences) {
  // 안전 체크
  if (!listings || listings.length === 0) {
    console.warn('⚠️  No listings provided to generateSmartRecommendations');
    return [];
  }

  const budget = preferences.budget?.[0] || 500000;
  const duration = preferences.duration || 2;
  const perDayBudget = budget / duration;

  // 1. 예산 내 상품 필터링
  let filtered = listings.filter(l => (l.price_from || 0) <= perDayBudget * 1.2);

  // 예산 내 상품이 없으면 모든 상품 사용
  if (filtered.length === 0) {
    console.warn('⚠️  No listings within budget, using all listings');
    filtered = [...listings];
  }

  // 2. 관심사 매칭
  if (preferences.interests && preferences.interests.length > 0) {
    filtered = filtered.map(listing => {
      const tags = listing.tags || [];
      const category = listing.category?.toLowerCase() || '';

      let matchScore = 0;
      preferences.interests.forEach(interest => {
        if (category.includes(interest) || tags.some(tag => tag.toLowerCase().includes(interest))) {
          matchScore += 10;
        }
      });

      return { ...listing, matchScore };
    }).sort((a, b) => (b.matchScore + b.popularityScore) - (a.matchScore + a.popularityScore));
  } else {
    // 인기순 정렬
    filtered.sort((a, b) => b.popularityScore - a.popularityScore);
  }

  // 3. 다양한 카테고리에서 선택 (카테고리 믹스)
  const selectedByCategory = {};
  const selected = [];
  const targetCount = Math.min(duration + 2, 6); // 일정 일수 + 2개

  for (const listing of filtered) {
    const cat = listing.category;
    if (!selectedByCategory[cat]) {
      selectedByCategory[cat] = 0;
    }

    // 같은 카테고리는 최대 2개까지
    if (selectedByCategory[cat] < 2) {
      selected.push(listing);
      selectedByCategory[cat]++;
    }

    if (selected.length >= targetCount) {
      break;
    }
  }

  // 선택된 상품이 없으면 빈 배열 반환
  if (selected.length === 0) {
    console.warn('⚠️  No products selected after filtering');
    return [];
  }

  // 4. 총 비용 계산
  const totalPrice = selected.reduce((sum, l) => sum + (l.price_from || 0), 0);

  // 5. 추천 생성
  const recommendations = selected.map((listing, index) => ({
    listing_id: listing.id,
    order: index + 1,
    day: Math.ceil((index + 1) / 2), // 하루에 2-3개 활동
    reason: `${listing.category} 카테고리의 인기 상품 (평점 ${listing.rating_avg || 0}점)`,
    listing
  }));

  return [{
    id: 'smart-1',
    courseName: `신안 ${duration}일 맞춤 여행 코스`,
    description: `인기순 및 카테고리 다양성을 고려한 ${duration}일 여행 코스입니다.`,
    totalDuration: `${duration}일`,
    totalPrice,
    recommendations,
    tips: [
      '편안한 신발 착용을 권장합니다',
      '날씨를 확인하고 준비물을 챙기세요',
      '사전 예약으로 대기 시간을 줄일 수 있습니다',
      '현지 맛집과 특산품도 함께 즐겨보세요'
    ],
    matchPercentage: 85 + Math.floor(Math.random() * 10),
    method: 'smart-filter'
  }];
}

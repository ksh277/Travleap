import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../utils/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 필터 파라미터
    const category = req.query.category as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = req.query.sortBy as string || 'popular';
    const search = req.query.search as string;
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined;
    const rating = req.query.rating ? parseFloat(req.query.rating as string) : undefined;

    const offset = (page - 1) * limit;

    // 기본 쿼리
    let sql = `
      SELECT l.*, c.slug as category_slug, c.name_ko as category_name
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.is_published = 1 AND l.is_active = 1
    `;
    const params: any[] = [];

    // 카테고리 필터
    if (category && category !== 'all') {
      sql += ' AND c.slug = ?';
      params.push(category);
    }

    // 가격 필터
    if (minPrice !== undefined) {
      sql += ' AND l.price_from >= ?';
      params.push(minPrice);
    }
    if (maxPrice !== undefined) {
      sql += ' AND l.price_from <= ?';
      params.push(maxPrice);
    }

    // 평점 필터
    if (rating !== undefined) {
      sql += ' AND l.rating_avg >= ?';
      params.push(rating);
    }

    // 검색 필터
    if (search) {
      sql += ' AND (l.title LIKE ? OR l.description_md LIKE ? OR l.location LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 정렬
    switch (sortBy) {
      case 'price_low':
        sql += ' ORDER BY l.price_from ASC';
        break;
      case 'price_high':
        sql += ' ORDER BY l.price_from DESC';
        break;
      case 'rating':
        sql += ' ORDER BY l.rating_avg DESC, l.rating_count DESC';
        break;
      case 'newest':
        sql += ' ORDER BY l.created_at DESC';
        break;
      case 'popular':
      default:
        sql += ' ORDER BY l.view_count DESC, l.booking_count DESC, l.rating_avg DESC';
        break;
    }

    // 페이지네이션
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const listings = await db.query(sql, params);

    // 이미지 JSON 파싱
    const parsedListings = listings.map((listing: any) => ({
      ...listing,
      images: typeof listing.images === 'string' ? JSON.parse(listing.images || '[]') : listing.images,
      amenities: typeof listing.amenities === 'string' ? JSON.parse(listing.amenities || '[]') : listing.amenities,
      highlights: typeof listing.highlights === 'string' ? JSON.parse(listing.highlights || '[]') : listing.highlights,
      included: typeof listing.included === 'string' ? JSON.parse(listing.included || '[]') : listing.included,
      excluded: typeof listing.excluded === 'string' ? JSON.parse(listing.excluded || '[]') : listing.excluded,
      tags: typeof listing.tags === 'string' ? JSON.parse(listing.tags || '[]') : listing.tags
    }));

    res.status(200).json({
      success: true,
      data: parsedListings,
      pagination: {
        page,
        limit,
        total: parsedListings.length
      }
    });
  } catch (error) {
    console.error('API /listings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listings',
      data: []
    });
  }
}

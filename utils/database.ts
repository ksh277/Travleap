import { connect, Connection } from '@planetscale/database';

export interface DatabaseConfig {
  url: string;
}

export interface QueryResult {
  rows: any[];
  insertId?: number;
  affectedRows?: number;
}

class Database {
  private connection: Connection;

  constructor() {
    const databaseUrl = import.meta.env.VITE_DATABASE_URL;

    if (!databaseUrl) {
      console.warn('VITE_DATABASE_URL not set - using fallback');
    }

    const config = {
      url: databaseUrl || 'mysql://localhost:3306/travleap'
    };

    this.connection = connect(config);
  }

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    try {
      const result = await this.connection.execute(sql, params);

      return {
        rows: result.rows || [],
        insertId: Number(result.insertId) || 0,
        affectedRows: result.rowsAffected
      };
    } catch (error) {
      console.error('Database execution error:', error);

      // DB 연결 실패 시에도 앱이 계속 작동하도록 빈 결과 반환
      if (!error.message?.includes('Unknown column') && !error.message?.includes("doesn't exist")) {
        console.warn('Database query failed, returning empty result:', error);
      }
      return {
        rows: [],
        insertId: 0,
        affectedRows: 0
      };
    }
  }

  // 기본 CRUD 작업
  async select(table: string, where?: Record<string, any>): Promise<any[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];

    if (where) {
      const conditions = Object.keys(where).map((key) => {
        params.push(where[key]);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.execute(sql, params);
    return result.rows;
  }

  async insert(table: string, data: Record<string, any>): Promise<{ id: number; [key: string]: any }> {

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await this.execute(sql, values);

    const returnValue = { id: Number(result.insertId) || Date.now(), ...data };

    return returnValue;
  }

  async update(table: string, id: number, data: Record<string, any>): Promise<boolean> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const result = await this.execute(sql, [...values, id]);

    return (result.affectedRows || 0) > 0;
  }

  async delete(table: string, id: number): Promise<boolean> {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const result = await this.execute(sql, [id]);

    return (result.affectedRows || 0) > 0;
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.execute(sql, params);
    return result.rows;
  }

  // 상품 목록 조회 (특화)
  async getListings(filters: {
    category?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    let sql = `
      SELECT
        l.*,
        c.name_ko as category_name,
        c.slug as category_slug
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.is_published = 1
    `;
    const params: any[] = [];

    if (filters.category && filters.category !== 'all') {
      sql += ' AND c.slug = ?';
      params.push(filters.category);
    }

    if (filters.location) {
      sql += ' AND l.location LIKE ?';
      params.push(`%${filters.location}%`);
    }

    if (filters.minPrice) {
      sql += ' AND l.price_from >= ?';
      params.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      sql += ' AND l.price_from <= ?';
      params.push(filters.maxPrice);
    }

    sql += ' ORDER BY l.created_at DESC';

    if (filters.limit) {
      sql += ` LIMIT ${filters.limit}`;
      if (filters.offset) {
        sql += ` OFFSET ${filters.offset}`;
      }
    }

    return this.query(sql, params);
  }

  // 카테고리 목록 조회
  async getCategories(): Promise<any[]> {
    return this.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order');
  }

  // 테스트 연결 메서드 추가
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as test');
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }

  // 파트너 목록 조회 메서드 추가
  async getPartners(): Promise<any[]> {
    try {
      return this.query('SELECT * FROM partners WHERE status = "approved" ORDER BY created_at DESC');
    } catch (error) {
      return [];
    }
  }

  // 리뷰 목록 조회
  async getReviews(listingId?: number): Promise<any[]> {
    if (listingId) {
      return this.query(`
        SELECT r.*, u.name as user_name, l.title as listing_title
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE r.listing_id = ?
        ORDER BY r.created_at DESC
      `, [listingId]);
    } else {
      return this.query(`
        SELECT r.*, u.name as user_name, l.title as listing_title, l.location as listing_location
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE r.is_verified = 1
        ORDER BY r.created_at DESC
        LIMIT 10
      `);
    }
  }

  // 데이터베이스 초기화
  async initializeIfEmpty(): Promise<void> {
    try {
      // 테이블 생성 및 데이터 시드
      await this.createTables();
      await this.seedBasicData();
    } catch (error) {
      console.warn('Database initialization failed:', error);
      // 테이블이 없는 경우 생성
      try {
        await this.createTables();
        await this.seedBasicData();
      } catch (fallbackError) {
        console.error('Database fallback initialization failed:', fallbackError);
      }
    }
  }

  // 강제 데이터베이스 재초기화 (개발용)
  async forceReinitialize(): Promise<void> {
    try {
      await this.createTables();
      await this.seedBasicData();
    } catch (error) {
      console.error('Force reinitialization failed:', error);
    }
  }

  private async createTables(): Promise<void> {
    // 카테고리 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(50) UNIQUE NOT NULL,
        name_ko VARCHAR(100) NOT NULL,
        name_en VARCHAR(100),
        icon VARCHAR(50),
        color_hex VARCHAR(7),
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 상품 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS listings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        category VARCHAR(50) NOT NULL,
        partner_id INT,
        title VARCHAR(300) NOT NULL,
        description_md TEXT,
        short_description TEXT,
        price_from DECIMAL(10, 2),
        price_to DECIMAL(10, 2),
        currency VARCHAR(10) DEFAULT 'KRW',
        images JSON,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        location VARCHAR(200),
        address TEXT,
        coordinates VARCHAR(100),
        duration VARCHAR(50),
        max_capacity INT DEFAULT 10,
        min_capacity INT DEFAULT 1,
        min_age INT,
        difficulty ENUM('easy', 'moderate', 'hard') DEFAULT 'easy',
        meeting_point TEXT,
        cancellation_policy TEXT,
        highlights JSON,
        included JSON,
        excluded JSON,
        amenities JSON,
        tags JSON,
        policies TEXT,
        rating_avg DECIMAL(3, 2) DEFAULT 0.00,
        rating_count INT DEFAULT 0,
        view_count INT DEFAULT 0,
        booking_count INT DEFAULT 0,
        start_date DATE,
        end_date DATE,
        available_from TIMESTAMP,
        available_to TIMESTAMP,
        is_published BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        featured_score INT DEFAULT 0,
        partner_boost INT DEFAULT 0,
        sponsored_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category_id),
        INDEX idx_location (location),
        INDEX idx_price (price_from),
        INDEX idx_rating (rating_avg),
        INDEX idx_featured (is_featured),
        INDEX idx_active (is_active, is_published)
      )
    `);

    // 사용자 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role ENUM('user', 'partner', 'admin') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 리뷰 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT NOT NULL,
        user_id INT NOT NULL,
        booking_id INT,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(200),
        comment_md TEXT,
        pros TEXT,
        cons TEXT,
        visit_date DATE,
        images JSON,
        is_verified BOOLEAN DEFAULT FALSE,
        is_published BOOLEAN DEFAULT TRUE,
        is_visible BOOLEAN DEFAULT TRUE,
        helpful_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing (listing_id),
        INDEX idx_user (user_id)
      )
    `);

    // 파트너 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS partners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        business_name VARCHAR(200) NOT NULL,
        contact_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        business_number VARCHAR(50),
        website VARCHAR(500),
        instagram VARCHAR(100),
        description TEXT,
        services TEXT,
        tier ENUM('bronze', 'silver', 'gold', 'vip') DEFAULT 'bronze',
        is_verified BOOLEAN DEFAULT FALSE,
        is_featured BOOLEAN DEFAULT FALSE,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        business_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_user (user_id)
      )
    `);

    // 예약 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_number VARCHAR(50) UNIQUE NOT NULL,
        listing_id INT NOT NULL,
        user_id INT NOT NULL,
        start_date DATE,
        end_date DATE,
        check_in_time TIME,
        check_out_time TIME,
        num_adults INT DEFAULT 1,
        num_children INT DEFAULT 0,
        num_seniors INT DEFAULT 0,
        price_adult DECIMAL(10, 2),
        price_child DECIMAL(10, 2),
        price_senior DECIMAL(10, 2),
        subtotal DECIMAL(10, 2),
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method ENUM('card', 'bank_transfer', 'kakaopay', 'naverpay') NOT NULL,
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
        customer_info JSON,
        special_requests TEXT,
        cancellation_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing (listing_id),
        INDEX idx_user (user_id),
        INDEX idx_status (status)
      )
    `);

    // 결제 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        payment_method ENUM('card', 'bank_transfer', 'kakaopay', 'naverpay') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'KRW',
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        transaction_id VARCHAR(200),
        gateway_response JSON,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking (booking_id),
        INDEX idx_status (status)
      )
    `);

    // 블로그 포스트 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        slug VARCHAR(300) UNIQUE NOT NULL,
        content_md TEXT,
        excerpt TEXT,
        featured_image VARCHAR(500),
        images JSON,
        tags JSON,
        category VARCHAR(100),
        author_id INT,
        views INT DEFAULT 0,
        likes INT DEFAULT 0,
        is_published BOOLEAN DEFAULT FALSE,
        is_featured BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_published (is_published),
        INDEX idx_category (category),
        INDEX idx_author (author_id)
      )
    `);

    // 이미지 테이블 (BLOB 저장 지원)
    await this.execute(`
      CREATE TABLE IF NOT EXISTS images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type ENUM('listing', 'partner', 'user', 'review', 'blog', 'general') NOT NULL,
        entity_id INT,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255),
        file_path VARCHAR(500),
        file_url VARCHAR(500),
        file_data LONGBLOB,
        file_size INT,
        mime_type VARCHAR(100),
        width INT,
        height INT,
        alt_text VARCHAR(255),
        is_primary BOOLEAN DEFAULT FALSE,
        uploaded_by INT,
        storage_type ENUM('blob', 'url') DEFAULT 'blob',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_uploader (uploaded_by),
        INDEX idx_storage_type (storage_type)
      )
    `);

    // 관리자 설정 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_category VARCHAR(50) DEFAULT 'general',
        description TEXT,
        data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (setting_category)
      )
    `);

    // 관리자 로그 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin (admin_id),
        INDEX idx_action (action),
        INDEX idx_entity (entity_type, entity_id)
      )
    `);

    // 파트너 신청 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS partner_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        business_name VARCHAR(200) NOT NULL,
        contact_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        business_number VARCHAR(50),
        business_address TEXT,
        description TEXT,
        services TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        reviewed_by INT,
        review_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_user (user_id)
      )
    `);
  }

  private async seedBasicData(): Promise<void> {
    // 기본 관리자 계정 생성
    await this.execute(`
      INSERT IGNORE INTO users (user_id, email, password_hash, name, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['admin_shinan', 'admin@shinan.com', 'hashed_admin123', '관리자', '010-0000-0000', 'admin']);

    // 테스트 사용자 계정들 추가
    const testUsers = [
      { user_id: 'test_user1', email: 'user1@test.com', password_hash: 'hashed_user123', name: '김신안', phone: '010-1234-5678', role: 'user' },
      { user_id: 'test_user2', email: 'user2@test.com', password_hash: 'hashed_user123', name: '박홍도', phone: '010-2345-6789', role: 'user' },
      { user_id: 'test_user3', email: 'user3@test.com', password_hash: 'hashed_user123', name: '이증도', phone: '010-3456-7890', role: 'user' },
      { user_id: 'partner1', email: 'partner1@test.com', password_hash: 'hashed_partner123', name: '최비금', phone: '010-4567-8901', role: 'partner' },
      { user_id: 'partner2', email: 'partner2@test.com', password_hash: 'hashed_partner123', name: '정도초', phone: '010-5678-9012', role: 'partner' }
    ];

    for (const user of testUsers) {
      await this.execute(`
        INSERT IGNORE INTO users (user_id, email, password_hash, name, phone, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [user.user_id, user.email, user.password_hash, user.name, user.phone, user.role]);
    }

    // 8개 카테고리 데이터
    const categoriesData = [
      { slug: 'tour', name_ko: '여행', name_en: 'Travel', icon: 'map', color_hex: '#FF6B6B', sort_order: 1 },
      { slug: 'rentcar', name_ko: '렌트카', name_en: 'Car Rental', icon: 'car', color_hex: '#4ECDC4', sort_order: 2 },
      { slug: 'stay', name_ko: '숙박', name_en: 'Accommodation', icon: 'bed', color_hex: '#45B7D1', sort_order: 3 },
      { slug: 'food', name_ko: '음식', name_en: 'Food', icon: 'utensils', color_hex: '#96CEB4', sort_order: 4 },
      { slug: 'tourist', name_ko: '관광지', name_en: 'Tourist Spots', icon: 'camera', color_hex: '#FFEAA7', sort_order: 5 },
      { slug: 'popup', name_ko: '팝업', name_en: 'Pop-up', icon: 'star', color_hex: '#FF9FF3', sort_order: 6 },
      { slug: 'event', name_ko: '행사', name_en: 'Events', icon: 'calendar', color_hex: '#54A0FF', sort_order: 7 },
      { slug: 'experience', name_ko: '체험', name_en: 'Experience', icon: 'heart', color_hex: '#5F27CD', sort_order: 8 }
    ];

    for (const category of categoriesData) {
      await this.execute(`
        INSERT IGNORE INTO categories (slug, name_ko, name_en, icon, color_hex, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [category.slug, category.name_ko, category.name_en, category.icon, category.color_hex, category.sort_order]);
    }

    // 관리자 설정 초기 데이터
    const adminSettingsData = [
      { setting_key: 'site_name', setting_value: 'Travleap', setting_category: 'general', description: '사이트 이름', data_type: 'string' },
      { setting_key: 'commission_rate', setting_value: '10', setting_category: 'finance', description: '수수료율 (%)', data_type: 'number' },
      { setting_key: 'max_images_per_listing', setting_value: '10', setting_category: 'listing', description: '상품당 최대 이미지 수', data_type: 'number' },
      { setting_key: 'default_currency', setting_value: 'KRW', setting_category: 'general', description: '기본 통화', data_type: 'string' },
      { setting_key: 'maintenance_mode', setting_value: 'false', setting_category: 'system', description: '유지보수 모드', data_type: 'boolean' }
    ];

    for (const setting of adminSettingsData) {
      await this.execute(`
        INSERT IGNORE INTO admin_settings (setting_key, setting_value, setting_category, description, data_type, updated_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [setting.setting_key, setting.setting_value, setting.setting_category, setting.description, setting.data_type, 1]);
    }

    // 테스트 파트너 데이터
    const partnersData = [
      {
        user_id: 5, // partner1 사용자
        business_name: '신안 여행사',
        contact_name: '최비금',
        email: 'partner1@test.com',
        phone: '010-4567-8901',
        business_number: '123-45-67890',
        description: '신안군 전문 여행사입니다.',
        services: '여행 상품 기획, 가이드 서비스',
        tier: 'gold',
        status: 'approved',
        is_verified: true
      },
      {
        user_id: 6, // partner2 사용자
        business_name: '신안 해양관광',
        contact_name: '정도초',
        email: 'partner2@test.com',
        phone: '010-5678-9012',
        business_number: '234-56-78901',
        description: '해양 관광 전문 업체입니다.',
        services: '해상 투어, 숙박 시설 운영',
        tier: 'silver',
        status: 'approved',
        is_verified: true
      }
    ];

    for (const partner of partnersData) {
      await this.execute(`
        INSERT IGNORE INTO partners (user_id, business_name, contact_name, email, phone, business_number, description, services, tier, status, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [partner.user_id, partner.business_name, partner.contact_name, partner.email, partner.phone, partner.business_number, partner.description, partner.services, partner.tier, partner.status, partner.is_verified]);
    }

    // 테스트 블로그 포스트 데이터
    const blogPostsData = [
      {
        title: '신안 여행의 매력',
        slug: 'shinan-travel-charm',
        content_md: '신안군은 천혜의 자연환경과 아름다운 섬들로 이루어진 관광지입니다...',
        excerpt: '신안군의 아름다운 자연과 관광 명소를 소개합니다.',
        featured_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
        tags: JSON.stringify(['여행', '신안', '섬']),
        category: '여행 가이드',
        author_id: 1,
        is_published: true,
        published_at: new Date().toISOString()
      },
      {
        title: '퍼플교의 아름다운 석양',
        slug: 'purple-bridge-sunset',
        content_md: '퍼플교에서 바라보는 석양은 정말 장관입니다...',
        excerpt: '퍼플교의 아름다운 석양 풍경을 담았습니다.',
        featured_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
        tags: JSON.stringify(['퍼플교', '석양', '사진']),
        category: '포토 스팟',
        author_id: 1,
        is_published: true,
        published_at: new Date().toISOString()
      }
    ];

    for (const post of blogPostsData) {
      await this.execute(`
        INSERT IGNORE INTO blog_posts (title, slug, content_md, excerpt, featured_image, tags, category, author_id, is_published, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [post.title, post.slug, post.content_md, post.excerpt, post.featured_image, post.tags, post.category, post.author_id, post.is_published, post.published_at]);
    }

    // 더 많은 상품 데이터
    const listingsData = [
      {
        category_id: 1,
        category: 'tour',
        title: '증도 천일염 체험여행',
        short_description: '전통 천일염 제조 과정을 직접 체험하며 소금의 역사를 배워보는 여행',
        location: '신안군 증도면',
        price_from: 25000,
        price_to: 35000,
        duration: '2시간',
        max_capacity: 30,
        images: JSON.stringify(['https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400']),
        is_featured: true
      },
      {
        category_id: 1,
        category: 'tour',
        title: '홍도 해상국립공원 여행',
        short_description: '아름다운 홍도의 기암절벽과 해안 절경을 만끽하는 해상 여행',
        location: '신안군 홍도면',
        price_from: 45000,
        price_to: 65000,
        duration: '4시간',
        max_capacity: 25,
        images: JSON.stringify(['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400']),
        is_featured: true
      },
      {
        category_id: 1,
        category: 'tour',
        title: '비금도 자연탐방',
        short_description: '비금도의 아름다운 자연과 함께하는 힐링 트레킹',
        location: '신안군 비금면',
        price_from: 30000,
        price_to: 40000,
        duration: '3시간',
        max_capacity: 20,
        images: JSON.stringify(['https://images.unsplash.com/photo-1464822759880-4601b726be04?w=400']),
        is_featured: true
      },
      {
        category_id: 1,
        category: 'tour',
        title: '도초도 갯벌체험',
        short_description: '도초도 갯벌에서 조개잡기와 갯벌생태 체험',
        location: '신안군 도초면',
        price_from: 20000,
        price_to: 30000,
        duration: '2시간',
        max_capacity: 40,
        images: JSON.stringify(['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400']),
        is_featured: true
      },
      {
        category_id: 3,
        category: 'stay',
        title: '퍼플교 해상펜션',
        short_description: '퍼플교 전망이 아름다운 프리미엄 해상펜션에서의 힐링 스테이',
        location: '신안군 암태면',
        price_from: 120000,
        price_to: 180000,
        duration: '1박',
        max_capacity: 4,
        images: JSON.stringify(['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400']),
        is_featured: true
      },
      {
        category_id: 3,
        category: 'stay',
        title: '신안 바다뷰 펜션',
        short_description: '바다가 한눈에 보이는 프라이빗 펜션',
        location: '신안군 지도면',
        price_from: 80000,
        price_to: 120000,
        duration: '1박',
        max_capacity: 6,
        images: JSON.stringify(['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400']),
        is_featured: false
      },
      {
        category_id: 3,
        category: 'stay',
        title: '홍도 게스트하우스',
        short_description: '홍도 섬 중심가의 아늑한 게스트하우스',
        location: '신안군 홍도면',
        price_from: 60000,
        price_to: 90000,
        duration: '1박',
        max_capacity: 8,
        images: JSON.stringify(['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400']),
        is_featured: false
      },
      {
        category_id: 3,
        category: 'stay',
        title: '증도 민박',
        short_description: '증도 갯벌 근처의 전통 민박집',
        location: '신안군 증도면',
        price_from: 40000,
        price_to: 70000,
        duration: '1박',
        max_capacity: 10,
        images: JSON.stringify(['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400']),
        is_featured: false
      },
      {
        category_id: 4,
        category: 'food',
        title: '팔금도 해물탕집',
        short_description: '팔금도 근해에서 잡은 신선한 해산물로 만든 정통 해물탕',
        location: '신안군 팔금면',
        price_from: 20000,
        price_to: 35000,
        duration: '1시간',
        max_capacity: 50,
        images: JSON.stringify(['https://images.unsplash.com/photo-1544025162-d76694265947?w=400']),
        is_featured: true
      },
      {
        category_id: 4,
        category: 'food',
        title: '신안 전통음식점',
        short_description: '신안의 전통 향토음식을 맛볼 수 있는 맛집',
        location: '신안군 지도면',
        price_from: 15000,
        price_to: 25000,
        duration: '1시간',
        max_capacity: 30,
        images: JSON.stringify(['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400']),
        is_featured: false
      }
    ];

    for (const listing of listingsData) {
      await this.execute(`
        INSERT IGNORE INTO listings (category_id, category, title, short_description, location, price_from, price_to, duration, max_capacity, images, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        listing.category_id,
        listing.category,
        listing.title,
        listing.short_description,
        listing.location,
        listing.price_from,
        listing.price_to,
        listing.duration,
        listing.max_capacity,
        listing.images,
        listing.is_featured ? 1 : 0
      ]);
    }

    // 테스트 리뷰 데이터
    const reviewsData = [
      {
        listing_id: 1,
        user_id: 2,
        rating: 5,
        title: '정말 좋은 체험이었습니다!',
        comment_md: '증도 천일염 체험은 정말 특별했습니다. 가이드님의 설명도 좋았고 체험도 재미있었어요.',
        pros: '친절한 가이드, 재미있는 체험',
        cons: '조금 더 길었으면 좋겠어요',
        visit_date: '2024-01-15'
      },
      {
        listing_id: 2,
        user_id: 3,
        rating: 4,
        title: '아름다운 홍도',
        comment_md: '홍도의 자연경관이 정말 아름다웠습니다. 사진 찍기 좋은 곳이 많아요.',
        pros: '아름다운 경치, 좋은 날씨',
        cons: '배 시간이 아쉬웠어요',
        visit_date: '2024-01-20'
      },
      {
        listing_id: 5,
        user_id: 4,
        rating: 5,
        title: '최고의 펜션!',
        comment_md: '퍼플교 뷰가 정말 환상적이었습니다. 시설도 깨끗하고 좋았어요.',
        pros: '깨끗한 시설, 환상적인 뷰',
        cons: '없음',
        visit_date: '2024-01-25'
      }
    ];

    for (const review of reviewsData) {
      await this.execute(`
        INSERT IGNORE INTO reviews (listing_id, user_id, rating, title, comment_md, pros, cons, visit_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [review.listing_id, review.user_id, review.rating, review.title, review.comment_md, review.pros, review.cons, review.visit_date]);
    }
  }
}

// 단일 인스턴스 생성 및 내보내기
export const db = new Database();

// 앱 시작 시 초기화
db.initializeIfEmpty().catch(console.error);

// 개발 환경에서 강제 재초기화 실행 (관리자 계정 생성)
if (typeof window !== 'undefined') {
  (window as any).forceReinitDB = () => db.forceReinitialize();
}

export default db;
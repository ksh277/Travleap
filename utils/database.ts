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
    // PlanetScale 연결 설정
    let host: string;
    let username: string;
    let password: string;

    if (typeof window === 'undefined') {
      // Node.js 서버 환경
      host = process.env.DATABASE_HOST || process.env.VITE_PLANETSCALE_HOST || 'aws.connect.psdb.cloud';
      username = process.env.DATABASE_USERNAME || process.env.VITE_PLANETSCALE_USERNAME || '';
      password = process.env.DATABASE_PASSWORD || process.env.VITE_PLANETSCALE_PASSWORD || '';
    } else {
      // 브라우저 환경
      host = import.meta.env.VITE_PLANETSCALE_HOST || 'aws.connect.psdb.cloud';
      username = import.meta.env.VITE_PLANETSCALE_USERNAME || '';
      password = import.meta.env.VITE_PLANETSCALE_PASSWORD || '';
    }

    if (!username || !password) {
      console.warn('⚠️  PlanetScale credentials not configured');
    }

    const config = {
      host,
      username,
      password
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

  // 별칭: findAll (select와 동일)
  async findAll(table: string, where?: Record<string, any>): Promise<any[]> {
    return this.select(table, where);
  }

  // 별칭: findOne (select 결과의 첫 번째 항목)
  async findOne(table: string, where?: Record<string, any>): Promise<any | null> {
    const results = await this.select(table, where);
    return results.length > 0 ? results[0] : null;
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

  async upsert(table: string, where: Record<string, any>, data: Record<string, any>): Promise<{ id: number; [key: string]: any }> {
    // Try to find existing record
    const existing = await this.select(table, where);

    if (existing.length > 0) {
      // Update existing record
      await this.update(table, existing[0].id, data);
      return { id: existing[0].id, ...data };
    } else {
      // Insert new record
      return await this.insert(table, { ...where, ...data });
    }
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

    // PMS 설정 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS pms_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT NOT NULL,
        vendor ENUM('stayntouch', 'opera', 'cloudbeds', 'mews', 'custom') NOT NULL,
        hotel_id VARCHAR(100) NOT NULL,
        api_key VARCHAR(500),
        api_secret VARCHAR(500),
        api_endpoint VARCHAR(500),
        webhook_secret VARCHAR(200),
        settings JSON,
        is_active BOOLEAN DEFAULT TRUE,
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_listing (listing_id),
        INDEX idx_hotel (hotel_id),
        INDEX idx_vendor (vendor),
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
      )
    `);

    // 객실 타입 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS room_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT NOT NULL,
        pms_vendor VARCHAR(50),
        pms_hotel_id VARCHAR(100),
        pms_room_type_id VARCHAR(100),
        room_type_id VARCHAR(100) NOT NULL,
        room_type_name VARCHAR(200) NOT NULL,
        description TEXT,
        max_occupancy INT DEFAULT 2,
        bed_type VARCHAR(100),
        amenities JSON,
        base_price DECIMAL(10, 2),
        currency VARCHAR(10) DEFAULT 'KRW',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_room_type (listing_id, room_type_id),
        INDEX idx_listing (listing_id),
        INDEX idx_active (is_active),
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
      )
    `);

    // 객실 미디어 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS room_media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_type_id INT NOT NULL,
        media_url VARCHAR(500) NOT NULL,
        media_type ENUM('image', 'video') DEFAULT 'image',
        caption TEXT,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_room_type (room_type_id),
        INDEX idx_order (room_type_id, display_order),
        FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
      )
    `);

    // 요금 플랜 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS rate_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT,
        room_type_id INT NOT NULL,
        pms_rate_plan_id VARCHAR(100),
        rate_plan_id VARCHAR(100),
        rate_plan_name VARCHAR(200) NOT NULL,
        base_price DECIMAL(10, 2),
        check_date DATE,
        price DECIMAL(10, 2),
        currency VARCHAR(10) DEFAULT 'KRW',
        min_stay INT DEFAULT 1,
        max_stay INT,
        is_refundable BOOLEAN DEFAULT TRUE,
        breakfast_included BOOLEAN DEFAULT FALSE,
        closed_to_arrival BOOLEAN DEFAULT FALSE,
        closed_to_departure BOOLEAN DEFAULT FALSE,
        non_refundable BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing (listing_id),
        INDEX idx_room_type (room_type_id),
        INDEX idx_date (check_date),
        INDEX idx_active (is_active),
        FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
      )
    `);

    // 객실 재고 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS room_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT,
        room_type_id INT NOT NULL,
        date DATE NOT NULL,
        check_date DATE,
        available INT NOT NULL DEFAULT 0,
        total INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_inventory (room_type_id, date),
        INDEX idx_listing (listing_id),
        INDEX idx_room_type (room_type_id),
        INDEX idx_date (date),
        INDEX idx_check_date (check_date),
        INDEX idx_available (available),
        FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
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
        INDEX idx_user (user_id),
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

    // 문의 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('pending', 'replied', 'resolved') DEFAULT 'pending',
        admin_reply TEXT,
        replied_by INT,
        replied_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

    // 미디어 라이브러리 테이블
    await this.execute(`
      CREATE TABLE IF NOT EXISTS media (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(500) NOT NULL,
        original_filename VARCHAR(500) NOT NULL,
        url LONGTEXT NOT NULL,
        thumbnail_url LONGTEXT,
        file_type VARCHAR(50) NOT NULL,
        file_size INT,
        width INT,
        height INT,
        alt_text VARCHAR(500),
        caption TEXT,
        category ENUM('product', 'banner', 'blog', 'partner', 'event', 'other') DEFAULT 'other',
        usage_location VARCHAR(100) COMMENT '사용 위치: main_banner, category_banner, product_image, blog_image 등',
        tags JSON COMMENT '검색용 태그',
        uploaded_by BIGINT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_usage_location (usage_location),
        INDEX idx_file_type (file_type),
        INDEX idx_is_active (is_active),
        INDEX idx_created_at (created_at)
      )
    `);
  }

  private async seedBasicData(): Promise<void> {
    console.log('🌱 데이터베이스 시드 시작...');

    // 관리자 계정 생성 (2개)
    const adminAccounts = [
      { user_id: 'admin_shinan', email: 'admin@shinan.com', password_hash: 'hashed_admin123', name: '관리자', phone: '010-0000-0000', role: 'admin' },
      { user_id: 'admin_manager', email: 'manager@shinan.com', password_hash: 'hashed_manager123', name: '매니저', phone: '010-0000-0001', role: 'admin' }
    ];

    for (const admin of adminAccounts) {
      await this.execute(`
        INSERT IGNORE INTO users (user_id, email, password_hash, name, phone, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [admin.user_id, admin.email, admin.password_hash, admin.name, admin.phone, admin.role]);
    }

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

    // 파트너 데이터는 관리자가 직접 승인하므로 초기 데이터 생성하지 않음
    console.log('ℹ️  파트너 데이터는 파트너 신청을 통해 추가됩니다.');

    // 블로그 포스트는 관리자가 직접 작성하므로 초기 데이터 생성하지 않음
    console.log('ℹ️  블로그 포스트는 관리자가 직접 작성합니다.');

    // 상품과 리뷰는 관리자가 직접 추가하므로 초기 데이터 생성하지 않음
    console.log('ℹ️  상품과 리뷰는 관리자 페이지에서 직접 추가합니다.');
  }
}

// Lazy initialization - database instance is created only when first accessed
let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

// Getter for backwards compatibility - will create instance on first access
export const db = new Proxy({} as Database, {
  get(target, prop) {
    const instance = getDatabase();
    const value = instance[prop as keyof Database];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

// 개발 환경에서 강제 재초기화 실행 (관리자 계정 생성)
if (typeof window !== 'undefined') {
  (window as any).forceReinitDB = () => getDatabase().forceReinitialize();
}

export default db;
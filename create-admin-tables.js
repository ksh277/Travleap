import { connect } from '@planetscale/database';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  url: process.env.VITE_PLANETSCALE_HOST?.replace(/'/g, '') || '',
  username: process.env.VITE_PLANETSCALE_USERNAME || '',
  password: process.env.VITE_PLANETSCALE_PASSWORD || ''
};

async function createAdminTables() {
  console.log('=== 관리자 페이지용 추가 테이블 생성 ===\n');

  try {
    const conn = connect(config);

    // 1. admin_settings (관리자 설정)
    console.log('1. admin_settings 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE admin_settings (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        setting_category ENUM('general', 'payment', 'email', 'sms', 'commission', 'maintenance') NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        setting_type ENUM('string', 'number', 'boolean', 'json', 'text') DEFAULT 'string',
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        requires_restart BOOLEAN DEFAULT FALSE,
        updated_by BIGINT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_setting (setting_key),
        INDEX idx_category (setting_category),
        INDEX idx_public (is_public)
      )
    `);
    console.log('✅ admin_settings 테이블 생성 완료');

    // 2. admin_dashboard_stats (대시보드 통계)
    console.log('2. admin_dashboard_stats 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE admin_dashboard_stats (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        date DATE NOT NULL,
        total_users INT DEFAULT 0,
        new_users_today INT DEFAULT 0,
        total_partners INT DEFAULT 0,
        pending_partners INT DEFAULT 0,
        total_listings INT DEFAULT 0,
        published_listings INT DEFAULT 0,
        total_bookings INT DEFAULT 0,
        bookings_today INT DEFAULT 0,
        total_revenue DECIMAL(15, 2) DEFAULT 0,
        revenue_today DECIMAL(15, 2) DEFAULT 0,
        commission_earned DECIMAL(15, 2) DEFAULT 0,
        avg_rating DECIMAL(3, 2) DEFAULT 0,
        total_reviews INT DEFAULT 0,
        pending_refunds INT DEFAULT 0,
        support_tickets_open INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_date (date),
        INDEX idx_date (date)
      )
    `);
    console.log('✅ admin_dashboard_stats 테이블 생성 완료');

    // 3. admin_logs (관리자 활동 로그)
    console.log('3. admin_logs 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE admin_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        admin_id BIGINT NOT NULL,
        action ENUM(
          'user_created', 'user_updated', 'user_deleted', 'user_banned',
          'partner_approved', 'partner_rejected', 'partner_updated',
          'listing_approved', 'listing_rejected', 'listing_featured',
          'booking_cancelled', 'booking_refunded',
          'payment_refunded', 'settlement_processed',
          'review_moderated', 'review_deleted',
          'setting_updated', 'backup_created',
          'maintenance_mode', 'email_sent'
        ) NOT NULL,
        entity_type ENUM('user', 'partner', 'listing', 'booking', 'payment', 'review', 'setting', 'system') NOT NULL,
        entity_id BIGINT,
        old_values JSON,
        new_values JSON,
        description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_action (action),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ admin_logs 테이블 생성 완료');

    // 4. banners (배너/광고 관리)
    console.log('4. banners 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE banners (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(500),
        image_url VARCHAR(500) NOT NULL,
        mobile_image_url VARCHAR(500),
        link_url VARCHAR(500),
        position ENUM('main_hero', 'sidebar', 'category_top', 'between_listings', 'footer', 'popup') NOT NULL,
        priority INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        start_date DATE,
        end_date DATE,
        target_audience JSON,
        click_count INT DEFAULT 0,
        impression_count INT DEFAULT 0,
        budget DECIMAL(10, 2),
        cost_per_click DECIMAL(5, 2),
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_position (position),
        INDEX idx_active_dates (is_active, start_date, end_date),
        INDEX idx_priority (priority)
      )
    `);
    console.log('✅ banners 테이블 생성 완료');

    // 5. faq (FAQ 관리)
    console.log('5. faq 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE faq (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        category ENUM('general', 'booking', 'payment', 'cancellation', 'partner', 'technical') NOT NULL,
        question VARCHAR(500) NOT NULL,
        answer TEXT NOT NULL,
        priority INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        view_count INT DEFAULT 0,
        helpful_count INT DEFAULT 0,
        not_helpful_count INT DEFAULT 0,
        tags JSON,
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_active (is_active),
        INDEX idx_priority (priority)
      )
    `);
    console.log('✅ faq 테이블 생성 완료');

    // 6. email_templates (이메일 템플릿)
    console.log('6. email_templates 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE email_templates (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        template_key VARCHAR(100) NOT NULL UNIQUE,
        template_name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        variables JSON,
        category ENUM('booking', 'payment', 'partner', 'user', 'marketing', 'system') NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);
    console.log('✅ email_templates 테이블 생성 완료');

    // 7. commission_rates (수수료 설정)
    console.log('7. commission_rates 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE commission_rates (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        partner_tier ENUM('bronze', 'silver', 'gold', 'vip') NOT NULL,
        category_id INT,
        commission_rate DECIMAL(5, 2) NOT NULL,
        effective_from DATE NOT NULL,
        effective_until DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tier_category (partner_tier, category_id),
        INDEX idx_effective_dates (effective_from, effective_until),
        INDEX idx_active (is_active)
      )
    `);
    console.log('✅ commission_rates 테이블 생성 완료');

    // 8. admin_tasks (관리자 작업)
    console.log('8. admin_tasks 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE admin_tasks (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        task_type ENUM('partner_review', 'listing_review', 'refund_process', 'customer_support', 'content_moderation', 'system_maintenance') NOT NULL,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        assigned_to BIGINT,
        related_entity_type ENUM('user', 'partner', 'listing', 'booking', 'payment', 'review'),
        related_entity_id BIGINT,
        due_date DATE,
        completed_at TIMESTAMP NULL,
        notes TEXT,
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_assigned_to (assigned_to),
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_due_date (due_date),
        INDEX idx_task_type (task_type)
      )
    `);
    console.log('✅ admin_tasks 테이블 생성 완료');

    // ===== 초기 데이터 삽입 =====
    console.log('\n📄 관리자 페이지 초기 데이터 삽입 중...\n');

    // 관리자 설정 초기값
    await conn.execute(`
      INSERT INTO admin_settings (setting_category, setting_key, setting_value, setting_type, display_name, description, is_public) VALUES
      ('general', 'site_name', 'Travleap', 'string', '사이트 이름', '웹사이트 제목', TRUE),
      ('general', 'site_description', '신안군 여행의 모든 것', 'string', '사이트 설명', 'SEO 메타 설명', TRUE),
      ('general', 'default_currency', 'KRW', 'string', '기본 통화', '결제 기본 통화', TRUE),
      ('general', 'default_language', 'ko', 'string', '기본 언어', '사이트 기본 언어', TRUE),
      ('general', 'items_per_page', '20', 'number', '페이지당 항목 수', '목록 페이지 기본 표시 개수', FALSE),
      ('payment', 'booking_cancel_hours', '24', 'number', '예약 취소 가능 시간', '예약 후 무료 취소 가능 시간(시간)', FALSE),
      ('payment', 'refund_processing_days', '3', 'number', '환불 처리 기간', '환불 승인 후 처리 일수', FALSE),
      ('commission', 'default_commission_rate', '10.0', 'number', '기본 수수료율', '신규 파트너 기본 수수료(%)', FALSE),
      ('email', 'smtp_enabled', 'false', 'boolean', 'SMTP 사용', '이메일 전송 기능 활성화', FALSE),
      ('maintenance', 'maintenance_mode', 'false', 'boolean', '점검 모드', '사이트 점검 모드 활성화', FALSE)
    `);
    console.log('✅ 관리자 설정 초기값 삽입 완료');

    // 오늘 날짜 통계 초기값
    await conn.execute(`
      INSERT INTO admin_dashboard_stats (date, total_users, total_partners, total_listings, total_bookings, total_revenue)
      SELECT
        CURDATE(),
        (SELECT COUNT(*) FROM users WHERE role != 'admin'),
        (SELECT COUNT(*) FROM partners WHERE status = 'approved'),
        (SELECT COUNT(*) FROM listings WHERE is_published = TRUE),
        (SELECT COUNT(*) FROM bookings),
        COALESCE((SELECT SUM(total_amount) FROM bookings WHERE payment_status = 'paid'), 0)
    `);
    console.log('✅ 대시보드 통계 초기값 삽입 완료');

    // FAQ 초기 데이터
    await conn.execute(`
      INSERT INTO faq (category, question, answer, priority, is_active) VALUES
      ('general', '신안군에는 어떤 관광지가 있나요?', '신안군에는 천일염 염전, 증도 슬로시티, 흑산도 등 다양한 관광지가 있습니다. 특히 유네스코 생물권보전지역으로 지정된 증도는 꼭 방문해보세요.', 1, TRUE),
      ('booking', '예약은 어떻게 하나요?', '원하는 상품을 선택한 후 날짜와 인원을 선택하고 예약하기 버튼을 클릭하세요. 로그인이 필요합니다.', 2, TRUE),
      ('booking', '예약 취소는 언제까지 가능한가요?', '예약 후 24시간 이내에는 무료 취소가 가능합니다. 이후에는 상품별 취소 정책에 따라 수수료가 발생할 수 있습니다.', 3, TRUE),
      ('payment', '어떤 결제 수단을 사용할 수 있나요?', '신용카드, 계좌이체, 카카오페이, 네이버페이를 지원합니다.', 4, TRUE),
      ('payment', '환불은 언제 받을 수 있나요?', '환불 승인 후 3-5 영업일 내에 원래 결제 수단으로 환불됩니다.', 5, TRUE)
    `);
    console.log('✅ FAQ 초기 데이터 삽입 완료');

    // 기본 수수료율 설정
    await conn.execute(`
      INSERT INTO commission_rates (partner_tier, commission_rate, effective_from, is_active) VALUES
      ('bronze', 15.0, CURDATE(), TRUE),
      ('silver', 12.0, CURDATE(), TRUE),
      ('gold', 10.0, CURDATE(), TRUE),
      ('vip', 8.0, CURDATE(), TRUE)
    `);
    console.log('✅ 수수료율 초기 설정 삽입 완료');

    // 이메일 템플릿 샘플
    await conn.execute(`
      INSERT INTO email_templates (template_key, template_name, subject, html_content, text_content, variables, category, is_active) VALUES
      ('booking_confirmed', '예약 확정 알림', '{{site_name}} 예약이 확정되었습니다',
       '<h1>예약 확정</h1><p>{{user_name}}님의 {{listing_title}} 예약이 확정되었습니다.</p><p>예약번호: {{booking_number}}</p>',
       '{{user_name}}님의 {{listing_title}} 예약이 확정되었습니다. 예약번호: {{booking_number}}',
       '["user_name", "listing_title", "booking_number", "site_name"]', 'booking', TRUE),
      ('payment_completed', '결제 완료 알림', '{{site_name}} 결제가 완료되었습니다',
       '<h1>결제 완료</h1><p>{{user_name}}님의 결제가 완료되었습니다.</p><p>결제금액: {{amount}}원</p>',
       '{{user_name}}님의 결제가 완료되었습니다. 결제금액: {{amount}}원',
       '["user_name", "amount", "site_name"]', 'payment', TRUE)
    `);
    console.log('✅ 이메일 템플릿 초기 데이터 삽입 완료');

    // 최종 테이블 목록 확인
    console.log('\n=== 관리자 페이지 테이블 목록 ===');
    const adminTables = [
      'admin_settings',
      'admin_dashboard_stats',
      'admin_logs',
      'banners',
      'faq',
      'email_templates',
      'commission_rates',
      'admin_tasks'
    ];

    for (const table of adminTables) {
      const result = await conn.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`✅ ${table}: ${result.rows[0].count}개 레코드`);
    }

    console.log('\n🎉 관리자 페이지용 테이블 생성 완료!');
    console.log('✨ 이제 완전한 관리자 기능을 제공할 수 있습니다.');

  } catch (error) {
    console.error('❌ 관리자 테이블 생성 실패:', error);
  }
}

createAdminTables();
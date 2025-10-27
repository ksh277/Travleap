/**
 * 누락된 테이블 추가 마이그레이션
 *
 * 이 스크립트는 기존 테이블은 유지하고 누락된 테이블만 추가합니다.
 * 서버 시작 시 자동으로 실행됩니다.
 */

import { getDatabase } from '../utils/database.js';

export async function runMissingTablesMigration() {
  const db = getDatabase();

  console.log('🔧 [Migration] Adding missing tables...');

  try {
    // 홈 배너 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS home_banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_url VARCHAR(500) NOT NULL,
        title VARCHAR(200),
        subtitle VARCHAR(300),
        link_url VARCHAR(500),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_order (display_order)
      )
    `);
    console.log('✅ home_banners table created/verified');

    // 액티비티 이미지 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        activity_id INT NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        caption VARCHAR(200),
        display_order INT DEFAULT 0,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_activity (activity_id),
        INDEX idx_order (display_order)
      )
    `);
    console.log('✅ activity_images table created/verified');

    // 숙박 예약 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS lodging_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_number VARCHAR(50) UNIQUE NOT NULL,
        listing_id INT NOT NULL,
        room_type_id INT NOT NULL,
        user_id INT NOT NULL,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        num_guests INT DEFAULT 1,
        total_amount DECIMAL(10, 2) NOT NULL,
        deposit_amount DECIMAL(10, 2) DEFAULT 0,
        payment_status ENUM('pending', 'deposit_paid', 'fully_paid', 'refunded') DEFAULT 'pending',
        booking_status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'pending',
        customer_info JSON,
        special_requests TEXT,
        cancellation_reason TEXT,
        expiry_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing (listing_id),
        INDEX idx_room_type (room_type_id),
        INDEX idx_user (user_id),
        INDEX idx_payment_status (payment_status),
        INDEX idx_booking_status (booking_status),
        INDEX idx_expiry (expiry_date)
      )
    `);
    console.log('✅ lodging_bookings table created/verified');

    // 벤더 설정 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vendor_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vendor_setting (vendor_id, setting_key),
        INDEX idx_vendor (vendor_id)
      )
    `);
    console.log('✅ vendor_settings table created/verified');

    // PMS API 크레덴셜 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pms_api_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        pms_provider VARCHAR(50) NOT NULL,
        api_key VARCHAR(500),
        api_secret VARCHAR(500),
        api_endpoint VARCHAR(500),
        hotel_id VARCHAR(100),
        property_id VARCHAR(100),
        sync_enabled BOOLEAN DEFAULT FALSE,
        sync_interval_hours INT DEFAULT 1,
        last_sync_at TIMESTAMP,
        settings JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vendor_pms (vendor_id),
        INDEX idx_provider (pms_provider),
        INDEX idx_sync_enabled (sync_enabled)
      )
    `);
    console.log('✅ pms_api_credentials table created/verified');

    // PMS 동기화 작업 로그 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pms_sync_jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pms_credential_id INT NOT NULL,
        status ENUM('RUNNING', 'SUCCESS', 'FAILED') DEFAULT 'RUNNING',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        rooms_synced INT DEFAULT 0,
        rates_synced INT DEFAULT 0,
        availability_synced INT DEFAULT 0,
        sync_details JSON,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_credential (pms_credential_id),
        INDEX idx_status (status),
        INDEX idx_started_at (started_at)
      )
    `);
    console.log('✅ pms_sync_jobs table created/verified');

    // 수수료율 관리 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS commission_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(50),
        vendor_id INT,
        rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
        effective_from TIMESTAMP,
        effective_to TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_by INT,
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_vendor (vendor_id),
        INDEX idx_active (is_active),
        INDEX idx_effective_dates (effective_from, effective_to)
      )
    `);
    console.log('✅ commission_rates table created/verified');

    // 기본 수수료율 데이터 시드
    const commissionRatesData = [
      { id: 1, category: null, vendor_id: null, rate: 10.00, notes: '전체 기본 수수료율', created_by: 1 },
      { id: 2, category: 'rentcar', vendor_id: null, rate: 10.00, notes: '렌트카 기본 수수료율', created_by: 1 },
      { id: 3, category: 'stay', vendor_id: null, rate: 12.00, notes: '숙박 기본 수수료율', created_by: 1 },
      { id: 4, category: 'tour', vendor_id: null, rate: 15.00, notes: '여행 기본 수수료율', created_by: 1 },
      { id: 5, category: 'food', vendor_id: null, rate: 8.00, notes: '음식 기본 수수료율', created_by: 1 },
      { id: 6, category: 'tourist', vendor_id: null, rate: 12.00, notes: '관광지 기본 수수료율', created_by: 1 },
      { id: 7, category: 'popup', vendor_id: null, rate: 20.00, notes: '팝업 기본 수수료율', created_by: 1 },
      { id: 8, category: 'event', vendor_id: null, rate: 15.00, notes: '행사 기본 수수료율', created_by: 1 },
      { id: 9, category: 'experience', vendor_id: null, rate: 15.00, notes: '체험 기본 수수료율', created_by: 1 }
    ];

    for (const commissionRate of commissionRatesData) {
      await db.execute(`
        INSERT IGNORE INTO commission_rates (id, category, vendor_id, rate, is_active, notes, created_by)
        VALUES (?, ?, ?, ?, TRUE, ?, ?)
      `, [commissionRate.id, commissionRate.category, commissionRate.vendor_id, commissionRate.rate, commissionRate.notes, commissionRate.created_by]);
    }
    console.log('✅ commission_rates seed data inserted');

    // Add partner_type column to partners table (8개 벤더 타입 지원)
    try {
      // Check if column exists first
      const columns = await db.query(`SHOW COLUMNS FROM partners LIKE 'partner_type'`);

      if (!columns || columns.length === 0) {
        // 컬럼이 없으면 새로 생성 (8개 벤더 타입)
        await db.execute(`
          ALTER TABLE partners
          ADD COLUMN partner_type ENUM('general', 'lodging', 'rentcar', 'popup', 'food', 'attraction', 'travel', 'event', 'experience') DEFAULT 'general'
          AFTER tier
        `);
        console.log('✅ partner_type column added to partners table (8 vendor types)');
      } else {
        // 컬럼이 이미 있으면 ENUM 확장 (기존 3개 → 8개)
        await db.execute(`
          ALTER TABLE partners
          MODIFY COLUMN partner_type ENUM('general', 'lodging', 'rentcar', 'popup', 'food', 'attraction', 'travel', 'event', 'experience') DEFAULT 'general'
        `);
        console.log('✅ partner_type column ENUM extended to 8 vendor types');
      }
    } catch (error: any) {
      console.warn('⚠️  partner_type column addition warning:', error.message);
    }

    // Update existing lodging partners
    try {
      await db.execute(`
        UPDATE partners p
        INNER JOIN listings l ON l.partner_id = p.id
        SET p.partner_type = 'lodging'
        WHERE p.partner_type = 'general'
        AND l.category_id = 1857
      `);
      console.log('✅ Existing lodging partners tagged');
    } catch (error) {
      console.warn('⚠️  Lodging partners update warning:', error);
    }

    // Update category values from English to Korean - 카테고리 자동 변환
    try {
      console.log('🔄 [Migration] Converting category values to Korean...');

      const result1 = await db.execute(`UPDATE listings SET category = '팝업' WHERE category = 'popup'`);
      const result2 = await db.execute(`UPDATE listings SET category = '여행' WHERE category = 'tour'`);
      const result3 = await db.execute(`UPDATE listings SET category = '숙박' WHERE category = 'stay'`);
      const result4 = await db.execute(`UPDATE listings SET category = '음식' WHERE category = 'food'`);
      const result5 = await db.execute(`UPDATE listings SET category = '관광지' WHERE category = 'tourist'`);
      const result6 = await db.execute(`UPDATE listings SET category = '체험' WHERE category = 'experience'`);
      const result7 = await db.execute(`UPDATE listings SET category = '행사' WHERE category = 'event'`);
      const result8 = await db.execute(`UPDATE listings SET category = '렌트카' WHERE category = 'rentcar'`);

      console.log('✅ Category values converted to Korean');
      console.log(`   - popup -> 팝업: ${result1.affectedRows || 0} rows`);
      console.log(`   - tour -> 여행: ${result2.affectedRows || 0} rows`);
      console.log(`   - stay -> 숙박: ${result3.affectedRows || 0} rows`);
    } catch (error) {
      console.warn('⚠️  [Migration] Category conversion warning:', error);
      // Continue with migration even if category conversion fails
    }

    // ========================================
    // 7. payments 테이블 컬럼 추가 (Toss Payments 연동)
    // ========================================
    console.log('🔧 [Migration] Adding payments table columns for Toss Payments...');
    try {
      // 7.1 user_id
      const userIdCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'user_id'`);
      if (!userIdCol || userIdCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN user_id INT COMMENT '사용자 ID'`);
        console.log('   ✅ user_id column added');
      }

      // 7.2 order_id
      const orderIdCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'order_id'`);
      if (!orderIdCol || orderIdCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN order_id INT COMMENT '장바구니 주문 ID'`);
        console.log('   ✅ order_id column added');
      }

      // 7.3 payment_key
      const paymentKeyCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'payment_key'`);
      if (!paymentKeyCol || paymentKeyCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN payment_key VARCHAR(200) COMMENT 'Toss Payments 결제 키'`);
        console.log('   ✅ payment_key column added');
      }

      // 7.4 order_id_str
      const orderIdStrCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'order_id_str'`);
      if (!orderIdStrCol || orderIdStrCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN order_id_str VARCHAR(100) COMMENT '주문 번호 문자열 (ORDER_xxx or BK-xxx)'`);
        console.log('   ✅ order_id_str column added');
      }

      // 7.5 gateway_transaction_id
      const gatewayTxIdCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'gateway_transaction_id'`);
      if (!gatewayTxIdCol || gatewayTxIdCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN gateway_transaction_id VARCHAR(200) COMMENT 'PG사 트랜잭션 ID'`);
        console.log('   ✅ gateway_transaction_id column added');
      }

      // 7.6 payment_status
      const paymentStatusCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'payment_status'`);
      if (!paymentStatusCol || paymentStatusCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending' COMMENT '결제 상태 (paid, pending, failed, refunded, completed)'`);
        console.log('   ✅ payment_status column added');
      }

      // 7.7 approved_at
      const approvedAtCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'approved_at'`);
      if (!approvedAtCol || approvedAtCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN approved_at DATETIME COMMENT '결제 승인 시각'`);
        console.log('   ✅ approved_at column added');
      }

      // 7.8 receipt_url
      const receiptUrlCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'receipt_url'`);
      if (!receiptUrlCol || receiptUrlCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN receipt_url VARCHAR(500) COMMENT 'Toss Payments 영수증 URL'`);
        console.log('   ✅ receipt_url column added');
      }

      // 7.9 card_company
      const cardCompanyCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'card_company'`);
      if (!cardCompanyCol || cardCompanyCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN card_company VARCHAR(50) COMMENT '카드사명'`);
        console.log('   ✅ card_company column added');
      }

      // 7.10 card_number
      const cardNumberCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'card_number'`);
      if (!cardNumberCol || cardNumberCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN card_number VARCHAR(50) COMMENT '카드 번호 (마스킹)'`);
        console.log('   ✅ card_number column added');
      }

      // 7.11 card_installment
      const cardInstallmentCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'card_installment'`);
      if (!cardInstallmentCol || cardInstallmentCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN card_installment INT DEFAULT 0 COMMENT '할부 개월수'`);
        console.log('   ✅ card_installment column added');
      }

      // 7.12 virtual_account_number
      const vaNumberCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'virtual_account_number'`);
      if (!vaNumberCol || vaNumberCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN virtual_account_number VARCHAR(50) COMMENT '가상계좌 번호'`);
        console.log('   ✅ virtual_account_number column added');
      }

      // 7.13 virtual_account_bank
      const vaBankCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'virtual_account_bank'`);
      if (!vaBankCol || vaBankCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN virtual_account_bank VARCHAR(50) COMMENT '가상계좌 은행명'`);
        console.log('   ✅ virtual_account_bank column added');
      }

      // 7.14 virtual_account_due_date
      const vaDueDateCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'virtual_account_due_date'`);
      if (!vaDueDateCol || vaDueDateCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN virtual_account_due_date DATETIME COMMENT '가상계좌 입금 마감일'`);
        console.log('   ✅ virtual_account_due_date column added');
      }

      // 7.15 refund_amount
      const refundAmountCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'refund_amount'`);
      if (!refundAmountCol || refundAmountCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN refund_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '환불 금액'`);
        console.log('   ✅ refund_amount column added');
      }

      // 7.16 discount_amount
      const discountAmountCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'discount_amount'`);
      if (!discountAmountCol || discountAmountCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '할인 금액'`);
        console.log('   ✅ discount_amount column added');
      }

      // 7.17 coupon_code
      const couponCodeCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'coupon_code'`);
      if (!couponCodeCol || couponCodeCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN coupon_code VARCHAR(50) COMMENT '적용된 쿠폰 코드'`);
        console.log('   ✅ coupon_code column added');
      }

      // 7.18 fee_amount
      const feeAmountCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'fee_amount'`);
      if (!feeAmountCol || feeAmountCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN fee_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '배송비 등 추가 비용'`);
        console.log('   ✅ fee_amount column added');
      }

      // 7.19 refund_reason
      const refundReasonCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'refund_reason'`);
      if (!refundReasonCol || refundReasonCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN refund_reason TEXT COMMENT '환불 사유'`);
        console.log('   ✅ refund_reason column added');
      }

      // 7.20 refunded_at
      const refundedAtCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'refunded_at'`);
      if (!refundedAtCol || refundedAtCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN refunded_at DATETIME COMMENT '환불 처리 시각'`);
        console.log('   ✅ refunded_at column added');
      }

      // 7.21 booking_id를 NULL 허용으로 변경 (장바구니 주문은 booking_id가 없을 수 있음)
      await db.execute(`ALTER TABLE payments MODIFY COLUMN booking_id INT NULL COMMENT '예약 ID (장바구니 주문은 NULL)'`);
      console.log('   ✅ booking_id changed to nullable');

      // 인덱스 추가
      try {
        await db.execute(`ALTER TABLE payments ADD INDEX idx_payment_key (payment_key)`);
        console.log('   ✅ idx_payment_key index added');
      } catch (e) {
        // Index might already exist
      }

      try {
        await db.execute(`ALTER TABLE payments ADD INDEX idx_order_id_str (order_id_str)`);
        console.log('   ✅ idx_order_id_str index added');
      } catch (e) {
        // Index might already exist
      }

      try {
        await db.execute(`ALTER TABLE payments ADD INDEX idx_gateway_transaction_id (gateway_transaction_id)`);
        console.log('   ✅ idx_gateway_transaction_id index added');
      } catch (e) {
        // Index might already exist
      }

      try {
        await db.execute(`ALTER TABLE payments ADD INDEX idx_payment_status (payment_status)`);
        console.log('   ✅ idx_payment_status index added');
      } catch (e) {
        // Index might already exist
      }

      try {
        await db.execute(`ALTER TABLE payments ADD INDEX idx_approved_at (approved_at)`);
        console.log('   ✅ idx_approved_at index added');
      } catch (e) {
        // Index might already exist
      }

      console.log('✅ [Migration] payments table columns added successfully');
    } catch (error) {
      console.warn('⚠️  [Migration] payments table column migration warning:', error);
      // Non-critical, continue
    }

    // ========================================
    // 8. bookings 테이블 배송 컬럼 추가 (팝업 상품 결제)
    // ========================================
    console.log('🔧 [Migration] Adding bookings table shipping columns...');
    try {
      // 8.1 shipping_name
      const shippingNameCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'shipping_name'`);
      if (!shippingNameCol || shippingNameCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN shipping_name VARCHAR(100) COMMENT '수령인 이름'`);
        console.log('   ✅ shipping_name column added');
      }

      // 8.2 shipping_phone
      const shippingPhoneCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'shipping_phone'`);
      if (!shippingPhoneCol || shippingPhoneCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN shipping_phone VARCHAR(20) COMMENT '수령인 전화번호'`);
        console.log('   ✅ shipping_phone column added');
      }

      // 8.3 shipping_address
      const shippingAddressCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'shipping_address'`);
      if (!shippingAddressCol || shippingAddressCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN shipping_address VARCHAR(255) COMMENT '배송지 기본 주소'`);
        console.log('   ✅ shipping_address column added');
      }

      // 8.4 shipping_address_detail
      const shippingAddressDetailCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'shipping_address_detail'`);
      if (!shippingAddressDetailCol || shippingAddressDetailCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN shipping_address_detail VARCHAR(255) COMMENT '배송지 상세 주소'`);
        console.log('   ✅ shipping_address_detail column added');
      }

      // 8.5 shipping_zipcode
      const shippingZipcodeCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'shipping_zipcode'`);
      if (!shippingZipcodeCol || shippingZipcodeCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN shipping_zipcode VARCHAR(10) COMMENT '우편번호'`);
        console.log('   ✅ shipping_zipcode column added');
      }

      // 8.6 shipping_memo
      const shippingMemoCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'shipping_memo'`);
      if (!shippingMemoCol || shippingMemoCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN shipping_memo VARCHAR(255) COMMENT '배송 요청사항'`);
        console.log('   ✅ shipping_memo column added');
      }

      // 8.7 tracking_number
      const trackingNumberCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'tracking_number'`);
      if (!trackingNumberCol || trackingNumberCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN tracking_number VARCHAR(50) COMMENT '택배 송장번호'`);
        console.log('   ✅ tracking_number column added');
      }

      // 8.8 courier_company
      const courierCompanyCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'courier_company'`);
      if (!courierCompanyCol || courierCompanyCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN courier_company VARCHAR(50) COMMENT '택배사명'`);
        console.log('   ✅ courier_company column added');
      }

      // 8.9 delivery_status
      const deliveryStatusCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'delivery_status'`);
      if (!deliveryStatusCol || deliveryStatusCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN delivery_status ENUM('PENDING', 'READY', 'SHIPPING', 'DELIVERED', 'CANCELED') DEFAULT 'PENDING' COMMENT '배송 상태'`);
        console.log('   ✅ delivery_status column added');
      }

      // 8.10 shipped_at
      const shippedAtCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'shipped_at'`);
      if (!shippedAtCol || shippedAtCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN shipped_at DATETIME COMMENT '발송 처리 시각'`);
        console.log('   ✅ shipped_at column added');
      }

      // 8.11 delivered_at
      const deliveredAtCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'delivered_at'`);
      if (!deliveredAtCol || deliveredAtCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN delivered_at DATETIME COMMENT '배송 완료 시각'`);
        console.log('   ✅ delivered_at column added');
      }

      // 8.12 selected_options (팝업 상품 옵션 정보)
      const selectedOptionsCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'selected_options'`);
      if (!selectedOptionsCol || selectedOptionsCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN selected_options JSON COMMENT '선택한 상품 옵션 정보 (팝업 상품용)'`);
        console.log('   ✅ selected_options column added');
      }

      // 배송 관련 인덱스 추가
      try {
        await db.execute(`ALTER TABLE bookings ADD INDEX idx_delivery_status (delivery_status, created_at)`);
        console.log('   ✅ idx_delivery_status index added');
      } catch (e) {
        // Index might already exist
      }

      try {
        await db.execute(`ALTER TABLE bookings ADD INDEX idx_tracking_number (tracking_number)`);
        console.log('   ✅ idx_tracking_number index added');
      } catch (e) {
        // Index might already exist
      }

      try {
        await db.execute(`ALTER TABLE bookings ADD INDEX idx_delivered_at (delivered_at)`);
        console.log('   ✅ idx_delivered_at index added');
      } catch (e) {
        // Index might already exist
      }

      console.log('✅ [Migration] bookings table shipping columns added successfully');
    } catch (error) {
      console.warn('⚠️  [Migration] bookings table shipping column migration warning:', error);
      // Non-critical, continue
    }

    // 9. 환불 정책 테이블 (refund_policies)
    console.log('📋 [Migration] Creating refund_policies table...');
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS refund_policies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          listing_id INT NULL COMMENT '특정 상품 ID (NULL이면 전체)',
          category VARCHAR(50) NULL COMMENT '카테고리 (NULL이면 전체)',
          vendor_id INT NULL COMMENT '벤더 ID (NULL이면 전체)',
          policy_name VARCHAR(100) NOT NULL COMMENT '정책 이름',
          is_refundable BOOLEAN DEFAULT TRUE COMMENT '환불 가능 여부',
          refund_disabled_reason TEXT COMMENT '환불 불가 사유 (is_refundable=FALSE일 때)',
          refund_policy_json JSON COMMENT '환불 정책 규칙 (JSON 형식)',
          priority INT DEFAULT 0 COMMENT '우선순위 (1=낮음, 10=높음)',
          is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_listing (listing_id),
          INDEX idx_category (category),
          INDEX idx_vendor (vendor_id),
          INDEX idx_priority (priority),
          INDEX idx_active (is_active),
          FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
          FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ refund_policies table created/verified');

      // 기본 정책 데이터 삽입 (테이블이 비어있을 때만)
      const existingPolicies = await db.query('SELECT COUNT(*) as count FROM refund_policies');
      if (existingPolicies[0].count === 0) {
        console.log('📝 [Migration] Inserting default refund policies...');

        // 1. 기본 환불 정책 (전체 상품)
        await db.execute(`
          INSERT INTO refund_policies (policy_name, is_refundable, refund_policy_json, priority)
          VALUES (?, ?, ?, ?)
        `, [
          '기본 환불정책',
          true,
          JSON.stringify({
            rules: [
              { days_before: 10, fee_rate: 0, description: '10일 전 무료 취소' },
              { days_before: 7, fee_rate: 0.1, description: '9~7일 전 10% 수수료' },
              { days_before: 3, fee_rate: 0.2, description: '6~3일 전 20% 수수료' },
              { days_before: 1, fee_rate: 0.3, description: '2~1일 전 30% 수수료' },
              { days_before: 0, fee_rate: 0.5, description: '당일 50% 수수료' }
            ],
            past_booking_refundable: false
          }),
          1 // 낮은 우선순위
        ]);
        console.log('   ✅ Default refund policy inserted');

        // 2. 팝업 굿즈 환불 정책
        await db.execute(`
          INSERT INTO refund_policies (category, policy_name, is_refundable, refund_policy_json, priority)
          VALUES (?, ?, ?, ?, ?)
        `, [
          '팝업',
          '팝업 굿즈 환불정책',
          true,
          JSON.stringify({
            rules: [
              { days_before: 7, fee_rate: 0, description: '발송 전 무료 취소 (7일 전)' },
              { days_before: 3, fee_rate: 0.1, description: '3일 전 10% 수수료' },
              { days_before: 0, fee_rate: 0.5, description: '당일/발송 후 50% 수수료' }
            ],
            past_booking_refundable: false
          }),
          5 // 중간 우선순위
        ]);
        console.log('   ✅ Popup goods refund policy inserted');

        // 3. 환불 불가 상품 예시 (특정 카테고리)
        await db.execute(`
          INSERT INTO refund_policies (category, policy_name, is_refundable, refund_disabled_reason, priority)
          VALUES (?, ?, ?, ?, ?)
        `, [
          '할인특가',
          '특가 상품 환불 불가',
          false,
          '특가 상품은 환불이 불가능합니다. 구매 전 신중히 검토해주세요.',
          10 // 높은 우선순위
        ]);
        console.log('   ✅ Non-refundable policy example inserted');
      }

      console.log('✅ [Migration] refund_policies table setup complete');
    } catch (error) {
      console.warn('⚠️  [Migration] refund_policies table creation warning:', error);
      // Non-critical, continue
    }

    // 10. 기능 플래그 테이블 (feature_flags) - 비상 스위치
    console.log('🚨 [Migration] Creating feature_flags table...');
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS feature_flags (
          id INT AUTO_INCREMENT PRIMARY KEY,
          flag_name VARCHAR(100) UNIQUE NOT NULL COMMENT '플래그 이름 (예: payment_enabled, popup_payment_enabled)',
          is_enabled BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
          category VARCHAR(50) NULL COMMENT '카테고리 (NULL이면 전체)',
          description TEXT COMMENT '플래그 설명',
          disabled_message VARCHAR(500) COMMENT '비활성화 시 사용자에게 표시할 메시지',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_flag_name (flag_name),
          INDEX idx_category (category),
          INDEX idx_enabled (is_enabled)
        )
      `);
      console.log('✅ feature_flags table created/verified');

      // 기본 플래그 데이터 삽입 (테이블이 비어있을 때만)
      const existingFlags = await db.query('SELECT COUNT(*) as count FROM feature_flags');
      if (existingFlags[0].count === 0) {
        console.log('📝 [Migration] Inserting default feature flags...');

        // 1. 전체 결제 ON/OFF
        await db.execute(`
          INSERT INTO feature_flags (flag_name, is_enabled, description, disabled_message)
          VALUES (?, ?, ?, ?)
        `, [
          'payment_enabled',
          true,
          '전체 결제 기능 ON/OFF (비상 스위치)',
          '현재 결제 서비스가 일시 중지되었습니다. 잠시 후 다시 시도해주세요.'
        ]);
        console.log('   ✅ payment_enabled flag inserted');

        // 2. 팝업 상품 결제 ON/OFF
        await db.execute(`
          INSERT INTO feature_flags (flag_name, is_enabled, category, description, disabled_message)
          VALUES (?, ?, ?, ?, ?)
        `, [
          'popup_payment_enabled',
          true,
          '팝업',
          '팝업 상품 결제 ON/OFF',
          '팝업 상품 결제가 일시 중지되었습니다. 빠른 시일 내에 재개 예정입니다.'
        ]);
        console.log('   ✅ popup_payment_enabled flag inserted');

        // 3. 여행 상품 결제 ON/OFF
        await db.execute(`
          INSERT INTO feature_flags (flag_name, is_enabled, category, description, disabled_message)
          VALUES (?, ?, ?, ?, ?)
        `, [
          'travel_payment_enabled',
          true,
          '여행',
          '여행 상품 결제 ON/OFF',
          '여행 상품 결제가 일시 중지되었습니다.'
        ]);
        console.log('   ✅ travel_payment_enabled flag inserted');

        // 4. 환불 기능 ON/OFF
        await db.execute(`
          INSERT INTO feature_flags (flag_name, is_enabled, description, disabled_message)
          VALUES (?, ?, ?, ?)
        `, [
          'refund_enabled',
          true,
          '환불 기능 ON/OFF',
          '현재 환불 처리가 일시 중지되었습니다. 고객센터로 문의해주세요.'
        ]);
        console.log('   ✅ refund_enabled flag inserted');
      }

      console.log('✅ [Migration] feature_flags table setup complete');
    } catch (error) {
      console.warn('⚠️  [Migration] feature_flags table creation warning:', error);
      // Non-critical, continue
    }

    // 11. 상품 옵션 테이블 (product_options) - 사이즈, 색상 등
    console.log('🎨 [Migration] Creating product_options table...');
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS product_options (
          id INT AUTO_INCREMENT PRIMARY KEY,
          listing_id INT NOT NULL COMMENT '상품 ID',
          option_name VARCHAR(50) NOT NULL COMMENT '옵션명 (예: 사이즈, 색상)',
          option_value VARCHAR(100) NOT NULL COMMENT '옵션값 (예: L, 블랙)',
          price_adjustment INT DEFAULT 0 COMMENT '가격 조정 (추가 금액, KRW 정수)',
          stock INT DEFAULT 0 COMMENT '옵션별 재고',
          is_available BOOLEAN DEFAULT TRUE COMMENT '판매 가능 여부',
          display_order INT DEFAULT 0 COMMENT '표시 순서',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_listing (listing_id),
          INDEX idx_available (is_available),
          FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ product_options table created/verified');
    } catch (error) {
      console.warn('⚠️  [Migration] product_options table creation warning:', error);
    }

    // 12. 사용자 포인트 테이블 (user_points) - 적립/사용 내역
    console.log('💰 [Migration] Creating user_points table...');
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_points (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL COMMENT '사용자 ID',
          points INT NOT NULL COMMENT '포인트 금액 (양수: 적립, 음수: 사용)',
          point_type ENUM('earn', 'use', 'expire', 'admin') DEFAULT 'earn' COMMENT '포인트 유형',
          reason VARCHAR(200) COMMENT '사유 (예: 주문 적립, 환불 차감)',
          related_order_id VARCHAR(100) COMMENT '관련 주문 번호',
          related_payment_id INT COMMENT '관련 결제 ID',
          balance_after INT NOT NULL COMMENT '거래 후 잔액',
          expires_at DATETIME COMMENT '포인트 만료일 (적립 시)',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user (user_id),
          INDEX idx_order (related_order_id),
          INDEX idx_expires (expires_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ user_points table created/verified');

      // users 테이블에 total_points 컬럼 추가
      const totalPointsCol = await db.query(`SHOW COLUMNS FROM users LIKE 'total_points'`);
      if (!totalPointsCol || totalPointsCol.length === 0) {
        await db.execute(`ALTER TABLE users ADD COLUMN total_points INT DEFAULT 0 COMMENT '현재 보유 포인트'`);
        console.log('   ✅ users.total_points column added');
      }
    } catch (error) {
      console.warn('⚠️  [Migration] user_points table creation warning:', error);
    }

    // 13. 배송비 정책 테이블 (shipping_policies)
    console.log('📦 [Migration] Creating shipping_policies table...');
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS shipping_policies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          policy_name VARCHAR(100) NOT NULL COMMENT '정책 이름',
          base_fee INT NOT NULL DEFAULT 3000 COMMENT '기본 배송비 (KRW)',
          free_shipping_threshold INT DEFAULT 30000 COMMENT '무료 배송 기준 금액',
          jeju_extra_fee INT DEFAULT 3000 COMMENT '제주 추가 배송비',
          island_extra_fee INT DEFAULT 5000 COMMENT '도서산간 추가 배송비',
          is_default BOOLEAN DEFAULT FALSE COMMENT '기본 정책 여부',
          is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_default (is_default),
          INDEX idx_active (is_active)
        )
      `);
      console.log('✅ shipping_policies table created/verified');

      // 기본 배송비 정책 삽입
      const existingPolicies = await db.query('SELECT COUNT(*) as count FROM shipping_policies');
      if (existingPolicies[0].count === 0) {
        await db.execute(`
          INSERT INTO shipping_policies (policy_name, base_fee, free_shipping_threshold, jeju_extra_fee, island_extra_fee, is_default)
          VALUES (?, ?, ?, ?, ?, ?)
        `, ['기본 배송비 정책', 3000, 30000, 3000, 5000, true]);
        console.log('   ✅ Default shipping policy inserted');
      }
    } catch (error) {
      console.warn('⚠️  [Migration] shipping_policies table creation warning:', error);
    }

    // 14. 알림 로그 테이블 (notification_logs) - 이메일/SMS 발송 내역
    console.log('📧 [Migration] Creating notification_logs table...');
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS notification_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT COMMENT '사용자 ID (NULL 가능)',
          notification_type ENUM('email', 'sms', 'push') NOT NULL COMMENT '알림 유형',
          recipient VARCHAR(200) NOT NULL COMMENT '수신자 (이메일 또는 전화번호)',
          subject VARCHAR(200) COMMENT '제목 (이메일만)',
          message TEXT NOT NULL COMMENT '메시지 내용',
          template_name VARCHAR(100) COMMENT '사용한 템플릿 이름',
          related_order_id VARCHAR(100) COMMENT '관련 주문 번호',
          status ENUM('pending', 'sent', 'failed') DEFAULT 'pending' COMMENT '발송 상태',
          error_message TEXT COMMENT '실패 사유',
          sent_at DATETIME COMMENT '발송 완료 시각',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user (user_id),
          INDEX idx_order (related_order_id),
          INDEX idx_status (status),
          INDEX idx_type (notification_type)
        )
      `);
      console.log('✅ notification_logs table created/verified');
    } catch (error) {
      console.warn('⚠️  [Migration] notification_logs table creation warning:', error);
    }

    // 15. listings 테이블에 추가 컬럼 (최대 구매 수량, 배송비, 옵션 사용 여부)
    console.log('🛍️  [Migration] Adding columns to listings table...');
    try {
      // max_purchase
      const maxPurchaseCol = await db.query(`SHOW COLUMNS FROM listings LIKE 'max_purchase'`);
      if (!maxPurchaseCol || maxPurchaseCol.length === 0) {
        await db.execute(`ALTER TABLE listings ADD COLUMN max_purchase INT DEFAULT NULL COMMENT '최대 구매 수량 (NULL이면 무제한)'`);
        console.log('   ✅ listings.max_purchase column added');
      }

      // min_purchase
      const minPurchaseCol = await db.query(`SHOW COLUMNS FROM listings LIKE 'min_purchase'`);
      if (!minPurchaseCol || minPurchaseCol.length === 0) {
        await db.execute(`ALTER TABLE listings ADD COLUMN min_purchase INT DEFAULT 1 COMMENT '최소 구매 수량'`);
        console.log('   ✅ listings.min_purchase column added');
      }

      // shipping_fee
      const shippingFeeCol = await db.query(`SHOW COLUMNS FROM listings LIKE 'shipping_fee'`);
      if (!shippingFeeCol || shippingFeeCol.length === 0) {
        await db.execute(`ALTER TABLE listings ADD COLUMN shipping_fee INT DEFAULT NULL COMMENT '배송비 (NULL이면 정책 적용)'`);
        console.log('   ✅ listings.shipping_fee column added');
      }

      // has_options
      const hasOptionsCol = await db.query(`SHOW COLUMNS FROM listings LIKE 'has_options'`);
      if (!hasOptionsCol || hasOptionsCol.length === 0) {
        await db.execute(`ALTER TABLE listings ADD COLUMN has_options BOOLEAN DEFAULT FALSE COMMENT '옵션 사용 여부'`);
        console.log('   ✅ listings.has_options column added');
      }

      // stock (재고)
      const stockCol = await db.query(`SHOW COLUMNS FROM listings LIKE 'stock'`);
      if (!stockCol || stockCol.length === 0) {
        await db.execute(`ALTER TABLE listings ADD COLUMN stock INT DEFAULT 0 COMMENT '재고 수량 (옵션 없는 상품용)'`);
        console.log('   ✅ listings.stock column added');
      }

      // stock_enabled
      const stockEnabledCol = await db.query(`SHOW COLUMNS FROM listings LIKE 'stock_enabled'`);
      if (!stockEnabledCol || stockEnabledCol.length === 0) {
        await db.execute(`ALTER TABLE listings ADD COLUMN stock_enabled BOOLEAN DEFAULT FALSE COMMENT '재고 관리 사용 여부'`);
        console.log('   ✅ listings.stock_enabled column added');
      }

      console.log('✅ [Migration] listings table columns added successfully');
    } catch (error) {
      console.warn('⚠️  [Migration] listings table column addition warning:', error);
    }

    // ========================================
    // 15.5. payments 테이블에 포인트 사용 컬럼 추가
    // ========================================
    console.log('💰 [Migration] Adding points_used column to payments table...');
    try {
      const paymentsPointsUsedCol = await db.query(`SHOW COLUMNS FROM payments LIKE 'points_used'`);
      if (!paymentsPointsUsedCol || paymentsPointsUsedCol.length === 0) {
        await db.execute(`ALTER TABLE payments ADD COLUMN points_used INT DEFAULT 0 COMMENT '주문 시 사용한 포인트'`);
        console.log('   ✅ payments.points_used column added');
      }
    } catch (error) {
      console.warn('⚠️  [Migration] payments.points_used column warning:', error);
    }

    // ========================================
    // 16. bookings 테이블에 포인트 관련 컬럼 추가
    // ========================================
    console.log('💳 [Migration] Adding point columns to bookings table...');
    try {
      // points_earned
      const pointsEarnedCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'points_earned'`);
      if (!pointsEarnedCol || pointsEarnedCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN points_earned INT DEFAULT 0 COMMENT '적립된 포인트'`);
        console.log('   ✅ bookings.points_earned column added');
      }

      // points_used
      const pointsUsedCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'points_used'`);
      if (!pointsUsedCol || pointsUsedCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN points_used INT DEFAULT 0 COMMENT '사용한 포인트'`);
        console.log('   ✅ bookings.points_used column added');
      }

      // selected_options (선택한 옵션 JSON)
      const selectedOptionsCol = await db.query(`SHOW COLUMNS FROM bookings LIKE 'selected_options'`);
      if (!selectedOptionsCol || selectedOptionsCol.length === 0) {
        await db.execute(`ALTER TABLE bookings ADD COLUMN selected_options JSON COMMENT '선택한 상품 옵션'`);
        console.log('   ✅ bookings.selected_options column added');
      }

      console.log('✅ [Migration] bookings table point columns added successfully');
    } catch (error) {
      console.warn('⚠️  [Migration] bookings table point column addition warning:', error);
    }

    // ========================================
    // 17. rentcar_vendors 테이블에 PMS 컬럼 추가
    // ========================================
    console.log('🚗 [Migration] Adding PMS columns to rentcar_vendors table...');
    try {
      // pms_provider
      const pmsProviderCol = await db.query(`SHOW COLUMNS FROM rentcar_vendors LIKE 'pms_provider'`);
      if (!pmsProviderCol || pmsProviderCol.length === 0) {
        await db.execute(`ALTER TABLE rentcar_vendors ADD COLUMN pms_provider VARCHAR(50) COMMENT 'PMS 제공자'`);
        console.log('   ✅ rentcar_vendors.pms_provider column added');
      }

      // pms_api_key
      const pmsApiKeyCol = await db.query(`SHOW COLUMNS FROM rentcar_vendors LIKE 'pms_api_key'`);
      if (!pmsApiKeyCol || pmsApiKeyCol.length === 0) {
        await db.execute(`ALTER TABLE rentcar_vendors ADD COLUMN pms_api_key VARCHAR(500) COMMENT 'PMS API 키'`);
        console.log('   ✅ rentcar_vendors.pms_api_key column added');
      }

      // pms_property_id
      const pmsPropertyIdCol = await db.query(`SHOW COLUMNS FROM rentcar_vendors LIKE 'pms_property_id'`);
      if (!pmsPropertyIdCol || pmsPropertyIdCol.length === 0) {
        await db.execute(`ALTER TABLE rentcar_vendors ADD COLUMN pms_property_id VARCHAR(100) COMMENT 'PMS 프로퍼티 ID'`);
        console.log('   ✅ rentcar_vendors.pms_property_id column added');
      }

      console.log('✅ [Migration] rentcar_vendors table PMS columns added successfully');
    } catch (error) {
      console.warn('⚠️  [Migration] rentcar_vendors table PMS column addition warning:', error);
    }

    console.log('🎉 [Migration] All missing tables added successfully!');
    return true;

  } catch (error) {
    console.error('❌ [Migration] Failed to add missing tables:', error);
    return false;
  }
}

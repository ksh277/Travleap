import { db } from '../utils/database.js';







// 이메일 구독 (공개 API)
export async function subscribeEmail(email) {
  try {
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: '올바른 이메일 형식이 아닙니다.'
      };
    }

    // 이미 구독 중인지 확인
    const existing = await db.query(
      `SELECT * FROM newsletter_subscribers WHERE email = ?`,
      [email]
    );

    if (existing && existing.length > 0) {
      // 이미 구독 중인 경우
      if (existing[0].is_active) {
        return {
          success: false,
          error: '이미 구독 중인 이메일입니다.'
        };
      } else {
        // 구독 취소했던 경우 다시 활성화
        await db.query(
          `UPDATE newsletter_subscribers SET is_active = TRUE, unsubscribed_at = NULL WHERE email = ?`,
          [email]
        );
        return {
          success: true,
          message: '뉴스레터 구독이 재개되었습니다!'
        };
      }
    }

    // 새로운 구독자 추가
    await db.query(
      `INSERT INTO newsletter_subscribers (email, is_active) VALUES (?, TRUE)`,
      [email]
    );

    return {
      success: true,
      message: '뉴스레터 구독이 완료되었습니다!'
    };
  } catch (error) {
    console.error('Subscribe email error:', error);
    return {
      success: false,
      error: '구독 처리 중 오류가 발생했습니다.'
    };
  }
}

// 이메일 구독 취소
export async function unsubscribeEmail(email) {
  try {
    await db.query(
      `UPDATE newsletter_subscribers SET is_active = FALSE, unsubscribed_at = NOW() WHERE email = ?`,
      [email]
    );

    return {
      success: true,
      message: '뉴스레터 구독이 취소되었습니다.'
    };
  } catch (error) {
    console.error('Unsubscribe email error:', error);
    return {
      success: false,
      error: '구독 취소 중 오류가 발생했습니다.'
    };
  }
}

// 모든 구독자 조회 (관리자용)
export async function getAllSubscribers() {
  try {
    const subscribers = await db.query(
      `SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC`
    );

    return {
      success: true,
      subscribers: subscribers || []
    };
  } catch (error) {
    console.error('Get all subscribers error:', error);
    return {
      success: false,
      error: '구독자 목록 조회 실패',
      subscribers: []
    };
  }
}

// 활성 구독자 조회 (관리자용)
export async function getActiveSubscribers() {
  try {
    const subscribers = await db.query(
      `SELECT * FROM newsletter_subscribers WHERE is_active = TRUE ORDER BY subscribed_at DESC`
    );

    return {
      success: true,
      subscribers: subscribers || []
    };
  } catch (error) {
    console.error('Get active subscribers error:', error);
    return {
      success: false,
      error: '활성 구독자 목록 조회 실패',
      subscribers: []
    };
  }
}

// 구독자 삭제 (관리자용)
export async function deleteSubscriber(id) {
  try {
    await db.query(`DELETE FROM newsletter_subscribers WHERE id = ?`, [id]);

    return {
      success: true,
      message: '구독자가 삭제되었습니다.'
    };
  } catch (error) {
    console.error('Delete subscriber error:', error);
    return {
      success: false,
      error: '구독자 삭제 실패'
    };
  }
}

// 캠페인 생성 (관리자용)
export async function createCampaign(campaign) {
  try {
    const result = await db.query(
      `INSERT INTO newsletter_campaigns (subject, content, status) VALUES (?, ?, ?)`,
      [campaign.subject, campaign.content, campaign.status || 'draft']
    );

    return {
      success: true,
      message: '캠페인이 생성되었습니다.',
      campaign: {
        id: result[0]?.id || 0,
        ...campaign
      }
    };
  } catch (error) {
    console.error('Create campaign error:', error);
    return {
      success: false,
      error: '캠페인 생성 실패'
    };
  }
}

// 모든 캠페인 조회 (관리자용)
export async function getAllCampaigns() {
  try {
    const campaigns = await db.query(
      `SELECT * FROM newsletter_campaigns ORDER BY created_at DESC`
    );

    return {
      success: true,
      campaigns: campaigns || []
    };
  } catch (error) {
    console.error('Get all campaigns error:', error);
    return {
      success: false,
      error: '캠페인 목록 조회 실패',
      campaigns: []
    };
  }
}

// 캠페인 발송 (관리자용)
export async function sendCampaign(campaignId) {
  try {
    // 활성 구독자 조회
    const subscribersResult = await getActiveSubscribers();

    if (!subscribersResult.success || !subscribersResult.subscribers || subscribersResult.subscribers.length === 0) {
      return {
        success: false,
        error: '발송할 활성 구독자가 없습니다.'
      };
    }

    // 캠페인 정보 조회
    const campaigns = await db.query(
      `SELECT * FROM newsletter_campaigns WHERE id = ?`,
      [campaignId]
    );

    if (!campaigns || campaigns.length === 0) {
      return {
        success: false,
        error: '캠페인을 찾을 수 없습니다.'
      };
    }

    const campaign = campaigns[0];
    const subscribers = subscribersResult.subscribers;

    // 여기서 실제 이메일 발송 로직을 구현할 수 있습니다
    // 예: Nodemailer, SendGrid, AWS SES 등을 사용
    console.log(`
      ===== 이메일 발송 =====
      제목: ${campaign.subject}
      내용: ${campaign.content}
      수신자 수: ${subscribers.length}
      수신자 목록: ${subscribers.map(s => s.email).join(', ')}
      =======================
    `);

    // 캠페인 상태 업데이트
    await db.query(
      `UPDATE newsletter_campaigns SET status = 'sent', sent_at = NOW(), sent_count = ? WHERE id = ?`,
      [subscribers.length, campaignId]
    );

    return {
      success: true,
      message: `${subscribers.length}명의 구독자에게 이메일이 발송되었습니다.`
    };
  } catch (error) {
    console.error('Send campaign error:', error);
    return {
      success: false,
      error: '캠페인 발송 실패'
    };
  }
}

// 캠페인 삭제 (관리자용)
export async function deleteCampaign(id) {
  try {
    await db.query(`DELETE FROM newsletter_campaigns WHERE id = ?`, [id]);

    return {
      success: true,
      message: '캠페인이 삭제되었습니다.'
    };
  } catch (error) {
    console.error('Delete campaign error:', error);
    return {
      success: false,
      error: '캠페인 삭제 실패'
    };
  }
}


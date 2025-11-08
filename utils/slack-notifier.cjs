/**
 * Slack 알림 유틸리티
 *
 * 목적:
 * - 운영 중 발생하는 오류를 Slack으로 실시간 알림
 * - 결제 실패, 시스템 에러, 보안 이슈 등을 즉시 파악
 *
 * 사용법:
 * const { notifyError, notifyPaymentFailure, notifySecurityAlert } = require('./utils/slack-notifier');
 * await notifyError('Payment API Error', error, { orderId: 123 });
 */

const { maskForLog } = require('./pii-masking.cjs');

/**
 * Slack Webhook URL
 * 환경변수로 설정: SLACK_WEBHOOK_URL
 *
 * Slack Webhook 생성 방법:
 * 1. https://api.slack.com/apps 접속
 * 2. "Create New App" 클릭
 * 3. "From scratch" 선택
 * 4. 앱 이름 입력 (예: Travleap Alerts)
 * 5. 워크스페이스 선택
 * 6. "Incoming Webhooks" 활성화
 * 7. "Add New Webhook to Workspace" 클릭
 * 8. 알림받을 채널 선택 (예: #alerts, #errors)
 * 9. 생성된 Webhook URL을 .env에 저장
 */
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const ENABLE_SLACK_NOTIFICATIONS = process.env.ENABLE_SLACK_NOTIFICATIONS === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Slack으로 메시지 전송
 *
 * @param {object} payload - Slack 메시지 페이로드
 * @returns {Promise<boolean>} 전송 성공 여부
 */
async function sendSlackMessage(payload) {
  // Slack 알림이 비활성화되어 있거나 Webhook URL이 없으면 건너뜀
  if (!ENABLE_SLACK_NOTIFICATIONS || !SLACK_WEBHOOK_URL) {
    console.log('⏭️  [Slack] Notifications disabled or webhook URL not set');
    return false;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ [Slack] Message sent successfully');
      return true;
    } else {
      console.error('❌ [Slack] Failed to send message:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ [Slack] Error sending message:', error.message);
    return false;
  }
}

/**
 * 에러 알림
 *
 * @param {string} title - 에러 제목
 * @param {Error|string} error - 에러 객체 또는 메시지
 * @param {object} context - 추가 컨텍스트 (PII 마스킹 적용됨)
 */
async function notifyError(title, error, context = {}) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';

  // PII 마스킹 적용
  const maskedContext = maskForLog(context);

  const payload = {
    text: `🚨 *${title}*`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 ${title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Environment:*\n${NODE_ENV}`
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${new Date().toISOString()}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error Message:*\n\`\`\`${errorMessage}\`\`\``
        }
      }
    ]
  };

  // 컨텍스트 추가
  if (Object.keys(maskedContext).length > 0) {
    payload.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Context:*\n\`\`\`${JSON.stringify(maskedContext, null, 2)}\`\`\``
      }
    });
  }

  // 스택 트레이스 추가 (개발 환경에서만)
  if (NODE_ENV === 'development' && errorStack) {
    payload.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Stack Trace:*\n\`\`\`${errorStack.substring(0, 500)}\`\`\``
      }
    });
  }

  await sendSlackMessage(payload);
}

/**
 * 결제 실패 알림
 *
 * @param {object} paymentData - 결제 데이터 (PII 마스킹 적용됨)
 */
async function notifyPaymentFailure(paymentData) {
  const maskedData = maskForLog(paymentData);

  const payload = {
    text: `💳 결제 실패 알림`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '💳 결제 실패 알림',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*주문번호:*\n${maskedData.orderId || 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*금액:*\n₩${(maskedData.amount || 0).toLocaleString()}`
          },
          {
            type: 'mrkdwn',
            text: `*실패 사유:*\n${maskedData.failReason || 'Unknown'}`
          },
          {
            type: 'mrkdwn',
            text: `*시각:*\n${new Date().toISOString()}`
          }
        ]
      }
    ]
  };

  await sendSlackMessage(payload);
}

/**
 * 보안 이슈 알림
 *
 * @param {string} issueType - 이슈 유형 (예: 'Unauthorized Access', 'Suspicious Activity')
 * @param {object} details - 상세 정보 (PII 마스킹 적용됨)
 */
async function notifySecurityAlert(issueType, details = {}) {
  const maskedDetails = maskForLog(details);

  const payload = {
    text: `🔒 보안 알림: ${issueType}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔒 보안 알림: ${issueType}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Environment:*\n${NODE_ENV}`
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${new Date().toISOString()}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Details:*\n\`\`\`${JSON.stringify(maskedDetails, null, 2)}\`\`\``
        }
      }
    ]
  };

  await sendSlackMessage(payload);
}

/**
 * 일반 정보 알림
 *
 * @param {string} title - 제목
 * @param {string} message - 메시지
 * @param {string} emoji - 이모지 (기본: 📢)
 */
async function notifyInfo(title, message, emoji = '📢') {
  const payload = {
    text: `${emoji} ${title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Environment: ${NODE_ENV} | ${new Date().toISOString()}`
          }
        ]
      }
    ]
  };

  await sendSlackMessage(payload);
}

/**
 * 주문 완료 알림
 *
 * @param {object} orderData - 주문 데이터 (PII 마스킹 적용됨)
 */
async function notifyOrderCompleted(orderData) {
  const maskedData = maskForLog(orderData);

  const payload = {
    text: `🎉 신규 주문`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎉 신규 주문',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*주문번호:*\n${maskedData.orderNumber || 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*상품:*\n${maskedData.productName || 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*금액:*\n₩${(maskedData.totalAmount || 0).toLocaleString()}`
          },
          {
            type: 'mrkdwn',
            text: `*시각:*\n${new Date().toISOString()}`
          }
        ]
      }
    ]
  };

  await sendSlackMessage(payload);
}

/**
 * Webhook 검증 실패 알림
 *
 * @param {string} reason - 실패 사유
 * @param {object} requestData - 요청 데이터 (PII 마스킹 적용됨)
 */
async function notifyWebhookFailure(reason, requestData = {}) {
  const maskedData = maskForLog(requestData);

  const payload = {
    text: `⚠️ Webhook 검증 실패`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Webhook 검증 실패',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*사유:*\n${reason}`
          },
          {
            type: 'mrkdwn',
            text: `*시각:*\n${new Date().toISOString()}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*요청 데이터:*\n\`\`\`${JSON.stringify(maskedData, null, 2).substring(0, 500)}\`\`\``
        }
      }
    ]
  };

  await sendSlackMessage(payload);
}

module.exports = {
  sendSlackMessage,
  notifyError,
  notifyPaymentFailure,
  notifySecurityAlert,
  notifyInfo,
  notifyOrderCompleted,
  notifyWebhookFailure
};

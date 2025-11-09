/**
 * 이메일 발송 서비스
 *
 * admin_settings에서 이메일 설정을 가져와 SendGrid로 이메일 발송
 */

import { connect } from '@planetscale/database';

interface EmailSettings {
  adminEmails: string[];
  emailNotificationsEnabled: boolean;
  orderNotificationEnabled: boolean;
  refundNotificationEnabled: boolean;
  paymentNotificationEnabled: boolean;
  supportEmail: string;
  smtpFrom: string;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * admin_settings에서 이메일 설정 가져오기
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute(
      "SELECT setting_key, setting_value FROM admin_settings WHERE setting_category = 'email'"
    );

    const settings: any = {};

    if (result.rows) {
      result.rows.forEach((row: any) => {
        settings[row.setting_key] = row.setting_value;
      });
    }

    // admin_emails JSON 파싱
    let adminEmails: string[] = [];
    try {
      adminEmails = JSON.parse(settings.admin_emails || '[]');
    } catch (e) {
      console.error('Failed to parse admin_emails:', e);
      adminEmails = [];
    }

    return {
      adminEmails,
      emailNotificationsEnabled: settings.email_notifications_enabled === 'true',
      orderNotificationEnabled: settings.order_notification_enabled === 'true',
      refundNotificationEnabled: settings.refund_notification_enabled === 'true',
      paymentNotificationEnabled: settings.payment_notification_enabled === 'true',
      supportEmail: settings.support_email || 'support@travleap.com',
      smtpFrom: settings.smtp_from || 'noreply@travleap.com',
    };
  } catch (error) {
    console.error('❌ Failed to get email settings:', error);
    // 기본값 반환
    return {
      adminEmails: [],
      emailNotificationsEnabled: false,
      orderNotificationEnabled: false,
      refundNotificationEnabled: false,
      paymentNotificationEnabled: false,
      supportEmail: 'support@travleap.com',
      smtpFrom: 'noreply@travleap.com',
    };
  }
}

/**
 * SendGrid를 사용한 이메일 발송
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  try {
    // SendGrid API 키 확인
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️  SENDGRID_API_KEY not configured, email not sent');
      console.log('📧 Email would be sent to:', to);
      console.log('📧 Subject:', subject);
      return false;
    }

    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);

    const settings = await getEmailSettings();

    const msg = {
      to: Array.isArray(to) ? to : [to],
      from: settings.smtpFrom,
      subject,
      text: text || '',
      html,
    };

    await sgMail.default.send(msg);
    console.log(`✅ Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
    return false;
  }
}

/**
 * 관리자에게 알림 이메일 발송
 */
export async function sendAdminNotification({
  subject,
  html,
  text,
  notificationType,
}: {
  subject: string;
  html: string;
  text?: string;
  notificationType: 'order' | 'refund' | 'payment';
}): Promise<boolean> {
  try {
    const settings = await getEmailSettings();

    // 전체 알림이 비활성화되어 있으면 발송 안 함
    if (!settings.emailNotificationsEnabled) {
      console.log('ℹ️  Email notifications are disabled');
      return false;
    }

    // 특정 알림 타입이 비활성화되어 있으면 발송 안 함
    if (
      (notificationType === 'order' && !settings.orderNotificationEnabled) ||
      (notificationType === 'refund' && !settings.refundNotificationEnabled) ||
      (notificationType === 'payment' && !settings.paymentNotificationEnabled)
    ) {
      console.log(`ℹ️  ${notificationType} notifications are disabled`);
      return false;
    }

    // 관리자 이메일이 없으면 발송 안 함
    if (settings.adminEmails.length === 0) {
      console.log('⚠️  No admin emails configured');
      return false;
    }

    // 관리자 이메일로 발송
    return await sendEmail({
      to: settings.adminEmails,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    return false;
  }
}

/**
 * 사용자에게 이메일 발송
 */
export async function sendUserEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  try {
    const settings = await getEmailSettings();

    // 전체 알림이 비활성화되어 있으면 발송 안 함
    if (!settings.emailNotificationsEnabled) {
      console.log('ℹ️  Email notifications are disabled');
      return false;
    }

    return await sendEmail({ to, subject, html, text });
  } catch (error) {
    console.error('❌ Failed to send user email:', error);
    return false;
  }
}

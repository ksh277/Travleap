/**
 * 이메일 발송 API (Vercel Serverless Function)
 * EmailJS, SendGrid, AWS SES 등 다양한 서비스 지원
 */

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, html/text'
      });
    }

    // 방법 1: EmailJS 사용 (무료, 간단)
    if (process.env.VITE_EMAILJS_SERVICE_ID) {
      const emailJSResponse = await sendViaEmailJS(to, subject, html || text);
      if (emailJSResponse.success) {
        return res.status(200).json({ success: true, message: 'Email sent via EmailJS' });
      }
    }

    // 방법 2: SendGrid 사용 (프로덕션 추천)
    if (process.env.SENDGRID_API_KEY) {
      const sendGridResponse = await sendViaSendGrid(to, subject, html || text);
      if (sendGridResponse.success) {
        return res.status(200).json({ success: true, message: 'Email sent via SendGrid' });
      }
    }

    // 방법 3: AWS SES 사용 (대규모 발송)
    if (process.env.AWS_SES_REGION) {
      const sesResponse = await sendViaAWSSES(to, subject, html || text);
      if (sesResponse.success) {
        return res.status(200).json({ success: true, message: 'Email sent via AWS SES' });
      }
    }

    // 개발 환경: 이메일 내용을 콘솔에 출력
    console.log('📧 Email (Development Mode):');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html || text}`);

    return res.status(200).json({
      success: true,
      message: 'Email sent (development mode - logged to console)',
      dev: true
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};

/**
 * EmailJS로 이메일 발송
 */
async function sendViaEmailJS(to, subject, content) {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: process.env.VITE_EMAILJS_SERVICE_ID,
        template_id: process.env.VITE_EMAILJS_TEMPLATE_ID,
        user_id: process.env.VITE_EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: to,
          subject: subject,
          message: content
        }
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      console.error('EmailJS error:', await response.text());
      return { success: false };
    }
  } catch (error) {
    console.error('EmailJS exception:', error);
    return { success: false };
  }
}

/**
 * SendGrid로 이메일 발송
 */
async function sendViaSendGrid(to, subject, html) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }]
        }],
        from: {
          email: process.env.SENDER_EMAIL || 'noreply@travleap.com',
          name: 'Travleap'
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: html
        }]
      })
    });

    if (response.ok || response.status === 202) {
      return { success: true };
    } else {
      console.error('SendGrid error:', await response.text());
      return { success: false };
    }
  } catch (error) {
    console.error('SendGrid exception:', error);
    return { success: false };
  }
}

/**
 * AWS SES로 이메일 발송
 */
async function sendViaAWSSES(to, subject, html) {
  try {
    // AWS SDK v3 사용
    const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

    const client = new SESClient({
      region: process.env.AWS_SES_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const command = new SendEmailCommand({
      Source: process.env.SENDER_EMAIL || 'noreply@travleap.com',
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8'
          }
        }
      }
    });

    await client.send(command);
    return { success: true };
  } catch (error) {
    console.error('AWS SES exception:', error);
    return { success: false };
  }
}

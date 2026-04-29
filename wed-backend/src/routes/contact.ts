import { Router, Request, Response } from 'express';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env';
import { escapeHtml } from '../utils/helpers';

const router = Router();

const ses = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// Permissive but strict email check; what matters most here is that we reject
// values containing CR/LF (header-injection vector) before passing them to SES.
const EMAIL_RE = /^[^\s@<>"'\\]+@[^\s@<>"'\\]+\.[^\s@<>"'\\]+$/;

const stripCRLF = (s: string) => s.replace(/[\r\n\t]/g, ' ').trim();

const sanitizeHeaderValue = (s: any, max = 200) =>
  stripCRLF(String(s ?? '')).slice(0, max);

// POST /api/contact
router.post('/', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body || {};

    if (!email || !phone) {
      return res.status(400).json({ error: 'email and phone are required' });
    }

    const safeEmail = sanitizeHeaderValue(email, 254);
    if (!EMAIL_RE.test(safeEmail)) {
      return res.status(400).json({ error: 'invalid email' });
    }

    const safeFirst = sanitizeHeaderValue(firstName, 100);
    const safeLast = sanitizeHeaderValue(lastName, 100);
    const safePhone = sanitizeHeaderValue(phone, 32);
    const safeMessage = String(message ?? '').slice(0, 5000);

    const fullName = `${safeFirst} ${safeLast}`.trim();
    const safeFullName = fullName || 'UsForever Contact';

    const command = new SendEmailCommand({
      Source: env.AWS_VERIFIED_EMAIL,
      Destination: {
        ToAddresses: [env.AWS_VERIFIED_EMAIL],
      },
      Message: {
        Subject: {
          Data: `UsForever Contact: ${safeFullName}`,
        },
        Body: {
          Text: {
            Data: `New contact form submission:\n\nName: ${safeFullName}\nEmail: ${safeEmail}\nPhone: ${safePhone || 'N/A'}\n\nMessage:\n${safeMessage}`,
          },
          Html: {
            Data: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${escapeHtml(safeFullName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(safePhone || 'N/A')}</p>
              <hr/>
              <p><strong>Message:</strong></p>
              <p>${escapeHtml(safeMessage).replace(/\n/g, '<br/>')}</p>
            `,
          },
        },
      },
      ReplyToAddresses: [safeEmail],
    });

    await ses.send(command);

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err: any) {
    console.error('contact error:', err);
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
});

export default router;

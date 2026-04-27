import { Router, Request, Response } from 'express';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env';

const router = Router();

const ses = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// POST /api/contact
router.post('/', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body || {};

    if (!email || !phone) {
      return res.status(400).json({ error: 'email and phone are required' });
    }

    const fullName = `${firstName} ${lastName || ''}`.trim();

    const command = new SendEmailCommand({
      Source: env.AWS_VERIFIED_EMAIL,
      Destination: {
        ToAddresses: [env.AWS_VERIFIED_EMAIL],
      },
      Message: {
        Subject: {
          Data: `UsForever Contact: ${fullName}`,
        },
        Body: {
          Text: {
            Data: `New contact form submission:\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\n\nMessage:\n${message}`,
          },
          Html: {
            Data: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
              <hr/>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
            `,
          },
        },
      },
      ReplyToAddresses: [email],
    });

    await ses.send(command);

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err: any) {
    console.error('contact error:', err);
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
});

export default router;

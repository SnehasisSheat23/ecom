import { EmailOptions, NotificationProvider } from './notification.interface.js';
import { logger } from '../../lib/logger.js';

export class ResendProvider implements NotificationProvider {
  constructor(
    private readonly apiKey: string,
    private readonly defaultFrom: string = 'Nexus Commerce <notifications@resend.dev>'
  ) {}

  async sendEmail(options: EmailOptions): Promise<{ id: string } | null> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: options.from || this.defaultFrom,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ error, status: response.status }, 'Resend API error');
        return null;
      }

      const data = await response.json() as { id: string };
      logger.info({ emailId: data.id }, 'Email sent successfully via Resend');
      return data;
    } catch (err) {
      logger.error({ err }, 'Failed to send email via Resend');
      return null;
    }
  }
}

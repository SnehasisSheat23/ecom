import { Hono } from 'hono';
import { AppBindings } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import { NotificationsService } from './notifications.service.js';
import { EmailOptions } from '../../providers/notification/notification.interface.js';

export const createNotificationJobs = (service: NotificationsService) => {
  const app = new Hono<AppBindings>();

  app.post('/email', async (c) => {
    const payload = await c.req.json() as EmailOptions & { type: string };
    
    logger.info({ to: payload.to, subject: payload.subject }, 'Processing email job from queue');

    try {
      const result = await service.sendEmailSync(payload);
      if (!result) {
        return c.json({ error: 'Failed to send email via provider' }, 500);
      }
      return c.json({ success: true, messageId: result.id });
    } catch (err) {
      logger.error({ err }, 'Error in notification job handler');
      return c.json({ error: 'Internal handler error' }, 500);
    }
  });

  return app;
};

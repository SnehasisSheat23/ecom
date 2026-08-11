import { NotificationProvider, EmailOptions } from '../../providers/notification/notification.interface.js';
import { JobQueueProvider } from '../../providers/queue/job-queue.interface.js';
import { logger } from '../../lib/logger.js';
import { getOptionalEnv } from '../../lib/env.js';

export interface NotificationJobPayload extends EmailOptions {
  type: 'email';
}

export class NotificationsService {
  constructor(
    private readonly provider: NotificationProvider,
    private readonly queue?: JobQueueProvider,
    private readonly config?: {
      jobUrl: string;
    }
  ) {}

  /**
   * Send an email asynchronously via the job queue
   */
  async sendEmailAsync(options: EmailOptions) {
    if (!this.queue || !this.config?.jobUrl) {
      logger.warn('Job queue not configured for async notifications, falling back to sync');
      return this.provider.sendEmail(options);
    }

    const jobId = `email-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    await this.queue.publish(
      {
        jobId,
        queueName: 'notifications',
        jobName: 'send-email',
        payload: {
          ...options,
          type: 'email'
        },
      },
      {
        url: this.config.jobUrl,
      }
    );

    return { id: jobId, queued: true };
  }

  /**
   * Directly send an email (synchronous)
   */
  async sendEmailSync(options: EmailOptions) {
    return this.provider.sendEmail(options);
  }

  // --- Templates ---

  async sendOrderConfirmation(email: string, orderData: { orderNumber: string, totalAmount: number }) {
    const subject = `Order Confirmation - ${orderData.orderNumber}`;
    const html = `
      <h1>Thank you for your order!</h1>
      <p>Your order <strong>${orderData.orderNumber}</strong> has been received.</p>
      <p>Total Amount: ₹${(orderData.totalAmount / 100).toFixed(2)}</p>
      <p>We will notify you when your items are shipped.</p>
    `;
    return this.sendEmailAsync({ to: email, subject, html });
  }

  async notifyVendorNewOrder(email: string, vendorName: string, orderNumber: string) {
    const subject = `New Order Received - ${orderNumber}`;
    const html = `
      <h1>Hello ${vendorName},</h1>
      <p>You have received a new order: <strong>${orderNumber}</strong>.</p>
      <p>Please log in to your vendor dashboard to process the order.</p>
    `;
    return this.sendEmailAsync({ to: email, subject, html });
  }
}

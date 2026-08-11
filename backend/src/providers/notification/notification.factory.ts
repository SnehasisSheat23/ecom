import { NotificationProvider } from './notification.interface.js';
import { ResendProvider } from './resend.provider.js';
import { getOptionalEnv } from '../../lib/env.js';

export function getNotificationProvider(): NotificationProvider | null {
  const apiKey = getOptionalEnv('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('RESEND_API_KEY not found. Emails will not be sent.');
    return null;
  }
  
  const from = getOptionalEnv('EMAIL_FROM');
  return new ResendProvider(apiKey, from);
}

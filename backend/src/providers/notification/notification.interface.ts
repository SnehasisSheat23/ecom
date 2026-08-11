export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface NotificationProvider {
  sendEmail(options: EmailOptions): Promise<{ id: string } | null>;
}

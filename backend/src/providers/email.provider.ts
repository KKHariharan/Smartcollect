import { logger } from '../config/logger';
import { env } from '../config/env';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Dev-mode provider: logs the email instead of sending it, so flows like
 * password reset are fully testable without real SMTP/SendGrid credentials.
 * Swap this for an SmtpEmailProvider/SendGridEmailProvider in a later phase.
 */
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    logger.info('Email dispatched (console provider)', {
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      body: message.body,
    });
    await Promise.resolve();
  }
}

export function createEmailProvider(): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case 'console':
    default:
      return new ConsoleEmailProvider();
  }
}

export const emailProvider = createEmailProvider();

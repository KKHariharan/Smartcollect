import { logger } from '../config/logger';

export interface WhatsAppMessage {
  to: string;
  body: string;
}

export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<void>;
}

/**
 * Dev-mode provider: logs the message instead of sending it, so receipt
 * flows are fully testable without real WhatsApp Business API credentials.
 * Swap for a Twilio/WhatsApp Cloud API implementation in a later phase.
 * The same shape (and a future SmsProvider) covers the "SMS Ready
 * Architecture" requirement.
 */
class ConsoleWhatsAppProvider implements WhatsAppProvider {
  async send(message: WhatsAppMessage): Promise<void> {
    logger.info('WhatsApp message dispatched (console provider)', message);
    await Promise.resolve();
  }
}

export function createWhatsAppProvider(): WhatsAppProvider {
  return new ConsoleWhatsAppProvider();
}

export const whatsappProvider = createWhatsAppProvider();

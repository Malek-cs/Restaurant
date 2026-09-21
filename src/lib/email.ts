import "server-only";

/**
 * Email abstraction. No transactional provider is configured by default:
 * `ConsoleEmailProvider` logs messages to the server console. Implement
 * `EmailProvider` with Resend / Postmark / SES and return it from `getEmailProvider()`.
 */
export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
}

export interface EmailProvider {
  readonly id: string;
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  readonly id = "console";
  async send(message: EmailMessage) {
    console.info(`[email:console] to=${message.to.join(",")} subject="${message.subject}"\n${message.text}`);
  }
}

export function getEmailProvider(): EmailProvider {
  return new ConsoleEmailProvider();
}

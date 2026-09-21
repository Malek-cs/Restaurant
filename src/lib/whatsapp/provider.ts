import "server-only";
import { whatsappLink } from "@/utils/phone";

/**
 * WhatsApp integration abstraction.
 *
 * Today the app uses `ClickToChatProvider`: it does NOT call any WhatsApp API.
 * It prepares a wa.me link with the rendered message so staff can send it from
 * their own WhatsApp with one click. To automate sending, implement
 * `WhatsAppProvider` against an official WhatsApp Business Platform provider
 * (Meta Cloud API, Twilio, 360dialog…), set `mode = "automatic"`, and return it
 * from `getWhatsAppProvider()`. Nothing else in the app needs to change.
 */
export interface OutgoingMessage {
  to: string; // E.164
  body: string;
  templateKey: string;
}

export interface SendResult {
  status: "QUEUED" | "SENT" | "FAILED";
  link?: string;
  providerMessageId?: string;
  error?: string;
}

export interface WhatsAppProvider {
  readonly id: string;
  readonly label: string;
  /** "manual": staff must open the link. "automatic": the provider delivers the message itself. */
  readonly mode: "manual" | "automatic";
  send(message: OutgoingMessage): Promise<SendResult>;
}

class ClickToChatProvider implements WhatsAppProvider {
  readonly id = "click-to-chat";
  readonly label = "Click-to-chat (wa.me)";
  readonly mode = "manual" as const;
  async send(message: OutgoingMessage): Promise<SendResult> {
    return { status: "QUEUED", link: whatsappLink(message.to, message.body) };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return new ClickToChatProvider();
}

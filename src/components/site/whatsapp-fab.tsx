import { SocialIcon } from "@/components/site/social-icons";

export function WhatsAppFab({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp" className="fixed bottom-24 end-4 z-40 grid size-12 place-items-center rounded-full bg-[#25a55f] text-white shadow-lg transition-transform hover:scale-105 sm:bottom-6 sm:end-6 sm:size-14">
      <SocialIcon kind="whatsapp" className="size-6 sm:size-7" />
    </a>
  );
}

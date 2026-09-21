// lucide-react no longer ships brand icons, so these are small inline SVGs.
export function SocialIcon({ kind, className }: { kind: "instagram" | "facebook" | "tiktok" | "whatsapp"; className?: string }) {
  const p = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "instagram":
      return (<svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" /></svg>);
    case "facebook":
      return (<svg {...p}><path d="M14 8h2.5V4.5H14C11.8 4.5 10.5 6 10.5 8.2V10.5H8V14h2.5v6h3.5v-6h2.4l.6-3.5H14V8.5c0-.3.2-.5.5-.5" /></svg>);
    case "tiktok":
      return (<svg {...p}><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 4c.3 2.3 1.8 3.8 4.2 4" /></svg>);
    case "whatsapp":
      return (<svg {...p}><path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8z" /><path d="M9 9c.2 2.2 2.3 4.4 5 5.4l1.3-1.2c.2-.2.5-.2.7 0l1.4.8c.2.2.3.4.2.7-.4 1-1.5 1.5-2.5 1.3C11.700 15.500 8.500 12.400 7.700 9.300c-.2-1 .4-2 1.300-2.400.2 0 .5 0 .6.3l.8 1.400c.1.200.1.500-.1.700z" /></svg>);
  }
}

import { useEffect, useState } from "react";
import { taka, type Product } from "@/lib/shop";
import { SmartImage } from "@/components/site/SmartImage";

export const WHATSAPP_NUMBER = "8801316745222";

export function whatsappOrderUrl(product: Product, qty: number) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = [
    "Hello Velvet Flora! ✨",
    `I want to order: ${product.name} x${qty} (${taka(product.price * qty)})`,
    url ? `Link: ${url}` : "",
    "",
    "My details:",
    "Name: ",
    "Phone: ",
    "Delivery Address: ",
    "Inside / Outside Dhaka: ",
  ]
    .filter((l, i) => l !== "" || i === 3)
    .join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function WhatsAppIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.23-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.42 9.43-9.42 2.52 0 4.88.98 6.66 2.76a9.36 9.36 0 0 1 2.76 6.67c0 5.2-4.23 9.42-9.42 9.42m8.02-17.44A11.27 11.27 0 0 0 12.05.75C5.8.75.7 5.84.7 12.1c0 2 .52 3.95 1.52 5.67L.6 23.25l5.61-1.47a11.3 11.3 0 0 0 5.84 1.6c6.25 0 11.35-5.1 11.35-11.36 0-3.03-1.18-5.88-3.33-8.02" />
    </svg>
  );
}

export function WhatsAppOrderButton({ product, qty }: { product: Product; qty: number }) {
  return (
    <a
      href={whatsappOrderUrl(product, qty)}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-secondary sm:w-auto"
    >
      <WhatsAppIcon />
      Order via WhatsApp
    </a>
  );
}

/** Mobile bar that slides up once the main buttons scroll out of view. */
export function StickyQuickBuy({
  product,
  qty,
  onQuickCod,
  anchorId,
}: {
  product: Product;
  qty: number;
  onQuickCod: () => void;
  anchorId: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(anchorId);
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e && setShow(!e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [anchorId]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 py-2.5 shadow-lg backdrop-blur transition-transform duration-300 md:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!show}
    >
      <div className="flex items-center gap-2.5">
        <div className="size-11 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
          <SmartImage src={product.image_url} alt="" width={88} height={88} className="size-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <p className="text-sm font-semibold text-primary">{taka(product.price * qty)}</p>
        </div>
        <a
          href={whatsappOrderUrl(product, qty)}
          target="_blank"
          rel="noreferrer"
          aria-label="Order via WhatsApp"
          tabIndex={show ? 0 : -1}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border"
        >
          <WhatsAppIcon />
        </a>
        <button
          onClick={onQuickCod}
          tabIndex={show ? 0 : -1}
          className="shrink-0 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        >
          Quick COD
        </button>
      </div>
    </div>
  );
}

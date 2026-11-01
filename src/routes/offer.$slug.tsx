import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Truck, PackageOpen, RefreshCw, Phone, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { WHATSAPP_NUMBER, WhatsAppIcon } from "@/components/site/QuickOrder";
import { contentQuery } from "@/lib/content";
import { LANDING_KEY, parseLandingPages, useLandingPages } from "@/lib/landing";
import { cdnImage } from "@/components/site/SmartImage";

export const Route = createFileRoute("/offer/$slug")({
  loader: async ({ context, params }) => {
    const c = await context.queryClient.ensureQueryData(contentQuery).catch(() => undefined);
    const page = parseLandingPages(c?.[LANDING_KEY]).find((p) => p.slug === params.slug && p.active);
    return { title: page ? `${page.title} ${page.highlight}`.trim() : "", intro: page?.intro ?? "" };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.title ? `${loaderData.title} — Velvet Flora` : "স্পেশাল অফার — Velvet Flora";
    const desc = loaderData?.intro || "সারাদেশে ক্যাশ অন ডেলিভারি। পণ্য দেখে টাকা পরিশোধ করুন।";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: OfferPage,
});

const bn = (n: number) => n.toLocaleString("bn-BD");

function normalizeBdPhone(raw: string) {
  const en = raw.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  let d = en.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(2);
  else if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return d;
}

const schema = z.object({
  customer_name: z.string().trim().min(2, "আপনার নাম লিখুন").max(80),
  phone: z.string().transform(normalizeBdPhone).pipe(z.string().regex(/^01[3-9]\d{8}$/, "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন")),
  address: z.string().trim().min(10, "সম্পূর্ণ ঠিকানা লিখুন (গ্রাম/রোড, থানা, জেলা)").max(400),
});

function useCountdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      setLeft(Math.max(0, end.getTime() - now.getTime()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (left === null) return null;
  const s = Math.floor(left / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => bn(n).padStart(2, "০"));
}

function OfferPage() {
  const { slug } = Route.useParams();
  const { pages, ready } = useLandingPages();
  const page = pages.find((p) => p.slug === slug && p.active);
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [trap, setTrap] = useState("");
  const lock = useRef(false);
  const started = useRef(false);
  const viewed = useRef(false);
  const timer = useCountdown();

  const selected = page?.packages.find((k) => k.id === pkgId) ?? page?.packages[0];
  const fee = selected?.deliveryFee ?? 0;
  const grand = (selected?.price ?? 0) + fee;
  const pkgSlug = (id: string) => `${slug}-${id}`;

  useEffect(() => {
    if (page && selected && !viewed.current) {
      viewed.current = true;
      track("ViewContent", { currency: "BDT", value: selected.price, content_type: "product", content_ids: [pkgSlug(selected.id)] });
    }
  }, [page, selected]);

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!page || !selected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div>
          <h1 className="text-2xl font-bold">এই অফারটি এখন আর নেই</h1>
          <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-primary-foreground">হোম পেজে যান</Link>
        </div>
      </div>
    );
  }

  function onField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (!started.current) {
      started.current = true;
      track("InitiateCheckout", { currency: "BDT", value: grand });
    }
  }

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `আসসালামু আলাইকুম, আমি "${selected.name}" (৳${selected.price}) অর্ডার করতে চাই।\nনাম: ${form.customer_name}\nমোবাইল: ${form.phone}\nঠিকানা: ${form.address}`,
  )}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!page || !selected) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
      setErrors(next);
      const first = ["customer_name", "phone", "address"].find((k) => next[k]);
      if (first) {
        toast.error(next[first]);
        const el = document.getElementById(`of-${first}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => el?.focus({ preventScroll: true }), 350);
      }
      return;
    }
    setErrors({});
    if (trap) return setDone("VF-RECEIVED");
    if (lock.current) return;
    lock.current = true;
    setSubmitting(true);
    const code = `VF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    let error: unknown = null;
    try {
      const res = await supabase.from("orders").insert({
        order_code: code,
        customer_name: parsed.data.customer_name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        notes: `ল্যান্ডিং পেজ: ${page.title} ${page.highlight}`.trim(),
        area: "outside_dhaka",
        items: [{ name: selected.name, qty: 1, price: selected.price, slug: pkgSlug(selected.id) }],
        subtotal: selected.price,
        discount: 0,
        delivery_fee: fee,
        total: grand,
      });
      error = res.error;
    } catch (err) {
      error = err;
    }
    setSubmitting(false);
    if (error) {
      lock.current = false;
      toast.error("অর্ডার পাঠানো যায়নি — হোয়াটসঅ্যাপে এক ক্লিকে অর্ডার করুন।");
      return;
    }
    track(
      "Purchase",
      { value: grand, currency: "BDT", content_type: "product", content_ids: [pkgSlug(selected.id)], num_items: 1, order_id: code },
      { phone: parsed.data.phone, customerName: parsed.data.customer_name },
    );
    setDone(code);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
        <div className="max-w-md text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-10" strokeWidth={3} />
          </div>
          <h1 className="mt-6 text-3xl font-bold">ধন্যবাদ! আপনার অর্ডার সম্পন্ন হয়েছে</h1>
          <p className="mt-3 text-muted-foreground">অর্ডার নম্বর: <b className="text-foreground">{done}</b></p>
          <p className="mt-1 text-muted-foreground">মোট: <b className="text-foreground">৳{bn(grand)}</b> · {fee ? `ডেলিভারি চার্জ ৳${bn(fee)} সহ` : "ডেলিভারি চার্জ ফ্রি"}</p>
          <p className="mt-4 text-sm text-muted-foreground">{page.thanks}</p>
        </div>
      </div>
    );
  }

  const hero = page.heroImage || selected.image;
  const field = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground md:pb-0">
      <div className="sticky top-0 z-40 bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Timer className="size-4" /> আজকের অফার শেষ হতে বাকি:
          <span className="rounded bg-background/20 px-1.5 font-mono tabular-nums">{timer ? timer.join(":") : "--:--:--"}</span>
        </span>
      </div>

      <section className="mx-auto grid max-w-5xl items-center gap-8 px-5 py-10 md:grid-cols-2">
        <div>
          {page.badge && <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{page.badge}</span>}
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            {page.title} <span className="text-primary">{page.highlight}</span>
          </h1>
          {page.intro && <p className="mt-4 text-muted-foreground">{page.intro}</p>}
          <p className="mt-4 text-3xl font-bold text-primary">
            ৳{bn(selected.price)}
            {selected.was > selected.price && <span className="ml-3 text-lg text-muted-foreground line-through">৳{bn(selected.was)}</span>}
          </p>
          <a href="#order" className="mt-6 inline-block rounded-full bg-primary px-8 py-3.5 font-semibold text-primary-foreground">{page.cta}</a>
        </div>
        {hero && <img src={cdnImage(hero)} alt={page.title} className="w-full rounded-2xl object-cover shadow-lg" />}
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-2 gap-3 px-5 md:grid-cols-4">
        {[
          [Truck, fee ? "দ্রুত হোম ডেলিভারি" : "ফ্রি হোম ডেলিভারি"],
          [PackageOpen, "পণ্য দেখে টাকা দিন"],
          [RefreshCw, "রিপ্লেসমেন্ট সুবিধা"],
          [Phone, "কল করে কনফার্ম"],
        ].map(([Icon, label]) => {
          const I = Icon as typeof Truck;
          return (
            <div key={label as string} className="rounded-xl border border-border bg-card p-4 text-center text-sm font-medium">
              <I className="mx-auto mb-2 size-6 text-primary" />
              {label as string}
            </div>
          );
        })}
      </section>

      {page.packages.map((k) => (
        <section key={k.id} className="mx-auto grid max-w-5xl items-center gap-6 px-5 pt-12 md:grid-cols-2">
          {k.image && <img src={cdnImage(k.image)} alt={k.name} loading="lazy" className="w-full rounded-2xl object-cover" />}
          <div>
            <h2 className="text-2xl font-bold">{k.name}</h2>
            <ul className="mt-4 space-y-2">
              {k.features.split("\n").map((f) => f.trim()).filter(Boolean).map((f) => (
                <li key={f} className="flex gap-2"><Check className="mt-0.5 size-5 shrink-0 text-primary" />{f}</li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section id="order" className="mx-auto max-w-xl scroll-mt-14 px-5 py-14">
        <h2 className="text-center text-2xl font-bold">অর্ডার করতে নিচের তথ্য দিন</h2>
        <form id="offer-form" onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
          {page.packages.length > 1 && (
            <div className="space-y-2">
              {page.packages.map((k) => (
                <button type="button" key={k.id} onClick={() => setPkgId(k.id)}
                  className={`flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition-colors ${selected.id === k.id ? "border-primary bg-secondary" : "border-border"}`}>
                  <span className="font-medium">{k.name}</span>
                  <span className="font-bold text-primary">৳{bn(k.price)}</span>
                </button>
              ))}
            </div>
          )}
          <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} className="hidden" aria-hidden />
          {([
            ["customer_name", "আপনার নাম", "text"],
            ["phone", "মোবাইল নম্বর", "tel"],
            ["address", "সম্পূর্ণ ঠিকানা", "text"],
          ] as const).map(([k, label, type]) => (
            <label key={k} className="block">
              <span className="text-sm font-medium">{label}</span>
              <input id={`of-${k}`} type={type} value={form[k]} onChange={(e) => onField(k, e.target.value)} className={field} />
              {errors[k] && <span className="text-sm text-destructive">{errors[k]}</span>}
            </label>
          ))}
          <div className="rounded-xl bg-secondary p-3 text-sm">
            <div className="flex justify-between"><span>পণ্যের দাম</span><span>৳{bn(selected.price)}</span></div>
            <div className="flex justify-between"><span>ডেলিভারি চার্জ</span><span>{fee ? `৳${bn(fee)}` : "ফ্রি"}</span></div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold"><span>মোট</span><span>৳{bn(grand)}</span></div>
          </div>
          <button type="submit" disabled={submitting} className="w-full rounded-full bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-60">
            {submitting ? "অর্ডার প্রসেস হচ্ছে..." : `অর্ডার কনফার্ম করুন · ৳${bn(grand)}`}
          </button>
          <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm text-muted-foreground underline">
            <WhatsAppIcon className="size-4" /> হোয়াটসঅ্যাপে অর্ডার করুন
          </a>
        </form>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 md:hidden">
        <button type="submit" form="offer-form" disabled={submitting} className="w-full rounded-full bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-60">
          {submitting ? "অর্ডার প্রসেস হচ্ছে..." : `অর্ডার করুন · ৳${bn(grand)}`}
        </button>
      </div>
    </div>
  );
}

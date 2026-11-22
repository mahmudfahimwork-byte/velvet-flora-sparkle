import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Truck, PackageOpen, RefreshCw, Phone, ShieldCheck, Flame, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { WHATSAPP_NUMBER, WhatsAppIcon } from "@/components/site/QuickOrder";
import boxImgSrc from "@/assets/fascia-gun-box.webp";
import headsImgSrc from "@/assets/fascia-gun-heads.webp";
import { useText, useContentReady } from "@/lib/content";
import { cdnImage } from "@/components/site/SmartImage";

export const Route = createFileRoute("/fascia-gun")({
  head: () => ({
    meta: [
      { title: "ফ্যাশিয়া ম্যাসাজ গান — ৩-বল হেড সহ মাত্র ৳১,০৯০ | ফ্রি ডেলিভারি" },
      { name: "description", content: "মাল্টি-ফাংশনাল ফ্যাশিয়া গান, ৩-বল আর্চ হেড ও একাধিক ম্যাসাজ হেড। ঘাড়, পিঠ, কোমর ও পায়ের ব্যথায় আরাম। মাত্র ৳১,০৯০, ফ্রি ক্যাশ অন ডেলিভারি।" },
      { property: "og:title", content: "ফ্যাশিয়া ম্যাসাজ গান মাত্র ৳১,০৯০ — ফ্রি ডেলিভারি" },
      { property: "og:description", content: "ঘরে বসেই পুরো শরীরের ক্লান্তি দূর করুন। পণ্য দেখে টাকা দিন।" },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FasciaGun,
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
  phone: z.string().transform(normalizeBdPhone).pipe(z.string().regex(/^01[3-9]\d{8}$/, "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন ০১৭১২৩৪৫৬৭৮)")),
  address: z.string().trim().min(10, "সম্পূর্ণ ঠিকানা লিখুন (গ্রাম/রোড, থানা, জেলা)").max(400),
});

function useCountUp(target: number) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 500);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(a + (target - a) * e));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

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

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && (setShown(true), io.disconnect()), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

function scrollToOrder() {
  document.getElementById("order")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const num = (v: string, fb: number) => { const n = parseInt(String(v).replace(/[^\d]/g, ""), 10); return Number.isFinite(n) && n > 0 ? n : fb; };
const SLUG = "fascia-massage-gun";
const NAME = "Fascial Gun — Multifunctional Massage Gun";
const TITLE = "ফ্যাশিয়া ম্যাসাজ গান";

function FasciaGun() {
  const t = useText();
  const ready = useContentReady();
  const PRICE = num(t("fascia.price"), 1090);
  const WAS = num(t("fascia.was"), 1850);
  const FEE = t("fascia.delivery.on").trim().toLowerCase() === "on" ? num(t("fascia.delivery.fee"), 0) : 0;
  const TOTAL = PRICE + FEE;
  const img = (k: "fascia.img.hero" | "fascia.img.heads", fb: string) => { const v = t(k); return v ? cdnImage(v) : fb; };
  const features = t("fascia.features").split("\n").map((x) => x.trim()).filter(Boolean);
  const total = useCountUp(TOTAL);
  const timer = useCountdown();
  const [form, setForm] = useState({ customer_name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [trap, setTrap] = useState("");
  const lock = useRef(false);
  const startedCheckout = useRef(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (!ready || viewed.current) return;
    viewed.current = true;
    track("ViewContent", { currency: "BDT", value: PRICE, content_type: "product", content_ids: [SLUG] });
  }, [ready, PRICE]);

  function onField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (!startedCheckout.current) {
      startedCheckout.current = true;
      track("InitiateCheckout", { currency: "BDT", value: TOTAL });
    }
  }

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `আসসালামু আলাইকুম, আমি "${TITLE}" (৳${TOTAL}) অর্ডার করতে চাই।\nনাম: ${form.customer_name}\nমোবাইল: ${form.phone}\nঠিকানা: ${form.address}`,
  )}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
      setErrors(next);
      const first = ["customer_name", "phone", "address"].find((k) => next[k]);
      if (first) {
        toast.error(next[first]);
        const el = document.getElementById(`cf-${first}`);
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
    setFailed(false);
    const code = `VF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    let error: unknown = null;
    try {
      const res = await supabase.from("orders").insert({
        order_code: code,
        customer_name: parsed.data.customer_name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        notes: "ল্যান্ডিং পেজ: ফ্যাশিয়া গান",
        area: "outside_dhaka",
        items: [{ name: NAME, qty: 1, price: PRICE, slug: SLUG }],
        subtotal: PRICE,
        discount: 0,
        delivery_fee: FEE,
        total: TOTAL,
      });
      error = res.error;
    } catch (err) {
      error = err;
    }
    setSubmitting(false);
    if (error) {
      lock.current = false;
      setFailed(true);
      toast.error("অর্ডার পাঠানো যায়নি — হোয়াটসঅ্যাপে এক ক্লিকে অর্ডার করুন।");
      return;
    }
    track(
      "Purchase",
      { value: TOTAL, currency: "BDT", content_type: "product", content_ids: [SLUG], num_items: 1, order_id: code },
      { phone: parsed.data.phone, customerName: parsed.data.customer_name },
    );
    setDone(code);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
        <div className="max-w-md text-center">
          <div className="mx-auto flex size-20 animate-[bounce_1s_ease-out_1] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift">
            <Check className="size-10" strokeWidth={3} />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-foreground">ধন্যবাদ! আপনার অর্ডার সম্পন্ন হয়েছে</h1>
          <p className="mt-3 text-muted-foreground">অর্ডার নম্বর: <b className="text-foreground">{done}</b></p>
          <p className="mt-1 text-muted-foreground">মোট: <b className="text-foreground">৳{bn(TOTAL)}</b> · {FEE ? `ডেলিভারি চার্জ ৳${bn(FEE)} সহ` : "ডেলিভারি চার্জ ফ্রি"}</p>
          <p className="mt-4 text-sm text-muted-foreground">{t("fascia.thanks")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground md:pb-0">
      {/* Urgency bar */}
      <div className="sticky top-0 z-40 bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground shadow-soft">
        <span className="inline-flex items-center gap-1.5">
          <Timer className="size-4" /> আজকের অফার শেষ হতে বাকি:
          <span className="rounded bg-background/20 px-1.5 font-mono tabular-nums">{timer ? timer.join(":") : "--:--:--"}</span>
        </span>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-6 md:grid md:grid-cols-2 md:items-center md:gap-10 md:pt-12">
        <div className="text-center md:text-left">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            <Flame className="size-3.5" /> {t("fascia.badge")}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-5xl">
            {t("fascia.title1")} <span className="text-primary">{t("fascia.title2")}</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            {t("fascia.intro")}
          </p>
          <div className="mt-5 flex items-end justify-center gap-3 md:justify-start">
            <span className={`text-4xl font-extrabold text-primary transition-opacity md:text-5xl ${ready ? "opacity-100" : "opacity-0"}`}>৳{bn(PRICE)}</span>
            <span className={`pb-1 text-lg text-muted-foreground line-through`}>৳{bn(WAS)}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-primary">{t("fascia.deliveryLine")}</p>
          <button onClick={scrollToOrder} className="mt-6 hidden w-full animate-pulse rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lift transition-transform hover:scale-[1.02] md:inline-block md:w-auto">
            {t("fascia.cta")}
          </button>
        </div>
        <div className="relative mt-6 md:mt-0">
          <img src={img("fascia.img.hero", boxImgSrc)} alt="ফ্যাশিয়া ম্যাসাজ গান বক্স" className="w-full rounded-3xl shadow-lift" />
          <div className="absolute -right-2 -top-3 rotate-6 rounded-2xl bg-accent px-3 py-2 text-center text-sm font-extrabold text-accent-foreground shadow-soft">
            ৳{bn(WAS - PRICE)}<br />ছাড়
          </div>
        </div>
      </section>

      {/* Trust row */}
      <section className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 px-4 md:grid-cols-4">
        {[
          { i: Truck, t: "ফ্রি হোম ডেলিভারি", d: "সারা বাংলাদেশে" },
          { i: PackageOpen, t: "দেখে টাকা দিন", d: "ক্যাশ অন ডেলিভারি" },
          { i: RefreshCw, t: "রিপ্লেসমেন্ট সুবিধা", d: "সমস্যা হলে বদলে দেব" },
          { i: Phone, t: "কল করে কনফার্ম", d: "অর্ডারের পর" },
        ].map(({ i: Icon, t: title, d }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-4 text-center">
            <Icon className="mx-auto size-7 text-primary" />
            <p className="mt-2 text-sm font-bold">{title}</p>
            <p className="text-xs text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      {/* Who */}
      <Reveal className="mx-auto mt-14 max-w-5xl px-4">
        <h2 className="text-center text-2xl font-extrabold md:text-3xl">কাদের জন্য এটি দরকারি?</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            ["অফিস কর্মী ও ফ্রিল্যান্সার", "সারাদিন বসে কাজ করে ঘাড় ও পিঠ জমে থাকে? কয়েক মিনিটেই আরাম।"],
            ["বাবা-মা ও বয়স্করা", "হাত-পা, কোমর ও হাঁটুর ব্যথায় প্রতিদিনের আরাম — প্রিয়জনের জন্য সেরা উপহার।"],
            ["জিম ও খেলাধুলা", "ব্যায়ামের পর পেশির টান দূর করে দ্রুত রিকভারিতে সাহায্য করে।"],
          ].map(([h, d]) => (
            <div key={h} className="rounded-2xl border border-border bg-card p-5">
              <p className="font-bold text-primary">{h}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Features */}
      <Reveal className="mx-auto mt-14 max-w-5xl px-4">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={img("fascia.img.heads", headsImgSrc)} alt="ফ্যাশিয়া গান ও সব ম্যাসাজ হেড" loading="lazy" className="w-full rounded-3xl shadow-soft" />
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">বক্সে যা যা পাবেন</h2>
            <ul className="mt-4 space-y-2.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-5 shrink-0 text-primary" /> {f}</li>
              ))}
            </ul>
            <button onClick={scrollToOrder} className="mt-6 w-full rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lift md:w-auto">এখনই অর্ডার করুন — ৳{bn(PRICE)}</button>
          </div>
        </div>
      </Reveal>

      {/* Order */}
      <section id="order" className="mx-auto mt-14 max-w-xl scroll-mt-14 px-4 pb-12">
        <h2 className="text-center text-2xl font-extrabold md:text-3xl">অর্ডার করতে নিচের ফর্মটি পূরণ করুন</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">কোনো অগ্রিম টাকা লাগবে না — পণ্য হাতে পেয়ে টাকা দিন</p>

        <form id="fascia-form" onSubmit={submit} noValidate className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
          {([
            ["customer_name", "আপনার নাম *", "যেমন: রহিম উদ্দিন", "text", "name"],
            ["phone", "মোবাইল নম্বর *", "০১XXXXXXXXX", "tel", "tel"],
          ] as const).map(([k, label, ph, type, ac]) => (
            <label key={k} className="block">
              <span className="text-sm font-semibold">{label}</span>
              <input id={`cf-${k}`} type={type} autoComplete={ac} inputMode={type === "tel" ? "tel" : undefined} placeholder={ph} value={form[k]} onChange={(e) => onField(k, e.target.value)}
                className={`mt-1 w-full rounded-xl border bg-background px-4 py-3 text-base outline-none transition focus:ring-2 focus:ring-primary ${errors[k] ? "border-destructive" : "border-input"}`} />
              {errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>}
            </label>
          ))}
          <label className="block">
            <span className="text-sm font-semibold">সম্পূর্ণ ঠিকানা *</span>
            <textarea id="cf-address" rows={3} placeholder="বাসা/গ্রাম, রোড, থানা, জেলা" value={form.address} onChange={(e) => onField("address", e.target.value)}
              className={`mt-1 w-full rounded-xl border bg-background px-4 py-3 text-base outline-none transition focus:ring-2 focus:ring-primary ${errors["address"] ? "border-destructive" : "border-input"}`} />
            {errors["address"] && <span className="mt-1 block text-xs text-destructive">{errors["address"]}</span>}
          </label>

          <div className="space-y-1.5 rounded-xl bg-secondary p-4 text-sm">
            <div className="flex justify-between"><span>{TITLE}</span><span>৳{bn(PRICE)}</span></div>
            <div className="flex justify-between"><span>ডেলিভারি চার্জ</span><span className="font-bold text-primary">{FEE ? `৳${bn(FEE)}` : "ফ্রি ৳০"}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-lg font-extrabold"><span>সর্বমোট</span><span className="tabular-nums text-primary">৳{bn(total)}</span></div>
          </div>

          <button type="submit" disabled={submitting || !ready}
            className="w-full rounded-full bg-primary py-4 text-lg font-extrabold text-primary-foreground shadow-lift transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-60">
            {submitting ? "অর্ডার পাঠানো হচ্ছে..." : `অর্ডার কনফার্ম করুন — ৳${bn(TOTAL)}`}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> আপনার তথ্য সম্পূর্ণ নিরাপদ</p>

          {failed && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary py-3 font-bold text-primary">
              <WhatsAppIcon className="size-5" /> হোয়াটসঅ্যাপে অর্ডার করুন
            </a>
          )}
        </form>
      </section>

      {/* Floating WhatsApp */}
      <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label="হোয়াটসঅ্যাপে কথা বলুন"
        className="fixed bottom-24 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift md:bottom-6">
        <WhatsAppIcon className="size-6" />
      </a>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <button type="submit" form="fascia-form" disabled={submitting} className="w-full animate-pulse rounded-full bg-primary py-3.5 text-base font-extrabold text-primary-foreground shadow-lift disabled:opacity-60">
          {submitting ? "অর্ডার পাঠানো হচ্ছে..." : `অর্ডার কনফার্ম করুন — ৳${bn(TOTAL)}${FEE ? "" : " · ফ্রি ডেলিভারি"}`}
        </button>
      </div>
    </div>
  );
}

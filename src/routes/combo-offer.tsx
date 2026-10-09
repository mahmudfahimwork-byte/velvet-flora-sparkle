import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Truck, PackageOpen, RefreshCw, Phone, Zap, ShieldCheck, Flame, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { WHATSAPP_NUMBER, WhatsAppIcon } from "@/components/site/QuickOrder";
import heroImg from "@/assets/combo-hero.jpg";
import grinderImg from "@/assets/combo-grinder.jpg";
import cookerImg from "@/assets/combo-cooker.jpg";

export const Route = createFileRoute("/combo-offer")({
  head: () => ({
    meta: [
      { title: "কিচেন কম্বো অফার — ১০০০০W গ্রাইন্ডার + ২ লিটার মাল্টি কুকার ৳১,৭০০" },
      { name: "description", content: "সিলভার ক্রেস্ট ১০০০০ ওয়াট ৮ ব্লেড গ্রাইন্ডার + YN ২ লিটার মাল্টি কুকার মাত্র ৳১,৭০০। সারাদেশে ফ্রি ক্যাশ অন ডেলিভারি।" },
      { property: "og:title", content: "কিচেন কম্বো — গ্রাইন্ডার + মাল্টি কুকার মাত্র ৳১,৭০০" },
      { property: "og:description", content: "ফ্রি হোম ডেলিভারি, পণ্য দেখে টাকা পরিশোধ। আজই অর্ডার করুন।" },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComboOffer,
});

const bn = (n: number) => n.toLocaleString("bn-BD");

const PACKAGES = [
  { id: "combo", title: "মেগা কিচেন কম্বো", sub: "গ্রাইন্ডার + মাল্টি কুকার", price: 1700, was: 2020, badge: "সবচেয়ে জনপ্রিয় · ৳৩২০ সাশ্রয়", slug: "combo-grinder-cooker", name: "Combo: Silver Crest 10000W Grinder + YN 2L Multi Cooker" },
  { id: "grinder", title: "শুধু গ্রাইন্ডার", sub: "সিলভার ক্রেস্ট ১০০০০ ওয়াট", price: 1100, slug: "silver-crest-grinder-10000w", name: "Silver Crest 10000W Grinder" },
  { id: "cooker", title: "শুধু মাল্টি কুকার", sub: "YN ২ লিটার", price: 920, slug: "yn-multi-cooker-2l", name: "YN 2L Multi Cooker" },
] as const;
type PkgId = (typeof PACKAGES)[number]["id"];

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

function ComboOffer() {
  const [pkg, setPkg] = useState<PkgId>("combo");
  const selected = PACKAGES.find((p) => p.id === pkg)!;
  const total = useCountUp(selected.price);
  const timer = useCountdown();
  const [form, setForm] = useState({ customer_name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [trap, setTrap] = useState("");
  const lock = useRef(false);
  const startedCheckout = useRef(false);

  useEffect(() => {
    track("ViewContent", { currency: "BDT", value: 1700, content_type: "product", content_ids: ["combo-grinder-cooker"] });
  }, []);

  function onField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (!startedCheckout.current) {
      startedCheckout.current = true;
      track("InitiateCheckout", { currency: "BDT", value: selected.price });
    }
  }

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `আসসালামু আলাইকুম, আমি "${selected.title}" (৳${selected.price}) অর্ডার করতে চাই।\nনাম: ${form.customer_name}\nমোবাইল: ${form.phone}\nঠিকানা: ${form.address}`,
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
        notes: "ল্যান্ডিং পেজ: কিচেন কম্বো অফার",
        area: "outside_dhaka",
        items: [{ name: selected.name, qty: 1, price: selected.price, slug: selected.slug }],
        subtotal: selected.price,
        discount: 0,
        delivery_fee: 0,
        total: selected.price,
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
      { value: selected.price, currency: "BDT", content_type: "product", content_ids: [selected.slug], num_items: 1, order_id: code },
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
          <h1 className="mt-6 text-3xl font-bold text-foreground">ধন্যবাদ! আপনার অর্ডার সম্পন্ন হয়েছে 🎉</h1>
          <p className="mt-3 text-muted-foreground">অর্ডার নম্বর: <b className="text-foreground">{done}</b></p>
          <p className="mt-1 text-muted-foreground">মোট: <b className="text-foreground">৳{bn(selected.price)}</b> · ডেলিভারি চার্জ ফ্রি</p>
          <p className="mt-4 text-sm text-muted-foreground">আমাদের প্রতিনিধি খুব শীঘ্রই আপনাকে কল করে অর্ডার কনফার্ম করবেন। ফোনটি কাছে রাখুন।</p>
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
            <Flame className="size-3.5" /> সীমিত স্টক · স্পেশাল কম্বো
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-5xl">
            রান্নাঘরের সব ঝামেলা শেষ <span className="text-primary">এক কম্বোতেই!</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            সিলভার ক্রেস্ট ১০০০০ ওয়াট ৮ ব্লেড গ্রাইন্ডার + YN ২ লিটার মাল্টি কুকার — মশলা গুঁড়া থেকে রান্না, সব এক সাথে।
          </p>
          <div className="mt-5 flex items-end justify-center gap-3 md:justify-start">
            <span className="text-4xl font-extrabold text-primary md:text-5xl">৳{bn(1700)}</span>
            <span className="pb-1 text-lg text-muted-foreground line-through">৳{bn(2020)}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-primary">🚚 সারাদেশে ডেলিভারি চার্জ একদম ফ্রি!</p>
          <button onClick={scrollToOrder} className="mt-6 hidden w-full animate-pulse rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lift transition-transform hover:scale-[1.02] md:inline-block md:w-auto">
            এখনই অর্ডার করুন →
          </button>
        </div>
        <div className="relative mt-6 md:mt-0">
          <img src={heroImg} alt="সিলভার ক্রেস্ট গ্রাইন্ডার ও YN মাল্টি কুকার কম্বো" width={1280} height={960} className="w-full rounded-3xl shadow-lift" />
          <div className="absolute -right-2 -top-3 rotate-6 rounded-2xl bg-accent px-3 py-2 text-center text-sm font-extrabold text-accent-foreground shadow-soft">
            ৳৩২০<br />সাশ্রয়
          </div>
        </div>
      </section>

      {/* Trust row */}
      <section className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 px-4 md:grid-cols-4">
        {[
          { i: Truck, t: "ফ্রি হোম ডেলিভারি", d: "সারা বাংলাদেশে" },
          { i: PackageOpen, t: "দেখে টাকা দিন", d: "ক্যাশ অন ডেলিভারি" },
          { i: RefreshCw, t: "রিপ্লেসমেন্ট সুবিধা", d: "সমস্যা থাকলে পরিবর্তন" },
          { i: Phone, t: "কল করে কনফার্ম", d: "অর্ডারের পর" },
        ].map(({ i: Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4 text-center">
            <Icon className="mx-auto size-7 text-primary" />
            <p className="mt-2 text-sm font-bold">{t}</p>
            <p className="text-xs text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      {/* Grinder */}
      <Reveal className="mx-auto mt-14 max-w-5xl px-4">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={grinderImg} alt="সিলভার ক্রেস্ট ১০০০০ ওয়াট গ্রাইন্ডার" width={1024} height={1024} loading="lazy" className="w-full rounded-3xl shadow-soft" />
          <div>
            <p className="text-sm font-bold text-primary">পণ্য ১</p>
            <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">সিলভার ক্রেস্ট ১০০০০ ওয়াট গ্রাইন্ডার</h2>
            <p className="mt-2 text-muted-foreground">শক্তিশালী মোটর আর ৮টি ধারালো স্টিল ব্লেড — শক্ত মশলাও মুহূর্তে মিহি।</p>
            <ul className="mt-4 space-y-2.5">
              {["৮টি ধারালো স্টেইনলেস স্টিল ব্লেড", "১০০০০ ওয়াট হেভি ডিউটি পাওয়ার", "শুকনো মরিচ, হলুদ, ধনিয়া, জিরা গুঁড়া", "চালের গুঁড়া, কফি বিন্স, বাদাম", "স্বচ্ছ ঢাকনা — গুঁড়া হওয়া চোখে দেখুন"].map((f) => (
                <li key={f} className="flex items-start gap-2"><Zap className="mt-0.5 size-5 shrink-0 text-primary" /> {f}</li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      {/* Cooker */}
      <Reveal className="mx-auto mt-14 max-w-5xl px-4">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={cookerImg} alt="YN ২ লিটার মাল্টি কুকার" width={1024} height={1024} loading="lazy" className="w-full rounded-3xl shadow-soft md:order-2" />
          <div>
            <p className="text-sm font-bold text-primary">পণ্য ২</p>
            <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">YN ২ লিটার মাল্টি কুকার</h2>
            <p className="mt-2 text-muted-foreground">ব্যাচেলর, মেস, অফিস বা ছোট পরিবার — চুলা ছাড়াই ঝটপট রান্না।</p>
            <ul className="mt-4 space-y-2.5">
              {["২ লিটার ধারণক্ষমতা — ১-৩ জনের জন্য", "নুডলস, ডিম সেদ্ধ, স্যুপ, খিচুড়ি, হটপট", "নন-স্টিক পাত্র — সহজে পরিষ্কার", "দ্রুত গরম হয়, বিদ্যুৎ সাশ্রয়ী", "হালকা ও বহনযোগ্য"].map((f) => (
                <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-5 shrink-0 text-primary" /> {f}</li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      {/* Why combo */}
      <Reveal className="mx-auto mt-14 max-w-3xl px-4">
        <div className="rounded-3xl bg-secondary p-6 text-center md:p-10">
          <h2 className="text-2xl font-extrabold md:text-3xl">কেন কম্বো নেবেন?</h2>
          <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-card p-3"><p className="text-muted-foreground">আলাদা কিনলে</p><p className="mt-1 text-lg font-bold line-through">৳{bn(2020)}</p></div>
            <div className="rounded-xl bg-primary p-3 text-primary-foreground"><p>কম্বোতে</p><p className="mt-1 text-lg font-extrabold">৳{bn(1700)}</p></div>
            <div className="rounded-xl bg-card p-3"><p className="text-muted-foreground">আপনার সাশ্রয়</p><p className="mt-1 text-lg font-bold text-primary">৳{bn(320)}</p></div>
          </div>
        </div>
      </Reveal>

      {/* Order */}
      <section id="order" className="mx-auto mt-14 max-w-xl scroll-mt-14 px-4 pb-12">
        <h2 className="text-center text-2xl font-extrabold md:text-3xl">অর্ডার করতে নিচের ফর্মটি পূরণ করুন</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">কোনো অগ্রিম টাকা লাগবে না — পণ্য হাতে পেয়ে টাকা দিন</p>

        <div className="mt-6 space-y-3" role="radiogroup" aria-label="প্যাকেজ নির্বাচন">
          {PACKAGES.map((p) => {
            const on = p.id === pkg;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setPkg(p.id)}
                className={`relative flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-300 ${on ? "scale-[1.02] border-primary bg-primary/5 shadow-lift" : "border-border bg-card hover:border-primary/40"}`}>
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                  {on && <Check className="size-4" strokeWidth={3} />}
                </span>
                <span className="flex-1">
                  <span className="block font-bold">{p.title}</span>
                  <span className="block text-sm text-muted-foreground">{p.sub}</span>
                </span>
                <span className="text-right">
                  <span className="block text-xl font-extrabold text-primary">৳{bn(p.price)}</span>
                  {"was" in p && <span className="block text-xs text-muted-foreground line-through">৳{bn(p.was)}</span>}
                </span>
                {"badge" in p && (
                  <span className="absolute -top-3 left-4 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground shadow-soft">{p.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} noValidate className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
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
            <div className="flex justify-between"><span>{selected.title}</span><span>৳{bn(selected.price)}</span></div>
            <div className="flex justify-between"><span>ডেলিভারি চার্জ</span><span className="font-bold text-primary">ফ্রি ৳০</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-lg font-extrabold"><span>সর্বমোট</span><span className="tabular-nums text-primary">৳{bn(total)}</span></div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rounded-full bg-primary py-4 text-lg font-extrabold text-primary-foreground shadow-lift transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-60">
            {submitting ? "অর্ডার পাঠানো হচ্ছে..." : `অর্ডার কনফার্ম করুন — ৳${bn(selected.price)}`}
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
        <button onClick={scrollToOrder} className="w-full animate-pulse rounded-full bg-primary py-3.5 text-base font-extrabold text-primary-foreground shadow-lift">
          অর্ডার করতে চাপুন — ৳{bn(selected.price)} · ফ্রি ডেলিভারি
        </button>
      </div>
    </div>
  );
}

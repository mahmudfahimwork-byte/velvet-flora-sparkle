import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Every editable piece of text on the site, grouped for the admin panel. */
export const CONTENT_GROUPS = [
  {
    group: "Home — hero",
    fields: [
      { key: "home.eyebrow", label: "Small line above title", default: "Velvet Flora · Bangladesh" },
      { key: "home.title1", label: "Headline (line 1)", default: "Little pieces that" },
      { key: "home.title2", label: "Headline (line 2, italic)", default: "bloom on you." },
      {
        key: "home.intro",
        label: "Intro paragraph",
        default:
          "Bracelets, pendants and anklets picked for soft everyday wear — mostly ৳500 to ৳1000, with cash on delivery anywhere in Bangladesh.",
        long: true,
      },
      { key: "home.cta1", label: "Primary button", default: "Shop the collection" },
      { key: "home.cta2", label: "Secondary button", default: "Our story" },
    ],
  },
  {
    group: "Home — featured & promises",
    fields: [
      { key: "home.featured.eyebrow", label: "Featured eyebrow", default: "Loved this week" },
      { key: "home.featured.title", label: "Featured heading", default: "Featured pieces" },
      { key: "home.featured.cta", label: "View all button", default: "View all jewellery" },
      { key: "home.promise1.title", label: "Promise 1 title", default: "Cash on delivery" },
      { key: "home.promise1.text", label: "Promise 1 text", default: "Pay the courier when your parcel arrives." },
      { key: "home.promise2.title", label: "Promise 2 title", default: "Nationwide delivery" },
      { key: "home.promise2.text", label: "Promise 2 text", default: "Inside Dhaka ৳60 · Outside Dhaka ৳120." },
      { key: "home.promise3.title", label: "Promise 3 title", default: "Gift ready" },
      { key: "home.promise3.text", label: "Promise 3 text", default: "Every order is packed in a little gift pouch." },
    ],
  },
  {
    group: "Shop page",
    fields: [
      { key: "shop.eyebrow", label: "Eyebrow", default: "The collection" },
      { key: "shop.title", label: "Heading", default: "Shop all" },
    ],
  },
  {
    group: "About page",
    fields: [
      { key: "about.eyebrow", label: "Eyebrow", default: "Our story" },
      { key: "about.title", label: "Heading", default: "Made for the quiet kind of pretty" },
      {
        key: "about.p1",
        label: "Paragraph 1",
        long: true,
        default:
          "Velvet Flora started with one simple idea: jewellery you can actually wear every day — to class, to work, to a friend's wedding — without worrying about the price tag.",
      },
      {
        key: "about.p2",
        label: "Paragraph 2",
        long: true,
        default:
          "Every bracelet, pendant and anklet is handpicked for its finish and comfort. Most of our pieces sit between ৳500 and ৳1000 so you can collect a few favourites instead of saving for one.",
      },
      {
        key: "about.p3",
        label: "Paragraph 3",
        long: true,
        default:
          "We deliver all over Bangladesh with cash on delivery, so you only pay once the parcel is in your hands. Each order arrives in a little gift pouch, ready to keep or give away.",
      },
      { key: "about.cta", label: "Button", default: "Browse the collection" },
    ],
  },
  {
    group: "Contact page",
    fields: [
      { key: "contact.eyebrow", label: "Eyebrow", default: "Contact & delivery" },
      { key: "contact.title", label: "Heading", default: "We're a message away" },
      { key: "contact.delivery.title", label: "Delivery card title", default: "Delivery charges" },
      { key: "contact.delivery.l1", label: "Delivery line 1", default: "Inside Dhaka — ৳60" },
      { key: "contact.delivery.l2", label: "Delivery line 2", default: "Outside Dhaka — ৳120" },
      { key: "contact.delivery.l3", label: "Delivery line 3", default: "Delivered within 2–4 working days" },
      { key: "contact.payment.title", label: "Payment card title", default: "Payment" },
      { key: "contact.payment.l1", label: "Payment line 1", default: "Cash on delivery all over Bangladesh" },
      { key: "contact.payment.l2", label: "Payment line 2", default: "Pay the courier when the parcel arrives" },
      { key: "contact.payment.l3", label: "Payment line 3", default: "No advance payment needed" },
      { key: "contact.talk.title", label: "Talk to us title", default: "Talk to us" },
      {
        key: "contact.talk.text",
        label: "Talk to us text",
        long: true,
        default:
          "For order updates, exchanges or a custom request, message us on WhatsApp or Facebook and we'll reply within a few hours.",
      },
    ],
  },
  {
    group: "Footer",
    fields: [
      { key: "footer.brand", label: "Brand name", default: "Velvet Flora" },
      {
        key: "footer.tagline",
        label: "Tagline",
        long: true,
        default:
          "Dainty bracelets, pendants and anklets for everyday softness. Cash on delivery all over Bangladesh.",
      },
      { key: "footer.help1", label: "Order help line 1", default: "Cash on delivery available" },
      { key: "footer.help2", label: "Order help line 2", default: "Inside Dhaka ৳60 · Outside ৳120" },
      { key: "footer.help3", label: "Order help line 3", default: "Delivery in 2–4 days" },
    ],
  },
  {
    group: "কম্বো অফার — দাম (শুধু সংখ্যা লিখুন)",
    fields: [
      { key: "combo.price.combo", label: "কম্বো দাম", default: "1700" },
      { key: "combo.price.was", label: "কম্বোর কাটা দাম (আগের দাম)", default: "2020" },
      { key: "combo.price.grinder", label: "শুধু গ্রাইন্ডারের দাম", default: "1100" },
      { key: "combo.price.cooker", label: "শুধু কুকারের দাম", default: "920" },
    ],
  },
  {
    group: "কম্বো অফার — ছবি",
    fields: [
      { key: "combo.img.hero", label: "উপরের বড় ছবি (কম্বো)", default: "", image: true },
      { key: "combo.img.grinder", label: "গ্রাইন্ডারের ছবি", default: "", image: true },
      { key: "combo.img.cooker", label: "কুকারের ছবি", default: "", image: true },
    ],
  },
  {
    group: "কম্বো অফার — লেখা",
    fields: [
      { key: "combo.badge", label: "উপরের ছোট ব্যাজ", default: "সীমিত স্টক · স্পেশাল কম্বো" },
      { key: "combo.title1", label: "শিরোনাম (প্রথম অংশ)", default: "রান্নাঘরের সব ঝামেলা শেষ" },
      { key: "combo.title2", label: "শিরোনাম (রঙিন অংশ)", default: "এক কম্বোতেই!" },
      { key: "combo.intro", label: "শিরোনামের নিচের লেখা", long: true, default: "সিলভার ক্রেস্ট ১০০০০ ওয়াট ৮ ব্লেড গ্রাইন্ডার + YN ২ লিটার মাল্টি কুকার — মশলা গুঁড়া থেকে রান্না, সব এক সাথে।" },
      { key: "combo.delivery", label: "ডেলিভারি লাইন", default: "সারাদেশে ডেলিভারি চার্জ একদম ফ্রি!" },
      { key: "combo.cta", label: "অর্ডার বাটন", default: "এখনই অর্ডার করুন →" },
      { key: "combo.trust3.title", label: "ভরসা কার্ড ৩ (রিপ্লেসমেন্ট)", default: "রিপ্লেসমেন্ট সুবিধা" },
      { key: "combo.trust3.text", label: "ভরসা কার্ড ৩ ছোট লেখা", default: "সমস্যা থাকলে পরিবর্তন" },
      { key: "combo.combo.title", label: "কম্বো প্যাকেজের নাম", default: "মেগা কিচেন কম্বো" },
      { key: "combo.grinder.title", label: "গ্রাইন্ডারের নাম", default: "সিলভার ক্রেস্ট ১০০০০ ওয়াট গ্রাইন্ডার" },
      { key: "combo.grinder.text", label: "গ্রাইন্ডারের বর্ণনা", long: true, default: "শক্তিশালী মোটর আর ৮টি ধারালো স্টিল ব্লেড — শক্ত মশলাও মুহূর্তে মিহি।" },
      { key: "combo.grinder.features", label: "গ্রাইন্ডারের ফিচার (প্রতি লাইনে একটি)", long: true, default: "৮টি ধারালো স্টেইনলেস স্টিল ব্লেড\n১০০০০ ওয়াট হেভি ডিউটি পাওয়ার\nশুকনো মরিচ, হলুদ, ধনিয়া, জিরা গুঁড়া\nচালের গুঁড়া, কফি বিন্স, বাদাম\nস্বচ্ছ ঢাকনা — গুঁড়া হওয়া চোখে দেখুন" },
      { key: "combo.cooker.title", label: "কুকারের নাম", default: "YN ২ লিটার মাল্টি কুকার" },
      { key: "combo.cooker.text", label: "কুকারের বর্ণনা", long: true, default: "ব্যাচেলর, মেস, অফিস বা ছোট পরিবার — চুলা ছাড়াই ঝটপট রান্না।" },
      { key: "combo.cooker.features", label: "কুকারের ফিচার (প্রতি লাইনে একটি)", long: true, default: "২ লিটার ধারণক্ষমতা — ১-৩ জনের জন্য\nনুডলস, ডিম সেদ্ধ, স্যুপ, খিচুড়ি, হটপট\nনন-স্টিক পাত্র — সহজে পরিষ্কার\nদ্রুত গরম হয়, বিদ্যুৎ সাশ্রয়ী\nহালকা ও বহনযোগ্য" },
      { key: "combo.thanks", label: "অর্ডারের পর ধন্যবাদ বার্তা", long: true, default: "আমাদের প্রতিনিধি খুব শীঘ্রই আপনাকে কল করে অর্ডার কনফার্ম করবেন। ফোনটি কাছে রাখুন।" },
    ],
  },
] as const;

export type ContentKey = (typeof CONTENT_GROUPS)[number]["fields"][number]["key"];

export const CONTENT_DEFAULTS: Record<string, string> = Object.fromEntries(
  CONTENT_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.default])),
);

export const contentQuery = queryOptions({
  queryKey: ["site-content"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("site_content").select("key,value");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, string>;
  },
});

/** t("home.title1") → the admin-edited text, or the built-in default. */
export function useText() {
  const { data } = useQuery(contentQuery);
  return (key: ContentKey) => {
    const v = data?.[key];
    return v && v.trim() ? v : CONTENT_DEFAULTS[key] ?? "";
  };
}

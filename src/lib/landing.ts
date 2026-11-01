import { useQuery } from "@tanstack/react-query";
import { contentQuery } from "@/lib/content";

/** One buyable option on a landing page (a single product or a combo). */
export type LandingPackage = {
  id: string;
  name: string;
  price: number;
  was: number; // crossed-out price, 0 = none
  image: string;
  features: string; // one per line
  deliveryFee: number; // 0 = free delivery
};

export type LandingPage = {
  slug: string;
  active: boolean;
  showOnHome: boolean;
  badge: string;
  title: string;
  highlight: string;
  intro: string;
  heroImage: string;
  cta: string;
  thanks: string;
  packages: LandingPackage[];
};

/** All landing pages live as JSON in one site_content row, so no extra table is needed. */
export const LANDING_KEY = "landing.pages";

export function newPackage(): LandingPackage {
  return { id: Math.random().toString(36).slice(2, 9), name: "", price: 0, was: 0, image: "", features: "", deliveryFee: 0 };
}

export function newLandingPage(): LandingPage {
  return {
    slug: "",
    active: true,
    showOnHome: true,
    badge: "সীমিত স্টক · স্পেশাল অফার",
    title: "",
    highlight: "",
    intro: "",
    heroImage: "",
    cta: "এখনই অর্ডার করুন →",
    thanks: "আমাদের প্রতিনিধি খুব শীঘ্রই আপনাকে কল করে অর্ডার কনফার্ম করবেন।",
    packages: [newPackage()],
  };
}

export function parseLandingPages(raw: string | undefined): LandingPage[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as LandingPage[]) : [];
  } catch {
    return [];
  }
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function useLandingPages() {
  const q = useQuery(contentQuery);
  return { pages: parseLandingPages(q.data?.[LANDING_KEY]), ready: q.isFetched };
}

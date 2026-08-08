import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl">Velvet Flora</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Dainty bracelets, pendants and anklets for everyday softness. Cash on delivery all
            over Bangladesh.
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow">Explore</p>
          <div className="mt-4 flex flex-col gap-2 text-muted-foreground">
            <Link to="/shop" className="hover:text-foreground">
              Shop all
            </Link>
            <Link to="/about" className="hover:text-foreground">
              Our story
            </Link>
            <Link to="/contact" className="hover:text-foreground">
              Contact & delivery
            </Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="eyebrow">Order help</p>
          <div className="mt-4 flex flex-col gap-2 text-muted-foreground">
            <span>Cash on delivery available</span>
            <span>Inside Dhaka ৳60 · Outside ৳120</span>
            <span>Delivery in 2–4 days</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Velvet Flora. All rights reserved.
      </div>
    </footer>
  );
}

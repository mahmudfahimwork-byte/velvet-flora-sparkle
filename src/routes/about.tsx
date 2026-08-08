import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story — Velvet Flora Jewellery" },
      {
        name: "description",
        content:
          "Velvet Flora is a small Bangladeshi jewellery label making soft, wearable bracelets, pendants and anklets.",
      },
      { property: "og:title", content: "Our Story — Velvet Flora" },
      {
        property: "og:description",
        content: "A small Bangladeshi jewellery label built on soft, everyday pieces.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Our story</p>
      <h1 className="mt-2 text-4xl">Made for the quiet kind of pretty</h1>
      <div className="gold-rule my-6" />
      <div className="space-y-5 text-muted-foreground">
        <p>
          Velvet Flora started with one simple idea: jewellery you can actually wear every day —
          to class, to work, to a friend's wedding — without worrying about the price tag.
        </p>
        <p>
          Every bracelet, pendant and anklet is handpicked for its finish and comfort. Most of our
          pieces sit between ৳500 and ৳1000 so you can collect a few favourites instead of saving
          for one.
        </p>
        <p>
          We deliver all over Bangladesh with cash on delivery, so you only pay once the parcel is
          in your hands. Each order arrives in a little gift pouch, ready to keep or give away.
        </p>
      </div>
      <Link
        to="/shop"
        className="mt-10 inline-block rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Browse the collection
      </Link>
    </div>
  );
}

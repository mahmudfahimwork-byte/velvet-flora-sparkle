type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
};

// Live store photos are served through velvetflorabd.com/storage-cdn/* (see vercel.json),
// so Vercel's CDN caches them and the storage provider is hit only once per photo.
const STORAGE_ORIGIN = "https://vrnlypjhonuykzcurpvb.supabase.co/storage/v1/";

// Photos still hosted on the old project are left as-is (no CDN rewrite) until re-uploaded.
export function cdnImage(src: string): string {
  if (!src || !src.startsWith(STORAGE_ORIGIN)) return src;
  return "/storage-cdn/" + src.slice(STORAGE_ORIGIN.length);
}

/**
 * Serves a lighter WebP variant for locally bundled /images/*.jpg files,
 * and routes stored product photos through the edge cache.
 */
export function SmartImage({ src, alt, ...rest }: Props) {
  const finalSrc = cdnImage(src);
  const isLocalJpg = /^\/images\/.+\.jpe?g$/i.test(finalSrc);
  const img = <img src={finalSrc} alt={alt} decoding="async" {...rest} />;
  if (!isLocalJpg) return img;
  return (
    <picture>
      <source srcSet={finalSrc.replace(/\.jpe?g$/i, ".webp")} type="image/webp" />
      {img}
    </picture>
  );
}

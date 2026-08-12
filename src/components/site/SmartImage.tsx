type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
};

/**
 * Serves a lighter WebP variant for locally bundled /images/*.jpg files,
 * falling back to the original JPEG everywhere else.
 */
export function SmartImage({ src, alt, ...rest }: Props) {
  const isLocalJpg = /^\/images\/.+\.jpe?g$/i.test(src);
  const img = <img src={src} alt={alt} decoding="async" {...rest} />;
  if (!isLocalJpg) return img;
  return (
    <picture>
      <source srcSet={src.replace(/\.jpe?g$/i, ".webp")} type="image/webp" />
      {img}
    </picture>
  );
}

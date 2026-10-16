import { settings } from '../data/catalog';

/** React 19 remonte automatiquement <title> et <meta> dans le <head>. */
export function Seo({ title, description, image }: { title?: string; description?: string; image?: string }) {
  const full = title ? `${title} — ${settings.brandName}` : `${settings.brandName} — ${settings.tagline}`;
  return (
    <>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
    </>
  );
}

type SeoConfig = {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  ogImageAlt: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
};

const SITE_URL = "https://entreefox.com";

function upsertMetaByName(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${CSS.escape(name)}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string) {
  let el = document.head.querySelector(`meta[property="${CSS.escape(property)}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function buildSeoForPath(pathname: string, isAuthenticated: boolean): SeoConfig {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const canonicalUrl = new URL(normalizedPath, SITE_URL).toString();

  const titleBase = "EntreeFox";
  const defaultDescription =
    "Connect with your social community through EntreeFox. Join as a customer or vendor to share experiences, connect with peers, and discover several opportunities.";

  const isPublicIndexable = !isAuthenticated && (normalizedPath === "/" || normalizedPath === "/welcome");

  const title = normalizedPath === "/welcome" ? `${titleBase} - Welcome` : `${titleBase} - Entreefox Social Platform`;
  const description = defaultDescription;

  const robots = isPublicIndexable ? "index,follow" : "noindex,nofollow";

  const ogTitle = title;
  const ogDescription = description;
  const ogUrl = canonicalUrl;
  const ogImage = `${SITE_URL}/og.png`;
  const ogImageAlt = titleBase;

  const twitterCard = "summary_large_image";
  const twitterTitle = ogTitle;
  const twitterDescription = ogDescription;
  const twitterImage = ogImage;

  return {
    title,
    description,
    canonicalUrl,
    robots,
    ogTitle,
    ogDescription,
    ogUrl,
    ogImage,
    ogImageAlt,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
  };
}

export function applySeoForRoute(pathname: string, isAuthenticated: boolean) {
  const seo = buildSeoForPath(pathname, isAuthenticated);

  document.title = seo.title;
  upsertMetaByName("description", seo.description);
  upsertMetaByName("robots", seo.robots);
  upsertCanonical(seo.canonicalUrl);

  upsertMetaByProperty("og:title", seo.ogTitle);
  upsertMetaByProperty("og:description", seo.ogDescription);
  upsertMetaByProperty("og:type", "website");
  upsertMetaByProperty("og:url", seo.ogUrl);
  upsertMetaByProperty("og:image", seo.ogImage);
  upsertMetaByProperty("og:image:alt", seo.ogImageAlt);

  upsertMetaByName("twitter:card", seo.twitterCard);
  upsertMetaByName("twitter:title", seo.twitterTitle);
  upsertMetaByName("twitter:description", seo.twitterDescription);
  upsertMetaByName("twitter:image", seo.twitterImage);
}

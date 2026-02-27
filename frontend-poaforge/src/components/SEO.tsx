import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: "website" | "article" | "event";
  eventData?: {
    name: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    organizer?: string;
  };
}

const defaultTitle = "POAP Forge — Create & Claim Event NFTs | Ohana Protocol";
const defaultDescription =
  "Create and discover amazing events. Get POAP NFTs to prove your attendance and build your reputation. Join conferences, sports events, online meetups, and more.";
const defaultKeywords =
  "POAP, NFT, events, attendance proof, blockchain, Web3, conferences, sports events, online events, reputation, Ohana Protocol";
const defaultImage = "/og-image.png";
const siteUrl = import.meta.env.VITE_SITE_URL || "https://poapforge.ohana.io";

export function SEO({
  title,
  description = defaultDescription,
  keywords = defaultKeywords,
  image = defaultImage,
  type = "website",
  eventData,
}: SEOProps) {
  const location = useLocation();
  const fullTitle = title ? `${title} | POAP Forge` : defaultTitle;
  const canonicalUrl = `${siteUrl}${location.pathname}`;
  const ogImage = image.startsWith("http") ? image : `${siteUrl}${image}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Basic meta tags
    updateMetaTag("description", description);
    updateMetaTag("keywords", keywords);
    updateMetaTag("author", "Ohana Protocol");

    // Open Graph tags
    updateMetaTag("og:title", fullTitle, true);
    updateMetaTag("og:description", description, true);
    updateMetaTag("og:image", ogImage, true);
    updateMetaTag("og:url", canonicalUrl, true);
    updateMetaTag("og:type", type, true);
    updateMetaTag("og:site_name", "POAP Forge", true);

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", fullTitle);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:image", ogImage);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // Structured data (JSON-LD)
    let structuredData = document.getElementById("structured-data");
    if (structuredData) {
      structuredData.remove();
    }

    const schema: any = {
      "@context": "https://schema.org",
      "@type": type === "event" ? "Event" : "WebSite",
      name: fullTitle,
      description: description,
      url: canonicalUrl,
    };

    if (type === "event" && eventData) {
      schema.name = eventData.name;
      if (eventData.startDate) schema.startDate = eventData.startDate;
      if (eventData.endDate) schema.endDate = eventData.endDate;
      if (eventData.location) {
        schema.location = {
          "@type": "Place",
          name: eventData.location,
        };
      }
      if (eventData.organizer) {
        schema.organizer = {
          "@type": "Organization",
          name: eventData.organizer,
        };
      }
    } else if (type === "website") {
      schema.potentialAction = {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/events?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      };
    }

    structuredData = document.createElement("script");
    structuredData.id = "structured-data";
    structuredData.setAttribute("type", "application/ld+json");
    structuredData.textContent = JSON.stringify(schema);
    document.head.appendChild(structuredData);
  }, [fullTitle, description, keywords, ogImage, canonicalUrl, type, eventData]);

  return null;
}

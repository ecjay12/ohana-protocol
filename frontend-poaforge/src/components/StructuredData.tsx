import { useEffect } from "react";
import { Event } from "../lib/supabase";
import { getGatewayURL } from "../lib/ipfs";

interface StructuredDataProps {
  type: "Organization" | "WebSite" | "Event" | "BreadcrumbList";
  data?: Event | any;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    let script = document.getElementById("structured-data");
    if (script) {
      script.remove();
    }

    let schema: any = {
      "@context": "https://schema.org",
    };

    switch (type) {
      case "Organization":
        schema["@type"] = "Organization";
        schema.name = "Ohana Protocol";
        schema.url = "https://poapforge.ohana.io";
        schema.logo = "https://poapforge.ohana.io/logo.png";
        schema.description = "Decentralized reputation and attendance proof platform";
        schema.sameAs = [
          "https://twitter.com/ohanaprotocol",
          "https://github.com/ohana-protocol",
        ];
        break;

      case "WebSite":
        schema["@type"] = "WebSite";
        schema.name = "POAP Forge";
        schema.url = "https://poapforge.ohana.io";
        schema.potentialAction = {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://poapforge.ohana.io/events?search={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        };
        break;

      case "Event":
        if (data) {
          schema["@type"] = "Event";
          schema.name = data.title;
          schema.description = data.description || `${data.title} - Join and claim your POAP NFT`;
          schema.image = data.image_cid ? getGatewayURL(data.image_cid) : undefined;
          schema.startDate = data.created_at;
          schema.eventStatus = data.status === "active" ? "https://schema.org/EventScheduled" : "https://schema.org/EventCancelled";
          schema.eventAttendanceMode =
            data.event_type === "online"
              ? "https://schema.org/OnlineEventAttendanceMode"
              : data.event_type === "in-person"
              ? "https://schema.org/OfflineEventAttendanceMode"
              : "https://schema.org/MixedEventAttendanceMode";

          if (data.location_address || (data.location_lat && data.location_lng)) {
            schema.location = {
              "@type": "Place",
              name: data.location_address || "Event Location",
              ...(data.location_lat &&
                data.location_lng && {
                  geo: {
                    "@type": "GeoCoordinates",
                    latitude: data.location_lat,
                    longitude: data.location_lng,
                  },
                }),
            };
          }

          schema.organizer = {
            "@type": "Organization",
            name: data.creator_email || data.creator_wallet || "Ohana Protocol",
          };
        }
        break;

      case "BreadcrumbList":
        if (data && Array.isArray(data)) {
          schema["@type"] = "BreadcrumbList";
          schema.itemListElement = data.map((item: any, index: number) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
          }));
        }
        break;
    }

    script = document.createElement("script");
    script.id = "structured-data";
    script.setAttribute("type", "application/ld+json");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }, [type, data]);

  return null;
}

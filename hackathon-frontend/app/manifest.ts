import type { MetadataRoute } from "next";

const ICON = [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }];

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AGOS · Circular Water Network Planner",
    short_name: "AGOS",
    description:
      "Plan safe reuse of greywater and rain per barangay, and keep non-potable needs running when the main supply fails.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#168d98",
    lang: "en",
    dir: "ltr",
    categories: ["utilities", "government"],
    // Web app only; there is no store app to send people to instead.
    prefer_related_applications: false,
    // Opening AGOS again (e.g. from a shortcut) reuses the open window instead of stacking new ones.
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon.
    shortcuts: [
      { name: "Reuse Map", short_name: "Map", description: "Reuse and stored water per barangay", url: "/map", icons: ICON },
      { name: "Outage Mode", short_name: "Outage", description: "Which barangays run out in an outage", url: "/map?outage=1", icons: ICON },
      { name: "Barangay Form", short_name: "Form", description: "File this quarter's four numbers, even offline", url: "/form", icons: ICON },
      { name: "Household Guide", short_name: "Guide", description: "Safe reuse of rinse water and rain", url: "/guide", icons: ICON },
    ],
    // Shown in the install dialog on Android and desktop.
    screenshots: [
      { src: "/screenshots/map-narrow.webp", sizes: "824x1830", type: "image/webp", form_factor: "narrow", label: "Reuse Map: share of households reusing water per barangay" },
      { src: "/screenshots/outage-narrow.webp", sizes: "824x1830", type: "image/webp", form_factor: "narrow", label: "Outage Mode: which barangays hold out, partly, or run out" },
      { src: "/screenshots/map-wide.webp", sizes: "1280x800", type: "image/webp", form_factor: "wide", label: "Reuse Map with the citywide reuse summary" },
      { src: "/screenshots/overview-wide.webp", sizes: "1280x800", type: "image/webp", form_factor: "wide", label: "Overview: Catbalogan at a glance" },
    ],
  };
}

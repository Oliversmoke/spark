import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ComeBack.ai — AI Recovery Coach",
    short_name: "ComeBack.ai",
    description: "Miss a day. Don't miss the goal.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#059669",
    orientation: "portrait-primary",
    categories: ["productivity", "health", "lifestyle"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Today",
        short_name: "Today",
        url: "/today",
        description: "Log today's tasks",
      },
      {
        name: "Chat coach",
        short_name: "Chat",
        url: "/chat",
        description: "Talk to your AI coach",
      },
    ],
  };
}

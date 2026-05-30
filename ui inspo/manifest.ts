import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "9thArc",
    short_name: "9thArc",
    description: "9thArc — Solana gaming and creator platform",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/9tharclogo.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/9tharclogo.png",
        sizes: "1024x1024",
        type: "image/png",
      },
      {
        src: "/9tharclogo.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}


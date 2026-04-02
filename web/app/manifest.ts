import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HGH WorkForce",
    short_name: "WorkForce",
    description: "Payroll, attendance, and employee self-service for Ghana teams.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2ed",
    theme_color: "#0f1f33",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

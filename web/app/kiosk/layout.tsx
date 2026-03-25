import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Office check-in | HGH",
  robots: "noindex, nofollow",
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return children;
}

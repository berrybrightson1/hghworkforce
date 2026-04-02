import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "./providers";
import { TRIAL_DAYS } from "@/lib/billing/access";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "optional",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional",
});

export const metadata: Metadata = {
  title: {
    default: "HGH WorkForce",
    template: "%s | HGH WorkForce",
  },
  description: `Payroll and attendance for Ghana — PAYE, SSNIT, payslips, and employee self-service. ${TRIAL_DAYS}-day full-access trial per workspace, then subscribe.`,
  icons: {
    icon: "/hgh-logo.svg",
  },
  appleWebApp: {
    capable: true,
    title: "HGH WorkForce",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

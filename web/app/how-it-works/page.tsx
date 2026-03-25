import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { HowItWorksContent } from "@/components/landing/how-it-works-content";
import { getLandingAuth } from "@/lib/landing-auth";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Sign up once for payroll and attendance. Learn how onboarding, company setup, and invites work on HGH WorkForce.",
};

export default async function HowItWorksPage() {
  const auth = await getLandingAuth();

  return (
    <div className="min-h-screen bg-hgh-offwhite">
      <LandingNav auth={auth} />
      <main className="pt-24 md:pt-28">
        <HowItWorksContent />
      </main>
      <LandingFooter />
    </div>
  );
}

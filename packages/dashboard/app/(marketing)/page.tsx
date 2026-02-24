import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { SocialProof } from "@/components/marketing/social-proof";

export const metadata: Metadata = {
  title: "DynoClaw — Enterprise AI Teammate Platform",
  description:
    "Deploy an always-on AI agent to your GCP project with plugins, scheduled skills, and enterprise controls.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Pricing />
    </>
  );
}

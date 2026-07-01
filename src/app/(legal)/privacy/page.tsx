import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we collect, use and protect your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      This is a placeholder for the privacy policy. It will describe what data
      we collect, why we collect it, how it is stored, and the rights you have
      over it. A complete, legally reviewed policy should be added before launch.
    </LegalPage>
  );
}

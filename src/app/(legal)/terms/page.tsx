import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using this platform.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      This is a placeholder for the terms of service. It will cover acceptable
      use, user-generated content, accounts, intellectual property and
      liability. A complete, legally reviewed document should be added before launch.
    </LegalPage>
  );
}

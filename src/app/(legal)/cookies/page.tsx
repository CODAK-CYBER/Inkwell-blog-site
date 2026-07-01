import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How and why we use cookies.",
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy">
      This is a placeholder for the cookie policy. It will list the cookies the
      site sets, what each one does, and how to withdraw consent. A complete,
      legally reviewed policy should be added before launch.
    </LegalPage>
  );
}

export const siteConfig = {
  name: "Inkwell",
  tagline: "Stories worth your time",
  description:
    "Inkwell is a premium publishing platform featuring in-depth articles on technology, culture, business, science, and more — personalized to what you love reading.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_US",
  author: "Inkwell Editorial",
  social: {
    twitter: "https://twitter.com/inkwell",
    facebook: "https://facebook.com/inkwell",
    instagram: "https://instagram.com/inkwell",
    linkedin: "https://linkedin.com/company/inkwell",
    youtube: "https://youtube.com/@inkwell",
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Articles", href: "/articles" },
    { label: "Trending", href: "/trending" },
    { label: "Categories", href: "/categories" },
    { label: "Authors", href: "/authors" },
    { label: "About", href: "/about" },
  ],
  footerNav: {
    explore: [
      { label: "Latest Articles", href: "/articles" },
      { label: "Categories", href: "/categories" },
      { label: "Trending", href: "/trending" },
      { label: "Collections", href: "/collections" },
      { label: "Authors", href: "/authors" },
      { label: "Search", href: "/search" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Write for Us", href: "/contact" },
      { label: "Advertise", href: "/contact" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;

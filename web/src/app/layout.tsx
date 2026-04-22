import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareDuo — Share Claude Artifacts Instantly",
  description:
    "Get a shareable link for any HTML artifact. No Claude account needed to view. Track views, add a password, set expiry. Free.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ShareDuo",
  url: "https://www.shareduo.com",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "ShareDuo is the easiest way to share a Claude artifact with someone who doesn't have a Claude account. " +
    "Paste or upload any HTML file and get an instant shareable link that works in any browser. " +
    "Features include view analytics, password protection, expiry control (1h–30d), and a Claude MCP integration " +
    "that lets you push artifacts directly from the conversation.",
  featureList: [
    "View analytics — see how many times your link was opened",
    "Password protection",
    "Expiry control — 1 hour, 1 day, 7 days, or 30 days",
    "Claude MCP integration — push artifacts without leaving the conversation",
    "No account required to upload or view",
  ],
  keywords:
    "share Claude artifact, HTML sharing, Claude artifact link, share HTML file, no account HTML hosting",
  creator: {
    "@type": "Organization",
    name: "ShareDuo",
    url: "https://www.shareduo.com",
    email: "fiona@tf9ventures.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SK6BTG9C54"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SK6BTG9C54');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}

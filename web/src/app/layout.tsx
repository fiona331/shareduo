import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareDuo — Share Claude Artifacts Instantly",
  description:
    "Get a shareable link for any HTML artifact. No Claude account needed to view. Track views, add a password, set expiry. Free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

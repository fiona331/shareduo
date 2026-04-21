import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareDuo",
  description: "Share HTML artifacts instantly. No account required.",
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

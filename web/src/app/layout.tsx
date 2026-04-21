import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artifact Host",
  description: "Share Claude-generated HTML artifacts. No account required.",
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

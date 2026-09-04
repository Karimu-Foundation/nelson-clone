import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nelson Clone — Karimu Foundation",
  description:
    "Chat with the Nelson Mattos COO clone and analyse how it grounds, reasons and escalates.",
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

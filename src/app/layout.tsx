import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RuleFive",
  description: "Buy the 5% dip, sell the 5% rip — a simple Alpaca helper.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}

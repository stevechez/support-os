import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({
  src: "../fonts/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  weight: "200 800",
});

const dmSerif = localFont({
  src: "../fonts/dm-serif-display-latin-400-normal.woff2",
  variable: "--font-dm-serif",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "SupportOS",
    template: "%s · SupportOS",
  },
  description: "The operating system for AI-powered customer support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmSerif.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

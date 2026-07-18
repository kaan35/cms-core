import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fontGeistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const fontGeistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: "Modular CMS built with Next.js",
  title: "CMS Core",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontGeistSans.variable} ${fontGeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* <QueryProvider>{children}</QueryProvider> */}
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Root layout and global styles for the AgeKey OIDC demo

const inter = Inter({
  subsets: ["latin"],
  weight: ["600"], // Semibold weight
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgeKey OIDC Demo",
  description: "Sample app demonstrating AgeKey creation and usage with oidc-client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

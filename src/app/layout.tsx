import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { ChatPopup } from "@/components/ChatPopup";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RealFi Learn & Earn",
  description:
    "Gamified mini app on Base that teaches DeFi concepts and lets users deploy yield strategies gaslessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`} style={{ fontFamily: "var(--font-inter)" }}>
        <AppProviders>
          {children}
          <ChatPopup />
        </AppProviders>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

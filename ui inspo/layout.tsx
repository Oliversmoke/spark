import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers";
import { PwaRegister } from "./components/pwa-register";
import { ShellGate } from "./components/shell-gate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "9thArc",
  description: "9thArc — Solana gaming and creator platform",
  icons: {
    icon: "/9tharclogo.png",
    shortcut: "/9tharclogo.png",
    apple: "/9tharclogo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <PwaRegister />
          <ShellGate>{children}</ShellGate>
        </Providers>
      </body>
    </html>
  );
}

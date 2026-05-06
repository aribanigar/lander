import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Landed — AI Job Application Engine",
  description:
    "Stop applying manually. Landed finds the best companies in your niche, tailors your resume per job, and applies in bulk — so you land interviews faster.",
  keywords: ["job search", "AI resume", "bulk apply", "job automation", "ATS resume"],
  openGraph: {
    title: "Landed — AI Job Application Engine",
    description: "Land your next senior role in under 60 days.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
        {/* suppressHydrationWarning prevents false errors from browser extensions
            (e.g. Grammarly) that inject attributes into <body> before React hydrates */}
        <body className={dmSans.className} suppressHydrationWarning>{children}</body>
      </html>
    </ClerkProvider>
  );
}

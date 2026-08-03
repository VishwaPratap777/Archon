import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BrewCRM",
  description: "AI-native Mini CRM for Roast & Co.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="flex flex-col h-screen overflow-hidden">
            <div className="bg-amber-500/20 text-amber-200 text-xs text-center py-1.5 border-b border-amber-500/30 font-medium">
              ⚠️ Note: The backend is deployed on Render's free tier. It may take 1-2 minutes to wake up from inactivity.
            </div>
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
          <Toaster theme="dark" position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

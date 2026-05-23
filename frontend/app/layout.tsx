import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Lookout — Threat Intelligence",
  description: "Real-time cyber threat intelligence platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans antialiased">
        <Providers>
          <Sidebar />
          <main className="flex-1 overflow-auto min-w-0">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

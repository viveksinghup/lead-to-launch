import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/AuthGuard";
import "./globals.css";

// Fonts are provided via CSS variables (--font-sans / --font-display / --font-mono)
// defined in globals.css using system-font stacks.

export const metadata: Metadata = {
  title: "Lead → Launch",
  description: "Scrape → Audit → Rank → Build → Outreach.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <Script
          id="sw-unregister"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var registration of registrations) {
                    registration.unregister();
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <AuthGuard>
          {children}
        </AuthGuard>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { AuthContextProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gym Logger",
  description: "Minimal, mobile-first Progressive Web App to track gym workouts with zero friction.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym Logger"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} style={{ colorScheme: 'dark' }}>
      <body className="min-h-full flex flex-col bg-bgPrimary text-textPrimary selection:bg-accent/20 transition-colors duration-200">
        
        {/* Core Provider Wrapping Cascade */}
        <ErrorBoundary>
          <AuthContextProvider>
            <SettingsProvider>
              <ThemeProvider>
                <AuthGuard>
                  
                  {/* Central App Shell Container */}
                  <div className="mx-auto max-w-lg w-full min-h-[100dvh] flex flex-col bg-bgPrimary shadow-2xl relative">
                    
                    {/* Safe Safe-Area content wrapper notch-friendly */}
                    <div className="flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-24 relative overflow-y-auto">
                      {children}
                    </div>
                    
                    {/* Navigational Footer */}
                    <BottomNav />
                  </div>

                </AuthGuard>
              </ThemeProvider>
            </SettingsProvider>
          </AuthContextProvider>
        </ErrorBoundary>

      </body>
    </html>
  );
}

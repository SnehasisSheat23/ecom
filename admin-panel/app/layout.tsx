import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "material-symbols/outlined.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "OpenShutter Admin",
  description: "Admin Panel for OpenShutter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground antialiased selection:bg-primary/10">
        {children}
        <Toaster />
      </body>
    </html>
  );
}







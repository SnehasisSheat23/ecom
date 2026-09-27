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
  title: "Abdullah Bakheet | Admin Portal",
  description: "Enterprise Administrative Portal for Abdullah Bakheet Trading Co. - Saudi Arabia",
  icons: {
    icon: [
      { url: "/image.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/image.png",
    apple: "/image.png",
  },
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
      <head>
        <link rel="icon" href="/image.png" type="image/png" />
        <link rel="shortcut icon" href="/image.png" type="image/png" />
        <link rel="apple-touch-icon" href="/image.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground antialiased selection:bg-primary/10">
        {children}
        <Toaster />
      </body>
    </html>
  );
}







// app/layout.tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Outfit } from 'next/font/google';
import './globals.css';



import { ShopProvider } from '@/context/ShopContext';
import { cn } from '@/lib/utils';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const fiorello = localFont({
  src: '../public/fonts/fiorello-cg-condensed-regular-opentype_ufonts.com.otf',
  variable: '--font-heading',
});

import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata: Metadata = {
  title: 'Abdullah Bakheet | Trading Company',
  description: 'Leading food importer and distributor in Saudi Arabia',
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" suppressHydrationWarning={true}>
      <body className={cn(outfit.variable, fiorello.variable, 'font-sans bg-brand-gray min-h-screen flex flex-col')}>
      <ShopProvider>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </ShopProvider>
      </body>
      </html>
  );
}
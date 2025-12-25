import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: {
    default: 'Shaaka - Organic Grocery Store',
    template: '%s | Shaaka',
  },
  description:
    'Shaaka brings you the finest organic groceries in Hyderabad. Shop for spices, pulses, honey, ghee, and more. Farm fresh, delivered to your doorstep.',
  keywords: [
    'organic grocery',
    'organic food',
    'Hyderabad',
    'spices',
    'pulses',
    'honey',
    'ghee',
    'natural products',
    'farm fresh',
  ],
  authors: [{ name: 'Shaaka' }],
  creator: 'Shaaka',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://shaaka.in',
    siteName: 'Shaaka',
    title: 'Shaaka - Organic Grocery Store',
    description:
      'Shop the finest organic groceries in Hyderabad. Farm fresh products delivered to your doorstep.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Shaaka - Organic Grocery Store',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shaaka - Organic Grocery Store',
    description:
      'Shop the finest organic groceries in Hyderabad. Farm fresh products delivered to your doorstep.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

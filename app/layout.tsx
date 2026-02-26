import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spend Tracking App',
  description: 'Track API spend for OpenRouter and Nano Banana Pro',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
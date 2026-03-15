import './globals.css';

export const metadata = {
  title: 'Flex - Spartan Race Training',
  description: 'Train together, compete together, win together',
  manifest: '/manifest.json',
};

import ServiceWorkerRegistration from '../components/ServiceWorkerRegistration';
import PWAInstallPrompt from '../components/PWAInstallPrompt';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ff6b35" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  );
}

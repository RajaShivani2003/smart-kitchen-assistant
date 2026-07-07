'use client';

import PWAProvider from './pwa-provider';

export default function AuthPwaProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PWAProvider />
      {children}
    </>
  );
}

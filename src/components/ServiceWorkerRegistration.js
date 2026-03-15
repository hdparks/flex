'use client';
import { useEffect } from 'react';
import { api } from '@/lib/api';

async function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush(registration, publicKey) {
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  return subscription;
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    async function init() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered');

        const token = api.getToken();
        if (!token) return;

        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) return;

        let publicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!publicKey) {
          const { publicKey: serverKey } = await api.push.getPublicKey();
          publicKey = serverKey;
        }
        const subscription = await subscribeToPush(registration, publicKey);
        await api.push.subscribe(subscription);
        console.log('Push subscribed');
      } catch (err) {
        console.error('SW/Push init error:', err);
      }
    }

    init();
  }, []);

  return null;
}
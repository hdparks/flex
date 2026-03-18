'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64String) {
  let base64 = base64String.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush(registration, publicKey) {
  const keyArray = urlBase64ToUint8Array(publicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyArray,
  });
  return subscription;
}

export default function ServiceWorkerRegistration() {
  const { status } = useSession();

  useEffect(() => {
    async function init() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
      if (status !== 'authenticated') return;

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered');

        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await api.push.subscribe(existingSub.toJSON()).then(() => {
            console.log('Push re-subscribed for current user');
          }).catch(err => {
            console.error('Push re-subscribe error:', err);
          });
          return;
        }

        let publicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!publicKey) {
          const { publicKey: serverKey } = await api.push.getPublicKey();
          publicKey = serverKey;
        }
        const subscription = await subscribeToPush(registration, publicKey);
        await api.push.subscribe(subscription.toJSON());
        console.log('Push subscribed');
      } catch (err) {
        console.error('SW/Push init error:', err);
      }
    }

    init();
  }, [status]);

  return null;
}
'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64) {
  const base64Data = base64.replace(/[-]/g, '+').replace(/[_]/g, '/');
  const padding = base64Data.length % 4;
  const paddedBase64 = padding ? base64Data + '='.repeat(4 - padding) : base64Data;
  const rawData = window.atob(paddedBase64);
  const uint8Array = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    uint8Array[i] = rawData.charCodeAt(i);
  }
  return uint8Array;
}

let swRegistration = null;

export async function enableNotifications() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  if (typeof Notification === 'undefined') {
    throw new Error('Notifications not supported');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  if (!swRegistration) {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
  }

  await handlePushSubscription(swRegistration);
  return true;
}

export default function ServiceWorkerRegistration() {
  const { status } = useSession();
  const initialized = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || initialized.current) return;
    initialized.current = true;

    async function initServiceWorker() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

      try {
        swRegistration = await navigator.serviceWorker.register('/sw.js');

        swRegistration.addEventListener('updatefound', () => {
          const newWorker = swRegistration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker available');
              }
            });
          }
        });
      } catch (err) {
        console.error('Service worker registration failed:', err);
      }
    }

    initServiceWorker();
  }, [status]);

  return null;
}

async function handlePushSubscription(registration) {
  try {
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await api.push.subscribe(existingSubscription.toJSON());
      return;
    }

    const publicKey = await getPublicKey();
    if (!publicKey) throw new Error('Failed to get public key');

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await api.push.subscribe(subscription.toJSON());
  } catch (err) {
    console.error('Push subscription failed:', err);
    throw err;
  }
}

async function getPublicKey() {
  if (process.env.NEXT_PUBLIC_VAPID_KEY) {
    return process.env.NEXT_PUBLIC_VAPID_KEY;
  }

  try {
    const { publicKey } = await api.push.getPublicKey();
    return publicKey;
  } catch (err) {
    console.error('Failed to fetch VAPID public key:', err);
    return null;
  }
}

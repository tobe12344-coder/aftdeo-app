
'use client';

import {useState, useEffect, type ReactNode} from 'react';
import {initializeFirebase} from '@/firebase';
import {FirebaseProvider} from './provider';
import type {FirebaseContextValue} from './provider';

export function FirebaseClientProvider({children}: {children: ReactNode}) {
  const [firebase, setFirebase] = useState<FirebaseContextValue | null>(null);

  useEffect(() => {
    const firebaseInstances = initializeFirebase();
    if (firebaseInstances) {
      setFirebase(firebaseInstances);
    }
  }, []);

  if (!firebase) {
    // You can return a loader here, or just the children if you want the app to render without firebase.
    // For this app, we will show nothing until firebase is ready.
    return null;
  }

  return <FirebaseProvider {...firebase}>{children}</FirebaseProvider>;
}

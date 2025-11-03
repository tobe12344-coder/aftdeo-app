
'use client';

import { useMemo } from 'react';
import {initializeApp, getApp, getApps, type FirebaseApp} from 'firebase/app';
import {getAuth, type Auth} from 'firebase/auth';
import {getFirestore, type Firestore} from 'firebase/firestore';
import {firebaseConfig} from '@/firebase/config';

export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} | null {
  if (!firebaseConfig) {
    console.warn(
      'Firebase config is not provided. Skipping Firebase initialization.'
    );
    return null;
  }
  const firebaseApp =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  return {firebaseApp, auth, firestore};
}

export const useMemoFirebase = useMemo;

export {FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore} from './provider';
export {FirebaseClientProvider} from './client-provider';
export {useUser} from './auth/use-user';
export {useCollection} from './firestore/use-collection';
export {useDoc} from './firestore/use-doc';

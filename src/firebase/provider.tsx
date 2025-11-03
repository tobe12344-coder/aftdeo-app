
'use client';

import {createContext, useContext, type ReactNode} from 'react';
import type {FirebaseApp} from 'firebase/app';
import type {Auth} from 'firebase/auth';
import type {Firestore} from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/common/FirebaseErrorListener';

export interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

export interface FirebaseProviderProps extends FirebaseContextValue {
  children: ReactNode;
}

export function FirebaseProvider(props: FirebaseProviderProps) {
  const {firebaseApp, auth, firestore, children} = props;
  return (
    <FirebaseContext.Provider value={{firebaseApp, auth, firestore}}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  return useFirebase().firebaseApp;
}

export function useAuth() {
  return useFirebase().auth;
}

export function useFirestore() {
  return useFirebase().firestore;
}


'use client';

import {useEffect, useState} from 'react';
import {onAuthStateChanged, type User} from 'firebase/auth';
import {useAuth, useFirestore} from '@/firebase/provider';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';

export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let firestoreUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (authUser: User | null) => {
      // If there was a previous Firestore listener, unsubscribe from it.
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
      }

      if (authUser) {
        // User is signed in, set up a listener for their Firestore document.
        const userDocRef = doc(firestore, 'users', authUser.uid);
        
        firestoreUnsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            // Combine auth data with Firestore data for the complete user profile.
            setUser({
              ...authUser,
              ...doc.data(),
            });
          } else {
            // The user is authenticated, but their Firestore document doesn't exist yet.
            // This can happen briefly during signup. We set the basic auth user for now.
            setUser(authUser);
          }
          setLoading(false);
        }, (error) => {
          // Handle errors (e.g., permissions) gracefully.
          console.error("Error listening to user document:", error);
          setUser(authUser); // Fallback to auth data only
          setLoading(false);
        });

      } else {
        // User is signed out.
        setUser(null);
        setLoading(false);
      }
    });

    // Cleanup function: this runs when the component unmounts.
    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [auth, firestore]); // Rerun this effect only if auth or firestore instances change.

  return {user, loading};
}

'use client';

import {
  type Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export async function signup(auth: Auth, email: string, password: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Create a user document in Firestore
  const db = getFirestore(auth.app);
  const userRef = doc(db, 'users', user.uid);
  const userData = {
    uid: user.uid,
    email: user.email,
    role: 'employee', // Default role for new user
    status: 'pending', // Default status for new user
    displayName: user.email,
    photoURL: '',
  };

  // We are not awaiting the setDoc call directly. Instead, we chain a .catch()
  // to handle potential permission errors without blocking the UI.
  // The error is then emitted globally for a centralized listener to handle.
  setDoc(userRef, userData).catch(serverError => {
    const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'create',
        requestResourceData: userData,
    });
    // Emit the detailed error for the development overlay.
    errorEmitter.emit('permission-error', permissionError);
  });

  // Return the user immediately for a responsive UI, assuming optimistic update.
  return user;
}

export async function login(auth: Auth, email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error logging in: ", error);
    throw error;
  }
}

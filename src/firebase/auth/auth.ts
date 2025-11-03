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

  try {
    // Await the setDoc operation to ensure it completes or throws.
    await setDoc(userRef, userData);
    return user;
  } catch (error) {
    console.error("Error setting user document:", error);
    // Create and emit a detailed permission error
    const permissionError = new FirestorePermissionError({
      path: userRef.path,
      operation: 'create',
      requestResourceData: userData,
    });
    errorEmitter.emit('permission-error', permissionError);
    // We re-throw the original error to ensure the signup promise is rejected
    // and can be caught by the calling function in the UI.
    throw error;
  }
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

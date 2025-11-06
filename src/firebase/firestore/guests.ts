'use client';

import {
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type GuestInput = {
  name: string;
  alamat: string;
  perusahaan: string;
  yangDikunjungi: string;
  maksudKunjungan: string;
  tandaPengenal: string;
  zona: 'Bebas' | 'Terbatas' | 'Terlarang';
  signature: string;
};

export function addGuest(firestore: Firestore | null, guestData: GuestInput) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const guestCollection = collection(firestore, 'guests');
  const dataWithTimestamp = { ...guestData, timestamp: serverTimestamp() };
  
  addDoc(guestCollection, dataWithTimestamp).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: guestCollection.path,
      operation: 'create',
      requestResourceData: dataWithTimestamp,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
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

export async function addGuest(firestore: Firestore, guestData: GuestInput) {
  const guestCollection = collection(firestore, 'guests');
  const dataWithTimestamp = { ...guestData, timestamp: serverTimestamp() };
  
  // By not awaiting the addDoc and only chaining a .catch, we let the UI proceed optimistically.
  // The error will be caught and emitted globally by our listener.
  addDoc(guestCollection, dataWithTimestamp).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: guestCollection.path,
      operation: 'create',
      requestResourceData: dataWithTimestamp,
    });
    errorEmitter.emit('permission-error', permissionError);
    // We don't re-throw here anymore, so it won't be caught by a local try/catch.
  });
}

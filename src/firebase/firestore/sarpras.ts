'use client';

import {
  collection,
  addDoc,
  type Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type SarprasInput = {
  name: string;
  category: string;
  location: string;
  status: 'Baik' | 'Perlu Perbaikan' | 'Rusak';
  lastMaintenance: string;
};

export async function addSarpras(firestore: Firestore, sarprasData: SarprasInput) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const sarprasCollection = collection(firestore, 'sarpras');
  
  addDoc(sarprasCollection, sarprasData).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: sarprasCollection.path,
      operation: 'create',
      requestResourceData: sarprasData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

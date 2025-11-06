'use client';

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  type Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type WasteInput = {
    jenis: string;
    sumber: string;
    jumlah: number;
    unit: string;
    tanggalMasuk: string;
    status: string;
    perlakuan: string;
    kodeManifestasi?: string;
    catatan?: string;
};

export function addWaste(firestore: Firestore | null, wasteData: WasteInput) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const wasteCollection = collection(firestore, 'waste');
  
  addDoc(wasteCollection, wasteData).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: wasteCollection.path,
      operation: 'create',
      requestResourceData: wasteData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function updateWaste(firestore: Firestore | null, id: string, wasteData: Partial<WasteInput>) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const wasteDocRef = doc(firestore, 'waste', id);

  updateDoc(wasteDocRef, wasteData).catch(serverError => {
    const permissionError = new FirestorePermissionError({
        path: wasteDocRef.path,
        operation: 'update',
        requestResourceData: wasteData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function deleteWaste(firestore: Firestore | null, id: string) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const wasteDocRef = doc(firestore, 'waste', id);

  deleteDoc(wasteDocRef).catch(serverError => {
    const permissionError = new FirestorePermissionError({
        path: wasteDocRef.path,
        operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

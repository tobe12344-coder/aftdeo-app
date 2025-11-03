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

export async function addWaste(firestore: Firestore, wasteData: WasteInput) {
  if (!firestore) {
    const err = new Error('Firestore is not initialized');
    console.error(err);
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

export async function updateWaste(firestore: Firestore, id: string, wasteData: Partial<WasteInput>) {
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

export async function deleteWaste(firestore: Firestore, id: string) {
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

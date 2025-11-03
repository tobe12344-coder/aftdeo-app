
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
import type { OvertimeRecord } from '@/lib/types';

export async function addOvertime(firestore: Firestore, overtimeData: Omit<OvertimeRecord, 'id'>) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const overtimeCollection = collection(firestore, 'overtime');
  
  addDoc(overtimeCollection, overtimeData).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: overtimeCollection.path,
      operation: 'create',
      requestResourceData: overtimeData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export async function updateOvertime(firestore: Firestore, id: string, overtimeData: Partial<Omit<OvertimeRecord, 'id'>>) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const overtimeDocRef = doc(firestore, 'overtime', id);

  updateDoc(overtimeDocRef, overtimeData).catch(serverError => {
    const permissionError = new FirestorePermissionError({
        path: overtimeDocRef.path,
        operation: 'update',
        requestResourceData: overtimeData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export async function deleteOvertime(firestore: Firestore, id: string) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const overtimeDocRef = doc(firestore, 'overtime', id);

  deleteDoc(overtimeDocRef).catch(serverError => {
    const permissionError = new FirestorePermissionError({
        path: overtimeDocRef.path,
        operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

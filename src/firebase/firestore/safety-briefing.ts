'use client';

import {
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type SafetyBriefingInput = {
  date: string;
  topic: string;
  conductor: string;
  attendees: string[];
  notes?: string;
};

export function addSafetyBriefing(firestore: Firestore | null, briefingData: SafetyBriefingInput) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const briefingCollection = collection(firestore, 'safety-briefings');
  const dataWithTimestamp = { ...briefingData, timestamp: serverTimestamp() };
  
  addDoc(briefingCollection, dataWithTimestamp).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: briefingCollection.path,
      operation: 'create',
      requestResourceData: dataWithTimestamp,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

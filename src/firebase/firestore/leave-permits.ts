'use client';

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type LeavePermitInput = {
  employeeId: string;
  employeeName: string;
  date: string;
  leaveTime: string;
  securityOnDuty: string;
  purpose: string;
};

export function addLeavePermit(firestore: Firestore | null, permitData: LeavePermitInput) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const permitCollection = collection(firestore, 'leave-permits');
  const dataWithTimestamp = { 
      ...permitData, 
      status: 'Pending', 
      timestamp: serverTimestamp() 
  };
  
  addDoc(permitCollection, dataWithTimestamp)
    .catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: permitCollection.path,
        operation: 'create',
        requestResourceData: dataWithTimestamp,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

export function updateLeavePermitStatus(firestore: Firestore | null, id: string, status: 'Approved' | 'Rejected' | 'Butuh Klarifikasi', approvedBy: string) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const permitDocRef = doc(firestore, 'leave-permits', id);
  const updateData = { status, approvedBy };

  updateDoc(permitDocRef, updateData).catch(serverError => {
    const permissionError = new FirestorePermissionError({
        path: permitDocRef.path,
        operation: 'update',
        requestResourceData: updateData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function addSecuritySignature(
    firestore: Firestore | null, 
    id: string, 
    signature: string, 
    actualLeaveTime: string
) {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  const permitDocRef = doc(firestore, 'leave-permits', id);
  const updateData = { 
      securityOutSignature: signature, 
      actualLeaveTime: actualLeaveTime,
      status: 'On Leave' 
  };

  updateDoc(permitDocRef, updateData).catch(serverError => {
    const permissionError = new FirestorePermissionError({
        path: permitDocRef.path,
        operation: 'update',
        requestResourceData: updateData,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

export function confirmReturn(
    firestore: Firestore | null,
    id: string,
    actualReturnTime: string
) {
    if (!firestore) {
        console.error('Firestore is not initialized');
        return;
    }
    const permitDocRef = doc(firestore, 'leave-permits', id);
    const updateData = {
        actualReturnTime: actualReturnTime,
        status: 'Returned'
    };

    updateDoc(permitDocRef, updateData).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: permitDocRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

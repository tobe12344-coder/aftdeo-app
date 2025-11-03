'use client';

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  type Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import type { AttendanceRecord, Employee } from '@/lib/types';

type AttendanceAction = 'clockIn' | 'clockOut';

export async function handleAttendanceAction(
  firestore: Firestore,
  type: AttendanceAction,
  employee: Employee,
  date: string,
  time: string,
  notes: string,
  existingRecord?: AttendanceRecord
) {
  const attendanceCollection = collection(firestore, 'attendance');

  if (existingRecord?.id) {
    // Update existing record
    const docRef = doc(firestore, 'attendance', existingRecord.id);
    const updateData: Partial<AttendanceRecord> = {};

    if (type === 'clockOut') {
        updateData.clockOut = time;
        updateData.status = 'Clocked Out';
        if (notes) updateData.notes = notes;
    }

    updateDoc(docRef, updateData).catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: updateData,
      });
      errorEmitter.emit('permission-error', permissionError);
    });

  } else if (type === 'clockIn') {
    // Create new record
    const newRecord: Omit<AttendanceRecord, 'id'> = {
      employeeId: employee.id,
      employeeName: employee.name,
      date: date,
      status: 'Present',
      clockIn: time,
      clockOut: '-',
      leaveOut: '-',
      returnIn: '-',
      notes: notes || '-',
    };

    addDoc(attendanceCollection, newRecord).catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: attendanceCollection.path,
        operation: 'create',
        requestResourceData: newRecord,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  }
}

export async function updateAttendance(firestore: Firestore, id: string, data: Partial<AttendanceRecord>) {
    const docRef = doc(firestore, 'attendance', id);
    updateDoc(docRef, data).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

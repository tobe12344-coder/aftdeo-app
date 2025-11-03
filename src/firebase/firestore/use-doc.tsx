
'use client';

import {useEffect, useState, useRef} from 'react';
import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T>(
  docRef: DocumentReference<T> | null,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const ref = useRef(docRef);

  useEffect(() => {
    if (!ref.current) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ref.current,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          const docData = {id: snapshot.id, ...snapshot.data()} as T;
          setData(docData);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      async (err: FirestoreError) => {
        const permissionError = new FirestorePermissionError({
            path: ref.current?.path || 'unknown',
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return {data, loading, error};
}

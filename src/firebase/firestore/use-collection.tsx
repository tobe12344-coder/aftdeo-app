'use client';

import {useEffect, useState, useRef} from 'react';
import {
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  endBefore,
  limitToLast,
  type DocumentData,
  type FirestoreError,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T>(
  queryObj: Query<T> | null,
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  // We can't use query directly as a dependency because it's a new object on every render.
  // We'll stringify it to use as a dependency. A bit of a hack, but it works for this case.
  const queryKey = JSON.stringify({
    path: (queryObj as any)?._query?.path?.segments,
    where: (queryObj as any)?._query?.filters?.map((f:any) => [f.field.segments.join('.'), f.op, f.value]),
    orderBy: (queryObj as any)?._query?.explicitOrderBy?.map((o:any) => [o.field.segments.join('.'), o.dir]),
  });


  useEffect(() => {
    if (!queryObj) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      queryObj,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(data);
        setLoading(false);
      },
      (err: FirestoreError) => {
        // Create a detailed, contextual permission error.
        const path = (queryObj as any)?._query?.path?.segments?.join('/') || 'unknown path';
        const permissionError = new FirestorePermissionError({
          path: path,
          operation: 'list', // 'list' is for collection queries
        });

        // Emit the contextual error for the developer overlay.
        errorEmitter.emit('permission-error', permissionError);
        
        // Also, set the original Firebase error in the component's state.
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]); // Use the stringified key as a dependency

  return {data, loading, error};
}


'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      let description = `Operation: ${error.context.operation}, Path: ${error.context.path}`;
      if (process.env.NODE_ENV === 'development') {
        description += `\nCheck your Firestore security rules.`;
      }

      toast({
        variant: 'destructive',
        title: 'Firestore: Insufficient Permissions',
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">{JSON.stringify(error.context, null, 2)}</code>
          </pre>
        ),
      });

      // For developers, throw the error to show it in the Next.js dev overlay
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}

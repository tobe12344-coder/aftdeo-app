
export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
    requestResourceData?: any;
  };
  
  export class FirestorePermissionError extends Error {
    constructor(public context: SecurityRuleContext) {
      const message = `FirestorePermissionError: Insufficient permissions for ${context.operation} on ${context.path}`;
      super(message);
      this.name = 'FirestorePermissionError';
    }
  }

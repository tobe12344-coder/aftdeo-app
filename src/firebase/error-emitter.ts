
import {EventEmitter} from 'events';

// This is a global event emitter for permission errors.
// It's used to display errors in the development overlay.
export const errorEmitter = new EventEmitter();

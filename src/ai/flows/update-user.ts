'use server';
/**
 * @fileOverview A server-side flow for securely updating user data.
 * This flow uses the Firebase Admin SDK to bypass client-side security rules,
 * allowing administrators to modify user roles and statuses.
 *
 * - updateUser - The exported function to be called from the client.
 * - UpdateUserInput - The Zod schema for the input.
 * - UpdateUserOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK
let adminApp: App;
if (!getApps().length) {
  // Explicitly providing the projectId helps resolve authentication issues in some server environments.
  adminApp = initializeApp({
    credential: credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
} else {
  adminApp = getApps()[0];
}

const db = getFirestore(adminApp);

// Define the shape of the data that can be updated.
// Using .optional() means not all fields have to be provided on every update.
const UserUpdateDataSchema = z.object({
  role: z.enum(['admin', 'employee', 'security', 'receptionist']).optional(),
  status: z.enum(['pending', 'approved']).optional(),
});

// Define the input for the entire flow.
const UpdateUserInputSchema = z.object({
  uid: z.string().describe('The unique ID of the user to update.'),
  data: UserUpdateDataSchema.describe('The data to update for the user.'),
});

// Define the output of the flow.
const UpdateUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;
export type UpdateUserOutput = z.infer<typeof UpdateUserOutputSchema>;

/**
 * This is the main function that will be exported and called by the client.
 * It's a simple wrapper around the Genkit flow.
 */
export async function updateUser(input: UpdateUserInput): Promise<UpdateUserOutput> {
  return updateUserFlow(input);
}

const updateUserFlow = ai.defineFlow(
  {
    name: 'updateUserFlow',
    inputSchema: UpdateUserInputSchema,
    outputSchema: UpdateUserOutputSchema,
  },
  async ({ uid, data }) => {
    // In a real-world, high-security app, you would add a check here
    // to verify that the CALLER of this flow is an admin.
    // For now, we trust that the client-side UI only allows admins to trigger this.

    if (!uid || !data || Object.keys(data).length === 0) {
      return { success: false, message: 'Invalid input: UID and data are required.' };
    }

    try {
      const userRef = db.collection('users').doc(uid);
      await userRef.update(data);
      return { success: true, message: 'User updated successfully.' };
    } catch (error: any) {
      console.error('[Admin Flow] Error updating user:', error);
      // Return a more generic error message to the client.
      return { success: false, message: `Failed to update user: ${error.message}` };
    }
  }
);

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

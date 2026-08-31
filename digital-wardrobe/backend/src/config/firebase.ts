import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initializes Firebase Admin SDK using available environment credentials
 */
function initializeFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // 1. Raw JSON string or Base64 encoded Service Account
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      const parsedJson = raw.startsWith('{')
        ? JSON.parse(raw)
        : JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));

      return admin.initializeApp({
        credential: admin.credential.cert(parsedJson),
        projectId: parsedJson.project_id || process.env.FIREBASE_PROJECT_ID,
      });
    } catch (err) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON/base64:', err);
    }
  }

  // 2. Discrete environment variables
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  // 3. Default application credentials or project ID only fallback
  if (process.env.FIREBASE_PROJECT_ID) {
    return admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  // 4. Default initialization (e.g. for GCP environments or development emulation)
  return admin.initializeApp();
}

const firebaseApp = initializeFirebaseAdmin();
export const adminAuth = firebaseApp.auth();
export { admin };
export default firebaseApp;

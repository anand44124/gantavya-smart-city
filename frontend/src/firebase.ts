import { initializeApp, getApps } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'

export const firebaseConfig = {
  apiKey: "AIzaSyDcILq2RZt_59TrgjWucIDvGqOKXIY_2KI",
  authDomain: "gantavya-app.firebaseapp.com",
  projectId: "gantavya-app",
  storageBucket: "gantavya-app.firebasestorage.app",
  messagingSenderId: "406886206847",
  appId: "1:406886206847:web:ccc753f5235b2c14a4de4a",
  measurementId: "G-X14FJYHPBW",
}

export const isFirebaseConfigured = true

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)

export { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult }

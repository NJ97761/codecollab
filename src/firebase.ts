import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCT9_OECtMBTyVLmyvHbI-LIPh9y84RbnQ",
  authDomain: "codecloud-dce09.firebaseapp.com",
  projectId: "codecloud-dce09",
  storageBucket: "codecloud-dce09.firebasestorage.app",
  messagingSenderId: "178597491499",
  appId: "1:178597491499:web:ce5ee8230762d610b38b6e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;

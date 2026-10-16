import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBZSSJSKfClwCMHErjYoJ6dVJLTSyKLeuk',
  authDomain: 'clone-5ef88.firebaseapp.com',
  projectId: 'clone-5ef88',
  storageBucket: 'clone-5ef88.firebasestorage.app',
  messagingSenderId: '739261013820',
  appId: '1:739261013820:web:ab253671a834068a5c0839',
  measurementId: 'G-D6EKVSQX6F'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
};
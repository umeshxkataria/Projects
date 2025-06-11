import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqOCliSM6znHg82nZ8kwctDCYmP0YPTn4",
  authDomain: "mind-vault-1.firebaseapp.com",
  projectId: "mind-vault-1",
  storageBucket: "mind-vault-1.appspot.com",
  messagingSenderId: "913436656480",
  appId: "1:913436656480:web:0e18ee1486038dcce91405",
  measurementId: "G-EXKS7P6TYP"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, analytics, auth, provider, db }; 
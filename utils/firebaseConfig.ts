// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB1f6ZuJzuPaOSoNsbjKXIXGZ6-vZt0VMg",
  authDomain: "onehostel-0.firebaseapp.com",
  databaseURL: "https://onehostel-0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onehostel-0",
  storageBucket: "onehostel-0.firebasestorage.app",
  messagingSenderId: "641505847165",
  appId: "1:641505847165:web:aa5f72e6b289f1d23ace14",
  measurementId: "G-QZQ5MCD098"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };

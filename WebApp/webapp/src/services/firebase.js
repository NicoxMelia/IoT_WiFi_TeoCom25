// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBf5GVdTQWOUrUtOOWb3aC7q4uXJgkdzfU",
  authDomain: "iot-wifi-tc25.firebaseapp.com",
  projectId: "iot-wifi-tc25",
  storageBucket: "iot-wifi-tc25.firebasestorage.app",
  messagingSenderId: "765431657193",
  appId: "1:765431657193:web:a149c2f336224c6132b678",
  measurementId: "G-M10W1JGEYG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
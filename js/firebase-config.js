// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDuSp9d_rbrVNI2RrLWLOBO78Wrb7CJKf0",
  authDomain: "pokestack-66ddf.firebaseapp.com",
  databaseURL: "https://pokestack-66ddf-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pokestack-66ddf",
  storageBucket: "pokestack-66ddf.firebasestorage.app",
  messagingSenderId: "744310266082",
  appId: "1:744310266082:web:923525f6c8b606744326bb",
  measurementId: "G-WK0301QYP0"
};

let database = null;

try {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Get a reference to the database service
  database = firebase.database();
  
  console.log('🔥 Firebase initialized successfully!');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.warn('⚠️ Game will continue without Firebase leaderboard');
}

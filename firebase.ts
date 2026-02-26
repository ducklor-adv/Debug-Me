import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAvVyJCNS3GPvSeY-RfhoplxaucnG7lHOo",
    authDomain: "debug-me-8036c.firebaseapp.com",
    projectId: "debug-me-8036c",
    storageBucket: "debug-me-8036c.firebasestorage.app",
    messagingSenderId: "357813357110",
    appId: "1:357813357110:web:757261c744f6a6a6552697",
    measurementId: "G-MVTLFMRY6T"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

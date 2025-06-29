// src/contexts/FirebaseContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Create a context for Firebase services
const FirebaseContext = createContext(null);

// Custom hook to use Firebase services
export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider = ({ children }) => {
    const [firebaseApp, setFirebaseApp] = useState(null);
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // Global variables provided by the Canvas environment
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

                // Ensure firebaseConfig is not empty before initializing
                if (Object.keys(firebaseConfig).length === 0) {
                    console.error("Firebase config is missing. Please provide a valid Firebase configuration.");
                    // Set loading to false and return if config is missing to avoid infinite loading
                    setLoading(false);
                    return;
                }

                // Initialize Firebase app
                const app = initializeApp(firebaseConfig);
                const firebaseAuth = getAuth(app);
                const firestoreDb = getFirestore(app);

                setFirebaseApp(app);
                setAuth(firebaseAuth);
                setDb(firestoreDb);

                // Sign in with custom token or anonymously
                if (initialAuthToken) {
                    await signInWithCustomToken(firebaseAuth, initialAuthToken);
                } else {
                    await signInAnonymously(firebaseAuth);
                }

                // Listen for auth state changes
                const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                    if (user) {
                        setUserId(user.uid); // Use UID for authenticated users
                    } else {
                        // For anonymous users or logged out users, generate a temporary UUID
                        setUserId(crypto.randomUUID());
                    }
                    setLoading(false); // Set loading to false once auth state is determined
                });

                // Cleanup subscription on unmount
                return () => unsubscribe();
            } catch (error) {
                console.error("Error initializing Firebase:", error);
                setLoading(false); // Ensure loading is false even on error
            }
        };

        initializeFirebase();
    }, []); // Empty dependency array ensures this runs only once on mount

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
                    <p className="mt-4 text-gray-700">Loading Firebase...</p>
                </div>
            </div>
        );
    }

    // Provide Firebase app, auth, db, and userId to children
    return (
        <FirebaseContext.Provider value={{ firebaseApp, auth, db, userId }}>
            {children}
        </FirebaseContext.Provider>
    );
};

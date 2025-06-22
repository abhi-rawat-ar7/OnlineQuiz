import React, { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import CreateQuizPage from './pages/CreateQuizPage';
import TakeQuizPage from './pages/TakeQuizPage';
import AnalyticsPage from './pages/AnalyticsPage';
import Header from './components/Header';

// Firebase imports (these will be provided by Canvas runtime)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';


// Global variables provided by the Canvas environment
// If not available (e.g., running locally without Canvas), use defaults
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedQuizId, setSelectedQuizId] = useState(null); // State to pass to TakeQuizPage

  useEffect(() => {
    const initFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestoreDb);
        setAuth(firebaseAuth);

        // Sign in user using provided token or anonymously
        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          await signInAnonymously(firebaseAuth);
        }

        // Set up auth state listener
        onAuthStateChanged(firebaseAuth, (user) => {
          if (user) {
            console.log("User authenticated:", user.uid);
            setCurrentUser(user);
          } else {
            console.log("No user is signed in.");
            setCurrentUser(null);
          }
        });

      } catch (error) {
        console.error("Error initializing Firebase or authenticating:", error);
      }
    };

    initFirebase();
  }, []); // Run only once on component mount

  const navigateTo = (page, quizId = null) => {
    setCurrentPage(page);
    setSelectedQuizId(quizId);
  };

    // Determine user ID for Firestore operations
  const userId = currentUser ? currentUser.uid : (crypto.randomUUID ? crypto.randomUUID() : 'anonymous');
  const userIdentifier = currentUser ? currentUser.uid : 'Anonymous User'; // Display for UI

  if (!db || !auth || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg text-gray-700">
        Loading application...
      </div>
    );
  }

    return (
    <div className="min-h-screen flex flex-col">
      <Header navigateTo={navigateTo} userIdentifier={userIdentifier} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {currentPage === 'home' && (
          <HomePage navigateTo={navigateTo} db={db} userId={userId} />
        )}
        {currentPage === 'create' && (
          <CreateQuizPage navigateTo={navigateTo} db={db} userId={userId} />
        )}
        {currentPage === 'takeQuiz' && selectedQuizId && (
          <TakeQuizPage navigateTo={navigateTo} db={db} userId={userId} quizId={selectedQuizId} />
        )}
        {currentPage === 'analytics' && (
          <AnalyticsPage navigateTo={navigateTo} db={db} userId={userId} />
        )}
      </main>
      <footer className="bg-purple-800 text-white p-4 text-center text-sm">
        <p>&copy; 2025 AI Quiz Maker. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;

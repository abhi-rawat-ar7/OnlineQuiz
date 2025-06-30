// src/App.js
import React, { useState, useEffect } from 'react';
import { useFirebase } from './contexts/FirebaseContext';
import Auth from './components/Auth';
import Home from './components/Home';
import QuizList from './components/QuizList';
import QuizBuilder from './components/QuizBuilder';
import TakeQuiz from './components/TakeQuiz';
import QuizResults from './components/QuizResults';
import Analytics from './components/Analytics';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
    const { auth, userId, db } = useFirebase();
    const [currentUser, setCurrentUser] = useState(null);
    const [currentView, setCurrentView] = useState('home'); // 'home', 'quiz-builder', 'quiz-list', 'take-quiz', 'quiz-results', 'analytics'
    const [selectedQuizId, setSelectedQuizId] = useState(null); // To pass quiz ID to TakeQuiz/QuizResults

    useEffect(() => {
        // Ensure auth object is available before setting up the listener
        if (!auth) return;

        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            // If user logs out, go back to auth view
            if (!user) {
                setCurrentView('auth');
            } else {
                // If user logs in, go to home view
                setCurrentView('home');
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [auth]); // Re-run effect if auth object changes

    // Callback for successful authentication (from Auth component)
    const handleAuthSuccess = () => {
        // onAuthStateChanged will handle updating currentUser and setting view to 'home'
        // No explicit view change needed here as it's handled by the listener
    };

    // Render different components based on the current view
    const renderContent = () => {
        if (!currentUser && currentView !== 'auth') {
            // If no user and not explicitly on auth view, show auth (e.g., initial load)
            return <Auth onAuthSuccess={handleAuthSuccess} />;
        }

        switch (currentView) {
            case 'auth':
                return <Auth onAuthSuccess={handleAuthSuccess} />;
            case 'home':
                return <Home setCurrentView={setCurrentView} />;
            case 'quiz-list':
                return <QuizList setCurrentView={setCurrentView} setSelectedQuizId={setSelectedQuizId} />;
            case 'quiz-builder':
                return <QuizBuilder setCurrentView={setCurrentView} />;
            case 'take-quiz':
                if (!selectedQuizId) {
                    // Redirect to quiz list if no quiz is selected
                    setCurrentView('quiz-list');
                    return null;
                }
                return <TakeQuiz quizId={selectedQuizId} setCurrentView={setCurrentView} />;
            case 'quiz-results':
                if (!selectedQuizId) {
                    // Redirect to home if no quiz results to show
                    setCurrentView('home');
                    return null;
                }
                return <QuizResults quizId={selectedQuizId} setCurrentView={setCurrentView} />;
            case 'analytics':
                return <Analytics setCurrentView={setCurrentView} />;
            default:
                return <Home setCurrentView={setCurrentView} />;
        }
    };

    return (
        <div className="font-inter">
            {renderContent()}
        </div>
    );
}

export default App;

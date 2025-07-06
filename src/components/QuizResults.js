// src/components/QuizResults.js
import React, { useState, useEffect } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Trophy, CheckCircle, XCircle, Info, ArrowLeft } from 'lucide-react';

const QuizResults = ({ quizId, setCurrentView }) => {
    const { db, userId } = useFirebase();
    const [latestAttempt, setLatestAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!quizId || !db || !userId) {
            setMessage("Invalid quiz ID or Firebase not ready.");
            setLoading(false);
            return;
        }

        const fetchLatestAttempt = async () => {
            setLoading(true);
            try {
                const attemptsCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/quizAttempts`);
                const q = query(
                    attemptsCollectionRef,
                    where("quizId", "==", quizId)
                    // Note: Firestore does not support orderBy on non-indexed fields by default without creating an index.
                    // For simplicity, we'll fetch all and sort in memory. For large datasets, this might be inefficient.
                    // For a real-world app with many attempts, consider storing a timestamp and using it to query.
                );

                const querySnapshot = await getDocs(q);
                let latest = null;
                let latestTime = 0;

                querySnapshot.forEach((docSnap) => {
                    const attemptData = docSnap.data();
                    const submissionTime = new Date(attemptData.submissionTime).getTime();
                    if (submissionTime > latestTime) {
                        latestTime = submissionTime;
                        latest = attemptData;
                    }
                });

                if (latest) {
                    setLatestAttempt(latest);
                } else {
                    setMessage("No attempts found for this quiz.");
                }
            } catch (error) {
                console.error("Error fetching quiz results:", error);
                setMessage("Failed to load quiz results. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchLatestAttempt();
    }, [quizId, db, userId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
                    <p className="mt-4 text-gray-700">Loading results...</p>
                </div>
            </div>
        );
    }

    if (!latestAttempt) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
                <p className="text-xl text-red-600 mb-4">{message || "Results not available."}</p>
                <button
                    onClick={() => setCurrentView('quiz-list')}
                    className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" /> Back to Quizzes
                </button>
            </div>
        );
    }

    const { score, totalQuestions, detailedResults, timeTaken, timedOut } = latestAttempt;
    const percentage = ((score / totalQuestions) * 100).toFixed(1);

    const formatTimeTaken = (seconds) => {
        if (seconds === null) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 sm:p-8">
            <header className="w-full max-w-3xl flex justify-between items-center py-4 px-6 bg-white shadow-md rounded-lg mb-8">
                <button
                    onClick={() => setCurrentView('quiz-list')}
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition duration-150 ease-in-out text-sm"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Quizzes
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Quiz Results</h1>
            </header>

            <main className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
                {message && (
                    <div className={`mb-6 p-3 rounded-md text-center text-sm font-medium ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <div className="text-center mb-8">
                    <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
                        Your Score: {score} / {totalQuestions}
                    </h2>
                    <p className="text-2xl font-semibold text-indigo-600 mb-4">
                        ({percentage}%)
                    </p>
                    <div className="flex justify-center items-center space-x-4 text-gray-700">
                        {latestAttempt.submissionTime && (
                            <p>Submitted On: {new Date(latestAttempt.submissionTime).toLocaleString()}</p>
                        )}
                        <p>Time Taken: {formatTimeTaken(timeTaken)}</p>
                        {timedOut && <p className="text-red-500 font-medium"> (Timed Out)</p>}
                    </div>
                </div>

                <div className="space-y-6">
                    {detailedResults.map((result, index) => (
                        <div key={index} className="p-5 border rounded-lg shadow-sm bg-gray-50">
                            <div className="flex items-start mb-3">
                                {result.isCorrect === true && (
                                    <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0" />
                                )}
                                {result.isCorrect === false && (
                                    <XCircle className="h-6 w-6 text-red-500 mr-2 flex-shrink-0" />
                                )}
                                {result.isCorrect === null && ( // For open-ended
                                    <Info className="h-6 w-6 text-blue-500 mr-2 flex-shrink-0" />
                                )}
                                <p className="flex-1 text-lg font-semibold text-gray-800">
                                    Q{index + 1}: {result.questionText}
                                </p>
                            </div>

                            {(result.type === 'mcq' || result.type === 'true-false') && (
                                <>
                                    <div className="mb-2">
                                        <p className="text-sm text-gray-600">Your Answer:</p>
                                        <p className={`font-medium ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                            {result.userAnswer === null || result.userAnswer === '' ? (
                                                <span className="text-gray-500 italic">No answer provided</span>
                                            ) : (
                                                result.type === 'mcq' ? (result.options[parseInt(result.userAnswer)]?.text || 'Invalid selection') : result.userAnswer
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Correct Answer:</p>
                                        <p className="font-medium text-green-700">
                                            {result.type === 'mcq' ? (result.options[parseInt(result.correctAnswer)]?.text || 'N/A') : result.correctAnswer}
                                        </p>
                                    </div>
                                </>
                            )}

                            {result.type === 'open-ended' && (
                                <div className="mb-2">
                                    <p className="text-sm text-gray-600">Your Answer:</p>
                                    <p className="font-medium text-gray-800">
                                        {result.userAnswer || <span className="text-gray-500 italic">No answer provided</span>}
                                    </p>
                                    <p className="text-sm text-blue-600 mt-2">
                                        (Open-ended questions require manual review for scoring.)
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default QuizResults;

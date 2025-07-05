// src/components/TakeQuiz.js
import React, { useState, useEffect, useRef } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { Hourglass, CheckSquare, XSquare, MessageSquare, ArrowLeft } from 'lucide-react';

const TakeQuiz = ({ quizId, setCurrentView }) => {
    const { db, userId } = useFirebase();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({}); // { questionId: answer }
    const [timeLeft, setTimeLeft] = useState(null); // Time in seconds
    const timerRef = useRef(null); // Ref to hold the interval ID
    const [quizSubmitted, setQuizSubmitted] = useState(false); // To prevent multiple submissions

    useEffect(() => {
        if (!quizId || !db || !userId) {
            setMessage("Invalid quiz ID or Firebase not ready.");
            setLoading(false);
            return;
        }

        const fetchQuiz = async () => {
            setLoading(true);
            try {
                // Construct the document path for the specific quiz
                const quizDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/quizzes`, quizId);
                const docSnap = await getDoc(quizDocRef);

                if (docSnap.exists()) {
                    const quizData = docSnap.data();
                    setQuiz(quizData);
                    // Initialize timer if timeLimit is set
                    if (quizData.timeLimit) {
                        setTimeLeft(quizData.timeLimit * 60); // Convert minutes to seconds
                    }
                    // Initialize userAnswers with empty strings for all questions
                    const initialAnswers = {};
                    quizData.questions.forEach((_, index) => {
                        initialAnswers[index] = ''; // Using index as key for simplicity here
                    });
                    setUserAnswers(initialAnswers);
                } else {
                    setMessage("Quiz not found.");
                    setCurrentView('quiz-list'); // Redirect if quiz doesn't exist
                }
            } catch (error) {
                console.error("Error fetching quiz:", error);
                setMessage("Failed to load quiz. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();

        // Cleanup timer on unmount
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [quizId, db, userId, setCurrentView]);

    useEffect(() => {
        if (quiz && quiz.timeLimit && timeLeft !== null && !quizSubmitted) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmitQuiz(true); // Auto-submit when time runs out
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [quiz, timeLeft, quizSubmitted]); // Re-run effect if quiz or timeLeft changes

    // Handle user selecting an answer for a question
    const handleAnswerChange = (questionIndex, answer) => {
        setUserAnswers(prevAnswers => ({
            ...prevAnswers,
            [questionIndex]: answer
        }));
    };

    // Calculate score
    const calculateScore = () => {
        if (!quiz || !quiz.questions) return { score: 0, total: 0, detailedResults: [] };

        let score = 0;
        const detailedResults = [];

        quiz.questions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            let isCorrect = false;

            if (q.type === 'mcq') {
                // Correct answer is stored as stringified index
                if (String(q.correctAnswer) === String(userAnswer)) {
                    isCorrect = true;
                    score += 1;
                }
            } else if (q.type === 'true-false') {
                // Correct answer is "True" or "False"
                if (q.correctAnswer === userAnswer) {
                    isCorrect = true;
                    score += 1;
                }
            }
            // For open-ended, correctness cannot be determined here.
            // It will be null/undefined for open-ended and require manual review.

            detailedResults.push({
                questionIndex: index,
                questionText: q.text,
                userAnswer: userAnswer,
                correctAnswer: (q.type === 'mcq' && q.options[parseInt(q.correctAnswer)]?.text) || q.correctAnswer || 'N/A (Open-Ended)',
                isCorrect: q.type === 'open-ended' ? null : isCorrect, // Null for open-ended
                type: q.type,
                options: q.options || []
            });
        });

        return { score, total: quiz.questions.length, detailedResults };
    };

    // Handle quiz submission
    const handleSubmitQuiz = async (timedOut = false) => {
        if (quizSubmitted) return; // Prevent double submission

        setQuizSubmitted(true); // Mark quiz as submitted
        if (timerRef.current) {
            clearInterval(timerRef.current); // Stop the timer
        }
        setMessage(timedOut ? "Time's up! Submitting your quiz..." : "Submitting your quiz...");
        setLoading(true);

        const { score, total, detailedResults } = calculateScore();

        const quizAttemptData = {
            quizId: quizId,
            userId: userId,
            score: score,
            totalQuestions: total,
            submissionTime: new Date().toISOString(),
            userAnswers: userAnswers, // Raw user answers
            detailedResults: detailedResults, // Calculated results including correctness
            timeTaken: quiz.timeLimit ? (quiz.timeLimit * 60 - (timeLeft || 0)) : null, // If timed, calculate time taken
            timedOut: timedOut,
        };

        try {
            // Save quiz attempt to Firestore
            const attemptsCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/quizAttempts`);
            await addDoc(attemptsCollectionRef, quizAttemptData);
            setMessage("Quiz submitted successfully!");
            // Redirect to quiz results page
            setTimeout(() => {
                setCurrentView('quiz-results');
            }, 1500); // Give user a moment to see submission message
        } catch (error) {
            console.error("Error submitting quiz:", error);
            setMessage("Failed to submit quiz. Please try again.");
            setLoading(false);
            setQuizSubmitted(false); // Allow re-submission if failed
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
                    <p className="mt-4 text-gray-700">Loading quiz...</p>
                </div>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
                <p className="text-xl text-red-600 mb-4">{message || "Quiz not found or an error occurred."}</p>
                <button
                    onClick={() => setCurrentView('quiz-list')}
                    className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" /> Back to Quizzes
                </button>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 sm:p-8">
            <header className="w-full max-w-2xl flex flex-col sm:flex-row justify-between items-center py-4 px-6 bg-white shadow-md rounded-lg mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center sm:text-left mb-2 sm:mb-0">
                    {quiz.title}
                </h1>
                {quiz.timeLimit && timeLeft !== null && (
                    <div className={`flex items-center text-lg font-semibold px-4 py-2 rounded-full ${timeLeft <= 60 ? 'bg-red-100 text-red-600 border border-red-300' : 'bg-blue-100 text-blue-600 border border-blue-300'}`}>
                        <Hourglass className="h-5 w-5 mr-2" />
                        Time Left: {formatTime(timeLeft)}
                    </div>
                )}
            </header>

            <main className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-xl border border-gray-200 relative">
                {message && (
                    <div className={`mb-6 p-3 rounded-md text-center text-sm font-medium ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                {!quizSubmitted ? (
                    <>
                        <div className="mb-8">
                            <p className="text-gray-600 text-sm mb-2 text-center">
                                Question {currentQuestionIndex + 1} of {quiz.questions.length}
                            </p>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                                {currentQuestion.text}
                            </h2>

                            {currentQuestion.type === 'mcq' && (
                                <div className="space-y-3">
                                    {currentQuestion.options.map((option, index) => (
                                        <label
                                            key={option.id || index}
                                            className={`flex items-center p-4 border rounded-md cursor-pointer transition duration-150 ease-in-out
                                            ${userAnswers[currentQuestionIndex] === String(index)
                                                ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300'
                                                : 'bg-white border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`question-${currentQuestionIndex}`}
                                                value={index}
                                                checked={userAnswers[currentQuestionIndex] === String(index)}
                                                onChange={() => handleAnswerChange(currentQuestionIndex, String(index))}
                                                className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                            />
                                            <span className="ml-3 text-base text-gray-800">{option.text}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {currentQuestion.type === 'true-false' && (
                                <div className="space-y-3">
                                    <label
                                        className={`flex items-center p-4 border rounded-md cursor-pointer transition duration-150 ease-in-out
                                        ${userAnswers[currentQuestionIndex] === 'True'
                                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300'
                                            : 'bg-white border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${currentQuestionIndex}`}
                                            value="True"
                                            checked={userAnswers[currentQuestionIndex] === 'True'}
                                            onChange={() => handleAnswerChange(currentQuestionIndex, 'True')}
                                            className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                        />
                                        <span className="ml-3 text-base text-gray-800">True</span>
                                    </label>
                                    <label
                                        className={`flex items-center p-4 border rounded-md cursor-pointer transition duration-150 ease-in-out
                                        ${userAnswers[currentQuestionIndex] === 'False'
                                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300'
                                            : 'bg-white border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${currentQuestionIndex}`}
                                            value="False"
                                            checked={userAnswers[currentQuestionIndex] === 'False'}
                                            onChange={() => handleAnswerChange(currentQuestionIndex, 'False')}
                                            className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                        />
                                        <span className="ml-3 text-base text-gray-800">False</span>
                                    </label>
                                </div>
                            )}

                            {currentQuestion.type === 'open-ended' && (
                                <div>
                                    <textarea
                                        value={userAnswers[currentQuestionIndex]}
                                        onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                                        rows="5"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Type your answer here..."
                                    ></textarea>
                                </div>
                            )}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-8 flex justify-between">
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            {currentQuestionIndex < quiz.questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSubmitQuiz()}
                                    className="px-5 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
                                >
                                    Submit Quiz
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-xl font-semibold text-gray-800 mb-4">Quiz Submitted!</p>
                        <p className="text-gray-600">Redirecting to results page...</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TakeQuiz;

// src/components/QuizBuilder.js
import React, { useState, useEffect } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { Plus, X, Timer, Book, Info, CheckCircle, Radio, Type, ArrowLeft } from 'lucide-react';

const QuizBuilder = ({ setCurrentView, selectedQuizId }) => {
    const { db, userId } = useFirebase();
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState(''); // in minutes
    const [questions, setQuestions] = useState([]); // Array of question objects
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // Flag for edit mode

    // Load quiz data if in edit mode
    useEffect(() => {
        if (selectedQuizId && db && userId) {
            setIsEditing(true);
            setLoading(true);
            const quizDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/quizzes`, selectedQuizId);
            getDoc(quizDocRef)
                .then(docSnap => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setQuizTitle(data.title || '');
                        setQuizDescription(data.description || '');
                        setTimeLimit(data.timeLimit || '');
                        setQuestions(data.questions || []);
                    } else {
                        setMessage("Quiz not found.");
                        setIsEditing(false); // Not found, so not in edit mode
                    }
                })
                .catch(error => {
                    console.error("Error fetching quiz for editing:", error);
                    setMessage("Failed to load quiz for editing.");
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setIsEditing(false);
        }
    }, [selectedQuizId, db, userId]); // Dependencies for useEffect

    // Add a new question to the list
    const addQuestion = (type) => {
        const newQuestion = {
            id: Date.now(), // Unique ID for keying in React
            type: type, // 'mcq', 'true-false', 'open-ended'
            text: '',
            options: [], // For MCQ/True-False
            correctAnswer: '', // For MCQ/True-False (index or "True"/"False")
        };
        setQuestions([...questions, newQuestion]);
    };

    // Update a question's property (e.g., text, options)
    const updateQuestion = (id, field, value) => {
        setQuestions(questions.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        ));
    };

    // Add an option to an MCQ question
    const addOption = (questionId) => {
        setQuestions(questions.map(q =>
            q.id === questionId ? { ...q, options: [...q.options, { text: '', id: Date.now() + Math.random() }] } : q
        ));
    };

    // Update an option's text
    const updateOption = (questionId, optionId, value) => {
        setQuestions(questions.map(q =>
            q.id === questionId ? {
                ...q,
                options: q.options.map(opt =>
                    opt.id === optionId ? { ...opt, text: value } : opt
                )
            } : q
        ));
    };

    // Remove an option from an MCQ question
    const removeOption = (questionId, optionId) => {
        setQuestions(questions.map(q =>
            q.id === questionId ? {
                ...q,
                options: q.options.filter(opt => opt.id !== optionId)
            } : q
        ));
    };

    // Remove a question
    const removeQuestion = (id) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    // Handles saving or updating the quiz
    const handleSaveQuiz = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);

        if (!db || !userId) {
            setMessage("Firebase not initialized or user not logged in.");
            setLoading(false);
            return;
        }

        // Basic validation
        if (!quizTitle.trim()) {
            setMessage("Quiz title cannot be empty.");
            setLoading(false);
            return;
        }
        if (questions.length === 0) {
            setMessage("Please add at least one question to the quiz.");
            setLoading(false);
            return;
        }
        // Further validation for questions (e.g., text, options, correct answer)
        for (const q of questions) {
            if (!q.text.trim()) {
                setMessage(`Question text cannot be empty for question ${q.id}.`);
                setLoading(false);
                return;
            }
            if (q.type === 'mcq' || q.type === 'true-false') {
                if (q.options.length === 0) {
                    setMessage(`Question ${q.id} (MCQ/True-False) must have at least one option.`);
                    setLoading(false);
                    return;
                }
                if (!q.correctAnswer) {
                    setMessage(`Please select a correct answer for question ${q.id}.`);
                    setLoading(false);
                    return;
                }
            }
        }

        const quizData = {
            title: quizTitle,
            description: quizDescription,
            timeLimit: parseInt(timeLimit) || null, // Store as number, or null if empty
            questions: questions.map(q => {
                // Sanitize temporary IDs and ensure correct format for storage
                const { id, ...rest } = q;
                return rest;
            }),
            createdAt: new Date().toISOString(),
            createdBy: userId,
        };

        try {
            if (isEditing && selectedQuizId) {
                // Update existing quiz
                const quizDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/quizzes`, selectedQuizId);
                await setDoc(quizDocRef, quizData, { merge: true }); // Use setDoc with merge to update
                setMessage('Quiz updated successfully!');
            } else {
                // Add new quiz
                const quizzesCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/quizzes`);
                await addDoc(quizzesCollectionRef, quizData);
                setMessage('Quiz saved successfully!');
                // Optionally clear form or redirect after successful save
                setQuizTitle('');
                setQuizDescription('');
                setTimeLimit('');
                setQuestions([]);
            }
            // After a short delay, go back to quiz list
            setTimeout(() => setCurrentView('quiz-list'), 1500);
        } catch (error) {
            console.error("Error saving quiz:", error);
            setMessage(`Failed to save quiz: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
                    <p className="mt-4 text-gray-700">Loading quiz for editing...</p>
                </div>
            </div>
        );
    }

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
                <h1 className="text-3xl font-bold text-gray-900">{isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h1>
            </header>

            <main className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
                {message && (
                    <div className={`mb-6 p-3 rounded-md text-center text-sm font-medium ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSaveQuiz} className="space-y-8">
                    {/* Quiz Details */}
                    <div className="p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                            <Book className="h-6 w-6 mr-2 text-indigo-500" /> Quiz Details
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="quizTitle" className="block text-sm font-medium text-gray-700">Quiz Title</label>
                                <input
                                    type="text"
                                    id="quizTitle"
                                    value={quizTitle}
                                    onChange={(e) => setQuizTitle(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="e.g., Frontend React Basics"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="quizDescription" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                                <textarea
                                    id="quizDescription"
                                    value={quizDescription}
                                    onChange={(e) => setQuizDescription(e.target.value)}
                                    rows="3"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="A brief description of the quiz..."
                                ></textarea>
                            </div>
                            <div>
                                <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">Time Limit (minutes, optional)</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Timer className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        type="number"
                                        id="timeLimit"
                                        value={timeLimit}
                                        onChange={(e) => setTimeLimit(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="e.g., 30"
                                        min="1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Questions Section */}
                    <div className="p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                            <Plus className="h-6 w-6 mr-2 text-indigo-500" /> Questions ({questions.length})
                        </h2>

                        <div className="flex flex-wrap gap-3 mb-6">
                            <button
                                type="button"
                                onClick={() => addQuestion('mcq')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Radio className="h-4 w-4 mr-2" /> Add MCQ
                            </button>
                            <button
                                type="button"
                                onClick={() => addQuestion('true-false')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" /> Add True/False
                            </button>
                            <button
                                type="button"
                                onClick={() => addQuestion('open-ended')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                            >
                                <Type className="h-4 w-4 mr-2" /> Add Open-Ended
                            </button>
                        </div>

                        <div className="space-y-8">
                            {questions.map((q, qIndex) => (
                                <div key={q.id} className="p-6 border border-gray-300 rounded-lg bg-white shadow-md relative">
                                    <button
                                        type="button"
                                        onClick={() => removeQuestion(q.id)}
                                        className="absolute top-3 right-3 text-red-500 hover:text-red-700 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        title="Remove Question"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Question {qIndex + 1} ({q.type === 'mcq' ? 'Multiple Choice' : q.type === 'true-false' ? 'True/False' : 'Open-Ended'})</h3>

                                    <div className="mb-4">
                                        <label htmlFor={`question-text-${q.id}`} className="block text-sm font-medium text-gray-700">Question Text</label>
                                        <textarea
                                            id={`question-text-${q.id}`}
                                            value={q.text}
                                            onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                            rows="2"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="Enter your question here..."
                                            required
                                        ></textarea>
                                    </div>

                                    {(q.type === 'mcq' || q.type === 'true-false') && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                                            <div className="space-y-2">
                                                {q.options.map((option, optIndex) => (
                                                    <div key={option.id} className="flex items-center space-x-2">
                                                        {q.type === 'mcq' && (
                                                            <input
                                                                type="radio"
                                                                name={`correct-answer-${q.id}`}
                                                                value={optIndex} // Store index of correct answer
                                                                checked={q.correctAnswer === String(optIndex)}
                                                                onChange={() => updateQuestion(q.id, 'correctAnswer', String(optIndex))}
                                                                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                                            />
                                                        )}
                                                        {q.type === 'true-false' && (
                                                            <input
                                                                type="radio"
                                                                name={`correct-answer-${q.id}`}
                                                                value={option.text}
                                                                checked={q.correctAnswer === option.text}
                                                                onChange={() => updateQuestion(q.id, 'correctAnswer', option.text)}
                                                                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                                            />
                                                        )}
                                                        <input
                                                            type="text"
                                                            value={option.text}
                                                            onChange={(e) => updateOption(q.id, option.id, e.target.value)}
                                                            className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                            placeholder={`Option ${optIndex + 1}`}
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption(q.id, option.id)}
                                                            className="text-red-500 hover:text-red-700"
                                                            title="Remove Option"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            {q.type === 'mcq' && (
                                                <button
                                                    type="button"
                                                    onClick={() => addOption(q.id)}
                                                    className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> Add Option
                                                </button>
                                            )}
                                            {q.type === 'true-false' && q.options.length === 0 && (
                                                // Automatically add True/False options if not present
                                                <div className="mt-3 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            updateQuestion(q.id, 'options', [{ text: 'True', id: 'true_opt' }, { text: 'False', id: 'false_opt' }]);
                                                        }}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                    >
                                                        Generate True/False Options
                                                    </button>
                                                </div>
                                            )}
                                            {q.type === 'true-false' && q.options.length > 0 && (
                                                <p className="mt-2 text-sm text-gray-500">
                                                    Select the correct answer above.
                                                </p>
                                            )}
                                            {q.type === 'mcq' && q.correctAnswer && (
                                                <p className="mt-2 text-sm text-gray-500">
                                                    Correct Answer: <span className="font-semibold">{q.options[parseInt(q.correctAnswer)]?.text || 'Not selected'}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {q.type === 'open-ended' && (
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-500">
                                                For open-ended questions, there is no pre-defined correct answer. Scoring will need manual review or AI-based assessment (not covered in this basic implementation).
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t border-gray-200 mt-8">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                isEditing ? 'Update Quiz' : 'Save Quiz'
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default QuizBuilder;

// src/components/QuizList.js
import React, { useState, useEffect } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, query, where, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { Edit, Trash2, PlayCircle, PlusCircle, ArrowLeft } from 'lucide-react';

const QuizList = ({ setCurrentView, setSelectedQuizId }) => {
    const { db, userId } = useFirebase();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [quizToDelete, setQuizToDelete] = useState(null);

    // Fetch quizzes from Firestore
    useEffect(() => {
        if (!db || !userId) {
            // Firebase or user not ready, handle loading or error state
            setLoading(false);
            return;
        }

        setLoading(true);
        // Define the collection path for private quizzes
        const quizzesCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/quizzes`);
        // Create a query to fetch quizzes created by the current user
        // Note: Firestore security rules should also enforce this 'where' clause for user's own data
        const q = query(quizzesCollectionRef);

        // Set up a real-time listener for quizzes
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedQuizzes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setQuizzes(fetchedQuizzes);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching quizzes:", error);
            setMessage("Failed to load quizzes. Please try again.");
            setLoading(false);
        });

        // Cleanup the listener on component unmount
        return () => unsubscribe();
    }, [db, userId]); // Re-run when db or userId changes

    // Handle deleting a quiz
    const handleDeleteQuiz = async () => {
        if (!quizToDelete) return;

        try {
            // Construct the document path for the specific quiz to delete
            const quizDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/quizzes`, quizToDelete.id);
            await deleteDoc(quizDocRef);
            setMessage(`Quiz "${quizToDelete.title}" deleted successfully!`);
            setQuizToDelete(null); // Clear the quiz to delete state
            setShowDeleteConfirm(false); // Hide the confirmation modal
        } catch (error) {
            console.error("Error deleting quiz:", error);
            setMessage(`Failed to delete quiz "${quizToDelete.title}". Please try again.`);
        }
    };

    const confirmDelete = (quiz) => {
        setQuizToDelete(quiz);
        setShowDeleteConfirm(true);
    };

    const cancelDelete = () => {
        setQuizToDelete(null);
        setShowDeleteConfirm(false);
    };

    const handleTakeQuiz = (quizId) => {
        setSelectedQuizId(quizId);
        setCurrentView('take-quiz');
    };

    // Placeholder for editing a quiz (future implementation)
    const handleEditQuiz = (quizId) => {
        // For now, we'll just log it. In a real app, you'd navigate to QuizBuilder with the quizId
        console.log("Edit quiz:", quizId);
        setSelectedQuizId(quizId); // Set for editing
        setCurrentView('quiz-builder'); // Navigate to quiz builder to edit
    };


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
                    <p className="mt-4 text-gray-700">Loading quizzes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 sm:p-8">
            <header className="w-full max-w-4xl flex justify-between items-center py-4 px-6 bg-white shadow-md rounded-lg mb-8">
                <button
                    onClick={() => setCurrentView('home')}
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition duration-150 ease-in-out text-sm"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                </button>
                <h1 className="text-3xl font-bold text-gray-900">My Quizzes</h1>
                <button
                    onClick={() => setCurrentView('quiz-builder')}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out text-sm"
                >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create New Quiz
                </button>
            </header>

            <main className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
                {message && (
                    <div className={`mb-6 p-3 rounded-md text-center text-sm font-medium ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                {quizzes.length === 0 ? (
                    <div className="text-center text-gray-600 py-10">
                        <p className="text-lg mb-4">No quizzes created yet.</p>
                        <button
                            onClick={() => setCurrentView('quiz-builder')}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <PlusCircle className="h-5 w-5 mr-3" />
                            Start Creating Your First Quiz!
                        </button>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {quizzes.map((quiz) => (
                            <li
                                key={quiz.id}
                                className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0"
                            >
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{quiz.title}</h3>
                                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{quiz.description}</p>
                                    <p className="text-gray-500 text-xs">
                                        Questions: {quiz.questions ? quiz.questions.length : 0} |
                                        Time Limit: {quiz.timeLimit ? `${quiz.timeLimit} min` : 'No limit'}
                                    </p>
                                </div>
                                <div className="flex space-x-3 items-center ml-0 sm:ml-4">
                                    <button
                                        onClick={() => handleTakeQuiz(quiz.id)}
                                        className="flex items-center p-2 rounded-full bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out shadow-md"
                                        title="Take Quiz"
                                    >
                                        <PlayCircle className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleEditQuiz(quiz.id)}
                                        className="flex items-center p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out shadow-md"
                                        title="Edit Quiz"
                                    >
                                        <Edit className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => confirmDelete(quiz)}
                                        className="flex items-center p-2 rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out shadow-md"
                                        title="Delete Quiz"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete the quiz "<span className="font-bold">{quizToDelete?.title}</span>"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteQuiz}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizList;

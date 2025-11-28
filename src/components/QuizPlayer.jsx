import React, { useState, useEffect } from 'react';
import { quizService } from '../services/quizService';
import { X, CheckCircle, XCircle, ChevronRight, Trophy, RotateCcw, Home } from 'lucide-react';
import './QuizPlayer.css';

const QuizPlayer = ({ quiz, onClose, onComplete }) => {
  const [quizData, setQuizData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuiz();
  }, [quiz.id, loadQuiz]);

  const loadQuiz = async () => {
    try {
      const data = await quizService.getQuizWithQuestions(quiz.id);
      setQuizData(data);
    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (answer) => {
    if (!showResult) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const currentQ = quizData.questions[currentQuestion];
    const isCorrect = selectedAnswer === currentQ.answer;
    
    const answerData = {
      questionId: currentQ.id,
      question: currentQ.question,
      userAnswer: selectedAnswer,
      correctAnswer: currentQ.answer,
      isCorrect,
      explanation: currentQ.explanation,
      points: isCorrect ? currentQ.points : 0
    };

    setUserAnswers([...userAnswers, answerData]);
    if (isCorrect) {
      setScore(score + currentQ.points);
    }
    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    try {
      await quizService.saveQuizAttempt(
        quiz.id,
        score,
        quizData.questions.length,
        userAnswers
      );
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
    }

    setQuizCompleted(true);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setShowResult(false);
    setQuizCompleted(false);
    setScore(0);
  };

  const getScorePercentage = () => {
    return Math.round((score / quizData.questions.length) * 100);
  };

  const getScoreMessage = () => {
    const percentage = getScorePercentage();
    if (percentage >= 90) return { text: 'Excellent ! 🎉', color: '#10b981' };
    if (percentage >= 70) return { text: 'Très bien ! 👏', color: '#3b82f6' };
    if (percentage >= 50) return { text: 'Bien ! 👍', color: '#f59e0b' };
    return { text: 'Continuez à réviser ! 💪', color: '#ef4444' };
  };

  if (loading) {
    return (
      <div className="quiz-player-overlay">
        <div className="quiz-player">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Chargement du quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return null;
  }

  const currentQ = quizData.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;

  return (
    <div className="quiz-player-overlay" onClick={onClose}>
      <div className="quiz-player" onClick={(e) => e.stopPropagation()}>
        {!quizCompleted ? (
          <>
            {/* Header */}
            <div className="quiz-player-header">
              <div className="quiz-info">
                <h2>{quiz.title}</h2>
                <p>
                  Question {currentQuestion + 1} / {quizData.questions.length}
                </p>
              </div>
              <button className="btn-icon btn-close" onClick={onClose}>
                <X size={24} />
              </button>
            </div>

            {/* Progress */}
            <div className="quiz-progress-bar">
              <div 
                className="quiz-progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Question */}
            <div className="quiz-question-container">
              <div className="question-header">
                <div className="question-number">Q{currentQuestion + 1}</div>
                <div className="question-points">{currentQ.points} pt{currentQ.points > 1 ? 's' : ''}</div>
              </div>

              <h3 className="question-text">{currentQ.question}</h3>

              {/* Options */}
              <div className="options-container">
                {currentQ.options && currentQ.options.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = option === currentQ.answer;
                  let optionClass = 'option-button';
                  
                  if (showResult) {
                    if (isCorrect) {
                      optionClass += ' correct';
                    } else if (isSelected && !isCorrect) {
                      optionClass += ' incorrect';
                    }
                  } else if (isSelected) {
                    optionClass += ' selected';
                  }

                  return (
                    <button
                      key={index}
                      className={optionClass}
                      onClick={() => handleSelectAnswer(option)}
                      disabled={showResult}
                    >
                      <span className="option-letter">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="option-text">{option}</span>
                      {showResult && isCorrect && <CheckCircle size={20} />}
                      {showResult && isSelected && !isCorrect && <XCircle size={20} />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showResult && currentQ.explanation && (
                <div className={`explanation ${userAnswers[userAnswers.length - 1]?.isCorrect ? 'correct' : 'incorrect'}`}>
                  <strong>Explication :</strong>
                  <p>{currentQ.explanation}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="quiz-actions">
              {!showResult ? (
                <button
                  className="btn btn-primary btn-large"
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                >
                  Valider
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-large"
                  onClick={handleNextQuestion}
                >
                  {currentQuestion < quizData.questions.length - 1 ? (
                    <>
                      Question suivante
                      <ChevronRight size={20} />
                    </>
                  ) : (
                    <>
                      Voir les résultats
                      <Trophy size={20} />
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        ) : (
          /* Results Screen */
          <div className="quiz-results">
            <button className="btn-icon btn-close" onClick={onClose}>
              <X size={24} />
            </button>

            <div className="results-icon">
              <Trophy size={64} />
            </div>

            <h2>Quiz terminé !</h2>
            
            <div 
              className="score-display"
              style={{ borderColor: getScoreMessage().color }}
            >
              <div className="score-number" style={{ color: getScoreMessage().color }}>
                {score} / {quizData.questions.length}
              </div>
              <div className="score-percentage">
                {getScorePercentage()}%
              </div>
              <div className="score-message" style={{ color: getScoreMessage().color }}>
                {getScoreMessage().text}
              </div>
            </div>

            <div className="results-summary">
              <div className="summary-item">
                <CheckCircle size={20} color="#10b981" />
                <span>{userAnswers.filter(a => a.isCorrect).length} bonnes réponses</span>
              </div>
              <div className="summary-item">
                <XCircle size={20} color="#ef4444" />
                <span>{userAnswers.filter(a => !a.isCorrect).length} mauvaises réponses</span>
              </div>
            </div>

            <div className="results-actions">
              <button className="btn btn-secondary" onClick={handleRestart}>
                <RotateCcw size={18} />
                Recommencer
              </button>
              <button className="btn btn-primary" onClick={() => {
                onComplete();
                onClose();
              }}>
                <Home size={18} />
                Retour
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPlayer;

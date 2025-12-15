import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { quizService } from '../services/quizService';
import { Play, Trash2, Edit, Trophy, Clock, Target, TrendingUp, FileText, Layers, X, AlertTriangle } from 'lucide-react';
import './QuizList.css';

const QuizList = ({ subjectId, section, onPlayQuiz, onPlayFlashcard, filterType = null }) => {
  const { isAdmin } = useApp();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [quizStats, setQuizStats] = useState({});
  const [userBestScores, setUserBestScores] = useState({});

  // Ajouter/retirer la classe modal-open au body quand le modal de confirmation est ouvert
  useEffect(() => {
    if (deleteConfirm) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [deleteConfirm]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await quizService.getQuizzesBySubject(subjectId, section);
      // Filtrer si un type est spécifié
      const filteredData = filterType
        ? data.filter(q => q.type === filterType)
        : data;

      setQuizzes(filteredData);

      // Charger les statistiques et meilleurs scores pour chaque quiz
      // Utiliser Promise.allSettled pour ne pas bloquer si une requête échoue
      const statsPromises = filteredData.map(async (quiz) => {
        try {
          const stats = await quizService.getQuizStats(quiz.id);
          const bestScore = await quizService.getBestScore(quiz.id);

          setQuizStats(prev => ({ ...prev, [quiz.id]: stats }));
          setUserBestScores(prev => ({ ...prev, [quiz.id]: bestScore }));
        } catch (error) {
          console.warn(`Error loading stats for quiz ${quiz.id}:`, error);
          // Définir des valeurs par défaut en cas d'erreur
          setQuizStats(prev => ({ ...prev, [quiz.id]: { total_attempts: 0, average_score: 0, best_score: 0, completion_rate: 0 } }));
          setUserBestScores(prev => ({ ...prev, [quiz.id]: null }));
        }
      });

      await Promise.allSettled(statsPromises);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [subjectId, section, filterType]);

  const handleDelete = async (quizId) => {
    try {
      await quizService.deleteQuiz(quizId);
      setQuizzes(quizzes.filter(q => q.id !== quizId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Erreur lors de la suppression du quiz');
    }
  };

  const handlePlay = (quiz) => {
    if (quiz.type === 'flashcard') {
      onPlayFlashcard(quiz);
    } else {
      onPlayQuiz(quiz);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#10b981'; // Vert
    if (percentage >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Rouge
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Chargement des {filterType === 'flashcard' ? 'flashcards' : 'quiz'}...</p>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="empty-state scale-in">
        <p>Aucun {filterType === 'flashcard' ? 'flashcard' : 'quiz'} pour le moment</p>
      </div>
    );
  }

  return (
    <>
      <div className="quiz-list">
        {quizzes.map((quiz, index) => {
          const stats = quizStats[quiz.id] || {};
          const bestScore = userBestScores[quiz.id];
          const hasPlayed = bestScore !== null && bestScore !== undefined;
          const scorePercentage = hasPlayed
            ? Math.round((bestScore.score / bestScore.total_questions) * 100)
            : 0;

          return (
            <div
              key={quiz.id}
              className="quiz-card card fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="quiz-header">
                <div className="quiz-type-badge" data-type={quiz.type}>
                  {quiz.type === 'quiz' ? (
                    <>
                      <FileText size={16} />
                      <span>Quiz</span>
                    </>
                  ) : (
                    <>
                      <Layers size={16} />
                      <span>Flashcards</span>
                    </>
                  )}
                </div>
                {hasPlayed && (
                  <div
                    className="score-badge"
                    style={{ backgroundColor: getScoreColor(scorePercentage) }}
                  >
                    <Trophy size={14} />
                    {scorePercentage}%
                  </div>
                )}
              </div>

              <div className="quiz-content">
                <h3>{quiz.title}</h3>
                {quiz.description && (
                  <p className="quiz-description">{quiz.description}</p>
                )}

                <div className="quiz-meta">
                  <div className="meta-item">
                    <Target size={16} />
                    <span>{stats.total_attempts || 0} tentatives</span>
                  </div>
                  {stats.average_score > 0 && (
                    <div className="meta-item">
                      <TrendingUp size={16} />
                      <span>Moy. {stats.average_score}%</span>
                    </div>
                  )}
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>{new Date(quiz.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>

              <div className="quiz-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handlePlay(quiz)}
                >
                  <Play size={18} />
                  {hasPlayed ? 'Rejouer' : 'Commencer'}
                </button>

                {isAdmin() && (
                  <button
                    className="btn-icon"
                    onClick={() => setDeleteConfirm(quiz.id)}
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {deleteConfirm && (
        <div className="modal-overlay mobile-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal mobile-modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header mobile-modal-header">
              <h2>Confirmer la suppression</h2>
              <button className="btn-icon mobile-close-btn" onClick={() => setDeleteConfirm(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body mobile-modal-body">
              <div className="confirm-content">
                <div className="alert-icon">
                  <AlertTriangle size={56} strokeWidth={2.5} />
                </div>
                <div className="confirm-text">
                  <p className="confirm-question">Supprimer ce quiz ?</p>
                  <p className="warning-text">
                    Toutes les questions et les tentatives seront supprimées.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer mobile-modal-footer">
              <button
                className="btn btn-secondary mobile-btn"
                onClick={() => setDeleteConfirm(null)}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger mobile-btn"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuizList;

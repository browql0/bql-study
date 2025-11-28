import React, { useState, useEffect } from 'react';
import { quizService } from '../services/quizService';
import { X, ChevronLeft, ChevronRight, RotateCw, Shuffle } from 'lucide-react';
import './FlashcardViewer.css';

const FlashcardViewer = ({ quiz, onClose }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [masteredCards, setMasteredCards] = useState(new Set());

  useEffect(() => {
    loadFlashcards();
  }, [quiz.id]);

  const loadFlashcards = async () => {
    try {
      const data = await quizService.getQuizWithQuestions(quiz.id);
      setFlashcards(data.questions || []);
    } catch (error) {
      console.error('Error loading flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleMastered = () => {
    const newMastered = new Set(masteredCards);
    if (masteredCards.has(currentIndex)) {
      newMastered.delete(currentIndex);
    } else {
      newMastered.add(currentIndex);
    }
    setMasteredCards(newMastered);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === ' ') {
      e.preventDefault();
      handleFlip();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (loading) {
    return (
      <div className="flashcard-overlay">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des flashcards...</p>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flashcard-overlay" onClick={onClose}>
        <div className="flashcard-container" onClick={(e) => e.stopPropagation()}>
          <div className="empty-state">
            <p>Aucune flashcard disponible</p>
            <button className="btn btn-primary" onClick={onClose}>
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;
  const isMastered = masteredCards.has(currentIndex);

  return (
    <div className="flashcard-overlay" onClick={onClose}>
      <div className="flashcard-container" onClick={(e) => e.stopPropagation()}>
        <div className="flashcard-header">
          <div className="flashcard-info">
            <h2>{quiz.title}</h2>
            <p>
              Carte {currentIndex + 1} / {flashcards.length}
              {masteredCards.size > 0 && (
                <span className="mastered-count">
                  • {masteredCards.size} maîtrisée{masteredCards.size > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="header-actions">
            <button 
              className="btn-icon" 
              onClick={handleShuffle}
              title="Mélanger"
            >
              <Shuffle size={20} />
            </button>
            <button className="btn-icon" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flashcard-progress">
          <div 
            className="flashcard-progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flashcard-wrapper">
          <div 
            className={`flashcard ${isFlipped ? 'is-flipped' : ''}`}
            onClick={handleFlip}
          >
            <div className="flashcard-inner">
              <div className="flashcard-side flashcard-front">
                <div className="card-badge">Question</div>
                <div className="card-text">{currentCard.question}</div>
                <div className="flip-indicator">
                  <RotateCw size={18} />
                  <span>Cliquez pour voir la réponse</span>
                </div>
              </div>
              
              <div className="flashcard-side flashcard-back">
                <div className="card-badge">Réponse</div>
                <div className="card-text">{currentCard.answer}</div>
                {currentCard.explanation && (
                  <div className="card-note">
                    <strong>💡 Explication :</strong>
                    <p>{currentCard.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flashcard-controls">
          <button
            className="btn btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={20} />
            Précédent
          </button>

          <button
            className={`btn ${isMastered ? 'btn-success' : 'btn-secondary'}`}
            onClick={(e) => {
              e.stopPropagation();
              handleMastered();
            }}
          >
            {isMastered ? '✓ Maîtrisée' : 'Marquer maîtrisée'}
          </button>

          <button
            className="btn btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={currentIndex === flashcards.length - 1}
          >
            Suivant
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flashcard-dots">
          {flashcards.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''} ${masteredCards.has(index) ? 'mastered' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
                setIsFlipped(false);
              }}
              title={`Carte ${index + 1}`}
            />
          ))}
        </div>

        <div className="keyboard-hints">
          <span>← →</span> Navigation
          <span>Espace</span> Retourner
        </div>
      </div>
    </div>
  );
};

export default FlashcardViewer;

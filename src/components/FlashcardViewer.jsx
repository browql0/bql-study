import React, { useState, useEffect } from 'react';
import { quizService } from '../services/quizService';
import { X, ChevronLeft, ChevronRight, RotateCw, Shuffle, Check, Flag } from 'lucide-react';
import './FlashcardViewer.css';

const FlashcardViewer = ({ quiz, onClose }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [masteredCards, setMasteredCards] = useState(new Set());

  useEffect(() => {
    loadFlashcards();
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
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
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150); // Petit délai pour laisser l'anim de flip reset si besoin
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
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
      // Auto advance on master if not last card (optional UX tweak)
      // if (currentIndex < flashcards.length - 1) handleNext();
    }
    setMasteredCards(newMastered);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setIsFlipped(false);
          setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
        }
      }
      if (e.key === 'ArrowRight') {
        if (currentIndex < flashcards.length - 1) {
          setIsFlipped(false);
          setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        }
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, flashcards.length]); // Dependencies stable now

  const renderMarkdown = (text) => {
    if (!text) return '';
    let html = text
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br />');

    return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  if (loading) return null; // Or a spinner

  if (flashcards.length === 0) return null;

  const currentCard = flashcards[currentIndex];
  const isMastered = masteredCards.has(currentIndex);
  const progressPercent = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="fv-overlay">
      <div className="fv-backdrop" onClick={onClose} />

      <div className="fv-container">

        {/* HEADER */}
        <div className="fv-header">
          <div className="fv-header-left">
            <h2 className="fv-title">{quiz.title}</h2>
            <div className="fv-subtitle">
              <span>Correction</span>
              <span className="fv-dot">•</span>
              <span>{currentIndex + 1} sur {flashcards.length}</span>
            </div>
          </div>
          <div className="fv-header-right">
            <button className="fv-icon-btn" onClick={handleShuffle} title="Mélanger">
              <Shuffle size={20} />
            </button>
            <button className="fv-icon-btn" onClick={onClose} title="Fermer">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="fv-progress-track">
          <div className="fv-progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* MAIN STAGE */}
        <div className="fv-stage">

          {/* Nav Left */}
          <button
            className="fv-nav-btn prev"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={32} />
          </button>

          {/* CARD */}
          <div className="fv-card-wrapper">
            <div
              className={`fv-card ${isFlipped ? 'flipped' : ''}`}
              onClick={handleFlip}
            >
              {/* FRONT */}
              <div className="fv-face fv-front">
                <div className="fv-face-header">Question</div>
                <div className="fv-face-content">
                  {renderMarkdown(currentCard.question)}
                </div>
                <div className="fv-tap-hint">
                  <RotateCw size={14} /> Cliquez pour retourner
                </div>
              </div>

              {/* BACK */}
              <div className="fv-face fv-back">
                <div className="fv-face-header">Réponse</div>
                <div className="fv-face-content">
                  {renderMarkdown(currentCard.answer)}
                  {currentCard.explanation && (
                    <div className="fv-explanation">
                      <strong>Explication:</strong>
                      {renderMarkdown(currentCard.explanation)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Nav Right */}
          <button
            className="fv-nav-btn next"
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1}
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="fv-footer">
          <button
            className={`fv-action-btn ${isMastered ? 'mastered' : ''}`}
            onClick={handleMastered}
          >
            {isMastered ? <Check size={20} /> : <Flag size={20} />}
            <span>{isMastered ? 'Maîtrisée' : 'Marquer à revoir'}</span>
          </button>

          {/* Optional: Add "Edit" or "Report" buttons here later */}
        </div>

      </div>
    </div>
  );
};

export default FlashcardViewer;

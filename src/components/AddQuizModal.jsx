import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, FileText, Layers, Sparkles } from 'lucide-react';
import './AddQuizModal.css';

const AddQuizModal = ({ subjectId, section, onClose, onSave, initialType = null }) => {
  const [quizType, setQuizType] = useState(initialType || 'quiz');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', answer: '', options: ['', '', '', ''], explanation: '', points: 1 }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const addQuestion = () => {
    const newIndex = questions.length;
    setQuestions([
      ...questions,
      { question: '', answer: '', options: ['', '', '', ''], explanation: '', points: 1 }
    ]);

    setTimeout(() => {
      const questionsList = document.querySelector('.questions-list');
      const newQuestionCard = document.querySelectorAll('.question-card')[newIndex];
      if (questionsList && newQuestionCard) {
        newQuestionCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const firstInput = newQuestionCard.querySelector('textarea, input');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 300);
        }
      }
    }, 100);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (questions.length === 0) {
      setError('Ajoutez au moins une question');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim() || !q.answer.trim()) {
        setError(`Question ${i + 1}: La question et la réponse sont requises`);
        return;
      }

      if (quizType === 'quiz') {
        const filledOptions = q.options.filter(opt => opt.trim() !== '');
        if (filledOptions.length < 2) {
          setError(`Question ${i + 1}: Au moins 2 options sont requises pour un quiz`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      const quizData = {
        title: title.trim(),
        description: description.trim(),
        type: quizType,
        questions: questions.map(q => ({
          question: q.question.trim(),
          answer: q.answer.trim(),
          options: quizType === 'quiz' ? q.options.filter(opt => opt.trim() !== '') : null,
          explanation: q.explanation?.trim() || null,
          points: parseInt(q.points) || 1
        }))
      };

      await onSave(subjectId, section, quizData);
      onClose();
    } catch (err) {
      setError('Erreur lors de la création du quiz');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quiz-modal-overlay mobile-modal-overlay" onClick={onClose}>
      <div className="quiz-modal-container mobile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="quiz-modal-header">
          <div className="quiz-modal-header-content">
            <div className="quiz-modal-title-section">
              <Sparkles className="quiz-modal-icon" size={32} />
              <h2>Créer un {quizType === 'quiz' ? 'Quiz' : 'Flashcard'}</h2>
            </div>
            <button className="quiz-modal-close" onClick={onClose} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="quiz-modal-body">
          {error && (
            <div className="quiz-error-alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selection - Only show if no initialType provided */}
          {!initialType && (
            <section className="quiz-section">
              <div className="quiz-section-label">
                <span className="quiz-section-number">01</span>
                <h3>Type de contenu</h3>
              </div>
              <div className="quiz-type-buttons">
                <button
                  type="button"
                  className={`quiz-type-button ${quizType === 'quiz' ? 'active' : ''}`}
                  onClick={() => setQuizType('quiz')}
                >
                  <FileText size={24} />
                  <div>
                    <div className="quiz-type-button-title">Quiz (QCM)</div>
                    <div className="quiz-type-button-desc">Questions à choix multiples</div>
                  </div>
                </button>
                <button
                  type="button"
                  className={`quiz-type-button ${quizType === 'flashcard' ? 'active' : ''}`}
                  onClick={() => setQuizType('flashcard')}
                >
                  <Layers size={24} />
                  <div>
                    <div className="quiz-type-button-title">Flashcards</div>
                    <div className="quiz-type-button-desc">Cartes de mémorisation</div>
                  </div>
                </button>
              </div>
            </section>
          )}

          {/* Basic Info */}
          <section className="quiz-section">
            <div className="quiz-section-label">
              <span className="quiz-section-number">{initialType ? '01' : '02'}</span>
              <h3>Informations de base</h3>
            </div>
            <div className="quiz-form-grid">
              <div className="quiz-form-field">
                <label>Titre *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Quiz Chapitre 1 - Les bases de la chimie"
                  required
                />
              </div>
              <div className="quiz-form-field">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ajoutez une description pour ce quiz..."
                  rows="4"
                />
              </div>
            </div>
          </section>

          {/* Questions */}
          <section className="quiz-section">
            <div className="quiz-section-header">
              <div className="quiz-section-label">
                <span className="quiz-section-number">03</span>
                <h3>Questions <span className="quiz-count-badge">{questions.length}</span></h3>
              </div>
              <button
                type="button"
                className="quiz-add-question-btn"
                onClick={addQuestion}
              >
                <Plus size={20} />
                Ajouter une question
              </button>
            </div>

            <div className="questions-list">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="question-card">
                  <div className="question-card-header">
                    <div className="question-card-number">
                      <span>{qIndex + 1}</span>
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        className="question-delete-btn"
                        onClick={() => removeQuestion(qIndex)}
                        aria-label="Supprimer la question"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="question-card-content">
                    <div className="question-form-field">
                      <label>Question *</label>
                      <textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        placeholder={quizType === 'quiz' ? 'Ex: Quelle est la capitale de la France ?' : 'Recto de la carte'}
                        rows="3"
                        required
                      />
                    </div>

                    {quizType === 'quiz' && (
                      <div className="question-form-field">
                        <label>Options de réponse *</label>
                        <div className="options-grid">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="option-field">
                              <span className="option-label">{String.fromCharCode(65 + oIndex)}</span>
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="question-form-field">
                      <label>
                        {quizType === 'quiz' ? 'Bonne réponse *' : 'Réponse (verso) *'}
                      </label>
                      <textarea
                        value={question.answer}
                        onChange={(e) => updateQuestion(qIndex, 'answer', e.target.value)}
                        placeholder={quizType === 'quiz' ? 'Ex: Paris (doit correspondre exactement à une option)' : 'Verso de la carte'}
                        rows="3"
                        required
                      />
                    </div>

                    <div className="question-form-field">
                      <label>Explication</label>
                      <textarea
                        value={question.explanation}
                        onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                        placeholder="Ajoutez une explication détaillée..."
                        rows="3"
                      />
                    </div>

                    {quizType === 'quiz' && (
                      <div className="question-form-field question-points-field">
                        <label>Points</label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => updateQuestion(qIndex, 'points', e.target.value)}
                          min="1"
                          className="points-input"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="quiz-modal-footer">
            <button
              type="button"
              className="quiz-modal-btn quiz-modal-btn-secondary"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="quiz-modal-btn quiz-modal-btn-primary"
              disabled={saving}
            >
              {saving ? 'Création en cours...' : 'Créer le quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddQuizModal;

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Trash2, AlertCircle, Brain, Sparkles,
  Bold, Italic, List, Code, Eye, Image as ImageIcon, Link, Minus
} from 'lucide-react';
import './AddQuizModal.css';

// Composant interne pour l'éditeur Markdown simplifié (identique à AddFlashcardModal)
const MarkdownField = ({ label, value, onChange, placeholder, required = false }) => {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);

  const insertMarkdown = (before, after = '', placeholderText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholderText;

    // Pour le code multiligne
    if (before === '`' && after === '`' && (textToInsert.includes('\n') || (!selectedText && placeholderText))) {
      const codeBlock = '\n```\n' + (textToInsert || 'votre code ici') + '\n```\n';
      const newText = value.substring(0, start) + codeBlock + value.substring(end);
      onChange(newText);
      setTimeout(() => {
        textarea.focus();
        const cursorPos = start + 5;
        textarea.setSelectionRange(cursorPos, cursorPos + (textToInsert || 'votre code ici').length);
      }, 0);
      return;
    }

    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + (selectedText ? selectedText.length : 0);
      textarea.setSelectionRange(newCursorPos, newCursorPos + (placeholderText && !selectedText ? placeholderText.length : 0));
    }, 0);
  };

  const renderPreview = () => {
    if (!value) return <p className="markdown-preview" style={{ opacity: 0.5 }}>Aucun contenu</p>;

    let html = value
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%" />')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br />');

    return <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="question-form-field">
      <div className="editor-header">
        <label>{label} {required && '*'}</label>
        <button
          type="button"
          className={`preview-toggle-btn ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye size={14} />
          {showPreview ? 'Éditer' : 'Aperçu'}
        </button>
      </div>

      <div className="markdown-editor-container">
        {!showPreview && (
          <div className="markdown-editor-toolbar">
            <div className="toolbar-group">
              <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('**', '**', 'gras')} title="Gras">
                <Bold size={16} />
              </button>
              <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('*', '*', 'italique')} title="Italique">
                <Italic size={16} />
              </button>
              <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('`', '`', 'code')} title="Code">
                <Code size={16} />
              </button>
            </div>
            <div className="toolbar-divider"></div>
            <div className="toolbar-group">
              <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('- ', '', 'liste')} title="Liste">
                <List size={16} />
              </button>
              <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('[', '](url)', 'lien')} title="Lien">
                <Link size={16} />
              </button>
              <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('![', '](url)', 'image')} title="Image">
                <ImageIcon size={16} />
              </button>
            </div>
          </div>
        )}

        {showPreview ? (
          <div className="markdown-preview-container">
            {renderPreview()}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows="4"
            required={required}
            className="markdown-textarea"
          />
        )}
      </div>
    </div>
  );
};

const AddQuizModal = ({ subjectId, section, onClose, onSave }) => {
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

      const filledOptions = q.options.filter(opt => opt.trim() !== '');
      if (filledOptions.length < 2) {
        setError(`Question ${i + 1}: Au moins 2 options sont requises pour un quiz`);
        return;
      }
    }

    setSaving(true);

    try {
      const quizData = {
        title: title.trim(),
        description: description.trim(),
        type: 'quiz',
        questions: questions.map(q => ({
          question: q.question.trim(),
          answer: q.answer.trim(),
          options: q.options.filter(opt => opt.trim() !== ''),
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
              <Brain className="quiz-modal-icon" size={32} />
              <h2>Créer un Quiz (QCM)</h2>
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

          {/* Basic Info */}
          <section className="quiz-section">
            <div className="quiz-section-label">
              <span className="quiz-section-number">01</span>
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
                  className="simple-textarea"
                />
              </div>
            </div>
          </section>

          {/* Questions */}
          <section className="quiz-section">
            <div className="quiz-section-header">
              <div className="quiz-section-label">
                <span className="quiz-section-number">02</span>
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
                    {/* Markdown Question */}
                    <MarkdownField
                      label="Question"
                      value={question.question}
                      onChange={(val) => updateQuestion(qIndex, 'question', val)}
                      placeholder="Ex: Quelle est la capitale de la France ?"
                      required={true}
                    />

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

                    <div className="question-form-field">
                      <label>Bonne réponse (copier exactement une option) *</label>
                      <textarea
                        value={question.answer}
                        onChange={(e) => updateQuestion(qIndex, 'answer', e.target.value)}
                        placeholder="Ex: Paris"
                        rows="2"
                        className="simple-textarea"
                        required
                      />
                    </div>

                    {/* Markdown Explanation */}
                    <MarkdownField
                      label="Explication (affichée après réponse)"
                      value={question.explanation}
                      onChange={(val) => updateQuestion(qIndex, 'explanation', val)}
                      placeholder="Ajoutez une explication détaillée..."
                    />

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
              {saving ? 'Création en cours...' : `Créer le quiz (${questions.length} question${questions.length > 1 ? 's' : ''})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddQuizModal;

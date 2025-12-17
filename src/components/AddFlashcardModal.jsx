import React, { useState, useEffect, useRef } from 'react';
import {
    X, Plus, Trash2, AlertCircle, Layers, Sparkles,
    Bold, Italic, List, Code, Eye, Image as ImageIcon, Link, Minus
} from 'lucide-react';
import './AddQuizModal.css';

// Composant interne pour l'éditeur Markdown simplifié
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

const AddFlashcardModal = ({ subjectId, section, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [cards, setCards] = useState([
        { question: '', answer: '', explanation: '' }
    ]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.classList.add('modal-open');
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, []);

    const addCard = () => {
        const newIndex = cards.length;
        setCards([
            ...cards,
            { question: '', answer: '', explanation: '' }
        ]);

        setTimeout(() => {
            const cardsList = document.querySelector('.questions-list');
            const newCard = document.querySelectorAll('.question-card')[newIndex];
            if (cardsList && newCard) {
                newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    };

    const removeCard = (index) => {
        setCards(cards.filter((_, i) => i !== index));
    };

    const updateCard = (index, field, value) => {
        const newCards = [...cards];
        newCards[index][field] = value;
        setCards(newCards);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Le titre est requis');
            return;
        }

        if (cards.length === 0) {
            setError('Ajoutez au moins une carte');
            return;
        }

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            if (!card.question.trim() || !card.answer.trim()) {
                setError(`Carte ${i + 1}: Question et Réponse requises`);
                return;
            }
        }

        setSaving(true);

        try {
            const flashcardData = {
                title: title.trim(),
                description: description.trim(),
                type: 'flashcard',
                questions: cards.map(card => ({
                    question: card.question.trim(),
                    answer: card.answer.trim(),
                    options: null,
                    explanation: card.explanation?.trim() || null,
                    points: 1
                }))
            };

            await onSave(subjectId, section, flashcardData);
            onClose();
        } catch (err) {
            setError('Erreur lors de la création de la flashcard');
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
                            <Layers className="quiz-modal-icon" size={32} />
                            <h2>Créer des Flashcards</h2>
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
                            <h3>Informations générales</h3>
                        </div>
                        <div className="quiz-form-grid">
                            <div className="quiz-form-field">
                                <label>Titre *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Vocabulaire Anglais - Chapitre 1"
                                    required
                                />
                            </div>
                            <div className="quiz-form-field">
                                <label>Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ajoutez une description pour ces flashcards..."
                                    rows="3"
                                    className="simple-textarea"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Flashcards */}
                    <section className="quiz-section">
                        <div className="quiz-section-header">
                            <div className="quiz-section-label">
                                <span className="quiz-section-number">02</span>
                                <h3>Cartes <span className="quiz-count-badge">{cards.length}</span></h3>
                            </div>
                            <button
                                type="button"
                                className="quiz-add-question-btn"
                                onClick={addCard}
                            >
                                <Plus size={20} />
                                Ajouter une carte
                            </button>
                        </div>

                        <div className="questions-list">
                            {cards.map((card, index) => (
                                <div key={index} className="question-card">
                                    <div className="question-card-header">
                                        <div className="question-card-number">
                                            <span>{index + 1}</span>
                                        </div>
                                        {cards.length > 1 && (
                                            <button
                                                type="button"
                                                className="question-delete-btn"
                                                onClick={() => removeCard(index)}
                                                aria-label="Supprimer la carte"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="question-card-content">
                                        <MarkdownField
                                            label="Recto (Question)"
                                            value={card.question}
                                            onChange={(val) => updateCard(index, 'question', val)}
                                            placeholder="Ex: What is the capital of France?"
                                            required={true}
                                        />

                                        <MarkdownField
                                            label="Verso (Réponse)"
                                            value={card.answer}
                                            onChange={(val) => updateCard(index, 'answer', val)}
                                            placeholder="Ex: Paris"
                                            required={true}
                                        />

                                        <MarkdownField
                                            label="Explication (Extra)"
                                            value={card.explanation}
                                            onChange={(val) => updateCard(index, 'explanation', val)}
                                            placeholder="Ajoutez du contexte (optionnel)..."
                                        />
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
                            {saving ? 'Création...' : `Créer ${cards.length} carte${cards.length > 1 ? 's' : ''}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddFlashcardModal;

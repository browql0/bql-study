import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { 
  X, Bold, Italic, List, Code, Heading1, Heading2, Heading3,
  Link, Image, Quote, ListOrdered, Table, Minus, Eye
} from 'lucide-react';
import './AddNoteModal.css';

const AddNoteModal = ({ subjectId, section, onClose }) => {
  const { addNote } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const insertMarkdown = (before, after = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    // Pour le code, si c'est multiligne ou contient des sauts de ligne, utiliser des backticks triples
    if (before === '`' && after === '`' && (textToInsert.includes('\n') || (!selectedText && placeholder))) {
      const codeBlock = '\n```\n' + (textToInsert || 'votre code ici') + '\n```\n';
      const newText = content.substring(0, start) + codeBlock + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        const cursorPos = start + 5; // Position après ```\n
        textarea.setSelectionRange(cursorPos, cursorPos + (textToInsert || 'votre code ici').length);
      }, 0);
      return;
    }
    
    const newText = content.substring(0, start) + before + textToInsert + after + content.substring(end);
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + (selectedText ? selectedText.length : 0);
      textarea.setSelectionRange(newCursorPos, newCursorPos + (placeholder && !selectedText ? placeholder.length : 0));
    }, 0);
  };

  const insertTable = () => {
    const tableMarkdown = '\n| Colonne 1 | Colonne 2 | Colonne 3 |\n|-----------|-----------|------------|\n| Cellule 1 | Cellule 2 | Cellule 3 |\n| Cellule 4 | Cellule 5 | Cellule 6 |\n';
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const newText = content.substring(0, start) + tableMarkdown + content.substring(start);
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tableMarkdown.length, start + tableMarkdown.length);
    }, 0);
  };

  const renderPreview = () => {
    if (!content) return <p className="preview-empty">Aucun contenu à prévisualiser</p>;
    
    // Simple markdown to HTML conversion
    let html = content
      // Code blocks (triple backticks) - doit être avant le code inline
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      // Code inline (après les blocs)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Unordered lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Blockquote
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Horizontal rule
      .replace(/^---$/gim, '<hr />')
      // Line breaks
      .replace(/\n/g, '<br />');

    return <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      addNote(subjectId, section, {
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
      });
      onClose();
    }
  };

  return (
    <div className="modal-overlay mobile-modal-overlay" onClick={onClose}>
      <div className="modal mobile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header - Sticky */}
        <div className="modal-header mobile-modal-header">
          <h2>Nouvelle Note</h2>
          <button className="btn-icon mobile-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={24} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <form onSubmit={handleSubmit} className="mobile-modal-form">
          <div className="modal-body mobile-modal-body">
            <div className="form-group">
              <label>Titre *</label>
              <input
                type="text"
                placeholder="Titre de la note..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mobile-input"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="editor-label">
                <span>Contenu *</span>
                <button 
                  type="button" 
                  className={`preview-toggle ${showPreview ? 'active' : ''}`}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye size={16} />
                  {showPreview ? 'Éditer' : 'Aperçu'}
                </button>
              </label>
              
              <div className="markdown-editor-container">
                <div className="markdown-editor-toolbar">
                  <div className="toolbar-group">
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('# ', '', 'Titre 1')}
                      title="Titre 1"
                    >
                      <Heading1 size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('## ', '', 'Titre 2')}
                      title="Titre 2"
                    >
                      <Heading2 size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('### ', '', 'Titre 3')}
                      title="Titre 3"
                    >
                      <Heading3 size={18} />
                    </button>
                  </div>

                  <div className="toolbar-divider"></div>

                  <div className="toolbar-group">
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('**', '**', 'texte en gras')}
                      title="Gras"
                    >
                      <Bold size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('*', '*', 'texte en italique')}
                      title="Italique"
                    >
                      <Italic size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('`', '`', 'code')}
                      title="Code"
                    >
                      <Code size={18} />
                    </button>
                  </div>

                  <div className="toolbar-divider"></div>

                  <div className="toolbar-group">
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('- ', '', 'élément de liste')}
                      title="Liste non ordonnée"
                    >
                      <List size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('1. ', '', 'premier élément')}
                      title="Liste ordonnée"
                    >
                      <ListOrdered size={18} />
                    </button>
                  </div>

                  <div className="toolbar-divider"></div>

                  <div className="toolbar-group">
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('[', '](url)', 'texte du lien')}
                      title="Lien"
                    >
                      <Link size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('![', '](url)', 'alt text')}
                      title="Image"
                    >
                      <Image size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('> ', '', 'citation')}
                      title="Citation"
                    >
                      <Quote size={18} />
                    </button>
                  </div>

                  <div className="toolbar-divider"></div>

                  <div className="toolbar-group">
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={() => insertMarkdown('\n---\n')}
                      title="Ligne horizontale"
                    >
                      <Minus size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="toolbar-btn"
                      onClick={insertTable}
                      title="Tableau"
                    >
                      <Table size={18} />
                    </button>
                  </div>
                </div>

                {!showPreview ? (
                  <textarea
                    ref={textareaRef}
                    id="note-content"
                    placeholder="Écrivez votre note en Markdown...\n\nExemples:\n# Titre principal\n## Sous-titre\n**texte en gras**\n*texte en italique*\n- Liste à puces\n1. Liste numérotée\n[Lien](url)\n![Image](url)\n> Citation\n`code`\n---"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={14}
                    className="markdown-textarea"
                  />
                ) : (
                  <div className="markdown-preview-container">
                    {renderPreview()}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Tags (séparés par des virgules)</label>
              <input
                type="text"
                placeholder="important, examen, révision..."
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mobile-input"
              />
            </div>
          </div>

          {/* Footer - Sticky */}
          <div className="modal-footer mobile-modal-footer">
            <button type="button" className="btn btn-secondary mobile-btn" onClick={onClose}>
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary mobile-btn"
              disabled={!title.trim() || !content.trim()}
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNoteModal;

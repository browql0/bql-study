import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { X, Bold, Italic, List, Code } from 'lucide-react';

const AddNoteModal = ({ subjectId, section, onClose }) => {
  const { addNote } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const insertMarkdown = (before, after = '') => {
    const textarea = document.getElementById('note-content');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
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
              <label>Contenu *</label>
              <div className="mobile-editor-toolbar">
                <button 
                  type="button" 
                  className="mobile-toolbar-btn"
                  onClick={() => insertMarkdown('**', '**')}
                  title="Gras"
                >
                  <Bold size={18} />
                </button>
                <button 
                  type="button" 
                  className="mobile-toolbar-btn"
                  onClick={() => insertMarkdown('*', '*')}
                  title="Italique"
                >
                  <Italic size={18} />
                </button>
                <button 
                  type="button" 
                  className="mobile-toolbar-btn"
                  onClick={() => insertMarkdown('- ')}
                  title="Liste"
                >
                  <List size={18} />
                </button>
                <button 
                  type="button" 
                  className="mobile-toolbar-btn"
                  onClick={() => insertMarkdown('`', '`')}
                  title="Code"
                >
                  <Code size={18} />
                </button>
              </div>
              <textarea
                id="note-content"
                placeholder="Écrivez votre note ici...\n\nAstuces:\n- **gras** pour du texte en gras\n- *italique* pour de l'italique\n- `code` pour du code"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="mobile-textarea"
              />
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

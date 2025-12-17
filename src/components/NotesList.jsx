import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Edit2, Trash2, Calendar, Tag, Eye, EyeOff, AlertTriangle, X, Maximize2 } from 'lucide-react';
import EditNoteModal from './EditNoteModal';
import './NotesList.css';

const NotesList = ({ subjectId, section, notes }) => {
  const { deleteNote, isAdmin } = useApp();
  const [editingNote, setEditingNote] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingNote, setViewingNote] = useState(null);

  useEffect(() => {
    if (viewingNote || deleteConfirm || editingNote) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [viewingNote, deleteConfirm, editingNote]);

  const handleDelete = (noteId) => {
    setDeleteConfirm(noteId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteNote(subjectId, section, deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const toggleExpand = (noteId) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const formatContent = (text) => {
    // Coloration syntaxique simple pour les blocs de code
    const highlightCode = (code) => {
      // Échapper le HTML d'abord
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return escaped
        // Keywords JavaScript/TypeScript
        .replace(/\b(if|else if|else|const|let|var|function|return|for|while|do|switch|case|break|continue|class|extends|import|export|from|default|async|await|try|catch|finally|throw|new|this|super|static|public|private|protected)\b/g, '<span class="keyword">$1</span>')
        // Strings (simple quotes, double quotes, backticks)
        .replace(/(&quot;)(.*?)(&quot;)/g, '<span class="string">&quot;$2&quot;</span>')
        .replace(/(&#39;)(.*?)(&#39;)/g, '<span class="string">&#39;$2&#39;</span>')
        .replace(/(`)(.*?)(`)/g, '<span class="string">`$2`</span>')
        // Numbers
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
        // Comments (// et /* */)
        .replace(/(\/\/.*?)(\n|$)/g, '<span class="comment">$1</span>$2')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
        // Functions (word followed by parenthesis)
        .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="function">$1</span>');
    };

    return text
      // Code blocks (triple backticks) - avec coloration
      .replace(/```([\s\S]*?)```/g, (match, code) => {
        const highlighted = highlightCode(code.trim());
        return `<pre><code>${highlighted}</code></pre>`;
      })
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      // Code inline (après les blocs)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Blockquote
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr />')
      // Wrap lists
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Line breaks - convertir les doubles sauts de ligne en paragraphes
      .replace(/\n\n/g, '</p><p>')
      // Single line breaks
      .replace(/\n/g, '<br>');
  };

  if (notes.length === 0) {
    return (
      <div className="empty-state scale-in">
        <p>Aucune note pour le moment</p>
      </div>
    );
  }

  return (
    <>
      <div className="notes-list">
        {notes.map((note, index) => {
          const isExpanded = expandedNotes.has(note.id);
          return (
            <div
              key={note.id}
              className="note-card card fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="note-header">
                <h3>{note.title}</h3>
                <div className="note-actions">
                  <button
                    className="btn-icon btn-toggle"
                    onClick={() => toggleExpand(note.id)}
                    title={isExpanded ? 'Réduire' : 'Développer'}
                  >
                    {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    className="btn-icon btn-view"
                    onClick={() => setViewingNote(note)}
                    title="Agrandir"
                  >
                    <Maximize2 size={16} />
                  </button>
                  {isAdmin() && (
                    <>
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => setEditingNote(note)}
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDelete(note.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div
                className={`note-content ${isExpanded ? 'expanded' : ''}`}
                dangerouslySetInnerHTML={{ __html: formatContent(note.content) }}
              />

              <div className="note-footer">
                <div className="note-date">
                  <Calendar size={14} />
                  <span>{new Date(note.updatedAt).toLocaleDateString('fr-FR')}</span>
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div className="note-tags">
                    <Tag size={14} />
                    {note.tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingNote && (
        <EditNoteModal
          subjectId={subjectId}
          section={section}
          note={editingNote}
          onClose={() => setEditingNote(null)}
        />
      )}

      {viewingNote && (
        <div className="note-viewer-overlay" onClick={() => setViewingNote(null)}>
          <div className="note-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="note-viewer-header">
              <h3>{viewingNote.title}</h3>
              <button
                className="btn-close-viewer"
                onClick={() => setViewingNote(null)}
                title="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="note-viewer-body">
              <div
                className="note-content expanded"
                dangerouslySetInnerHTML={{ __html: formatContent(viewingNote.content) }}
              />
              <div className="note-footer" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div className="note-date">
                  <Calendar size={14} />
                  <span>{new Date(viewingNote.updatedAt).toLocaleDateString('fr-FR')}</span>
                </div>
                {viewingNote.tags && viewingNote.tags.length > 0 && (
                  <div className="note-tags">
                    <Tag size={14} />
                    {viewingNote.tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay mobile-modal-overlay" onClick={cancelDelete}>
          <div className="modal mobile-modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header mobile-modal-header">
              <h2>Confirmer la suppression</h2>
              <button className="btn-icon mobile-close-btn" onClick={cancelDelete}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body mobile-modal-body">
              <div className="confirm-content">
                <div className="alert-icon">
                  <AlertTriangle size={56} strokeWidth={2.5} />
                </div>
                <div className="confirm-text">
                  <p className="confirm-question">Supprimer cette note ?</p>
                  <p className="warning-text">Cette action est irréversible.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer mobile-modal-footer">
              <button className="btn btn-secondary mobile-btn" onClick={cancelDelete}>
                Annuler
              </button>
              <button className="btn btn-danger mobile-btn" onClick={confirmDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotesList;

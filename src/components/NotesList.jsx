import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Edit2, Trash2, Calendar, Tag, Eye, EyeOff, AlertTriangle, X } from 'lucide-react';
import EditNoteModal from './EditNoteModal';
import './NotesList.css';

const NotesList = ({ subjectId, section, notes }) => {
  const { deleteNote, isAdmin } = useApp();
  const [editingNote, setEditingNote] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
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
                    className="btn-icon"
                    onClick={() => toggleExpand(note.id)}
                    title={isExpanded ? 'Réduire' : 'Développer'}
                  >
                    {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {isAdmin() && (
                    <>
                      <button
                        className="btn-icon"
                        onClick={() => setEditingNote(note)}
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon"
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

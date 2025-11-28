import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { X, Upload, FileText } from 'lucide-react';

const AddFileModal = ({ subjectId, section, onClose }) => {
  const { addFile } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Types de fichiers acceptés
      const acceptedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];

      if (!acceptedTypes.includes(selectedFile.type)) {
        alert('Seuls les fichiers PDF, Word (.doc, .docx), Excel (.xls, .xlsx) et PowerPoint (.ppt, .pptx) sont acceptés');
        return;
      }

      // Limiter la taille à 20MB
      if (selectedFile.size > 20 * 1024 * 1024) {
        alert('Le fichier ne doit pas dépasser 20 MB');
        return;
      }

      setFile(selectedFile);
      setFileInfo({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });
      
      // Auto-remplir le titre si vide
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    if (!title.trim()) {
      alert('Veuillez entrer un titre');
      return;
    }

    addFile(subjectId, section, {
      file: file,
      title: title.trim(),
      description: description.trim()
    });
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="modal-overlay mobile-modal-overlay" onClick={onClose}>
      <div className="modal mobile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header - Sticky */}
        <div className="modal-header mobile-modal-header">
          <h2>Ajouter un fichier</h2>
          <button className="btn-icon mobile-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={24} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <form onSubmit={handleSubmit} className="mobile-modal-form">
          <div className="modal-body mobile-modal-body">
            <div className="form-group">
              <label>Fichier *</label>
              <div className="mobile-file-upload">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileChange}
                  id="file-input"
                  style={{ display: 'none' }}
                />
                <label htmlFor="file-input" className="mobile-file-upload-btn">
                  {fileInfo ? (
                    <>
                      <FileText size={32} />
                      <div className="mobile-file-info">
                        <span className="mobile-file-name">{fileInfo.name}</span>
                        <span className="mobile-file-size">{formatFileSize(fileInfo.size)}</span>
                      </div>
                      <Upload size={20} />
                    </>
                  ) : (
                    <>
                      <FileText size={32} />
                      <span>Choisir un fichier</span>
                      <Upload size={20} />
                    </>
                  )}
                </label>
                {fileInfo && (
                  <button 
                    type="button"
                    className="mobile-change-file-btn"
                    onClick={() => {
                      setFile(null);
                      setFileInfo(null);
                    }}
                  >
                    Changer de fichier
                  </button>
                )}
                <p className="mobile-file-hint">PDF, Word, Excel, PowerPoint - Max 20 MB</p>
              </div>
            </div>

            <div className="form-group">
              <label>Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du fichier..."
                className="mobile-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Description (optionnelle)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du fichier..."
                rows={4}
                className="mobile-textarea"
              />
            </div>
          </div>

          {/* Footer - Sticky */}
          <div className="modal-footer mobile-modal-footer">
            <button type="button" className="btn btn-secondary mobile-btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary mobile-btn" disabled={!file || !title.trim()}>
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFileModal;

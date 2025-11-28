import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { X, Upload, Image } from 'lucide-react';

const AddPhotoModal = ({ subjectId, section, onClose }) => {
  const { addPhoto } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleFileChange = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        if (!title) {
          setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() && file) {
      addPhoto(subjectId, section, {
        title: title.trim(),
        description: description.trim(),
        file: file,
      });
      onClose();
    }
  };

  return (
    <div className="modal-overlay mobile-modal-overlay" onClick={onClose}>
      <div className="modal mobile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header - Sticky */}
        <div className="modal-header mobile-modal-header">
          <h2>Ajouter une Photo</h2>
          <button className="btn-icon mobile-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={24} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <form onSubmit={handleSubmit} className="mobile-modal-form">
          <div className="modal-body mobile-modal-body">
            <div className="form-group">
              <label>Image *</label>
              <div className="mobile-file-upload">
                {!preview ? (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e.target.files[0])}
                      id="photo-file"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="photo-file" className="mobile-file-upload-btn">
                      <Image size={32} />
                      <span>Choisir une image</span>
                      <Upload size={20} />
                    </label>
                    <p className="mobile-file-hint">Formats acceptés : JPG, PNG, GIF</p>
                  </>
                ) : (
                  <div className="mobile-image-preview">
                    <img src={preview} alt="Preview" />
                    <button 
                      type="button"
                      className="mobile-change-image-btn"
                      onClick={() => {
                        setPreview('');
                        setFile(null);
                      }}
                    >
                      Changer d'image
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Titre *</label>
              <input
                type="text"
                placeholder="Titre de la photo..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mobile-input"
              />
            </div>

            <div className="form-group">
              <label>Description (optionnelle)</label>
              <textarea
                placeholder="Description de la photo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            <button
              type="submit"
              className="btn btn-primary mobile-btn"
              disabled={!title.trim() || !file}
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPhotoModal;

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { X, Upload, Image, Trash2, Plus } from 'lucide-react';
import './PhotoGallery.css';

const AddPhotoModal = ({ subjectId, section, onClose }) => {
  const { addPhoto } = useApp();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
      // Cleanup previews
      previews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      
      const newPreviews = newFiles.map(file => ({
        file,
        url: URL.createObjectURL(file),
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: ''
      }));
      
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveFile = (index) => {
    const previewToRemove = previews[index];
    URL.revokeObjectURL(previewToRemove.url);
    
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMetadata = (index, field, value) => {
    setPreviews(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsSubmitting(true);
    
    try {
      // Upload files sequentially to avoid overwhelming the server/network
      for (let i = 0; i < previews.length; i++) {
        const item = previews[i];
        await addPhoto(subjectId, section, {
          title: item.title.trim() || item.file.name,
          description: item.description.trim(),
          file: item.file,
        });
      }
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      alert("Une erreur est survenue lors de l'upload de certaines photos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay mobile-modal-overlay" onClick={onClose}>
      <div className="modal mobile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header - Sticky */}
        <div className="modal-header mobile-modal-header">
          <h2>Ajouter des Photos</h2>
          <button className="btn-icon mobile-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={24} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <form onSubmit={handleSubmit} className="mobile-modal-form">
          <div className="modal-body mobile-modal-body">
            
            <div className="form-group">
              <div className="mobile-file-upload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  id="photo-files"
                  style={{ display: 'none' }}
                />
                <label htmlFor="photo-files" className="mobile-file-upload-btn">
                  <Plus size={32} />
                  <span>Ajouter des images</span>
                  <Upload size={20} />
                </label>
                <p className="mobile-file-hint">Formats acceptés : JPG, PNG, GIF</p>
              </div>
            </div>

            {previews.length > 0 && (
              <div className="selected-photos-list">
                <h3>Photos sélectionnées ({previews.length})</h3>
                <div className="photos-grid-preview">
                  {previews.map((preview, index) => (
                    <div key={index} className="photo-preview-card">
                      <div className="preview-image-container">
                        <img src={preview.url} alt={`Preview ${index}`} />
                        <button 
                          type="button" 
                          className="remove-photo-btn"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="preview-inputs">
                        <input
                          type="text"
                          placeholder="Titre"
                          value={preview.title}
                          onChange={(e) => handleUpdateMetadata(index, 'title', e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Description (optionnel)"
                          value={preview.description}
                          onChange={(e) => handleUpdateMetadata(index, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer - Sticky */}
          <div className="modal-footer mobile-modal-footer">
            <button type="button" className="btn btn-secondary mobile-btn" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            <button 
              type="submit" 
              className="btn btn-primary mobile-btn" 
              disabled={files.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Envoi en cours...' : `Ajouter ${files.length > 0 ? `(${files.length})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPhotoModal;

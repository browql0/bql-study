import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Trash2, ZoomIn, X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { getDisplayUrl } from '../utils/fileUrlHelper';
import './PhotoGallery.css';

const PhotoGallery = ({ subjectId, section, photos }) => {
  const { deletePhoto, isAdmin } = useApp();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [photoUrls, setPhotoUrls] = useState({});

  const handleDelete = (e, photoId) => {
    e.stopPropagation();
    setDeleteConfirm(photoId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deletePhoto(subjectId, section, deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const openPhotoViewer = (index) => {
    setSelectedPhotoIndex(index);
  };

  const closePhotoViewer = () => {
    setSelectedPhotoIndex(null);
  };

  // Ajouter/retirer la classe modal-open au body quand le viewer ou le modal de confirmation est ouvert
  useEffect(() => {
    if (selectedPhotoIndex !== null || deleteConfirm) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [selectedPhotoIndex, deleteConfirm]);

  const navigatePhoto = (direction) => {
    if (selectedPhotoIndex === null) return;
    const newIndex = selectedPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < photos.length) {
      setSelectedPhotoIndex(newIndex);
    }
  };

  // Charger les URLs des photos (pour les signed URLs)
  useEffect(() => {
    const loadPhotoUrls = async () => {
      const urls = {};
      for (const photo of photos) {
        // Si c'est déjà une URL publique, on n'a pas besoin de la générer
        if (photo.url?.startsWith('http://') || photo.url?.startsWith('https://')) {
          urls[photo.id] = photo.url;
        } else {
          // Sinon, c'est un storage_path, générer l'URL via le Worker
          try {
            // Utiliser storage_path en priorité, sinon url (qui peut contenir le path)
            const path = photo.storage_path || photo.url;
            if (path) {
              const displayUrl = await getDisplayUrl(null, path);
              urls[photo.id] = displayUrl;
            }
          } catch (error) {
            // En cas d'erreur, on laisse photoUrls[photo.id] undefined
          }
        }
      }
      setPhotoUrls(urls);
    };
    
    if (photos.length > 0) {
      loadPhotoUrls();
    }
  }, [photos]);

  const getPhotoUrl = (photo) => {
    // Si c'est déjà une URL publique, l'utiliser
    if (photo.url?.startsWith('http://') || photo.url?.startsWith('https://')) {
      return photo.url;
    }
    // Sinon, utiliser l'URL générée depuis photoUrls
    if (photoUrls[photo.id]) {
      return photoUrls[photo.id];
    }
    // Fallback: retourner le storage_path ou url (même si ce n'est pas une URL valide)
    // Cela affichera une icône cassée mais au moins on sait qu'il y a un problème
    return photo.storage_path || photo.url || '';
  };


  if (photos.length === 0) {
    return (
      <div className="empty-state scale-in">
        <p>Aucune photo pour le moment</p>
      </div>
    );
  }

  const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  return (
    <>
      <div className="photo-gallery">
        {photos.map((photo, index) => (
          <div 
            key={photo.id} 
            className="photo-card card fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="photo-image" onClick={() => openPhotoViewer(index)}>
              <img 
                src={getPhotoUrl(photo)} 
                alt={photo.title} 
                loading="lazy"
              />
              <div className="photo-overlay">
                <button className="btn-icon zoom-btn">
                  <ZoomIn size={24} />
                </button>
              </div>
            </div>
            <div className="photo-info">
              <h4>{photo.title}</h4>
              {photo.description && <p>{photo.description}</p>}
              <div className="photo-footer">
                <span className="photo-date">
                  {new Date(photo.createdAt).toLocaleDateString('fr-FR')}
                </span>
                {isAdmin() && (
                  <button
                    className="btn-icon"
                    onClick={(e) => handleDelete(e, photo.id)}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <div className="photo-viewer-overlay" onClick={closePhotoViewer}>
          <button className="viewer-close" onClick={closePhotoViewer}>
            <X size={32} />
          </button>
          
          {selectedPhotoIndex > 0 && (
            <button 
              className="viewer-nav viewer-prev" 
              onClick={(e) => { e.stopPropagation(); navigatePhoto(-1); }}
            >
              <ChevronLeft size={32} />
            </button>
          )}
          
          {selectedPhotoIndex < photos.length - 1 && (
            <button 
              className="viewer-nav viewer-next" 
              onClick={(e) => { e.stopPropagation(); navigatePhoto(1); }}
            >
              <ChevronRight size={32} />
            </button>
          )}

          <div className="photo-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'relative' }}>
              <img 
                src={getPhotoUrl(selectedPhoto)} 
                alt={selectedPhoto.title} 
                className="viewer-image"
              />
            </div>
            <div className="viewer-info">
              <div className="viewer-header">
                <div>
                  <h3>{selectedPhoto.title}</h3>
                  {selectedPhoto.description && <p>{selectedPhoto.description}</p>}
                </div>
              </div>
              <div className="viewer-counter">
                {selectedPhotoIndex + 1} / {photos.length}
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
                  <p className="confirm-question">Supprimer cette photo ?</p>
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

export default PhotoGallery;

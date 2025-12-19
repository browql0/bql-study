import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Trash2, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, AlertTriangle, RotateCcw } from 'lucide-react';
import { getDisplayUrl } from '../utils/fileUrlHelper';
import './PhotoGallery.css';

const PhotoGallery = ({ subjectId, section, photos }) => {
  const { deletePhoto, isAdmin } = useApp();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [photoUrls, setPhotoUrls] = useState({});

  // Zoom state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  // Touch state for mobile
  const [touchStartDist, setTouchStartDist] = useState(0);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

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
    resetZoom();
  };

  const closePhotoViewer = () => {
    setSelectedPhotoIndex(null);
    resetZoom();
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setScale(prev => Math.max(prev - 0.5, 1));
    if (scale <= 1.5) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch events for mobile
  const getDistance = (touches) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = getDistance(e.touches);
      setTouchStartDist(dist);
      setTouchStartScale(scale);
    } else if (e.touches.length === 1) {
      // Pan start or Swipe start
      setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      if (scale > 1) {
        setIsDragging(true);
        setStartPos({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y
        });
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const dist = getDistance(e.touches);
      const newScale = Math.min(Math.max(touchStartScale * (dist / touchStartDist), 1), 4);
      setScale(newScale);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1) {
      if (scale > 1 && isDragging) {
        // Pan
        e.preventDefault();
        setPosition({
          x: e.touches[0].clientX - startPos.x,
          y: e.touches[0].clientY - startPos.y
        });
      }
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);

    // Swipe detection (only if not zoomed)
    if (scale === 1 && e.changedTouches.length === 1) {
      const touchEndPos = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      const diffX = touchEndPos.x - touchStartPos.x;
      const diffY = touchEndPos.y - touchStartPos.y;

      // Horizontal swipe detection (threshold 50px)
      if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) {
        if (diffX > 0) {
          navigatePhoto(-1); // Swipe right -> prev
        } else {
          navigatePhoto(1); // Swipe left -> next
        }
      }
    }
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
      resetZoom();
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

  // Gestion du clavier pour la navigation
  useEffect(() => {
    if (selectedPhotoIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePhoto(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigatePhoto(1);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closePhotoViewer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, photos.length]);

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
            <div
              className="image-container"
              style={{
                overflow: 'hidden',
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '70vh',
                width: '100%',
                touchAction: 'none'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                ref={imageRef}
                src={getPhotoUrl(selectedPhoto)}
                alt={selectedPhoto.title}
                className="viewer-image"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain'
                }}
                draggable={false}
              />
            </div>

            <div className="zoom-controls">
              <button onClick={handleZoomOut} disabled={scale <= 1} title="Zoom arrière">
                <ZoomOut size={20} />
              </button>
              <span className="zoom-level">{Math.round(scale * 100)}%</span>
              <button onClick={handleZoomIn} disabled={scale >= 4} title="Zoom avant">
                <ZoomIn size={20} />
              </button>
              <button onClick={resetZoom} title="Réinitialiser">
                <RotateCcw size={20} />
              </button>
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

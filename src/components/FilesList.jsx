import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Trash2, FileText, X, AlertTriangle, FileSpreadsheet, File } from 'lucide-react';
import { getDisplayUrl } from '../utils/fileUrlHelper';
import PDFViewer from './PDFViewer';
import './FilesList.css';

const FilesList = ({ subjectId, section, files }) => {
  const { deleteFile, isAdmin } = useApp();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [viewerUrl, setViewerUrl] = useState(null);

  // Ajouter/retirer la classe modal-open au body quand le modal de confirmation est ouvert
  // Gestion de la classe modal-open pour le file viewer
  useEffect(() => {
    if (viewingFile || deleteConfirm) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [viewingFile, deleteConfirm]);

  const handleDelete = (fileId) => {
    setDeleteConfirm(fileId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteFile(subjectId, section, deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };


  const openFile = async (file) => {
    setViewingFile(file);
    setViewerUrl(null);
    try {
      const url = await getFileViewerUrl(file);
      setViewerUrl(url);
    } catch (error) {
      console.error('Error loading file URL:', error);
      setViewerUrl(null);
    }
  };

  const closeFileViewer = () => {
    setViewingFile(null);
    document.body.classList.remove('modal-open');
  };



  const getFileViewerUrl = async (file) => {
    // Utiliser storage_path en priorité, sinon url
    const path = file.storage_path || file.url;
    const fileUrl = await getDisplayUrl(null, path);
    const extension = file.name.split('.').pop().toLowerCase();

    // Pour les PDFs, affichage direct avec paramètres pour masquer les contrôles
    if (extension === 'pdf') {
      return `${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
    }

    // Pour les autres fichiers, utiliser Office Web Viewer
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconProps = { size: 32, strokeWidth: 2 };

    if (extension === 'pdf') {
      return <FileText {...iconProps} />;
    } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return <FileSpreadsheet {...iconProps} />;
    } else if (['doc', 'docx', 'txt'].includes(extension)) {
      return <FileText {...iconProps} />;
    } else if (['ppt', 'pptx'].includes(extension)) {
      return <File {...iconProps} />;
    }
    return <File {...iconProps} />;
  };

  const getFileColor = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();

    if (extension === 'pdf') {
      return '#ef4444'; // Rouge
    } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return '#10b981'; // Vert
    } else if (['doc', 'docx', 'txt'].includes(extension)) {
      return '#3b82f6'; // Bleu
    } else if (['ppt', 'pptx'].includes(extension)) {
      return '#f59e0b'; // Orange
    }
    return '#6b7280'; // Gris par défaut
  };

  if (files.length === 0) {
    return (
      <div className="empty-state scale-in">
        <p>Aucun fichier pour le moment</p>
      </div>
    );
  }

  return (
    <>
      <div className="files-list">
        {files.map((file, index) => (
          <div
            key={file.id}
            className="file-card card fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => openFile(file)}
          >
            <div className="file-icon" style={{ borderColor: `${getFileColor(file.name)}40` }}>
              <div style={{ color: getFileColor(file.name) }}>
                {getFileIcon(file.name)}
              </div>
            </div>
            <div className="file-info">
              <h4>{file.title || file.name}</h4>
              {file.description && <p className="file-description">{file.description}</p>}
              <div className="file-meta">
                <span className="file-size">{formatFileSize(file.size || 0)}</span>
                <span className="file-date">
                  {new Date(file.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
            <div className="file-actions">
              {isAdmin() && (
                <button
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id);
                  }}
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {viewingFile && (
        <div className="file-viewer-overlay" onClick={closeFileViewer}>
          <div className="file-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="file-viewer-header">
              <div>
                <h3>{viewingFile.title}</h3>
                <p className="file-viewer-name">{viewingFile.name}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="btn-icon btn-close-viewer" onClick={closeFileViewer} title="Fermer">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="file-viewer-frame">
              {viewerUrl ? (
                viewingFile.name.toLowerCase().endsWith('.pdf') ? (
                  <PDFViewer url={viewerUrl.split('#')[0]} fileName={viewingFile.name} />
                ) : (
                  <iframe
                    src={viewerUrl}
                    title={viewingFile.title}
                    frameBorder="0"
                    allowFullScreen
                  />
                )
              ) : (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <p>Chargement...</p>
                </div>
              )}
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
                  <p className="confirm-question">Supprimer ce fichier ?</p>
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

export default FilesList;

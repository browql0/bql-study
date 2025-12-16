import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { Trash2, FileText, X, AlertTriangle, FileSpreadsheet, File } from 'lucide-react';
import { getDisplayUrl } from '../utils/fileUrlHelper';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../lib/supabase';
import './FilesList.css';

// Utiliser le worker inline (pas de fichier externe)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const FilesList = ({ subjectId, section, files }) => {
  const { deleteFile, isAdmin } = useApp();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  // Charger et rendre le PDF en images
  // Charger et rendre le PDF en images
  useEffect(() => {
    if (!viewingFile?.name.toLowerCase().endsWith('.pdf')) {
      setPdfPages([]);
      return;
    }

    setPdfLoading(true);
    setPdfPages([]);

    const loadPdf = async () => {
      try {
        // Obtenir le token de session pour l'authentification
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error('Non authentifié');
        }

        // Construire l'URL du proxy via le Worker
        const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

        if (!workerUrl) {
          console.warn('VITE_CLOUDFLARE_WORKER_URL non défini, tentative de chargement direct (risque CORS)');
          // Fallback direct si pas de worker configuré
          if (viewerUrl) {
            const pdfDoc = await pdfjsLib.getDocument(viewerUrl.split('#')[0]).promise;
            await renderPages(pdfDoc);
          }
          return;
        }

        const filePath = viewingFile.storage_path || viewingFile.path; // Fallback

        if (!filePath) {
          throw new Error('Chemin du fichier introuvable');
        }

        const proxyUrl = `${workerUrl}/view?path=${encodeURIComponent(filePath)}`;

        // Charger le PDF via le proxy avec authentification
        const loadingTask = pdfjsLib.getDocument({
          url: proxyUrl,
          httpHeaders: {
            'Authorization': `Bearer ${token}`
          }
        });

        const pdfDoc = await loadingTask.promise;
        await renderPages(pdfDoc);

      } catch (error) {
        console.error('Error loading PDF:', error);
        setPdfLoading(false);
      }
    };

    const renderPages = async (pdfDoc) => {
      const pages = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.8 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        pages.push(canvas.toDataURL());
      }
      setPdfPages(pages);
      setPdfLoading(false);
    };

    loadPdf();
  }, [viewerUrl, viewingFile]);

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

    // Pour les autres fichiers, utiliser Google Docs Viewer en mode embedded (interface minimale)
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
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
                <h3>{viewingFile.title || viewingFile.name}</h3>
              </div>
              <button className="btn-close-viewer" onClick={closeFileViewer} title="Fermer">
                <X size={20} />
              </button>
            </div>
            <div className="file-viewer-frame" style={{ display: 'block', overflowY: 'auto', background: '#f5f5f5', height: '100%', width: '100%' }}>
              {viewerUrl ? (
                viewingFile.name.toLowerCase().endsWith('.pdf') ? (
                  pdfLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                      <p>Chargement du PDF...</p>
                    </div>
                  ) : pdfPages.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px', minHeight: '100%' }}>
                      {pdfPages.map((pageDataUrl, idx) => (
                        <img
                          key={idx}
                          src={pageDataUrl}
                          alt={`Page ${idx + 1}`}
                          style={{
                            maxWidth: '100%',
                            background: '#fff',
                            borderRadius: '4px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444' }}>
                      <p>Impossible de charger le PDF.</p>
                      <a href={viewerUrl.split('#')[0]} target="_blank" rel="noopener noreferrer" style={{ color: '#4f8ff0', marginTop: '8px' }}>Télécharger le fichier</a>
                    </div>
                  )
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

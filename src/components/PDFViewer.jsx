import React, { useEffect } from 'react';
import './PDFViewer.css';

const PDFViewer = ({ url, fileName, onClose }) => {
    
    // Empêcher le scroll du body quand la modale est ouverte
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!url) return null;

    return (
        <div className="pdf-modal-overlay" onClick={onClose}>
            <div className="pdf-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Barre d'entête de la modale */}
                <div className="pdf-modal-header">
                    <span className="pdf-modal-title">{fileName || "Visualisation du document"}</span>
                    <button className="pdf-modal-close-btn" onClick={onClose}>
                        &times;
                    </button>
                </div>

                {/* Corps de la modale : Le lecteur PDF */}
                <div className="pdf-modal-body">
                    <object
                        data={`${url}#toolbar=1&navpanes=0`}
                        type="application/pdf"
                        width="100%"
                        height="100%"
                    >
                        {/* Fallback si le navigateur ne peut pas afficher le PDF nativement */}
                        <div className="pdf-fallback">
                            <p>Il semble que votre navigateur ne puisse pas afficher le PDF directement.</p>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="download-link">
                                Cliquez ici pour télécharger et voir le fichier
                            </a>
                        </div>
                    </object>
                </div>
            </div>
        </div>
    );
};

export default PDFViewer;
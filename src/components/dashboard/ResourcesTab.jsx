import React, { useState, useEffect } from 'react';
import { BookOpen, Video, Globe, FileText, Plus, Trash2, Edit2, Search, Star, Eye, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './ResourcesTab.css';

const ResourcesTab = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ 
    show: false, 
    resourceId: null, 
    resourceTitle: '' 
  });
  const [successModal, setSuccessModal] = useState({ 
    show: false, 
    message: '' 
  });
  const [errorModal, setErrorModal] = useState({ 
    show: false, 
    message: '' 
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'book',
    url: '',
    thumbnail_url: '',
    subject_name: '',
    author: '',
    duration: '',
    tags: '',
    is_featured: false
  });

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Erreur chargement ressources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const resourceData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        created_by: user.id
      };

      if (editingResource) {
        const { error } = await supabase
          .from('resources')
          .update(resourceData)
          .eq('id', editingResource.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resources')
          .insert([resourceData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingResource(null);
      resetForm();
      loadResources();
      setSuccessModal({ 
        show: true, 
        message: editingResource ? 'La ressource a été mise à jour avec succès.' : 'La ressource a été ajoutée avec succès.' 
      });
    } catch (error) {
      console.error('Erreur sauvegarde ressource:', error);
      setErrorModal({ 
        show: true, 
        message: 'Erreur lors de la sauvegarde de la ressource. Veuillez réessayer.' 
      });
    }
  };

  const handleDelete = (id, title) => {
    setConfirmModal({
      show: true,
      resourceId: id,
      resourceTitle: title
    });
  };

  const confirmDeleteResource = async () => {
    if (!confirmModal.resourceId) return;

    const resourceIdToDelete = confirmModal.resourceId;
    const resourceTitleToDelete = confirmModal.resourceTitle;
    
    setConfirmModal({ show: false, resourceId: null, resourceTitle: '' });
    
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceIdToDelete);

      if (error) throw error;
      
      // Mise à jour optimiste
      setResources(prevResources => prevResources.filter(r => r.id !== resourceIdToDelete));
      
      setSuccessModal({ 
        show: true, 
        message: `La ressource "${resourceTitleToDelete}" a été supprimée avec succès.` 
      });
      
      // Recharger pour s'assurer de la cohérence
      setTimeout(async () => {
        try {
          await loadResources();
        } catch (error) {
          console.error('Erreur lors du rechargement:', error);
        }
      }, 500);
    } catch (error) {
      console.error('Erreur suppression:', error);
      setErrorModal({ 
        show: true, 
        message: 'Erreur lors de la suppression de la ressource. Veuillez réessayer.' 
      });
      // Recharger en cas d'erreur
      await loadResources();
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description || '',
      type: resource.type,
      url: resource.url || '',
      thumbnail_url: resource.thumbnail_url || '',
      subject_name: resource.subject_name || '',
      author: resource.author || '',
      duration: resource.duration || '',
      tags: resource.tags ? resource.tags.join(', ') : '',
      is_featured: resource.is_featured || false
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'book',
      url: '',
      thumbnail_url: '',
      subject_name: '',
      author: '',
      duration: '',
      tags: '',
      is_featured: false
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'book': return <BookOpen size={24} />;
      case 'video': return <Video size={24} />;
      case 'website': return <Globe size={24} />;
      case 'pdf':
      case 'document': return <FileText size={24} />;
      default: return <BookOpen size={24} />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      book: 'Livre',
      video: 'Vidéo',
      website: 'Site Web',
      pdf: 'PDF',
      document: 'Document'
    };
    return labels[type] || type;
  };

  // Filtrage
  const filteredResources = resources.filter(resource => {
    const matchesSearch = !searchTerm || 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.subject_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || resource.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Stats
  const stats = {
    total: resources.length,
    books: resources.filter(r => r.type === 'book').length,
    videos: resources.filter(r => r.type === 'video').length,
    websites: resources.filter(r => r.type === 'website').length,
    documents: resources.filter(r => r.type === 'pdf' || r.type === 'document').length
  };

  if (loading) {
    return (
      <div className="resources-loading">
        <div className="spinner"></div>
        <p>Chargement des ressources...</p>
      </div>
    );
  }

  return (
    <div className="resources-tab">
      {/* Stats Cards */}
      <div className="resources-stats">
        <div className="resource-stat-card">
          <div className="resource-stat-icon total">
            <BookOpen size={24} />
          </div>
          <div className="resource-stat-content">
            <p className="resource-stat-label">Total Ressources</p>
            <h3 className="resource-stat-value">{stats.total}</h3>
          </div>
        </div>

        <div className="resource-stat-card">
          <div className="resource-stat-icon books">
            <BookOpen size={24} />
          </div>
          <div className="resource-stat-content">
            <p className="resource-stat-label">Livres</p>
            <h3 className="resource-stat-value">{stats.books}</h3>
          </div>
        </div>

        <div className="resource-stat-card">
          <div className="resource-stat-icon videos">
            <Video size={24} />
          </div>
          <div className="resource-stat-content">
            <p className="resource-stat-label">Vidéos</p>
            <h3 className="resource-stat-value">{stats.videos}</h3>
          </div>
        </div>

        <div className="resource-stat-card">
          <div className="resource-stat-icon websites">
            <Globe size={24} />
          </div>
          <div className="resource-stat-content">
            <p className="resource-stat-label">Sites & Docs</p>
            <h3 className="resource-stat-value">{stats.websites + stats.documents}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="resources-toolbar">
        <div className="search-filter-group">
          <div className="search-input-wrapper">
            <Search size={20} />
            <input
              type="text"
              placeholder="Rechercher une ressource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="book">Livres</option>
            <option value="video">Vidéos</option>
            <option value="website">Sites Web</option>
            <option value="pdf">PDFs</option>
            <option value="document">Documents</option>
          </select>
        </div>

        <button className="add-resource-btn" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Ajouter une ressource
        </button>
      </div>

      {/* Resources Grid */}
      <div className="resources-grid">
        {filteredResources.length === 0 ? (
          <div className="resources-empty">
            <div className="empty-icon">
              <BookOpen size={48} />
            </div>
            <h3>Aucune ressource trouvée</h3>
            <p>Commencez par ajouter votre première ressource</p>
          </div>
        ) : (
          filteredResources.map((resource) => (
            <div key={resource.id} className="resource-card">
              {resource.is_featured && (
                <div className="featured-badge">
                  <Star size={14} />
                  En vedette
                </div>
              )}
              
              <button 
                className="resource-delete-btn"
                onClick={() => handleDelete(resource.id, resource.title)}
              >
                <Trash2 size={14} />
              </button>

              <button 
                className="resource-edit-btn"
                onClick={() => handleEdit(resource)}
              >
                <Edit2 size={14} />
              </button>

              <div className="resource-thumbnail">
                {resource.thumbnail_url ? (
                  <img src={resource.thumbnail_url} alt={resource.title} />
                ) : (
                  <div className="resource-thumbnail-placeholder">
                    {getTypeIcon(resource.type)}
                  </div>
                )}
              </div>

              <div className="resource-content">
                <div className="resource-type-badge">
                  {getTypeIcon(resource.type)}
                  <span>{getTypeLabel(resource.type)}</span>
                </div>

                <h4>{resource.title}</h4>
                
                {resource.author && (
                  <p className="resource-author">Par {resource.author}</p>
                )}

                {resource.description && (
                  <p className="resource-description">{resource.description}</p>
                )}

                {resource.subject_name && (
                  <div className="resource-subject">
                    <BookOpen size={14} />
                    <span>{resource.subject_name}</span>
                  </div>
                )}

                {resource.tags && resource.tags.length > 0 && (
                  <div className="resource-tags">
                    {resource.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="resource-tag">{tag}</span>
                    ))}
                  </div>
                )}

                {resource.url && (
                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="resource-link-btn"
                  >
                    Accéder à la ressource
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="resource-modal-overlay" onClick={() => { setShowModal(false); setEditingResource(null); resetForm(); }}>
          <div className="resource-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingResource ? 'Modifier la ressource' : 'Ajouter une ressource'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Titre *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="book">Livre</option>
                    <option value="video">Vidéo</option>
                    <option value="website">Site Web</option>
                    <option value="pdf">PDF</option>
                    <option value="document">Document</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>URL *</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>URL Miniature</label>
                  <input
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Matière</label>
                  <input
                    type="text"
                    value={formData.subject_name}
                    onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Auteur</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="python, tutoriel, débutant"
                />
              </div>

              <div className="form-group-checkbox">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                />
                <label htmlFor="featured">Mettre en vedette</label>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowModal(false); setEditingResource(null); resetForm(); }}>
                  Annuler
                </button>
                <button type="submit" className="submit-btn">
                  {editingResource ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {confirmModal.show && (
        <div className="resource-modal-overlay" onClick={() => setConfirmModal({ show: false, resourceId: null, resourceTitle: '' })}>
          <div className="confirm-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3 className="confirm-modal-title">Confirmer la suppression</h3>
            </div>
            <div className="confirm-modal-body">
              <div className="confirm-icon-wrapper">
                <AlertTriangle size={48} className="confirm-warning-icon" />
              </div>
              <p className="confirm-modal-message">
                Voulez-vous vraiment supprimer la ressource <strong>"{confirmModal.resourceTitle}"</strong> ?
              </p>
              <p className="confirm-modal-warning">Cette action est irréversible.</p>
            </div>
            <div className="confirm-modal-actions">
              <button 
                className="confirm-btn cancel-btn" 
                onClick={() => setConfirmModal({ show: false, resourceId: null, resourceTitle: '' })}
              >
                Annuler
              </button>
              <button 
                className="confirm-btn confirm-btn-danger" 
                onClick={confirmDeleteResource}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de succès */}
      {successModal.show && (
        <div className="resource-modal-overlay" onClick={() => setSuccessModal({ show: false, message: '' })}>
          <div className="confirm-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3 className="confirm-modal-title">Succès</h3>
            </div>
            <div className="confirm-modal-body">
              <div className="confirm-icon-wrapper">
                <CheckCircle size={48} className="confirm-success-icon" />
              </div>
              <p className="confirm-modal-message">{successModal.message}</p>
            </div>
            <div className="confirm-modal-actions">
              <button 
                className="confirm-btn confirm-btn-primary" 
                onClick={() => setSuccessModal({ show: false, message: '' })}
              >
                D'accord
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'erreur */}
      {errorModal.show && (
        <div className="resource-modal-overlay" onClick={() => setErrorModal({ show: false, message: '' })}>
          <div className="confirm-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3 className="confirm-modal-title">Erreur</h3>
            </div>
            <div className="confirm-modal-body">
              <div className="confirm-icon-wrapper">
                <AlertCircle size={48} className="confirm-error-icon" />
              </div>
              <p className="confirm-modal-message">{errorModal.message}</p>
            </div>
            <div className="confirm-modal-actions">
              <button 
                className="confirm-btn confirm-btn-primary" 
                onClick={() => setErrorModal({ show: false, message: '' })}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesTab;

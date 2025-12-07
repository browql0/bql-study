import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Video, Globe, FileText, Search, ExternalLink, Star, Filter, TrendingUp, Award, Zap, Library } from 'lucide-react';
import './UserResources.css';

const UserResources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterFeatured, setFilterFeatured] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('view_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Erreur chargement ressources:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async (resourceId) => {
    try {
      const resource = resources.find(r => r.id === resourceId);
      if (resource) {
        await supabase
          .from('resources')
          .update({ view_count: (resource.view_count || 0) + 1 })
          .eq('id', resourceId);
      }
    } catch (error) {
      console.error('Erreur incrémentation vues:', error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'book': return <BookOpen size={24} />;
      case 'video': return <Video size={24} />;
      case 'website': return <Globe size={24} />;
      default: return <FileText size={24} />;
    }
  };

  const getTypeGradient = (type) => {
    switch (type) {
      case 'book': return 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
      case 'video': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'website': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'pdf': return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      case 'document': return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
      default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || resource.type === filterType;
    const matchesFeatured = !filterFeatured || resource.is_featured;
    return matchesSearch && matchesType && matchesFeatured;
  });

  // Statistiques
  const stats = {
    total: resources.length,
    books: resources.filter(r => r.type === 'book').length,
    videos: resources.filter(r => r.type === 'video').length,
    websites: resources.filter(r => r.type === 'website').length,
    featured: resources.filter(r => r.is_featured).length
  };

  if (loading) {
    return (
      <div className="user-resources-page">
        <div className="resources-loading">
          <div className="loading-spinner-modern"></div>
          <p>Chargement de la bibliothèque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-resources-page">
      {/* Header Bar */}
      <div className="resources-header-bar">
        <div className="header-left">
          <Library size={24} className="header-icon" />
          <div className="header-text">
            <h1>Bibliothèque</h1>
            <p>{resources.length} ressource{resources.length > 1 ? 's' : ''} disponible{resources.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="header-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filtres Pills */}
      <div className="resources-filters">
        <div className="filter-pills">
          <button 
            className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            <Filter size={16} />
            Tout ({resources.length})
          </button>
          <button 
            className={`filter-pill ${filterType === 'book' ? 'active' : ''}`}
            onClick={() => setFilterType('book')}
          >
            <BookOpen size={16} />
            Livres ({stats.books})
          </button>
          <button 
            className={`filter-pill ${filterType === 'video' ? 'active' : ''}`}
            onClick={() => setFilterType('video')}
          >
            <Video size={16} />
            Vidéos ({stats.videos})
          </button>
          <button 
            className={`filter-pill ${filterType === 'website' ? 'active' : ''}`}
            onClick={() => setFilterType('website')}
          >
            <Globe size={16} />
            Sites ({stats.websites})
          </button>
          <button 
            className={`filter-pill ${filterType === 'pdf' ? 'active' : ''}`}
            onClick={() => setFilterType('pdf')}
          >
            <FileText size={16} />
            PDFs
          </button>
          <button 
            className={`filter-pill featured ${filterFeatured ? 'active' : ''}`}
            onClick={() => setFilterFeatured(!filterFeatured)}
          >
            <Star size={16} />
            Recommandées ({stats.featured})
          </button>
        </div>
      </div>

      {/* Liste des ressources */}
      {filteredResources.length === 0 ? (
        <div className="no-resources-modern">
          <div className="no-resources-icon">
            <BookOpen size={64} />
          </div>
          <h3>Aucune ressource trouvée</h3>
          <p>Essayez de modifier vos filtres ou votre recherche</p>
          <button className="reset-filters" onClick={() => {
            setSearchTerm('');
            setFilterType('all');
            setFilterFeatured(false);
          }}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="resources-grid-modern">
          {filteredResources.map(resource => (
            <div key={resource.id} className="resource-card-modern">
              {/* Thumbnail avec overlay gradient */}
              <div 
                className="resource-thumbnail-modern"
                style={{ 
                  backgroundImage: resource.thumbnail_url 
                    ? `url(${resource.thumbnail_url})` 
                    : getTypeGradient(resource.type)
                }}
              >
                <div className="thumbnail-overlay">
                  <div className="resource-type-badge" style={{ background: getTypeGradient(resource.type) }}>
                    {getTypeIcon(resource.type)}
                    <span>{resource.type}</span>
                  </div>
                  
                  {resource.is_featured && (
                    <div className="featured-badge-modern">
                      <Star size={14} fill="currentColor" />
                    </div>
                  )}
                </div>

                {!resource.thumbnail_url && (
                  <div className="thumbnail-icon">
                    {getTypeIcon(resource.type)}
                  </div>
                )}
              </div>

              {/* Contenu */}
              <div className="resource-content-modern">
                <div className="resource-meta-top">
                  {resource.subject_name && (
                    <span className="subject-tag">{resource.subject_name}</span>
                  )}
                  {resource.view_count > 0 && (
                    <span className="views-count">
                      <TrendingUp size={12} />
                      {resource.view_count} vues
                    </span>
                  )}
                </div>

                <h3 className="resource-title-modern">{resource.title}</h3>
                
                {resource.author && (
                  <p className="resource-author-modern">
                    <Award size={14} />
                    {resource.author}
                  </p>
                )}

                <p className="resource-description-modern">{resource.description}</p>

                {resource.tags && resource.tags.length > 0 && (
                  <div className="resource-tags-modern">
                    {resource.tags.slice(0, 4).map((tag, index) => (
                      <span key={index} className="tag-modern">#{tag}</span>
                    ))}
                  </div>
                )}

                <a 
                  href={resource.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="resource-link-modern"
                  onClick={() => incrementViewCount(resource.id)}
                  style={{ background: getTypeGradient(resource.type) }}
                >
                  <ExternalLink size={18} />
                  <span>Accéder</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserResources;

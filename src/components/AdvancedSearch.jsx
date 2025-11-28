import React, { useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { X, Search, Filter, Calendar, FileText, Image as ImageIcon, File, BookOpen, Edit, CheckSquare, FileCheck, Tag } from 'lucide-react';
import './AdvancedSearch.css';

const AdvancedSearch = ({ onClose, onSelectResult }) => {
  const { subjects } = useApp();
  const [filters, setFilters] = useState({
    query: '',
    contentTypes: ['notes', 'photos', 'files'],
    sections: ['cours', 'exercices', 'corrections', 'td'],
    dateFrom: '',
    dateTo: '',
    subjects: [],
    tags: []
  });
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Obtenir tous les tags disponibles
  const getAllTags = () => {
    const tagsSet = new Set();
    subjects.forEach(subject => {
      ['cours', 'exercices', 'corrections', 'td'].forEach(section => {
        subject[section]?.notes?.forEach(note => {
          note.tags?.forEach(tag => tagsSet.add(tag));
        });
      });
    });
    return Array.from(tagsSet).sort();
  };

  const availableTags = getAllTags();

  const handleSearch = () => {
    console.log('Search triggered with filters:', filters);
    const searchResults = [];
    const query = filters.query.toLowerCase();

    subjects.forEach(subject => {
      // Filtrer par matière si spécifié
      if (filters.subjects.length > 0 && !filters.subjects.includes(subject.id)) {
        return;
      }

      filters.sections.forEach(section => {
        const sectionData = subject[section];
        if (!sectionData) return;

        // Rechercher dans les notes
        if (filters.contentTypes.includes('notes')) {
          sectionData.notes?.forEach(note => {
            const matchQuery = !query || 
              (note.title && note.title.toLowerCase().includes(query)) || 
              (note.content && note.content.toLowerCase().includes(query)) ||
              (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)));

            const matchDate = (!filters.dateFrom || new Date(note.createdAt) >= new Date(filters.dateFrom)) &&
                            (!filters.dateTo || new Date(note.createdAt) <= new Date(filters.dateTo));

            const matchTags = filters.tags.length === 0 || 
              (note.tags && filters.tags.some(tag => note.tags.includes(tag)));

            if (matchQuery && matchDate && matchTags) {
              searchResults.push({
                type: 'note',
                subjectId: subject.id,
                subjectName: subject.name,
                subjectColor: subject.color,
                section,
                data: note,
                preview: note.content.substring(0, 150) + '...'
              });
            }
          });
        }

        // Rechercher dans les photos
        if (filters.contentTypes.includes('photos')) {
          sectionData.photos?.forEach(photo => {
            const matchQuery = !query || 
              (photo.title && photo.title.toLowerCase().includes(query)) || 
              (photo.description && photo.description.toLowerCase().includes(query));

            const matchDate = (!filters.dateFrom || new Date(photo.createdAt) >= new Date(filters.dateFrom)) &&
                            (!filters.dateTo || new Date(photo.createdAt) <= new Date(filters.dateTo));

            if (matchQuery && matchDate) {
              searchResults.push({
                type: 'photo',
                subjectId: subject.id,
                subjectName: subject.name,
                subjectColor: subject.color,
                section,
                data: photo,
                preview: photo.description || 'Aucune description'
              });
            }
          });
        }

        // Rechercher dans les fichiers
        if (filters.contentTypes.includes('files')) {
          sectionData.files?.forEach(file => {
            const matchQuery = !query || 
              (file.title && file.title.toLowerCase().includes(query)) || 
              (file.name && file.name.toLowerCase().includes(query)) ||
              (file.description && file.description.toLowerCase().includes(query));

            const matchDate = (!filters.dateFrom || new Date(file.createdAt) >= new Date(filters.dateFrom)) &&
                            (!filters.dateTo || new Date(file.createdAt) <= new Date(filters.dateTo));

            if (matchQuery && matchDate) {
              searchResults.push({
                type: 'file',
                subjectId: subject.id,
                subjectName: subject.name,
                subjectColor: subject.color,
                section,
                data: file,
                preview: file.description || file.name
              });
            }
          });
        }
      });
    });

    // Trier par date décroissante
    searchResults.sort((a, b) => 
      new Date(b.data.createdAt || b.data.updatedAt) - new Date(a.data.createdAt || a.data.updatedAt)
    );

    console.log('Search results:', searchResults.length, searchResults);
    setResults(searchResults);
    setHasSearched(true);
  };

  const toggleContentType = (type) => {
    setFilters(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(type)
        ? prev.contentTypes.filter(t => t !== type)
        : [...prev.contentTypes, type]
    }));
  };

  const toggleSection = (section) => {
    setFilters(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }));
  };

  const toggleSubject = (subjectId) => {
    setFilters(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(id => id !== subjectId)
        : [...prev.subjects, subjectId]
    }));
  };

  const toggleTag = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'note': return <FileText size={20} />;
      case 'photo': return <ImageIcon size={20} />;
      case 'file': return <File size={20} />;
      default: return null;
    }
  };

  const getSectionIcon = (section) => {
    switch(section) {
      case 'cours': return <BookOpen size={16} />;
      case 'exercices': return <Edit size={16} />;
      case 'corrections': return <CheckSquare size={16} />;
      case 'td': return <FileCheck size={16} />;
      default: return null;
    }
  };

  const getSectionLabel = (section) => {
    const labels = {
      cours: 'Cours',
      exercices: 'Exercices',
      corrections: 'Corrections',
      td: 'TD'
    };
    return labels[section] || section;
  };

  const handleResultClick = (result) => {
    onSelectResult(result);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal advanced-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Recherche avancée</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="search-content">
          {/* Barre de recherche principale */}
          <div className="search-input-group">
            <Search size={20} />
            <input
              type="text"
              placeholder="Rechercher dans les notes, photos, fichiers..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
          </div>

          {/* Bouton recherche */}
          <button className="btn btn-primary search-btn" onClick={handleSearch}>
            <Search size={18} />
            Rechercher
          </button>

          {/* Filtres */}
          <div className="search-filters">
            <div className="filter-section">
              <label><Filter size={16} /> Type de contenu</label>
              <div className="filter-options">
                <button 
                  className={`filter-chip ${filters.contentTypes.includes('notes') ? 'active' : ''}`}
                  onClick={() => toggleContentType('notes')}
                >
                  <FileText size={16} />
                  Notes
                </button>
                <button 
                  className={`filter-chip ${filters.contentTypes.includes('photos') ? 'active' : ''}`}
                  onClick={() => toggleContentType('photos')}
                >
                  <ImageIcon size={16} />
                  Photos
                </button>
                <button 
                  className={`filter-chip ${filters.contentTypes.includes('files') ? 'active' : ''}`}
                  onClick={() => toggleContentType('files')}
                >
                  <File size={16} />
                  Fichiers
                </button>
              </div>
            </div>

            <div className="filter-section">
              <label><BookOpen size={16} /> Sections</label>
              <div className="filter-options">
                <button 
                  className={`filter-chip ${filters.sections.includes('cours') ? 'active' : ''}`}
                  onClick={() => toggleSection('cours')}
                >
                  <BookOpen size={16} />
                  Cours
                </button>
                <button 
                  className={`filter-chip ${filters.sections.includes('exercices') ? 'active' : ''}`}
                  onClick={() => toggleSection('exercices')}
                >
                  <Edit size={16} />
                  Exercices
                </button>
                <button 
                  className={`filter-chip ${filters.sections.includes('corrections') ? 'active' : ''}`}
                  onClick={() => toggleSection('corrections')}
                >
                  <CheckSquare size={16} />
                  Corrections
                </button>
                <button 
                  className={`filter-chip ${filters.sections.includes('td') ? 'active' : ''}`}
                  onClick={() => toggleSection('td')}
                >
                  <FileCheck size={16} />
                  TD
                </button>
              </div>
            </div>

            {subjects.length > 0 && (
              <div className="filter-section">
                <label>Matières ({filters.subjects.length > 0 ? filters.subjects.length : 'Toutes'})</label>
                <div className="filter-options scrollable">
                  {subjects.map(subject => (
                    <button 
                      key={subject.id}
                      className={`filter-chip ${filters.subjects.includes(subject.id) ? 'active' : ''}`}
                      onClick={() => toggleSubject(subject.id)}
                      style={{ borderColor: filters.subjects.includes(subject.id) ? subject.color : undefined }}
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableTags.length > 0 && (
              <div className="filter-section">
                <label><Tag size={16} /> Tags ({filters.tags.length > 0 ? filters.tags.length : 'Tous'})</label>
                <div className="filter-options scrollable">
                  {availableTags.map(tag => (
                    <button 
                      key={tag}
                      className={`filter-chip ${filters.tags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      <Tag size={14} />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-section">
              <label><Calendar size={16} /> Période</label>
              <div className="date-filters">
                <div className="date-input-group">
                  <label>Du</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>
                <div className="date-input-group">
                  <label>Au</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Résultats */}
          <div className="search-results">
            {hasSearched && (
              <div className="results-header">
                <h3>{results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}</h3>
              </div>
            )}

            {hasSearched && results.length === 0 && (
              <div className="empty-results">
                <Search size={48} />
                <h4>Aucun résultat trouvé</h4>
                <span>Essayez avec d'autres mots-clés ou modifiez les filtres</span>
              </div>
            )}

            {results.length > 0 && (
              <div className="results-list">
                {results.map((result, index) => (
                  <div 
                    key={index} 
                    className="result-item"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="result-icon" style={{ color: result.subjectColor }}>
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="result-content">
                      <div className="result-title">
                        {result.data.title || result.data.name}
                      </div>
                      <div className="result-meta">
                        <span className="result-subject" style={{ color: result.subjectColor }}>
                          {result.subjectName}
                        </span>
                        <span className="result-section">
                          {getSectionIcon(result.section)}
                          {getSectionLabel(result.section)}
                        </span>
                        <span className="result-date">
                          {new Date(result.data.createdAt || result.data.updatedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="result-preview">
                        {result.preview}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;

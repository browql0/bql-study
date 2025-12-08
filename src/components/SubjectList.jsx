import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { 
  BookOpen, FileText, Image, Trash2, SortAsc, Filter, AlertTriangle, X, File, 
  GraduationCap, Calculator, FlaskConical, Dna, Globe, BookText, Atom, Brain,
  Music, Palette, Code, Languages, Microscope, Beaker, Lightbulb, PenTool, Compass,
  Map, Camera, Film, Headphones, Gamepad2, Zap, Target, Heart, Star, Trophy, Award,
  School, Library, Notebook, History, Users, Building2, Mountain, Waves, TreePine,
  Sun, Moon, Sparkles, Gem, Crown, Shield, Sword, Flag, Plane, Car, Bike, Ship,
  Rocket, Satellite, Wifi, Cpu, HardDrive, Database, Network, Server, Paintbrush,
  Scissors, Hammer, Wrench, Key, Lock, Unlock, Bell, Clock, Calendar, Mail, Phone,
  MessageSquare, Video, Radio, Tv, Monitor, Laptop, Tablet, Smartphone, Printer,
  Folder, FolderOpen, Archive, Search, Settings, Cog, BarChart, PieChart, TrendingUp,
  DollarSign, Euro, Coins, Wallet, CreditCard, Receipt, ShoppingCart, RefreshCw
} from 'lucide-react';
import ProtectedContent from './ProtectedContent';
import './SubjectList.css';

// Map des icônes disponibles
const ICON_MAP = {
  BookOpen, GraduationCap, Calculator, FlaskConical, Dna, Globe, BookText, Atom,
  Music, Palette, Code, Languages, Microscope, Beaker, Brain, Lightbulb, PenTool,
  Compass, Map, Camera, Film, Headphones, Gamepad2, Zap, Target, Heart, Star,
  Trophy, Award, School, Library, Notebook, FileText, History, Users, Building2,
  Mountain, Waves, TreePine, Sun, Moon, Sparkles, Gem, Crown, Shield, Sword, Flag,
  Plane, Car, Bike, Ship, Rocket, Satellite, Wifi, Cpu, HardDrive, Database, Network,
  Server, Paintbrush, Scissors, Hammer, Wrench, Key, Lock, Unlock, Bell, Clock,
  Calendar, Mail, Phone, MessageSquare, Video, Radio, Tv, Monitor, Laptop, Tablet,
  Smartphone, Printer, Folder, FolderOpen, Archive, Search, Filter, Settings, Cog,
  BarChart, PieChart, TrendingUp, DollarSign, Euro, Coins, Wallet, CreditCard,
  Receipt, ShoppingCart
};

const SubjectList = ({ onSelectSubject, hasSubscription, onUpgrade }) => {
  const { subjects, searchQuery, deleteSubject, isAdmin, loadSubjects } = useApp();
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ajouter/retirer la classe modal-open au body quand le modal de confirmation est ouvert
  useEffect(() => {
    if (deleteConfirm) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [deleteConfirm]);

  const filteredSubjects = subjects.filter(subject => {
    const query = searchQuery.toLowerCase();
    const nameMatch = subject.name.toLowerCase().includes(query);
    
    // Rechercher dans toutes les sections
    const sections = ['cours', 'exercices', 'corrections'];
    const notesMatch = sections.some(section => 
      subject[section]?.notes?.some(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query)
      )
    );
    
    return nameMatch || notesMatch;
  });

  const sortedSubjects = [...filteredSubjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'notes': {
        const aNotesCount = (a.cours?.notes?.length || 0) + (a.exercices?.notes?.length || 0) + (a.corrections?.notes?.length || 0);
        const bNotesCount = (b.cours?.notes?.length || 0) + (b.exercices?.notes?.length || 0) + (b.corrections?.notes?.length || 0);
        return bNotesCount - aNotesCount;
      }
      case 'photos': {
        const aPhotosCount = (a.cours?.photos?.length || 0) + (a.exercices?.photos?.length || 0) + (a.corrections?.photos?.length || 0);
        const bPhotosCount = (b.cours?.photos?.length || 0) + (b.exercices?.photos?.length || 0) + (b.corrections?.photos?.length || 0);
        return bPhotosCount - aPhotosCount;
      }
      case 'recent':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  const handleDelete = (e, subjectId) => {
    e.stopPropagation();
    setDeleteConfirm(subjectId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteSubject(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadSubjects();
      // Attendre un peu pour que l'animation soit visible
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="empty-state scale-in">
        <BookOpen size={80} color="var(--text-secondary)" />
        <h2>Aucune matière</h2>
        <p>Commencez par créer votre première matière</p>
      </div>
    );
  }

  return (
    <ProtectedContent 
      hasAccess={hasSubscription || isAdmin}
      onUpgrade={onUpgrade}
      message="Abonnez-vous pour accéder à toutes les matières et contenus"
    >
      <div className="subject-list">
      <div className="list-header">
        <div className="section-title-wrapper">
          <div className="section-title-icon">
            <BookOpen size={28} strokeWidth={2.5} />
          </div>
          <div className="section-title-text">
            <h2 className="section-title">
              <span className="main-title">Mes Matières</span>
              {searchQuery && (
                <span className="subtitle">{sortedSubjects.length} résultat{sortedSubjects.length > 1 ? 's' : ''}</span>
              )}
            </h2>
          </div>
        </div>
        <div className="list-actions">
          <button 
            className={`btn-icon refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRefresh();
            }}
            title="Rafraîchir"
            type="button"
            disabled={isRefreshing}
          >
            <RefreshCw size={18} className={isRefreshing ? 'spinning' : ''} />
          </button>
          <button 
            className={`btn-icon filter-btn ${showFilters ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowFilters(!showFilters);
            }}
            title="Filtres et tri"
            type="button"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {showFilters && (
        <>
          <div className="filters-overlay" onClick={() => setShowFilters(false)} />
          <div className="filters-panel">
            <div className="filter-panel-header">
              <h3 className="filter-panel-title">
                <Filter size={20} />
                Filtres et Tri
              </h3>
              <button 
                className="filter-close-btn"
                onClick={() => setShowFilters(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="filter-group">
              <label>
                <SortAsc size={16} />
                Trier par
              </label>
              <div className="filter-options">
                <button 
                  className={`filter-option ${sortBy === 'recent' ? 'active' : ''}`}
                  onClick={() => setSortBy('recent')}
                  type="button"
                >
                  <span>Plus récent</span>
                </button>
                <button 
                  className={`filter-option ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => setSortBy('name')}
                  type="button"
                >
                  <span>Nom A-Z</span>
                </button>
                <button 
                  className={`filter-option ${sortBy === 'notes' ? 'active' : ''}`}
                  onClick={() => setSortBy('notes')}
                  type="button"
                >
                  <span>Plus de notes</span>
                </button>
                <button 
                  className={`filter-option ${sortBy === 'photos' ? 'active' : ''}`}
                  onClick={() => setSortBy('photos')}
                  type="button"
                >
                  <span>Plus de photos</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      <div className="subjects-grid">
        {sortedSubjects.map((subject, index) => {
          const SubjectIcon = ICON_MAP[subject.icon] || BookOpen;
          const accent = subject.color || '#4f8ff0';
          const notesCount = ['cours','exercices','corrections','td'].reduce((acc, sec) => acc + (subject[sec]?.notes?.length || 0), 0);
          const photosCount = ['cours','exercices','corrections','td'].reduce((acc, sec) => acc + (subject[sec]?.photos?.length || 0), 0);
          const filesCount = ['cours','exercices','corrections','td'].reduce((acc, sec) => acc + (subject[sec]?.files?.length || 0), 0);
          // Compter tous les quizzes et flashcards
          const quizzesCount = subject.quizzes?.length || 0;

          return (
            <article
              key={subject.id}
              className="subject-card compact-card"
              onClick={() => onSelectSubject(subject)}
              style={{ animationDelay: `${index * 0.04}s`, '--accent-color': accent }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelectSubject(subject); }}
              aria-label={`Ouvrir la matière ${subject.name}`}
            >
              <div className="card-accent" style={{ background: accent }} aria-hidden="true" />
              
              {isAdmin() && (
                <button
                  className="delete-small"
                  onClick={(e) => handleDelete(e, subject.id)}
                  title="Supprimer"
                  aria-label={`Supprimer ${subject.name}`}
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className="card-main">
                <div className="card-left">
                  <div className="icon-circle" style={{ boxShadow: `0 6px 18px ${accent}33` }}>
                    <SubjectIcon size={28} style={{ color: accent }} />
                  </div>
                </div>

                <div className="card-center">
                  <h3 className="card-title">{subject.name}</h3>
                  <p className="card-sub">{subject.description || `${notesCount} notes • ${photosCount} photos`}</p>
                  <div className="card-chips">
                    <span className="chip">
                      <FileText size={16} />
                      <span>{notesCount}</span>
                    </span>
                    <span className="chip">
                      <Image size={16} />
                      <span>{photosCount}</span>
                    </span>
                    <span className="chip">
                      <File size={16} />
                      <span>{filesCount}</span>
                    </span>
                    <span className="chip">
                      <Brain size={16} />
                      <span>{quizzesCount}</span>
                    </span>
                  </div>
                </div>

              </div>
            </article>
          );
        })}
      </div>

      {filteredSubjects.length === 0 && searchQuery && (
        <div className="empty-state fade-in">
          <p>Aucun résultat pour "{searchQuery}"</p>
        </div>
      )}

      {isRefreshing && (
        <div className="refresh-loading-overlay">
          <div className="refresh-loading-container">
            <div className="refresh-loading-icon">
              <RefreshCw size={48} className="spinning" />
            </div>
            <h3 className="refresh-loading-title">Actualisation...</h3>
            <p className="refresh-loading-text">Chargement des matières</p>
            <div className="refresh-loading-dots">
              <span></span>
              <span></span>
              <span></span>
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
                  <p className="confirm-question">Supprimer cette matière ?</p>
                  <p className="warning-text">Toutes les notes et photos associées seront définitivement supprimées.</p>
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
    </div>
    </ProtectedContent>
  );
};

export default SubjectList;

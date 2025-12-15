import React, { useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import {
  ArrowLeft, FileText, Image as ImageIcon, Plus, BookOpen, Edit, CheckSquare, Download, FileCheck, File,
  GraduationCap, Calculator, FlaskConical, Dna, Globe, BookText, Atom, Brain, Music, Palette, Code,
  Languages, Microscope, Beaker, Lightbulb, PenTool, Compass, Map, Camera, Film, Headphones,
  Gamepad2, Zap, Target, Heart, Star, Trophy, Award, School, Library, Notebook, History, Users,
  Building2, Mountain, Waves, TreePine, Sun, Moon, Sparkles, Gem, Crown, Shield, Sword, Flag,
  Plane, Car, Bike, Ship, Rocket, Satellite, Wifi, Cpu, HardDrive, Database, Network, Server,
  Paintbrush, Scissors, Hammer, Wrench, Key, Lock, Unlock, Bell, Clock, Calendar, Mail, Phone,
  MessageSquare, Video, Radio, Tv, Monitor, Laptop, Tablet, Smartphone, Printer, Folder, FolderOpen,
  Archive, Search, Filter, Settings, Cog, BarChart, PieChart, TrendingUp, DollarSign, Euro, Coins,
  Wallet, CreditCard, Receipt, ShoppingCart, Layers
} from 'lucide-react';
import NotesList from './NotesList';
import PhotoGallery from './PhotoGallery';
import FilesList from './FilesList';
import QuizList from './QuizList';
import QuizPlayer from './QuizPlayer';
import FlashcardViewer from './FlashcardViewer';
import AddNoteModal from './AddNoteModal';
import AddPhotoModal from './AddPhotoModal';
import AddFileModal from './AddFileModal';
import AddQuizModal from './AddQuizModal';
import ProtectedContent from './ProtectedContent';
import { quizService } from '../services/quizService';
import './SubjectDetail.css';

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

const SubjectDetail = ({ subject, onBack, initialSection = 'cours', initialTab = 'notes', hasSubscription, onUpgrade }) => {
  const { subjects, isAdmin } = useApp();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [showAddFlashcard, setShowAddFlashcard] = useState(false);
  const [playingQuiz, setPlayingQuiz] = useState(null);
  const [playingFlashcard, setPlayingFlashcard] = useState(null);
  const [quizKey, setQuizKey] = useState(0);

  // Update active section and tab when initialSection or initialTab changes
  React.useEffect(() => {
    setActiveSection(initialSection);
    setActiveTab(initialTab);
  }, [initialSection, initialTab]);

  // Obtenir les données à jour du sujet
  const currentSubject = subjects.find(s => s.id === subject.id) || subject;

  const getSectionData = () => {
    return currentSubject[activeSection] || { notes: [], photos: [], files: [] };
  };

  const exportNotes = () => {
    const sectionData = getSectionData();
    const content = sectionData.notes.map(note =>
      `${note.title}\n${'='.repeat(note.title.length)}\n\n${note.content}\n\n`
    ).join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSubject.name}_${activeSection}_notes.txt`;
    a.click();
  };

  const getTotalStats = () => {
    const totalNotes = (currentSubject.cours?.notes?.length || 0) +
      (currentSubject.exercices?.notes?.length || 0) +
      (currentSubject.corrections?.notes?.length || 0) +
      (currentSubject.td?.notes?.length || 0);
    const totalPhotos = (currentSubject.cours?.photos?.length || 0) +
      (currentSubject.exercices?.photos?.length || 0) +
      (currentSubject.corrections?.photos?.length || 0) +
      (currentSubject.td?.photos?.length || 0);
    return { totalNotes, totalPhotos };
  };

  const { totalNotes, totalPhotos } = getTotalStats();
  const sectionData = getSectionData();
  const SubjectIcon = ICON_MAP[currentSubject.icon] || BookOpen;

  return (
    <div className="subject-detail fade-in">
      <div className="detail-header">
        <button className="btn-icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="detail-title">
          <div className="detail-title-content">
            <SubjectIcon size={28} style={{ color: currentSubject.color }} />
            <h1>{currentSubject.name}</h1>
          </div>
          <div className="detail-stats">
            <span>{totalNotes} notes</span>
            <span>{totalPhotos} photos</span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={exportNotes}>
          <Download size={18} />
          Exporter
        </button>
      </div>

      {/* Sections: Cours, Exercices, Corrections */}
      <div className="sections">
        <button
          className={`section-btn ${activeSection === 'cours' ? 'active' : ''}`}
          onClick={() => setActiveSection('cours')}
        >
          <BookOpen size={18} />
          <span>Cours</span>
          <span className="badge">{(currentSubject.cours?.notes?.length || 0) + (currentSubject.cours?.photos?.length || 0) + (currentSubject.cours?.files?.length || 0)}</span>
        </button>
        <button
          className={`section-btn ${activeSection === 'exercices' ? 'active' : ''}`}
          onClick={() => setActiveSection('exercices')}
        >
          <Edit size={18} />
          <span>Exercices</span>
          <span className="badge">{(currentSubject.exercices?.notes?.length || 0) + (currentSubject.exercices?.photos?.length || 0) + (currentSubject.exercices?.files?.length || 0)}</span>
        </button>
        <button
          className={`section-btn ${activeSection === 'corrections' ? 'active' : ''}`}
          onClick={() => setActiveSection('corrections')}
        >
          <CheckSquare size={18} />
          <span>Corrections</span>
          <span className="badge">{(currentSubject.corrections?.notes?.length || 0) + (currentSubject.corrections?.photos?.length || 0) + (currentSubject.corrections?.files?.length || 0)}</span>
        </button>
        <button
          className={`section-btn ${activeSection === 'td' ? 'active' : ''}`}
          onClick={() => setActiveSection('td')}
        >
          <FileCheck size={18} />
          <span>TD</span>
          <span className="badge">{(currentSubject.td?.notes?.length || 0) + (currentSubject.td?.photos?.length || 0) + (currentSubject.td?.files?.length || 0)}</span>
        </button>
      </div>

      {/* Tabs: Notes, Photos, Fichiers et Quiz */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <FileText size={18} />
          <span>Notes</span>
          <span className="tab-count">({sectionData.notes?.length || 0})</span>
        </button>
        <button
          className={`tab ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          <ImageIcon size={18} />
          <span>Photos</span>
          <span className="tab-count">({sectionData.photos?.length || 0})</span>
        </button>
        <button
          className={`tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <File size={18} />
          <span>Fichiers</span>
          <span className="tab-count">({sectionData.files?.length || 0})</span>
        </button>
        <button
          className={`tab ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          <Brain size={18} />
          <span>Quiz</span>
        </button>
        <button
          className={`tab ${activeTab === 'flashcard' ? 'active' : ''}`}
          onClick={() => setActiveTab('flashcard')}
        >
          <Layers size={18} />
          <span>Flashcards</span>
        </button>
      </div>

      <div className="tab-actions">
        {isAdmin() && (
          <>
            {activeTab === 'notes' && (
              <button className="btn btn-primary" onClick={() => setShowAddNote(true)}>
                <Plus size={18} />
                Nouvelle Note
              </button>
            )}
            {activeTab === 'photos' && (
              <button className="btn btn-primary" onClick={() => setShowAddPhoto(true)}>
                <Plus size={18} />
                Ajouter Photo
              </button>
            )}
            {activeTab === 'files' && (
              <button className="btn btn-primary" onClick={() => setShowAddFile(true)}>
                <Plus size={18} />
                Ajouter Fichier
              </button>
            )}
            {activeTab === 'quiz' && (
              <button className="btn btn-primary" onClick={() => setShowAddQuiz(true)}>
                <Plus size={18} />
                Nouveau Quiz
              </button>
            )}
            {activeTab === 'flashcard' && (
              <button className="btn btn-primary" onClick={() => setShowAddFlashcard(true)}>
                <Plus size={18} />
                Nouvelle Flashcard
              </button>
            )}
          </>
        )}
      </div>

      <ProtectedContent
        hasAccess={hasSubscription || isAdmin()}
        onUpgrade={onUpgrade}
        message="Abonnez-vous pour accéder aux notes, photos, fichiers et quiz"
      >
        <div className="tab-content">
          {activeTab === 'notes' && (
            <NotesList
              subjectId={currentSubject.id}
              section={activeSection}
              notes={sectionData.notes || []}
            />
          )}
          {activeTab === 'photos' && (
            <PhotoGallery
              subjectId={currentSubject.id}
              section={activeSection}
              photos={sectionData.photos || []}
            />
          )}
          {activeTab === 'files' && (
            <FilesList
              subjectId={currentSubject.id}
              section={activeSection}
              files={sectionData.files || []}
            />
          )}
          {activeTab === 'quiz' && (
            <QuizList
              key={`quiz-${quizKey}`}
              subjectId={currentSubject.id}
              section={activeSection}
              filterType="quiz"
              onPlayQuiz={(quiz) => setPlayingQuiz(quiz)}
              onPlayFlashcard={(quiz) => setPlayingFlashcard(quiz)}
            />
          )}
          {activeTab === 'flashcard' && (
            <QuizList
              key={`flashcard-${quizKey}`}
              subjectId={currentSubject.id}
              section={activeSection}
              filterType="flashcard"
              onPlayQuiz={(quiz) => setPlayingQuiz(quiz)}
              onPlayFlashcard={(quiz) => setPlayingFlashcard(quiz)}
            />
          )}
        </div>
      </ProtectedContent>

      {showAddNote && (
        <AddNoteModal
          subjectId={currentSubject.id}
          section={activeSection}
          onClose={() => setShowAddNote(false)}
        />
      )}

      {showAddPhoto && (
        <AddPhotoModal
          subjectId={currentSubject.id}
          section={activeSection}
          onClose={() => setShowAddPhoto(false)}
        />
      )}

      {showAddFile && (
        <AddFileModal
          subjectId={currentSubject.id}
          section={activeSection}
          onClose={() => setShowAddFile(false)}
        />
      )}

      {showAddQuiz && (
        <AddQuizModal
          subjectId={currentSubject.id}
          subjectName={currentSubject.name}
          section={activeSection}
          initialType="quiz"
          lockedType={true}
          onClose={() => setShowAddQuiz(false)}
          onSave={async (subjectId, section, quizData) => {
            await quizService.createQuiz(subjectId, section, quizData);
            setQuizKey(prev => prev + 1); // Recharger la liste

            // Notifier les spectateurs du nouveau quiz
            try {
              const { notifySpectators } = await import('../services/pushNotificationService');
              await notifySpectators(subjectId, 'quiz', quizData.title || 'Nouveau quiz');
            } catch (notifError) {
              console.debug('Push notification failed:', notifError);
            }
          }}
        />
      )}

      {showAddFlashcard && (
        <AddQuizModal
          subjectId={currentSubject.id}
          subjectName={currentSubject.name}
          section={activeSection}
          initialType="flashcard"
          lockedType={true}
          onClose={() => setShowAddFlashcard(false)}
          onSave={async (subjectId, section, quizData) => {
            await quizService.createQuiz(subjectId, section, quizData);
            setQuizKey(prev => prev + 1); // Recharger la liste

            // Notifier les spectateurs de la nouvelle flashcard
            try {
              const { notifySpectators } = await import('../services/pushNotificationService');
              await notifySpectators(subjectId, 'flashcard', quizData.title || 'Nouvelle flashcard');
            } catch (notifError) {
              console.debug('Push notification failed:', notifError);
            }
          }}
        />
      )}

      {playingQuiz && (
        <QuizPlayer
          quiz={playingQuiz}
          onClose={() => setPlayingQuiz(null)}
          onComplete={() => setQuizKey(prev => prev + 1)}
        />
      )}

      {playingFlashcard && (
        <FlashcardViewer
          quiz={playingFlashcard}
          onClose={() => setPlayingFlashcard(null)}
        />
      )}
    </div>
  );
};

export default SubjectDetail;
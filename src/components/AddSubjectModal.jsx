import React, { useState } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { 
  X, BookOpen, GraduationCap, Calculator, FlaskConical, Dna, Globe, BookText, Atom,
  Music, Palette, Code, Languages, Microscope, Beaker, Brain, Lightbulb, 
  PenTool, Compass, Map, Camera, Film, Headphones, Gamepad2, Zap, Target,
  Heart, Star, Trophy, Award, School, Library, Notebook, FileText,
  History, Users, Building2, Mountain, Waves, TreePine, Sun, Moon,
  Sparkles, Gem, Crown, Shield, Sword, Flag, Plane, Car, Bike, Ship,
  Rocket, Satellite, Wifi, Cpu, HardDrive, Database, Network, Server,
  Paintbrush, Scissors, Hammer, Wrench, Key, Lock, Unlock, Bell, Clock,
  Calendar, Mail, Phone, MessageSquare, Video, Radio, Tv, Monitor,
  Laptop, Tablet, Smartphone, Printer, Folder, FolderOpen, Archive,
  Search, Filter, Settings, Cog, BarChart, PieChart, TrendingUp,
  DollarSign, Euro, Coins, Wallet, CreditCard, Receipt, ShoppingCart
} from 'lucide-react';
import './AddSubjectModal.css';

const COLORS = [
  // Blue
  '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd',

  // Indigo / Violet
  '#8b5cf6', '#7c3aed', '#6d28d9', '#a78bfa', '#c4b5fd',

  // Pink / Magenta
  '#ec4899', '#db2777', '#be185d', '#f472b6', '#f9a8d4',

  // Red
  '#ef4444', '#dc2626', '#b91c1c', '#f87171', '#fecaca',

  // Orange
  '#f97316', '#ea580c', '#c2410c', '#fdba74', '#fed7aa',

  // Yellow
  '#f59e0b', '#d97706', '#b45309', '#fcd34d', '#fde68a',

  // Green
  '#10b981', '#059669', '#047857', '#6ee7b7', '#a7f3d0',

  // Lime
  '#84cc16', '#65a30d', '#4d7c0f', '#bef264', '#d9f99d',

  // Teal / Aqua
  '#14b8a6', '#0d9488', '#0f766e', '#5eead4', '#99f6e4',

  // Cyan / Light Blue
  '#06b6d4', '#0891b2', '#0e7490', '#67e8f9', '#a5f3fc',

  // Purple
  '#a855f7', '#9333ea', '#7e22ce', '#d8b4fe', '#ede9fe'
];

const ICONS = [
  { name: 'BookOpen', component: BookOpen, label: 'Livre' },
  { name: 'GraduationCap', component: GraduationCap, label: 'Diplôme' },
  { name: 'Calculator', component: Calculator, label: 'Calculatrice' },
  { name: 'FlaskConical', component: FlaskConical, label: 'Chimie' },
  { name: 'Dna', component: Dna, label: 'Biologie' },
  { name: 'Globe', component: Globe, label: 'Géographie' },
  { name: 'BookText', component: BookText, label: 'Texte' },
  { name: 'Atom', component: Atom, label: 'Physique' },
  { name: 'Music', component: Music, label: 'Musique' },
  { name: 'Palette', component: Palette, label: 'Art' },
  { name: 'Code', component: Code, label: 'Programmation' },
  { name: 'Languages', component: Languages, label: 'Langues' },
  { name: 'Microscope', component: Microscope, label: 'Science' },
  { name: 'Beaker', component: Beaker, label: 'Expérience' },
  { name: 'Brain', component: Brain, label: 'Psychologie' },
  { name: 'Lightbulb', component: Lightbulb, label: 'Idée' },
  { name: 'PenTool', component: PenTool, label: 'Dessin' },
  { name: 'Compass', component: Compass, label: 'Maths' },
  { name: 'Map', component: Map, label: 'Carte' },
  { name: 'Camera', component: Camera, label: 'Photo' },
  { name: 'Film', component: Film, label: 'Cinéma' },
  { name: 'Headphones', component: Headphones, label: 'Audio' },
  { name: 'Gamepad2', component: Gamepad2, label: 'Gaming' },
  { name: 'Zap', component: Zap, label: 'Énergie' },
  { name: 'Target', component: Target, label: 'Objectif' },
  { name: 'Heart', component: Heart, label: 'Santé' },
  { name: 'Star', component: Star, label: 'Favori' },
  { name: 'Trophy', component: Trophy, label: 'Trophée' },
  { name: 'Award', component: Award, label: 'Récompense' },
  { name: 'School', component: School, label: 'École' },
  { name: 'Library', component: Library, label: 'Bibliothèque' },
  { name: 'Notebook', component: Notebook, label: 'Cahier' },
  { name: 'FileText', component: FileText, label: 'Document' },
  { name: 'History', component: History, label: 'Histoire' },
  { name: 'Users', component: Users, label: 'Sociologie' },
  { name: 'Building2', component: Building2, label: 'Architecture' },
  { name: 'Mountain', component: Mountain, label: 'Géologie' },
  { name: 'Waves', component: Waves, label: 'Océanographie' },
  { name: 'TreePine', component: TreePine, label: 'Environnement' },
  { name: 'Sun', component: Sun, label: 'Astronomie' },
  { name: 'Moon', component: Moon, label: 'Astronomie' },
  { name: 'Sparkles', component: Sparkles, label: 'Magie' },
  { name: 'Gem', component: Gem, label: 'Géologie' },
  { name: 'Crown', component: Crown, label: 'Histoire' },
  { name: 'Shield', component: Shield, label: 'Droit' },
  { name: 'Sword', component: Sword, label: 'Histoire' },
  { name: 'Flag', component: Flag, label: 'Politique' },
  { name: 'Plane', component: Plane, label: 'Transport' },
  { name: 'Car', component: Car, label: 'Mécanique' },
  { name: 'Bike', component: Bike, label: 'Sport' },
  { name: 'Ship', component: Ship, label: 'Maritime' },
  { name: 'Rocket', component: Rocket, label: 'Aérospatial' },
  { name: 'Satellite', component: Satellite, label: 'Technologie' },
  { name: 'Wifi', component: Wifi, label: 'Réseaux' },
  { name: 'Cpu', component: Cpu, label: 'Informatique' },
  { name: 'HardDrive', component: HardDrive, label: 'Stockage' },
  { name: 'Database', component: Database, label: 'Base de données' },
  { name: 'Network', component: Network, label: 'Réseaux' },
  { name: 'Server', component: Server, label: 'Serveur' },
  { name: 'Paintbrush', component: Paintbrush, label: 'Peinture' },
  { name: 'Scissors', component: Scissors, label: 'Artisanat' },
  { name: 'Hammer', component: Hammer, label: 'Construction' },
  { name: 'Wrench', component: Wrench, label: 'Mécanique' },
  { name: 'Key', component: Key, label: 'Sécurité' },
  { name: 'Lock', component: Lock, label: 'Sécurité' },
  { name: 'Unlock', component: Unlock, label: 'Sécurité' },
  { name: 'Bell', component: Bell, label: 'Notification' },
  { name: 'Clock', component: Clock, label: 'Temps' },
  { name: 'Calendar', component: Calendar, label: 'Calendrier' },
  { name: 'Mail', component: Mail, label: 'Communication' },
  { name: 'Phone', component: Phone, label: 'Télécommunication' },
  { name: 'MessageSquare', component: MessageSquare, label: 'Messagerie' },
  { name: 'Video', component: Video, label: 'Vidéo' },
  { name: 'Radio', component: Radio, label: 'Radio' },
  { name: 'Tv', component: Tv, label: 'Télévision' },
  { name: 'Monitor', component: Monitor, label: 'Écran' },
  { name: 'Laptop', component: Laptop, label: 'Informatique' },
  { name: 'Tablet', component: Tablet, label: 'Tablette' },
  { name: 'Smartphone', component: Smartphone, label: 'Mobile' },
  { name: 'Printer', component: Printer, label: 'Impression' },
  { name: 'Folder', component: Folder, label: 'Dossier' },
  { name: 'FolderOpen', component: FolderOpen, label: 'Dossier ouvert' },
  { name: 'Archive', component: Archive, label: 'Archive' },
  { name: 'Search', component: Search, label: 'Recherche' },
  { name: 'Filter', component: Filter, label: 'Filtre' },
  { name: 'Settings', component: Settings, label: 'Paramètres' },
  { name: 'Cog', component: Cog, label: 'Configuration' },
  { name: 'BarChart', component: BarChart, label: 'Statistiques' },
  { name: 'PieChart', component: PieChart, label: 'Graphique' },
  { name: 'TrendingUp', component: TrendingUp, label: 'Croissance' },
  { name: 'DollarSign', component: DollarSign, label: 'Économie' },
  { name: 'Euro', component: Euro, label: 'Finance' },
  { name: 'Coins', component: Coins, label: 'Monnaie' },
  { name: 'Wallet', component: Wallet, label: 'Portefeuille' },
  { name: 'CreditCard', component: CreditCard, label: 'Paiement' },
  { name: 'Receipt', component: Receipt, label: 'Facture' },
  { name: 'ShoppingCart', component: ShoppingCart, label: 'Commerce' }
];

const AddSubjectModal = ({ onClose }) => {
  const { addSubject } = useApp();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState('BookOpen');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim()) {
      await addSubject(name.trim(), color, icon);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal add-subject-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <BookOpen size={24} />
            Nouvelle Matière
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>
                <FileText size={16} />
                Nom de la matière
              </label>
              <input
                type="text"
                placeholder="Ex: Mathématiques, Physique, Histoire..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                <Palette size={16} />
                Couleur
              </label>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <div
                    key={c}
                    className={`color-option ${color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  >
                    {color === c && <div className="check-mark">✓</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>
                <Star size={16} />
                Icône
              </label>
              <div className="icon-picker">
                {ICONS.map(({ name, component: Icon, label }) => (
                  <div
                    key={name}
                    className={`icon-option ${icon === name ? 'selected' : ''}`}
                    onClick={() => setIcon(name)}
                    style={{ 
                      borderColor: icon === name ? color : 'rgba(79, 143, 240, 0.2)',
                      backgroundColor: icon === name ? `${color}15` : 'transparent'
                    }}
                    title={label}
                  >
                    <Icon size={22} style={{ color: icon === name ? color : 'var(--text-secondary)' }} />
                    {icon === name && <div className="icon-check" style={{ color: color }}>✓</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <X size={18} />
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              <BookOpen size={18} />
              Créer la matière
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubjectModal;

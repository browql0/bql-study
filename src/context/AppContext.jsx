/* eslint-disable react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useLayoutEffect } from 'react';
import { notificationsService } from '../services/notificationsService';

/* eslint-disable react-refresh/only-export-components */
const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [subjects, setSubjects] = useState([]);
  const [theme, setTheme] = useState('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([
    // Utilisateur admin par défaut
    { id: '1', username: 'admin', password: 'admin123', role: 'admin', name: 'Administrateur', createdAt: '2024-01-01T00:00:00.000Z' },
    { id: '2', username: 'user', password: 'user123', role: 'spectator', name: 'Utilisateur Test', createdAt: '2024-01-01T00:00:00.000Z' }
  ]);

  // Charger le thème depuis localStorage (seul élément conservé)
  useLayoutEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Login
  const login = (username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      return { success: true, user };
    }
    return { success: false, error: 'Identifiants incorrects' };
  };

  // Logout
  const logout = () => {
    setCurrentUser(null);
    setSubjects([]);
  };

  // Register (nouveau spectateur)
  const register = (username, password, name) => {
    const exists = users.find(u => u.username === username);
    if (exists) {
      return { success: false, error: 'Nom d\'utilisateur déjà pris' };
    }
    const newUser = {
      id: Date.now().toString(),
      username,
      password,
      role: 'spectator',
      name,
      createdAt: new Date().toISOString()
    };
    setUsers([...users, newUser]);
    return { success: true, user: newUser };
  };

  // Mettre à jour le profil
  const updateProfile = (profileData) => {
    const updatedUser = { ...currentUser, ...profileData };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    return { success: true };
  };

  // Vérifier si admin
  const isAdmin = () => currentUser?.role === 'admin';

  // Ajouter une matière (Admin seulement)
  const addSubject = (name, color) => {
    if (!isAdmin()) {
      return { success: false, error: 'Action réservée aux administrateurs' };
    }
    const newSubject = {
      id: Date.now().toString(),
      name,
      color,
      cours: { notes: [], photos: [], files: [] },
      exercices: { notes: [], photos: [], files: [] },
      corrections: { notes: [], photos: [], files: [] },
      td: { notes: [], photos: [], files: [] },
      createdAt: new Date().toISOString(),
    };
    setSubjects([...subjects, newSubject]);
    return { success: true, subject: newSubject };
  };

  // Supprimer une matière (Admin seulement)
  const deleteSubject = (subjectId) => {
    if (!isAdmin()) return { success: false, error: 'Action réservée aux administrateurs' };
    setSubjects(subjects.filter(s => s.id !== subjectId));
    return { success: true };
  };

  // Ajouter une note (Admin seulement)
  const addNote = async (subjectId, section, noteData) => {
    if (!isAdmin()) return { success: false, error: 'Action réservée aux administrateurs' };
    
    const newNote = {
      id: Date.now().toString(),
      title: noteData.title,
      content: noteData.content,
      tags: noteData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          [section]: {
            ...subject[section],
            notes: [...subject[section].notes, newNote],
          },
        };
      }
      return subject;
    }));
    
    // Envoyer notification aux spectateurs
    try {
      const subject = subjects.find(s => s.id === subjectId);
      await notificationsService.notifySpectatorsNewContent(
        'new_note',
        'Nouvelle note ajoutée',
        `Une nouvelle note "${noteData.title}" a été ajoutée dans ${subject?.name || 'un cours'}`,
        {
          subjectId,
          section,
          noteId: newNote.id,
          noteTitle: noteData.title
        }
      );
    } catch (error) {
      console.error('Erreur notification:', error);
    }
    
    return { success: true };
  };

  // Modifier une note (Admin seulement)
  const updateNote = (subjectId, section, noteId, noteData) => {
    if (!isAdmin()) return { success: false, error: 'Action réservée aux administrateurs' };
    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          [section]: {
            ...subject[section],
            notes: subject[section].notes.map(note => 
              note.id === noteId 
                ? { ...note, ...noteData, updatedAt: new Date().toISOString() }
                : note
            ),
          },
        };
      }
      return subject;
    }));
    return { success: true };
  };

  // Supprimer une note (Admin seulement)
  const deleteNote = (subjectId, section, noteId) => {
    if (!isAdmin()) return { success: false, error: 'Action réservée aux administrateurs' };
    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          [section]: {
            ...subject[section],
            notes: subject[section].notes.filter(note => note.id !== noteId),
          },
        };
      }
      return subject;
    }));
    return { success: true };
  };

  // Ajouter une photo (Admin seulement)
  const addPhoto = async (subjectId, section, photoData) => {
    if (!isAdmin()) return { success: false, error: 'Action réservée aux administrateurs' };
    
    const newPhoto = {
      id: Date.now().toString(),
      url: photoData.url,
      title: photoData.title,
      description: photoData.description || '',
      createdAt: new Date().toISOString(),
    };
    
    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          [section]: {
            ...subject[section],
            photos: [...subject[section].photos, newPhoto],
          },
        };
      }
      return subject;
    }));
    
    // Envoyer notification aux spectateurs
    try {
      const subject = subjects.find(s => s.id === subjectId);
      await notificationsService.notifySpectatorsNewContent(
        'new_photo',
        'Nouvelle photo ajoutée',
        `Une nouvelle photo "${photoData.title}" a été ajoutée dans ${subject?.name || 'un cours'}`,
        {
          subjectId,
          section,
          photoId: newPhoto.id,
          photoTitle: photoData.title
        }
      );
    } catch (error) {
      console.error('Erreur notification:', error);
    }
    
    return { success: true };
  };

  // Supprimer une photo (Admin seulement)
  const deletePhoto = (subjectId, section, photoId) => {
    if (!isAdmin()) return { success: false, error: 'Action réservée aux administrateurs' };
    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          [section]: {
            ...subject[section],
            photos: subject[section].photos.filter(photo => photo.id !== photoId),
          },
        };
      }
      return subject;
    }));
    return { success: true };
  };

  // Ajouter un fichier (Admin seulement)
  const addFile = async (subjectId, section, fileData) => {
    if (!isAdmin()) return { success: false, error: 'Action réservée aux administrateurs' };
    
    const newFile = {
      id: Date.now().toString(),
      url: fileData.url,
      name: fileData.name,
      title: fileData.title,
      description: fileData.description || '',
      size: fileData.size || 0,
      createdAt: new Date().toISOString(),
    };
    
    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          [section]: {
            ...subject[section],
            files: [...(subject[section].files || []), newFile],
          },
        };
      }
      return subject;
    }));
    
    // Envoyer notification aux spectateurs
    try {
      const subject = subjects.find(s => s.id === subjectId);
      await notificationsService.notifySpectatorsNewContent(
        'new_file',
        'Nouveau fichier ajouté',
        `Un nouveau fichier "${fileData.title || fileData.name}" a été ajouté dans ${subject?.name || 'un cours'}`,
        {
          subjectId,
          section,
          fileId: newFile.id,
          fileName: fileData.name,
          fileTitle: fileData.title
        }
      );
    } catch (error) {
      console.error('Erreur notification:', error);
    }
    
    return { success: true };
  };

  // Supprimer un fichier (Admin seulement)
  const deleteFile = (subjectId, section, fileId) => {
    if (!isAdmin()) return { success: false, error: 'Action réservée aux administrateurs' };
    setSubjects(subjects.map(subject => {
      if (subject.id === subjectId) {
        return {
          ...subject,
          [section]: {
            ...subject[section],
            files: (subject[section].files || []).filter(file => file.id !== fileId),
          },
        };
      }
      return subject;
    }));
    return { success: true };
  };

  // Changer le thème
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const value = {
    subjects,
    theme,
    searchQuery,
    setSearchQuery,
    currentUser,
    login,
    logout,
    register,
    updateProfile,
    isAdmin,
    addSubject,
    deleteSubject,
    addNote,
    updateNote,
    deleteNote,
    addPhoto,
    deletePhoto,
    addFile,
    deleteFile,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

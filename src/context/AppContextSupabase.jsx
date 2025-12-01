/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { signIn as authSignIn, signUp as authSignUp, signOut as authSignOut, onAuthStateChange, updateProfile as authUpdateProfile, updatePassword as authUpdatePassword } from '../services/authService';
import { supabase } from '../lib/supabase';
import * as subjectsService from '../services/subjectsService';
import * as notesService from '../services/notesService';
import * as photosService from '../services/photosService';
import * as filesService from '../services/filesService';
import { quizService } from '../services/quizService';

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
  const [loading, setLoading] = useState(true);

  // Charger le thème depuis localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Écouter les changements d'authentification
  useEffect(() => {
    const authStateChangeResult = onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email,
          username: session.user.email,
          role: session.user.user_metadata?.role || 'spectator'
        });
        // Charger les matières depuis Supabase de manière optimisée
        await loadSubjects();
      } else {
        setCurrentUser(null);
        setSubjects([]);
      }
      setLoading(false);
    });

    // Écouter les événements d'expiration de session
    const handleAuthExpired = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          setCurrentUser(null);
          setSubjects([]);
        }
      } catch (error) {
        setCurrentUser(null);
        setSubjects([]);
      }
    };

    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
      if (authStateChangeResult?.data?.subscription) {
        authStateChangeResult.data.subscription.unsubscribe();
      }
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  // Charger les matières depuis Supabase (optimisé)
  const loadSubjects = async () => {
    try {
      const data = await subjectsService.getAllSubjects();
      
      // Transformer les dates de snake_case à camelCase (fonctions réutilisables)
      const transformNote = (note) => ({
        ...note,
        createdAt: note.created_at || note.createdAt,
        updatedAt: note.updated_at || note.updatedAt
      });

      const transformPhoto = (photo) => ({
        ...photo,
        createdAt: photo.created_at || photo.createdAt
      });

      const transformFile = (file) => ({
        ...file,
        createdAt: file.created_at || file.createdAt
      });

      // Charger toutes les données en parallèle pour chaque matière
      const transformedSubjects = await Promise.all(data.map(async (subject) => {
        // Charger toutes les données en parallèle pour cette matière
        const [notes, photos, files, quizzes] = await Promise.all([
          notesService.getNotesBySubject(subject.id),
          photosService.getPhotosBySubject(subject.id),
          filesService.getFilesBySubject(subject.id),
          quizService.getQuizzesBySubject(subject.id)
        ]);

        // Organiser par section avec transformation des dates
        const organizeBySection = (items, transformFn) => {
          const sections = ['cours', 'td', 'exercices', 'corrections', 'general'];
          const result = {};
          sections.forEach(section => {
            result[section] = items
              .filter(item => item.section === section)
              .map(transformFn);
          });
          return result;
        };

        const notesBySection = organizeBySection(notes, transformNote);
        const photosBySection = organizeBySection(photos, transformPhoto);
        const filesBySection = organizeBySection(files, transformFile);

        const cours = {
          notes: notesBySection.cours,
          photos: photosBySection.cours,
          files: filesBySection.cours
        };
        const td = {
          notes: notesBySection.td,
          photos: photosBySection.td,
          files: filesBySection.td
        };
        const exercices = {
          notes: notesBySection.exercices,
          photos: photosBySection.exercices,
          files: filesBySection.exercices
        };
        const corrections = {
          notes: notesBySection.corrections,
          photos: photosBySection.corrections,
          files: filesBySection.corrections
        };
        const general = {
          notes: notesBySection.general,
          photos: photosBySection.general,
          files: filesBySection.general
        };

        return {
          ...subject,
          cours,
          td,
          exercices,
          corrections,
          general,
          quizzes: quizzes || [],
          createdAt: subject.created_at || subject.createdAt
        };
      }));
      
      setSubjects(transformedSubjects);
    } catch (error) {
      console.error('Erreur lors du chargement des matières:', error);
      setSubjects([]);
    }
  };

  // Login avec Supabase
  const login = async (email, password) => {
    try {
      const { data, error } = await authSignIn(email, password);
      if (error) {
        return { success: false, error };
      }
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Register avec Supabase
  const register = async (email, password, name) => {
    try {
      // Normaliser l'email
      const normalizedEmail = email.toLowerCase().trim();
      
      // Vérifier si l'email est déjà utilisé
      const { isEmailAlreadyUsed } = await import('../services/authService');
      const emailExists = await isEmailAlreadyUsed(normalizedEmail);
      if (emailExists) {
        return { success: false, error: 'Cet email est déjà utilisé par un autre compte' };
      }
      
      // Importer le service de validation des noms
      const { validateAndCheckName } = await import('../services/studentNameService');
      
      // Valider le nom avant l'inscription
      const nameValidation = await validateAndCheckName(name);
      
      if (!nameValidation.valid) {
        return { success: false, error: nameValidation.error };
      }
      
      if (!nameValidation.available) {
        return { success: false, error: nameValidation.error };
      }
      
      // Utiliser le nom exact du JSON pour l'enregistrement
      const exactName = nameValidation.exactName || name;
      
      // VÉRIFICATION FINALE juste avant l'inscription pour éviter les race conditions
      const { isNameAlreadyUsed } = await import('../services/studentNameService');
      const nameStillUsed = await isNameAlreadyUsed(exactName);
      if (nameStillUsed) {
        return { success: false, error: 'Ce nom est déjà utilisé par un autre compte. Veuillez réessayer.' };
      }
      
      const { data, error } = await authSignUp(normalizedEmail, password, exactName);
      if (error) {
        // Le message d'erreur est déjà amélioré dans authService
        return { success: false, error };
      }
      
      // Vérifier et créer le profil avec trial si nécessaire
      if (data?.user?.id) {
        try {
          // Attendre un peu pour que le trigger s'exécute
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Vérifier si le profil existe et a le trial
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, subscription_status, subscription_end_date')
            .eq('id', data.user.id)
            .single();
          
          // Si le profil n'existe pas ou n'a pas le trial, le créer/corriger
          if (profileError || !profile || profile.subscription_status !== 'trial') {
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7);
            
            const { error: upsertError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                email: normalizedEmail,
                name: exactName,
                role: 'spectator',
                subscription_status: 'trial',
                subscription_end_date: trialEndDate.toISOString(),
                notification_preferences: {
                  new_files: true,
                  new_photos: true,
                  new_users: false,
                  new_payments: false,
                  voucher_expired: false
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              });
            
            if (upsertError) {
              console.warn('Erreur lors de la création/correction du profil avec trial:', upsertError);
            }
          }
        } catch (profileCheckError) {
          console.warn('Erreur lors de la vérification du profil:', profileCheckError);
          // On continue quand même car l'inscription a réussi
        }
      }
      
      return { success: true, user: data.user, message: 'Vérifiez votre email pour confirmer votre inscription' };
    } catch (error) {
      // Gérer les erreurs inattendues
      let errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription';
      
      if (error.message?.includes('already registered') || 
          error.message?.includes('already exists')) {
        errorMessage = 'Cet email est déjà utilisé par un autre compte';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Logout avec Supabase
  const logout = async () => {
    try {
      const { error } = await authSignOut();
      if (error) {
        return { success: false, error };
      }
      setCurrentUser(null);
      setSubjects([]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Mettre à jour le profil
  const updateProfile = async (profileData) => {
    try {
      const { error } = await authUpdateProfile(profileData);
      if (error) {
        return { success: false, error };
      }

      setCurrentUser({
        ...currentUser,
        ...profileData,
        name: profileData.name || currentUser.name
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Changer le mot de passe
  const changePassword = async (newPassword) => {
    try {
      const { error } = await authUpdatePassword(newPassword);
      if (error) {
        return { success: false, error };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Vérifier si admin
  const isAdmin = () => currentUser?.role === 'admin';

  // Ajouter une matière (Admin seulement)
  const addSubject = async (name, color, icon = 'BookOpen') => {
    if (!isAdmin()) {
      return { success: false, error: 'Action réservée aux administrateurs' };
    }
    try {
      const newSubject = await subjectsService.createSubject({ name, color, icon });
      // Recharger les matières pour avoir la structure complète
      await loadSubjects();
      return { success: true, subject: newSubject };
    } catch (error) {
      console.error('Erreur création matière:', error);
      return { success: false, error: error.message };
    }
  };

  // Supprimer une matière (Admin seulement)
  const deleteSubject = async (subjectId) => {
    if (!isAdmin()) return { success: false, error: 'Action réservée aux administrateurs' };
    try {
      await subjectsService.deleteSubject(subjectId);
      setSubjects(subjects.filter(s => s.id !== subjectId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Ajouter une note
  const addNote = async (subjectId, section, note) => {
    try {
      const newNote = await notesService.createNote({
        subjectId,
        section,
        title: note.title,
        content: note.content,
        tags: note.tags || []
      });
      // Transformer les dates
      const transformedNote = {
        ...newNote,
        createdAt: newNote.created_at || newNote.createdAt,
        updatedAt: newNote.updated_at || newNote.updatedAt
      };
      // Mise à jour optimisée du state local
      setSubjects(subjects.map(subject => {
        if (subject.id === subjectId) {
          return {
            ...subject,
            [section]: {
              ...subject[section],
              notes: [...(subject[section]?.notes || []), transformedNote]
            }
          };
        }
        return subject;
      }));

      // Créer la notification pour l'utilisateur
      if (currentUser?.id) {
        await notificationsService.createNotificationWithPreference(
          currentUser.id,
          'new_note',
          'Nouvelle note ajoutée',
          `La note "${note.title}" a été ajoutée.`,
          { subjectId, section, noteId: newNote.id }
        );
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  // Mettre à jour une note
  const updateNote = async (subjectId, section, noteId, updatedNote) => {
    try {
      const updated = await notesService.updateNote(noteId, updatedNote);
      // Transformer les dates
      const transformedNote = {
        ...updated,
        createdAt: updated.created_at || updated.createdAt,
        updatedAt: updated.updated_at || updated.updatedAt
      };
      // Mise à jour optimisée du state local
      setSubjects(subjects.map(subject => {
        if (subject.id === subjectId) {
          return {
            ...subject,
            [section]: {
              ...subject[section],
              notes: subject[section].notes.map(note =>
                note.id === noteId ? { ...note, ...transformedNote } : note
              )
            }
          };
        }
        return subject;
      }));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  // Supprimer une note
  const deleteNote = async (subjectId, section, noteId) => {
    try {
      await notesService.deleteNote(noteId);
      // Mise à jour optimisée du state local
      setSubjects(subjects.map(subject => {
        if (subject.id === subjectId) {
          return {
            ...subject,
            [section]: {
              ...subject[section],
              notes: subject[section].notes.filter(note => note.id !== noteId)
            }
          };
        }
        return subject;
      }));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Ajouter une photo
  const addPhoto = async (subjectId, section, photo) => {
    try {
      // photo.file contient le fichier à uploader
      if (photo.file) {
        const newPhoto = await photosService.uploadPhoto(photo.file, {
          subjectId,
          section,
          title: photo.title
        });
        // Transformer les dates
        const transformedPhoto = {
          ...newPhoto,
          createdAt: newPhoto.created_at || newPhoto.createdAt
        };
        // Mise à jour optimisée du state local
        setSubjects(subjects.map(subject => {
          if (subject.id === subjectId) {
            return {
              ...subject,
              [section]: {
                ...subject[section],
                photos: [...(subject[section]?.photos || []), transformedPhoto]
              }
            };
          }
          return subject;
        }));
      }
    } catch (error) {
      console.error('Error adding photo:', error);
    }
  };

  // Supprimer une photo
  const deletePhoto = async (subjectId, section, photoId) => {
    try {
      await photosService.deletePhoto(photoId);
      // Mise à jour optimisée du state local
      setSubjects(subjects.map(subject => {
        if (subject.id === subjectId) {
          return {
            ...subject,
            [section]: {
              ...subject[section],
              photos: subject[section].photos.filter(photo => photo.id !== photoId)
            }
          };
        }
        return subject;
      }));
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  // Ajouter un fichier
  const addFile = async (subjectId, section, file) => {
    try {
      // file.file contient le fichier à uploader
      if (file.file) {
        const newFile = await filesService.uploadFile(file.file, {
          subjectId,
          section,
          title: file.title,
          description: file.description
        });
        // Transformer les dates
        const transformedFile = {
          ...newFile,
          createdAt: newFile.created_at || newFile.createdAt
        };
        // Mise à jour optimisée du state local
        setSubjects(subjects.map(subject => {
          if (subject.id === subjectId) {
            return {
              ...subject,
              [section]: {
                ...subject[section],
                files: [...(subject[section]?.files || []), transformedFile]
              }
            };
          }
          return subject;
        }));
      }
    } catch (error) {
      console.error('Error adding file:', error);
    }
  };

  // Supprimer un fichier
  const deleteFile = async (subjectId, section, fileId) => {
    try {
      await filesService.deleteFile(fileId);
      // Mise à jour optimisée du state local
      setSubjects(subjects.map(subject => {
        if (subject.id === subjectId) {
          return {
            ...subject,
            [section]: {
              ...subject[section],
              files: subject[section].files.filter(f => f.id !== fileId)
            }
          };
        }
        return subject;
      }));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const value = {
    subjects,
    theme,
    searchQuery,
    currentUser,
    loading,
    setSearchQuery,
    toggleTheme,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    isAdmin,
    addSubject,
    deleteSubject,
    addNote,
    updateNote,
    deleteNote,
    addPhoto,
    deletePhoto,
    addFile,
    deleteFile
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

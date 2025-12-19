/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signIn as authSignIn, signUp as authSignUp, signOut as authSignOut, onAuthStateChange, updateProfile as authUpdateProfile, updatePassword as authUpdatePassword } from '../services/authService';
import { supabase } from '../lib/supabase';
import * as subjectsService from '../services/subjectsService';
import * as notesService from '../services/notesService';
import * as photosService from '../services/photosService';
import * as filesService from '../services/filesService';
import { notificationsService } from '../services/notificationsService';
import { pushNotificationService } from '../services/pushNotificationService';
import { subscriptionExpiryService } from '../services/subscriptionExpiryService';
import { quizService } from '../services/quizService';

// Helper to sync auth role
const syncAuthRoleWithProfile = async (sessionUser, profileRole) => {
  if (!sessionUser?.id || !profileRole) return;
  const metadata = sessionUser.user_metadata || {};
  if (metadata.role === profileRole) return;
  try {
    await supabase.auth.updateUser({
      data: {
        ...metadata,
        role: profileRole
      }
    });
  } catch (error) {
    console.warn('Failed to sync auth role with profile role:', error);
  }
};

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
  const [subscriptionWarning, setSubscriptionWarning] = useState(null);
  const [deviceLimitError, setDeviceLimitError] = useState(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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
        // Charger le rôle depuis la table profiles au lieu de user_metadata
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, name, created_at')
          .eq('id', session.user.id)
          .single();

        const userData = {
          id: session.user.id,
          email: session.user.email,
          name: profileData?.name || session.user.user_metadata?.name || session.user.email,
          username: session.user.email,
          role: profileData?.role || 'spectator',
          created_at: profileData?.created_at
        };

        await syncAuthRoleWithProfile(session.user, userData.role);

        // Vérifier l'expiration de l'abonnement au login
        try {
          const expiryStatus = await subscriptionExpiryService.checkOnLogin(session.user.id);
          if (expiryStatus.showWarning) {
            setSubscriptionWarning(expiryStatus);
          }
        } catch (error) {
          console.error('Error checking subscription expiry:', error);
        }

        // Enregistrer l'appareil lors de la connexion
        try {
          const { deviceService } = await import('../services/deviceService');
          const deviceResult = await deviceService.registerDevice();

          if (!deviceResult.success) {
            // Vérifier si c'est une erreur de limite d'appareils
            if (deviceResult.error === 'device_limit' ||
              deviceResult.error?.includes('Limite d\'appareils') ||
              deviceResult.error?.includes('P0001')) {
              // Limite d'appareils atteinte
              console.warn('Limite d\'appareils atteinte');
              setDeviceLimitError({
                devices: deviceResult.devices || []
              });

              // NE PAS définir currentUser pour éviter le "flash" du dashboard
              // L'utilisateur sera déconnecté par authService ou devra gérer la modale
              // Si authService a déjà fait le signOut, on ne devrait même pas être ici ou le prochain event le nettoiera
              setLoading(false);
              return;
            } else {
              // Autre erreur - logger mais ne pas bloquer la connexion
              console.error('Erreur lors de l\'enregistrement de l\'appareil:', deviceResult.error);
            }
          } else {
            // Réinitialiser l'erreur si l'enregistrement réussit
            setDeviceLimitError(null);
          }
        } catch (error) {
          console.error('Error registering device:', error);

          // Vérifier si c'est une erreur de limite d'appareils du trigger PostgreSQL
          if (error.code === 'P0001' || error.message?.includes('Limite d\'appareils')) {
            setDeviceLimitError({
              devices: []
            });
            setLoading(false);
            return;
          }
          // Ne pas bloquer la connexion si l'enregistrement de l'appareil échoue pour d'autres raisons
        }

        // Si tout est OK, on définit l'utilisateur
        setCurrentUser(userData);

        // Charger les matières depuis Supabase de manière optimisée
        await loadSubjects();
      } else {
        setCurrentUser(null);
        setSubjects([]);
        setSubscriptionWarning(null);
        setDeviceLimitError(null);
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

  // Heartbeat: Update last_sign_in_at every 2 minutes while active
  useEffect(() => {
    if (!currentUser?.id) return;

    const updateHeartbeat = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq('id', currentUser.id);
      } catch (err) {
        // Silently fail on heartbeat
      }
    };

    // Initial beat
    updateHeartbeat();

    // Loop
    const interval = setInterval(updateHeartbeat, 2 * 60 * 1000); // Every 2 mins
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Écouter les changements de profil en temps réel
  useEffect(() => {
    if (!currentUser?.id) return;

    // S'abonner aux changements du profil de l'utilisateur actuel
    const profileSubscription = supabase
      .channel(`profile-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUser.id}`
        },
        async (payload) => {
          console.log('Profil mis à jour en temps réel:', payload);

          // Mettre à jour le rôle si il a changé
          if (payload.new.role !== currentUser.role) {
            setCurrentUser(prev => ({
              ...prev,
              role: payload.new.role,
              name: payload.new.name || prev.name
            }));

            // Recharger la page pour appliquer les changements de permission
            window.location.reload();
          }
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, [currentUser?.id]);

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

      // Update profile last_sign_in_at
      if (data?.user?.id) {
        await supabase
          .from('profiles')
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq('id', data.user.id);
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

      // VÉRIFICATION FINALE
      const { isNameAlreadyUsed } = await import('../services/studentNameService');
      const nameStillUsed = await isNameAlreadyUsed(exactName);
      if (nameStillUsed) {
        return { success: false, error: 'Ce nom est déjà utilisé par un autre compte. Veuillez réessayer.' };
      }

      const { data, error } = await authSignUp(normalizedEmail, password, exactName);
      if (error) {
        return { success: false, error };
      }

      // Vérifier et créer le profil avec trial si nécessaire
      if (data?.user?.id) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, subscription_status')
            .eq('id', data.user.id)
            .single();

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
                updated_at: new Date().toISOString(),
                last_sign_in_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              });

            if (upsertError) {
              console.warn('Erreur lors de la création/correction du profil avec trial:', upsertError);
            }
          } else {
            // If profile already existed (by trigger), ensure last_sign_in_at is set
            await supabase.from('profiles').update({ last_sign_in_at: new Date().toISOString() }).eq('id', data.user.id);
          }
        } catch (profileCheckError) {
          console.warn('Erreur lors de la vérification du profil:', profileCheckError);
        }
      }

      // Notifier les admins d'un nouvel utilisateur (In-App + Push)
      try {
        const { notificationsService } = await import('../services/notificationsService');
        await notificationsService.notifyAllAdmins(
          'new_user',
          'Nouvel utilisateur inscrit',
          `${exactName} vient de s'inscrire`,
          { newUserId: data.user.id }
        );

        const { notifyAdmins } = await import('../services/pushNotificationService');
        await notifyAdmins(
          'new_user',
          '👤 Nouvel utilisateur',
          `${exactName} vient de s'inscrire`
        );
      } catch (notifError) {
        console.debug('Notification failed:', notifError);
      }

      return { success: true, user: data.user, message: 'Vérifiez votre email pour confirmer votre inscription' };
    } catch (error) {
      let errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription';
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        errorMessage = 'Cet email est déjà utilisé par un autre compte';
      }
      return { success: false, error: errorMessage };
    }
  };

  // Logout avec Supabase
  const logout = async () => {
    try {
      // Désactiver l'appareil actuel avant la déconnexion pour libérer une place
      try {
        const { deviceService } = await import('../services/deviceService');
        await deviceService.deactivateCurrentDevice();
      } catch (deviceError) {
        console.warn('Erreur lors de la désactivation de l\'appareil:', deviceError);
        // Continuer la déconnexion même si la désactivation échoue
      }

      const { error } = await authSignOut();
      if (error) {
        return { success: false, error };
      }

      // Réinitialiser l'erreur de limite d'appareils lors de la déconnexion
      setDeviceLimitError(null);

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

        // Envoyer notification push aux spectateurs
        await pushNotificationService.notifySpectators(
          subjectId,
          'note',
          note.title
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

        // Envoyer notification push aux spectateurs
        if (currentUser?.id) {
          await pushNotificationService.notifySpectators(
            subjectId,
            'photo',
            photo.title
          );
        }
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

        // Envoyer notification push aux spectateurs
        if (currentUser?.id) {
          await pushNotificationService.notifySpectators(
            subjectId,
            'file',
            file.title
          );
        }
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
    subscriptionWarning,
    setSubscriptionWarning,
    deviceLimitError,
    setDeviceLimitError,
    mobileSearchOpen,
    setMobileSearchOpen,
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
    deleteFile,
    loadSubjects
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

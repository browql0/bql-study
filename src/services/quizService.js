import { supabase } from '../lib/supabase';

export const quizService = {
  // ====================================
  // QUIZ CRUD
  // ====================================

  async getQuizzesBySubject(subjectId, section = null) {
    try {
      let query = supabase
        .from('quizzes')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });

      if (section) {
        query = query.eq('section', section);
      }

      const { data, error } = await query;
      if (error) {
        // Si l'erreur est due à une policy RLS (accès refusé), retourner un tableau vide
        if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
          console.warn('Access denied to quizzes (subscription required)');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  },

  async getQuizWithQuestions(quizId) {
    try {
      // Récupérer le quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;

      // Récupérer les questions
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;

      return { ...quiz, questions: questions || [] };
    } catch (error) {
      console.error('Error fetching quiz with questions:', error);
      throw error;
    }
  },

  async createQuiz(subjectId, section, quizData) {
    try {
      const { data: user } = await supabase.auth.getUser();

      // Créer le quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          user_id: user.user.id,
          subject_id: subjectId,
          section: section,
          title: quizData.title,
          description: quizData.description,
          type: quizData.type
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Créer les questions
      const questions = quizData.questions.map((q, index) => ({
        quiz_id: quiz.id,
        question: q.question,
        answer: q.answer,
        options: q.options || null,
        explanation: q.explanation || null,
        points: q.points || 1,
        order_index: index
      }));

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questions);

      if (questionsError) throw questionsError;

      return quiz;
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw error;
    }
  },

  async updateQuiz(quizId, quizData) {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({
          title: quizData.title,
          description: quizData.description,
          type: quizData.type
        })
        .eq('id', quizId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating quiz:', error);
      throw error;
    }
  },

  async deleteQuiz(quizId) {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  },

  // ====================================
  // QUIZ ATTEMPTS (Tentatives)
  // ====================================

  async saveQuizAttempt(quizId, score, totalQuestions, answers) {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.user.id,
          score: score,
          total_questions: totalQuestions,
          answers: answers
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      throw error;
    }
  },

  async getUserAttempts(quizId) {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', user.user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user attempts:', error);
      throw error;
    }
  },

  async getQuizStats(quizId) {
    // La fonction RPC get_quiz_stats n'existe pas encore côté DB,
    // on utilise le calcul manuel directement pour éviter les erreurs 404.
    return this.calculateQuizStatsManually(quizId);
  },

  async calculateQuizStatsManually(quizId) {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('score, total_questions')
        .eq('quiz_id', quizId);

      if (error) {
        console.error('Error calculating stats manually:', error);
        return { total_attempts: 0, average_score: 0, best_score: 0, completion_rate: 0 };
      }

      if (!data || data.length === 0) {
        return { total_attempts: 0, average_score: 0, best_score: 0, completion_rate: 0 };
      }

      const totalAttempts = data.length;
      const totalScore = data.reduce((sum, attempt) => sum + (attempt.score / attempt.total_questions * 100), 0);
      const averageScore = Math.round((totalScore / totalAttempts) * 100) / 100;
      const bestScore = Math.max(...data.map(a => a.score));

      return {
        total_attempts: totalAttempts,
        average_score: averageScore,
        best_score: bestScore,
        completion_rate: 0 // Ne peut pas être calculé sans connaître le nombre total d'utilisateurs
      };
    } catch (error) {
      console.error('Error in calculateQuizStatsManually:', error);
      return { total_attempts: 0, average_score: 0, best_score: 0, completion_rate: 0 };
    }
  },

  async getBestScore(quizId) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return null;

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('score, total_questions')
        .eq('quiz_id', quizId)
        .eq('user_id', user.user.id)
        .order('score', { ascending: false })
        .limit(1);

      if (error) {
        // Si l'erreur est due à l'absence de résultats ou à des permissions, retourner null
        if (error.code === 'PGRST116' || error.code === '42501' || error.message?.includes('permission')) {
          return null;
        }
        console.error('Error fetching best score:', error);
        return null;
      }

      // Si aucun résultat, retourner null
      if (!data || data.length === 0) {
        return null;
      }

      return data[0];
    } catch (error) {
      console.error('Error fetching best score:', error);
      return null;
    }
  }
};

import { supabase } from '../../infrastructure/supabase/supabaseClient';

export const AuthService = {
  /**
   * Realiza o login utilizando e-mail e senha.
   */
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Encerra a sessão do utilizador atual.
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Obtém a sessão atual 
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    return data.session;
  },
  
  /**
   * Busca os dados do utilizador na nossa tabela pública 
   */
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, role, store_id')
      .eq('id', userId)
      .single();
      
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
};
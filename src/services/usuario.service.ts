import { supabase } from './supabase';
import { Profile, CreateUserData, Filial } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= MIN_PASSWORD_LENGTH;
};

export const createUser = async (userData: CreateUserData): Promise<{ success: boolean; error?: string; userId?: string }> => {
  try {
    if (!validateEmail(userData.email)) {
      return { success: false, error: 'Email inválido' };
    }

    if (!validatePassword(userData.password)) {
      return { success: false, error: `Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres` };
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Sessão não encontrada' };
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

    console.log('Enviando dados para criar usuário:', { ...userData, password: '[REDACTED]' });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    console.log('Resposta da API:', { status: response.status, result });

    if (!response.ok || !result.success) {
      console.error('Erro na criação:', result.error);
      return { success: false, error: result.error || 'Erro ao criar usuário' };
    }

    return { success: true, userId: result.userId };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return { success: false, error: 'Erro inesperado ao criar usuário' };
  }
};

export const listUsers = async (currentUserRole: string, currentUserFilialId?: string): Promise<Profile[]> => {
  try {
    let query = supabase
      .from('profiles')
      .select(`
        *,
        filial:filiais(*)
      `)
      .order('created_at', { ascending: false });

    if (currentUserRole === 'user' && currentUserFilialId) {
      query = query.eq('filial_id', currentUserFilialId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar usuários:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return [];
  }
};

export const updateUser = async (
  userId: string,
  updates: { nome?: string; role?: string; filial_id?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return { success: false, error: 'Erro inesperado ao atualizar usuário' };
  }
};

export const deactivateUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Erro ao desativar usuário:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    return { success: false, error: 'Erro inesperado ao desativar usuário' };
  }
};

export const activateUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ativo: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Erro ao ativar usuário:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao ativar usuário:', error);
    return { success: false, error: 'Erro inesperado ao ativar usuário' };
  }
};

export const getFiliais = async (): Promise<Filial[]> => {
  try {
    const { data, error } = await supabase
      .from('filiais')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar filiais:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar filiais:', error);
    return [];
  }
};

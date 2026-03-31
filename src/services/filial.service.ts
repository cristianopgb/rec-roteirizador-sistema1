import { supabase } from './supabase';
import type { Filial } from '../types';

export interface CreateFilialDTO {
  nome: string;
  cidade: string;
  uf: string;
}

export interface UpdateFilialDTO {
  nome?: string;
  cidade?: string;
  uf?: string;
}

export async function listFiliais(): Promise<Filial[]> {
  const { data, error } = await supabase
    .from('filiais')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) {
    throw new Error(`Erro ao listar filiais: ${error.message}`);
  }

  return data || [];
}

export async function getFilialById(id: string): Promise<Filial | null> {
  const { data, error } = await supabase
    .from('filiais')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar filial: ${error.message}`);
  }

  return data;
}

export async function createFilial(dto: CreateFilialDTO): Promise<Filial> {
  // Validate UF (must be exactly 2 uppercase letters)
  const uf = dto.uf.toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(uf)) {
    throw new Error('UF deve conter exatamente 2 letras');
  }

  const { data, error } = await supabase
    .from('filiais')
    .insert({
      nome: dto.nome.trim(),
      cidade: dto.cidade.trim(),
      uf,
      ativo: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar filial: ${error.message}`);
  }

  return data;
}

export async function updateFilial(id: string, dto: UpdateFilialDTO): Promise<Filial> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (dto.nome !== undefined) {
    updateData.nome = dto.nome.trim();
  }

  if (dto.cidade !== undefined) {
    updateData.cidade = dto.cidade.trim();
  }

  if (dto.uf !== undefined) {
    const uf = dto.uf.toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(uf)) {
      throw new Error('UF deve conter exatamente 2 letras');
    }
    updateData.uf = uf;
  }

  const { data, error } = await supabase
    .from('filiais')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar filial: ${error.message}`);
  }

  return data;
}

export async function checkFilialHasUsers(filialId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('filial_id', filialId)
    .eq('ativo', true);

  if (error) {
    throw new Error(`Erro ao verificar usuários da filial: ${error.message}`);
  }

  return (count || 0) > 0;
}

export async function deleteFilial(id: string): Promise<void> {
  // Check if filial has active users
  const hasUsers = await checkFilialHasUsers(id);

  if (hasUsers) {
    throw new Error('Não é possível excluir filial com usuários ativos associados');
  }

  const { error } = await supabase
    .from('filiais')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao excluir filial: ${error.message}`);
  }
}

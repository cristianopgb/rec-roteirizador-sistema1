import { supabase } from './supabase';
import type { Filial } from '../types';

export interface CreateFilialDTO {
  nome: string;
  cidade: string;
  uf: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateFilialDTO {
  nome?: string;
  cidade?: string;
  uf?: string;
  latitude?: number | null;
  longitude?: number | null;
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

  // Validate coordinates if provided
  if (dto.latitude !== undefined && dto.latitude !== null) {
    const lat = Number(dto.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new Error('Latitude deve estar entre -90 e +90');
    }
  }

  if (dto.longitude !== undefined && dto.longitude !== null) {
    const lon = Number(dto.longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      throw new Error('Longitude deve estar entre -180 e +180');
    }
  }

  const { data, error } = await supabase
    .from('filiais')
    .insert({
      nome: dto.nome.trim(),
      cidade: dto.cidade.trim(),
      uf,
      latitude: dto.latitude,
      longitude: dto.longitude,
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

  // Validate and update latitude if provided
  if (dto.latitude !== undefined) {
    if (dto.latitude !== null) {
      const lat = Number(dto.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Latitude deve estar entre -90 e +90');
      }
      updateData.latitude = lat;
    } else {
      updateData.latitude = null;
    }
  }

  // Validate and update longitude if provided
  if (dto.longitude !== undefined) {
    if (dto.longitude !== null) {
      const lon = Number(dto.longitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        throw new Error('Longitude deve estar entre -180 e +180');
      }
      updateData.longitude = lon;
    } else {
      updateData.longitude = null;
    }
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

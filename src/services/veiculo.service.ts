import { supabase } from './supabase';
import { Veiculo, CreateVeiculo, UpdateVeiculo } from '../types';

export const createVeiculo = async (veiculo: CreateVeiculo): Promise<{ success: boolean; error?: string }> => {
  try {
    if (veiculo.qtd_eixos < 2 || veiculo.qtd_eixos > 9) {
      return { success: false, error: 'Quantidade de eixos deve estar entre 2 e 9' };
    }

    if (veiculo.capacidade_peso_kg <= 0) {
      return { success: false, error: 'Capacidade de peso deve ser maior que zero' };
    }

    if (veiculo.capacidade_vol_m3 <= 0) {
      return { success: false, error: 'Capacidade volumétrica deve ser maior que zero' };
    }

    if (veiculo.max_entregas <= 0) {
      return { success: false, error: 'Máximo de entregas deve ser maior que zero' };
    }

    if (veiculo.max_km_distancia <= 0) {
      return { success: false, error: 'Distância máxima deve ser maior que zero' };
    }

    if (veiculo.ocupacao_minima_perc < 0 || veiculo.ocupacao_minima_perc > 100) {
      return { success: false, error: 'Ocupação mínima deve estar entre 0 e 100%' };
    }

    const { error } = await supabase
      .from('veiculos')
      .insert(veiculo);

    if (error) {
      console.error('Erro ao criar veículo:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao criar veículo:', error);
    return { success: false, error: 'Erro inesperado ao criar veículo' };
  }
};

export const listVeiculos = async (): Promise<Veiculo[]> => {
  try {
    const { data, error } = await supabase
      .from('veiculos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar veículos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao listar veículos:', error);
    return [];
  }
};

export const getVeiculoById = async (id: string): Promise<Veiculo | null> => {
  try {
    const { data, error } = await supabase
      .from('veiculos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar veículo:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar veículo:', error);
    return null;
  }
};

export const updateVeiculo = async (
  id: string,
  updates: UpdateVeiculo
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (updates.qtd_eixos !== undefined && (updates.qtd_eixos < 2 || updates.qtd_eixos > 9)) {
      return { success: false, error: 'Quantidade de eixos deve estar entre 2 e 9' };
    }

    if (updates.capacidade_peso_kg !== undefined && updates.capacidade_peso_kg <= 0) {
      return { success: false, error: 'Capacidade de peso deve ser maior que zero' };
    }

    if (updates.capacidade_vol_m3 !== undefined && updates.capacidade_vol_m3 <= 0) {
      return { success: false, error: 'Capacidade volumétrica deve ser maior que zero' };
    }

    if (updates.max_entregas !== undefined && updates.max_entregas <= 0) {
      return { success: false, error: 'Máximo de entregas deve ser maior que zero' };
    }

    if (updates.max_km_distancia !== undefined && updates.max_km_distancia <= 0) {
      return { success: false, error: 'Distância máxima deve ser maior que zero' };
    }

    if (updates.ocupacao_minima_perc !== undefined &&
        (updates.ocupacao_minima_perc < 0 || updates.ocupacao_minima_perc > 100)) {
      return { success: false, error: 'Ocupação mínima deve estar entre 0 e 100%' };
    }

    const { error } = await supabase
      .from('veiculos')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar veículo:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    return { success: false, error: 'Erro inesperado ao atualizar veículo' };
  }
};

export const toggleVeiculoStatus = async (id: string, ativo: boolean): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('veiculos')
      .update({
        ativo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar status do veículo:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar status do veículo:', error);
    return { success: false, error: 'Erro inesperado ao atualizar status do veículo' };
  }
};

export const deleteVeiculo = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('veiculos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar veículo:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar veículo:', error);
    return { success: false, error: 'Erro inesperado ao deletar veículo' };
  }
};

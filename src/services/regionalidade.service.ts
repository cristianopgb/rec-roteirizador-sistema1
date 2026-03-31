import { supabase } from './supabase';
import {
  Regionalidade,
  CreateRegionalidade,
  RegionalidadeUploadResult,
  UFSummary,
  ImportacaoRegionalidade
} from '../types';
import * as XLSX from 'xlsx';

const UF_VALID_REGEX = /^[A-Z]{2}$/;

export const validateUF = (uf: string): boolean => {
  return UF_VALID_REGEX.test(uf.toUpperCase());
};

export const parseExcelFile = async (file: File): Promise<CreateRegionalidade[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const regionalidades: CreateRegionalidade[] = [];

        for (const row of jsonData as any[]) {
          const cidade = row['cidade'] || row['Cidade'] || row['CIDADE'];
          const uf = row['uf'] || row['UF'] || row['Uf'];
          const mesorregiao = row['mesorregiao'] || row['Mesorregiao'] || row['MESORREGIAO'];
          const microrregiao = row['microrregiao'] || row['Microrregiao'] || row['MICRORREGIAO'];

          if (!cidade || !uf || !mesorregiao || !microrregiao) {
            continue;
          }

          regionalidades.push({
            cidade: String(cidade).trim(),
            uf: String(uf).trim().toUpperCase(),
            mesorregiao: String(mesorregiao).trim(),
            microrregiao: String(microrregiao).trim(),
          });
        }

        if (regionalidades.length === 0) {
          reject(new Error('Arquivo inválido. Certifique-se de incluir as colunas: cidade, uf, mesorregiao, microrregiao'));
        }

        resolve(regionalidades);
      } catch (error) {
        reject(new Error('Erro ao processar arquivo Excel'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsBinaryString(file);
  });
};

export const uploadRegionalidades = async (
  file: File,
  userId: string
): Promise<RegionalidadeUploadResult> => {
  try {
    const regionalidades = await parseExcelFile(file);
    const total_linhas = regionalidades.length;

    const erros_detalhes: string[] = [];
    let inseridos = 0;
    let duplicados = 0;
    let erros = 0;

    for (const reg of regionalidades) {
      if (!validateUF(reg.uf)) {
        erros++;
        erros_detalhes.push(`UF inválida: ${reg.uf} para cidade ${reg.cidade}`);
        continue;
      }

      const { error } = await supabase
        .from('regionalidades')
        .insert(reg);

      if (error) {
        if (error.code === '23505') {
          duplicados++;
        } else {
          erros++;
          erros_detalhes.push(`Erro ao inserir ${reg.cidade}/${reg.uf}: ${error.message}`);
        }
      } else {
        inseridos++;
      }
    }

    await logImportacao({
      arquivo_nome: file.name,
      total_linhas,
      inseridos,
      duplicados,
      erros,
      user_id: userId,
    });

    return {
      total_linhas,
      inseridos,
      duplicados,
      erros,
      erros_detalhes: erros > 0 ? erros_detalhes : undefined,
    };
  } catch (error) {
    console.error('Erro ao fazer upload de regionalidades:', error);
    throw error;
  }
};

export const deleteByUF = async (uf: string): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    const { data: beforeData } = await supabase
      .from('regionalidades')
      .select('id')
      .eq('uf', uf.toUpperCase());

    const deletedCount = beforeData?.length || 0;

    const { error } = await supabase
      .from('regionalidades')
      .delete()
      .eq('uf', uf.toUpperCase());

    if (error) {
      console.error('Erro ao deletar regionalidades:', error);
      return { success: false, deletedCount: 0, error: error.message };
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error('Erro ao deletar regionalidades:', error);
    return { success: false, deletedCount: 0, error: 'Erro inesperado ao deletar regionalidades' };
  }
};

export const listUFs = async (): Promise<UFSummary[]> => {
  try {
    const { data, error } = await supabase
      .from('regionalidades')
      .select('uf')
      .order('uf');

    if (error) {
      console.error('Erro ao listar UFs:', error);
      return [];
    }

    const ufMap = new Map<string, number>();
    data?.forEach((item) => {
      const count = ufMap.get(item.uf) || 0;
      ufMap.set(item.uf, count + 1);
    });

    const ufSummaries: UFSummary[] = [];
    ufMap.forEach((total_cidades, uf) => {
      ufSummaries.push({ uf, total_cidades });
    });

    return ufSummaries.sort((a, b) => a.uf.localeCompare(b.uf));
  } catch (error) {
    console.error('Erro ao listar UFs:', error);
    return [];
  }
};

export const listRegionalidades = async (uf?: string): Promise<Regionalidade[]> => {
  try {
    let query = supabase
      .from('regionalidades')
      .select('*')
      .order('cidade');

    if (uf) {
      query = query.eq('uf', uf.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar regionalidades:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao listar regionalidades:', error);
    return [];
  }
};

export const logImportacao = async (
  logData: Omit<ImportacaoRegionalidade, 'id' | 'created_at'>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('importacoes_regionalidade')
      .insert(logData);

    if (error) {
      console.error('Erro ao registrar log de importação:', error);
    }
  } catch (error) {
    console.error('Erro ao registrar log de importação:', error);
  }
};

export const listImportacoes = async (): Promise<ImportacaoRegionalidade[]> => {
  try {
    const { data, error } = await supabase
      .from('importacoes_regionalidade')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Erro ao listar importações:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao listar importações:', error);
    return [];
  }
};

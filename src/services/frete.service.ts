import { supabase } from './supabase';
import { registrarAuditoriaRoteirizacao } from './roteirizacao.service';

interface ManifestoRow {
  id: string;
  rodada_id: string;
  manifesto_id: string;
  veiculo_perfil: string | null;
  veiculo_tipo: string | null;
  km_total: number | null;
}

interface VeiculoRow {
  id?: string;
  perfil: string;
  qtd_eixos: number;
  ativo: boolean | null;
  filial_id: string | null;
}

interface ANTTRow {
  id?: string;
  eixos_2: number | null;
  eixos_3: number | null;
  eixos_4: number | null;
  eixos_5: number | null;
  eixos_6: number | null;
  eixos_7: number | null;
  eixos_9: number | null;
}

const EIXO_COLUMN: Record<number, keyof ANTTRow> = {
  2: 'eixos_2',
  3: 'eixos_3',
  4: 'eixos_4',
  5: 'eixos_5',
  6: 'eixos_6',
  7: 'eixos_7',
  9: 'eixos_9',
};

function normalize(value: string | null | undefined): string {
  return (value ?? '').toString().trim().toLowerCase();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function findCompatibleVeiculo(
  veiculoPerfilManifesto: string | null,
  veiculoTipoManifesto: string | null,
  filialId: string | null,
  veiculos: VeiculoRow[],
): VeiculoRow | null {
  const perfil = normalize(veiculoPerfilManifesto);
  const tipo = normalize(veiculoTipoManifesto);

  const ativos = veiculos.filter((v) => v.ativo !== false);

  if (ativos.length === 0) return null;

  const mesmaFilial = filialId
    ? ativos.filter((v) => v.filial_id === filialId)
    : [];

  const procurarEm = mesmaFilial.length > 0 ? mesmaFilial : ativos;

  const porPerfil = procurarEm.find((v) => normalize(v.perfil) === perfil);
  if (porPerfil) return porPerfil;

  if (tipo) {
    const porTipo = procurarEm.find((v) => normalize(v.perfil) === tipo);
    if (porTipo) return porTipo;
  }

  if (mesmaFilial.length > 0) {
    const fallbackPerfilGlobal = ativos.find((v) => normalize(v.perfil) === perfil);
    if (fallbackPerfilGlobal) return fallbackPerfilGlobal;

    if (tipo) {
      const fallbackTipoGlobal = ativos.find((v) => normalize(v.perfil) === tipo);
      if (fallbackTipoGlobal) return fallbackTipoGlobal;
    }
  }

  return null;
}

export async function calcularFreteMinimoPorManifesto(rodadaId: string): Promise<void> {
  try {
    const { data: manifestosData, error: manifestosError } = await supabase
      .from('manifestos_roteirizacao')
      .select('id, rodada_id, manifesto_id, veiculo_perfil, veiculo_tipo, km_total')
      .eq('rodada_id', rodadaId);

    if (manifestosError) {
      throw new Error(`Erro ao buscar manifestos: ${manifestosError.message}`);
    }

    const manifestos = (manifestosData ?? []) as ManifestoRow[];
    if (manifestos.length === 0) {
      console.info('[calcularFreteMinimoPorManifesto] rodada sem manifestos:', rodadaId);
      return;
    }

    const { data: rodadaData, error: rodadaError } = await supabase
      .from('rodadas_roteirizacao')
      .select('filial_id')
      .eq('id', rodadaId)
      .maybeSingle();

    if (rodadaError) {
      throw new Error(`Erro ao buscar rodada: ${rodadaError.message}`);
    }

    const filialId = rodadaData?.filial_id ?? null;

    const { data: veiculosData, error: veiculosError } = await supabase
      .from('veiculos')
      .select('id, perfil, qtd_eixos, ativo, filial_id');

    if (veiculosError) {
      throw new Error(`Erro ao buscar veículos: ${veiculosError.message}`);
    }

    const veiculos = (veiculosData ?? []) as VeiculoRow[];

    const { data: anttData, error: anttError } = await supabase
      .from('tabela_antt')
      .select('id, eixos_2, eixos_3, eixos_4, eixos_5, eixos_6, eixos_7, eixos_9')
      .limit(1);

    if (anttError) {
      throw new Error(`Erro ao buscar tabela ANTT: ${anttError.message}`);
    }

    const anttRow = ((anttData ?? [])[0] ?? null) as ANTTRow | null;

    if (!anttRow) {
      console.warn('[calcularFreteMinimoPorManifesto] tabela_antt vazia');
      return;
    }

    const avisos: string[] = [];
    let atualizados = 0;

    for (const manifesto of manifestos) {
      const kmTotal = toNumberOrNull(manifesto.km_total);

      if (kmTotal === null || kmTotal <= 0) {
        const aviso = `${manifesto.manifesto_id}: sem km_total válido`;
        console.warn('[calcularFreteMinimoPorManifesto]', aviso);
        avisos.push(aviso);
        continue;
      }

      const veiculo = findCompatibleVeiculo(
        manifesto.veiculo_perfil,
        manifesto.veiculo_tipo,
        filialId,
        veiculos,
      );

      if (!veiculo) {
        const aviso = `${manifesto.manifesto_id}: veículo não encontrado (perfil=${manifesto.veiculo_perfil ?? '-'}, tipo=${manifesto.veiculo_tipo ?? '-'})`;
        console.warn('[calcularFreteMinimoPorManifesto]', aviso);
        avisos.push(aviso);
        continue;
      }

      const eixoColumn = EIXO_COLUMN[veiculo.qtd_eixos];

      if (!eixoColumn) {
        const aviso = `${manifesto.manifesto_id}: qtd_eixos sem coluna ANTT mapeada (${veiculo.qtd_eixos})`;
        console.warn('[calcularFreteMinimoPorManifesto]', aviso);
        avisos.push(aviso);
        continue;
      }

      const valorKm = toNumberOrNull(anttRow[eixoColumn]);

      if (valorKm === null || valorKm <= 0) {
        const aviso = `${manifesto.manifesto_id}: tarifa ANTT inválida para ${eixoColumn}`;
        console.warn('[calcularFreteMinimoPorManifesto]', aviso);
        avisos.push(aviso);
        continue;
      }

      const freteMinimo = round2(kmTotal * valorKm);

      console.info('[calcularFreteMinimoPorManifesto]', {
        manifesto_id: manifesto.manifesto_id,
        veiculo_perfil: manifesto.veiculo_perfil,
        veiculo_tipo: manifesto.veiculo_tipo,
        qtd_eixos: veiculo.qtd_eixos,
        km_total: kmTotal,
        coluna_antt: eixoColumn,
        valor_km: valorKm,
        frete_minimo: freteMinimo,
      });

      const { error: updateError } = await supabase
        .from('manifestos_roteirizacao')
        .update({ frete_minimo: freteMinimo })
        .eq('id', manifesto.id);

      if (updateError) {
        const aviso = `${manifesto.manifesto_id}: erro ao atualizar frete (${updateError.message})`;
        console.error('[calcularFreteMinimoPorManifesto]', aviso);
        avisos.push(aviso);
        continue;
      }

      atualizados += 1;
    }

    console.info('[calcularFreteMinimoPorManifesto] resumo', {
      rodada_id: rodadaId,
      manifestos_total: manifestos.length,
      manifestos_atualizados: atualizados,
      avisos_total: avisos.length,
    });

    if (avisos.length > 0) {
      await registrarAuditoriaRoteirizacao('roteirizacao_concluida', {
        rodada_id: rodadaId,
        fase: 'frete_minimo',
        avisos,
      }).catch(() => undefined);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[calcularFreteMinimoPorManifesto]', msg);

    await registrarAuditoriaRoteirizacao('roteirizacao_erro', {
      rodada_id: rodadaId,
      fase: 'frete_minimo',
      erro: msg,
    }).catch(() => undefined);
  }
}
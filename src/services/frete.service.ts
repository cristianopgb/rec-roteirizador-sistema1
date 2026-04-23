import { supabase } from './supabase';
import { registrarAuditoriaRoteirizacao } from './roteirizacao.service';

interface ManifestoRow {
  id: string;
  manifesto_id: string;
  veiculo_perfil: string | null;
  km_total: number | null;
}

interface VeiculoRow {
  perfil: string;
  qtd_eixos: number;
  ativo: boolean | null;
  filial_id: string | null;
}

interface ANTTRow {
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

function normalize(s: string | null | undefined): string {
  return (s ?? '').toString().trim().toLowerCase();
}

function findVeiculoPorPerfil(
  perfilManifesto: string | null,
  filialId: string | null,
  veiculos: VeiculoRow[]
): VeiculoRow | null {
  const perfil = normalize(perfilManifesto);
  if (!perfil) return null;

  const ativos = veiculos.filter((v) => v.ativo !== false);
  const byFilial = filialId ? ativos.filter((v) => v.filial_id === filialId) : [];
  const pool = byFilial.length > 0 ? byFilial : ativos;

  return pool.find((v) => normalize(v.perfil) === perfil) ?? null;
}

export async function calcularFreteMinimoPorManifesto(rodadaId: string): Promise<void> {
  try {
    const { data: manifestos, error: eMan } = await supabase
      .from('manifestos_roteirizacao')
      .select('id, manifesto_id, veiculo_perfil, km_total')
      .eq('rodada_id', rodadaId);

    if (eMan) throw new Error(eMan.message);
    if (!manifestos || manifestos.length === 0) {
      console.info('[calcularFreteMinimoPorManifesto] sem manifestos para rodada', rodadaId);
      return;
    }

    const { data: rodada } = await supabase
      .from('rodadas_roteirizacao')
      .select('filial_id')
      .eq('id', rodadaId)
      .maybeSingle();

    const filialId = rodada?.filial_id ?? null;

    const { data: veiculosData, error: eVei } = await supabase
      .from('veiculos')
      .select('perfil, qtd_eixos, ativo, filial_id');

    if (eVei) throw new Error(eVei.message);
    const veiculos: VeiculoRow[] = veiculosData ?? [];

    const { data: anttData, error: eAntt } = await supabase
      .from('tabela_antt')
      .select('eixos_2, eixos_3, eixos_4, eixos_5, eixos_6, eixos_7, eixos_9')
      .limit(1);

    if (eAntt) throw new Error(eAntt.message);
    const anttRow: ANTTRow | null = anttData && anttData.length > 0 ? (anttData[0] as ANTTRow) : null;

    if (!anttRow) {
      const erro = 'tabela_antt vazia: cadastre os valores R$/km por numero de eixos';
      console.error('[calcularFreteMinimoPorManifesto]', erro);
      await registrarAuditoriaRoteirizacao('roteirizacao_erro', {
        rodada_id: rodadaId,
        fase: 'frete_minimo',
        erro,
      }).catch(() => undefined);
      return;
    }

    const avisos: string[] = [];
    let calculados = 0;

    for (const m of manifestos as ManifestoRow[]) {
      if (!m.km_total || m.km_total <= 0) {
        console.warn(`[frete] manifesto=${m.manifesto_id} FALHA: km_total ausente ou zero`);
        avisos.push(`${m.manifesto_id}: sem km_total`);
        continue;
      }

      const veiculo = findVeiculoPorPerfil(m.veiculo_perfil, filialId, veiculos);
      if (!veiculo) {
        console.warn(`[frete] manifesto=${m.manifesto_id} FALHA: veiculo nao encontrado perfil="${m.veiculo_perfil ?? '-'}"`);
        avisos.push(`${m.manifesto_id}: veiculo nao encontrado perfil=${m.veiculo_perfil ?? '-'}`);
        continue;
      }

      const col = EIXO_COLUMN[veiculo.qtd_eixos];
      if (!col) {
        console.warn(`[frete] manifesto=${m.manifesto_id} FALHA: qtd_eixos=${veiculo.qtd_eixos} sem mapeamento`);
        avisos.push(`${m.manifesto_id}: qtd_eixos=${veiculo.qtd_eixos} sem mapeamento ANTT`);
        continue;
      }

      const valorKm = anttRow[col];
      if (valorKm === null || valorKm === undefined) {
        console.warn(`[frete] manifesto=${m.manifesto_id} FALHA: coluna ${col} vazia na ANTT`);
        avisos.push(`${m.manifesto_id}: coluna ${col} vazia na ANTT`);
        continue;
      }

      const frete = Math.round(Number(valorKm) * Number(m.km_total) * 100) / 100;

      console.info(
        `[frete] manifesto=${m.manifesto_id}` +
        ` veiculo_perfil="${m.veiculo_perfil}"` +
        ` qtd_eixos=${veiculo.qtd_eixos}` +
        ` km_total=${m.km_total}` +
        ` coluna=${col}` +
        ` valor_km=${valorKm}` +
        ` frete_calculado=${frete}`
      );

      const { error: eUpd } = await supabase
        .from('manifestos_roteirizacao')
        .update({ frete_minimo: frete })
        .eq('id', m.id);

      if (eUpd) {
        console.warn(`[frete] manifesto=${m.manifesto_id} FALHA ao salvar: ${eUpd.message}`);
        avisos.push(`${m.manifesto_id}: falha ao salvar: ${eUpd.message}`);
        continue;
      }

      calculados += 1;
    }

    console.info(
      '[calcularFreteMinimoPorManifesto] CONCLUIDO rodada=', rodadaId,
      'total_manifestos=', manifestos.length,
      'frete_calculado=', calculados,
      'avisos=', avisos.length
    );

    if (avisos.length > 0) {
      await registrarAuditoriaRoteirizacao('roteirizacao_concluida', {
        rodada_id: rodadaId,
        fase: 'frete_minimo',
        calculados,
        total_manifestos: manifestos.length,
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

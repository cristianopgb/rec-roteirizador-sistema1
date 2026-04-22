import { supabase } from './supabase';
import { registrarAuditoriaRoteirizacao } from './roteirizacao.service';

interface ManifestoRow {
  id: string;
  rodada_id: string;
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

function findCompatibleVeiculo(
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
      .select('id, rodada_id, manifesto_id, veiculo_perfil, km_total')
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
    const anttRow: ANTTRow | null =
      anttData && anttData.length > 0 ? (anttData[0] as ANTTRow) : null;

    if (!anttRow) {
      const erro = 'tabela_antt vazia: cadastre a linha padrão de R$/km por eixos';
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
        avisos.push(`${m.manifesto_id}: sem km_total`);
        continue;
      }

      const veiculo = findCompatibleVeiculo(m.veiculo_perfil, filialId, veiculos);
      if (!veiculo) {
        avisos.push(
          `${m.manifesto_id}: veículo compatível não encontrado para perfil=${m.veiculo_perfil ?? '-'}`
        );
        continue;
      }

      const col = EIXO_COLUMN[veiculo.qtd_eixos];
      const valorKm = col ? (anttRow[col] as number | null) : null;
      if (valorKm === null || valorKm === undefined) {
        avisos.push(`${m.manifesto_id}: sem tarifa ANTT para eixos=${veiculo.qtd_eixos}`);
        continue;
      }

      const frete = Number(valorKm) * Number(m.km_total);

      const { error: eUpd } = await supabase
        .from('manifestos_roteirizacao')
        .update({ frete_minimo: frete })
        .eq('id', m.id);

      if (eUpd) {
        avisos.push(`${m.manifesto_id}: falha no update: ${eUpd.message}`);
        continue;
      }
      calculados += 1;
    }

    console.info(
      '[calcularFreteMinimoPorManifesto] rodada=', rodadaId,
      'total=', manifestos.length,
      'calculados=', calculados,
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

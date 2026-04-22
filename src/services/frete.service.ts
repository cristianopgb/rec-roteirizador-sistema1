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
  perfil: string;
  qtd_eixos: number;
  ativo: boolean | null;
  filial_id: string | null;
}

interface ANTTRow {
  tipo_carga: string;
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

async function resolveTipoCargaDoManifesto(rodadaId: string, manifestoId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('manifestos_itens')
    .select('nro_documento')
    .eq('rodada_id', rodadaId)
    .eq('manifesto_id', manifestoId);

  if (error || !data || data.length === 0) return null;

  const docs = data.map((r) => r.nro_documento).filter(Boolean) as string[];
  if (docs.length === 0) return null;

  const { data: carteira } = await supabase
    .from('carteira_itens')
    .select('tipo_carga')
    .in('nro_doc', docs.map((d) => Number(d)).filter((n) => Number.isFinite(n)));

  if (!carteira || carteira.length === 0) return null;

  const counts = new Map<string, number>();
  for (const row of carteira) {
    const t = normalize(row.tipo_carga);
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let best = '';
  let bestCount = 0;
  for (const [k, v] of counts) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best || null;
}

function findCompatibleVeiculo(
  perfilManifesto: string | null,
  tipoManifesto: string | null,
  filialId: string | null,
  veiculos: VeiculoRow[]
): VeiculoRow | null {
  const perfil = normalize(perfilManifesto);
  const tipo = normalize(tipoManifesto);

  const candidates = veiculos.filter((v) => v.ativo !== false);
  const byFilial = filialId ? candidates.filter((v) => v.filial_id === filialId) : [];

  const pool = byFilial.length > 0 ? byFilial : candidates;

  const matchPerfil = pool.find((v) => normalize(v.perfil) === perfil);
  if (matchPerfil) return matchPerfil;

  if (tipo) {
    const matchTipo = pool.find((v) => normalize(v.perfil) === tipo);
    if (matchTipo) return matchTipo;
  }

  return null;
}

function findANTTRow(tipoCarga: string | null, tabela: ANTTRow[]): ANTTRow | null {
  if (!tipoCarga || tabela.length === 0) return null;
  const tn = normalize(tipoCarga);

  const exact = tabela.find((r) => normalize(r.tipo_carga) === tn);
  if (exact) return exact;

  return tabela.find((r) => normalize(r.tipo_carga).includes(tn) || tn.includes(normalize(r.tipo_carga))) ?? null;
}

export async function calcularFreteMinimoPorManifesto(rodadaId: string): Promise<void> {
  try {
    const { data: manifestos, error: eMan } = await supabase
      .from('manifestos_roteirizacao')
      .select('id, rodada_id, manifesto_id, veiculo_perfil, veiculo_tipo, km_total')
      .eq('rodada_id', rodadaId);

    if (eMan) throw new Error(eMan.message);
    if (!manifestos || manifestos.length === 0) return;

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
      .select('tipo_carga, eixos_2, eixos_3, eixos_4, eixos_5, eixos_6, eixos_7, eixos_9');

    if (eAntt) throw new Error(eAntt.message);
    const antt: ANTTRow[] = anttData ?? [];

    const avisos: string[] = [];

    for (const m of manifestos as ManifestoRow[]) {
      if (!m.km_total || m.km_total <= 0) {
        avisos.push(`${m.manifesto_id}: sem km_total`);
        continue;
      }

      const veiculo = findCompatibleVeiculo(m.veiculo_perfil, m.veiculo_tipo, filialId, veiculos);
      if (!veiculo) {
        avisos.push(`${m.manifesto_id}: veículo compatível não encontrado para perfil=${m.veiculo_perfil ?? '-'}`);
        continue;
      }

      const tipoCarga = await resolveTipoCargaDoManifesto(rodadaId, m.manifesto_id);
      const anttRow = findANTTRow(tipoCarga, antt);
      if (!anttRow) {
        avisos.push(`${m.manifesto_id}: ANTT não encontrada (tipo_carga=${tipoCarga ?? '-'})`);
        continue;
      }

      const col = EIXO_COLUMN[veiculo.qtd_eixos];
      const valorKm = col ? (anttRow[col] as number | null) : null;
      if (valorKm === null || valorKm === undefined) {
        avisos.push(`${m.manifesto_id}: sem tarifa ANTT para eixos=${veiculo.qtd_eixos}`);
        continue;
      }

      const frete = Number(valorKm) * Number(m.km_total);

      await supabase
        .from('manifestos_roteirizacao')
        .update({ frete_minimo: frete })
        .eq('id', m.id);
    }

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

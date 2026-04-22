import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Button } from '../components/common/Button';
import {
  ListChecks,
  AlertCircle,
  BarChart3,
  FileDown,
  X,
  Truck,
  MapPin,
  Package,
  Gauge,
  Save,
  RotateCcw,
} from 'lucide-react';
import { imprimirManifesto } from '../utils/manifestoPdf';
import { reprocessarPersistenciaRodada } from '../services/roteirizacao.service';
import { calcularFreteMinimoPorManifesto } from '../services/frete.service';

interface RodadaRow {
  id: string;
  filial_id: string;
  status: string;
  created_at: string;
  mensagem_retorno: string | null;
}

interface EstatisticaRow {
  rodada_id: string;
  total_carteira: number;
  total_roteirizado: number;
  total_remanescente: number;
  total_manifestos: number;
  km_total: number | null;
  ocupacao_media: number | null;
  tempo_execucao_ms: number | null;
  resumo_modulos_json: any;
}

interface ManifestoRow {
  id: string;
  rodada_id: string;
  manifesto_id: string;
  origem_modulo: string | null;
  tipo_manifesto: string | null;
  veiculo_perfil: string | null;
  veiculo_tipo: string | null;
  exclusivo_flag: boolean;
  peso_total: number | null;
  km_total: number | null;
  ocupacao: number | null;
  qtd_entregas: number;
  qtd_clientes: number;
  frete_minimo: number | null;
  sequencia_editada_flag: boolean;
}

interface ManifestoItemRow {
  id: string;
  manifesto_id: string;
  sequencia_original: number;
  sequencia_atual: number;
  nro_documento: string | null;
  destinatario: string | null;
  cidade: string | null;
  uf: string | null;
  peso: number | null;
  distancia_km: number | null;
  inicio_entrega: string | null;
  fim_entrega: string | null;
  observacoes: string | null;
}

interface RemanescenteRow {
  id: string;
  nro_documento: string | null;
  destinatario: string | null;
  cidade: string | null;
  uf: string | null;
  motivo: string | null;
  etapa_origem: string | null;
  grupo_remanescente: 'nao_roteirizavel' | 'saldo_roteirizacao' | null;
}

interface FilialRow {
  id: string;
  nome: string;
}

type Tab = 'manifestos' | 'remanescentes' | 'estatisticas';

function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '-';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '-';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

export function Aprovacao() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rodadas, setRodadas] = useState<RodadaRow[]>([]);
  const [estatMap, setEstatMap] = useState<Record<string, EstatisticaRow>>({});
  const [filiaisMap, setFiliaisMap] = useState<Record<string, string>>({});
  const [loadingRodadas, setLoadingRodadas] = useState(true);

  const [selectedRodadaId, setSelectedRodadaId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('manifestos');

  const [manifestos, setManifestos] = useState<ManifestoRow[]>([]);
  const [remanescentes, setRemanescentes] = useState<RemanescenteRow[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  const [manifestoSelecionado, setManifestoSelecionado] = useState<ManifestoRow | null>(null);
  const [itensManifesto, setItensManifesto] = useState<ManifestoItemRow[]>([]);
  const [itensEditados, setItensEditados] = useState<Record<string, number>>({});
  const [salvandoSeq, setSalvandoSeq] = useState(false);
  const [reprocessando, setReprocessando] = useState(false);

  useEffect(() => {
    if (profile?.filial_id) {
      carregarRodadas();
    }
  }, [profile?.filial_id]);

  useEffect(() => {
    const urlRodada = searchParams.get('rodadaId');
    if (urlRodada) setSelectedRodadaId(urlRodada);
  }, [searchParams]);

  useEffect(() => {
    const urlRodada = searchParams.get('rodadaId');
    if (!urlRodada || rodadas.length === 0) return;
    if (!rodadas.find((r) => r.id === urlRodada)) {
      carregarRodadas();
    }
  }, [searchParams, rodadas]);

  useEffect(() => {
    if (!selectedRodadaId && rodadas.length > 0) {
      setSelectedRodadaId(rodadas[0].id);
    }
  }, [rodadas, selectedRodadaId]);

  useEffect(() => {
    if (selectedRodadaId) {
      carregarDetalheRodada(selectedRodadaId);
    }
  }, [selectedRodadaId]);

  async function carregarRodadas() {
    if (!profile?.filial_id) return;
    setLoadingRodadas(true);

    const { data: rodadasData } = await supabase
      .from('rodadas_roteirizacao')
      .select('id, filial_id, status, created_at, mensagem_retorno')
      .eq('filial_id', profile.filial_id)
      .order('created_at', { ascending: false })
      .limit(100);

    const list = (rodadasData ?? []) as RodadaRow[];
    setRodadas(list);

    if (list.length > 0) {
      const ids = list.map((r) => r.id);
      const filialIds = Array.from(new Set(list.map((r) => r.filial_id)));

      const [{ data: stats }, { data: filiais }] = await Promise.all([
        supabase.from('estatisticas_roteirizacao').select('*').in('rodada_id', ids),
        supabase.from('filiais').select('id, nome').in('id', filialIds),
      ]);

      const sm: Record<string, EstatisticaRow> = {};
      for (const s of (stats ?? []) as EstatisticaRow[]) sm[s.rodada_id] = s;
      setEstatMap(sm);

      const fm: Record<string, string> = {};
      for (const f of (filiais ?? []) as FilialRow[]) fm[f.id] = f.nome;
      setFiliaisMap(fm);
    }

    setLoadingRodadas(false);
  }

  async function carregarDetalheRodada(rodadaId: string) {
    setLoadingDetalhe(true);
    setManifestoSelecionado(null);
    setItensManifesto([]);
    setItensEditados({});

    const [{ data: m }, { data: r }] = await Promise.all([
      supabase
        .from('manifestos_roteirizacao')
        .select('*')
        .eq('rodada_id', rodadaId)
        .order('manifesto_id', { ascending: true }),
      supabase
        .from('remanescentes_roteirizacao')
        .select('*')
        .eq('rodada_id', rodadaId)
        .order('created_at', { ascending: true }),
    ]);

    setManifestos((m ?? []) as ManifestoRow[]);
    setRemanescentes((r ?? []) as RemanescenteRow[]);
    setLoadingDetalhe(false);
  }

  function selecionarRodada(id: string) {
    setSelectedRodadaId(id);
    setSearchParams({ rodadaId: id });
  }

  async function abrirManifesto(m: ManifestoRow) {
    setManifestoSelecionado(m);
    setItensEditados({});

    const { data } = await supabase
      .from('manifestos_itens')
      .select('*')
      .eq('rodada_id', m.rodada_id)
      .eq('manifesto_id', m.manifesto_id)
      .order('sequencia_atual', { ascending: true });

    setItensManifesto((data ?? []) as ManifestoItemRow[]);
  }

  function atualizarSeqLocal(itemId: string, novaSeq: number) {
    setItensEditados((prev) => ({ ...prev, [itemId]: novaSeq }));
  }

  function seqAtualLocal(item: ManifestoItemRow): number {
    return itensEditados[item.id] ?? item.sequencia_atual;
  }

  async function salvarSequencia() {
    if (!manifestoSelecionado) return;
    const ids = itensManifesto.map((i) => i.id);
    const novas = ids.map((id) => {
      const it = itensManifesto.find((x) => x.id === id)!;
      return { id, seq: seqAtualLocal(it) };
    });

    const seqSet = new Set<number>();
    for (const n of novas) {
      if (!Number.isInteger(n.seq) || n.seq < 1) {
        alert('Sequência inválida: use inteiros positivos.');
        return;
      }
      if (seqSet.has(n.seq)) {
        alert(`Sequência duplicada: ${n.seq}`);
        return;
      }
      seqSet.add(n.seq);
    }

    const sorted = [...novas].sort((a, b) => a.seq - b.seq);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].seq !== i + 1) {
        alert('A sequência deve ser contígua começando em 1.');
        return;
      }
    }

    setSalvandoSeq(true);
    try {
      for (const n of novas) {
        const it = itensManifesto.find((x) => x.id === n.id)!;
        if (it.sequencia_atual !== n.seq) {
          const { error } = await supabase
            .from('manifestos_itens')
            .update({ sequencia_atual: n.seq })
            .eq('id', n.id);
          if (error) throw new Error(error.message);
        }
      }

      await supabase
        .from('manifestos_roteirizacao')
        .update({ sequencia_editada_flag: true })
        .eq('id', manifestoSelecionado.id);

      await abrirManifesto({ ...manifestoSelecionado, sequencia_editada_flag: true });
      setManifestos((prev) =>
        prev.map((p) =>
          p.id === manifestoSelecionado.id ? { ...p, sequencia_editada_flag: true } : p
        )
      );
    } catch (err) {
      alert(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSalvandoSeq(false);
    }
  }

  function resetarSequencia() {
    setItensEditados({});
  }

  async function handleReprocessar() {
    if (!selectedRodadaId) return;
    setReprocessando(true);
    try {
      const contagem = await reprocessarPersistenciaRodada(selectedRodadaId);
      try {
        await calcularFreteMinimoPorManifesto(selectedRodadaId);
      } catch (freteErr) {
        console.error('[Aprovacao] frete falhou no reprocesso:', freteErr);
      }
      alert(
        `Reprocessamento concluído:\n- Manifestos: ${contagem.manifestos}\n- Itens: ${contagem.itens}\n- Remanescentes: ${contagem.remanescentes}\n- Estatísticas: ${contagem.estatisticas}`
      );
      await carregarDetalheRodada(selectedRodadaId);
      await carregarRodadas();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Aprovacao] reprocessar falhou:', msg);
      alert(`Falha ao reprocessar: ${msg}`);
    } finally {
      setReprocessando(false);
    }
  }

  function handleDownloadPdf() {
    if (!manifestoSelecionado || !selectedRodadaId) return;
    const rodada = rodadas.find((r) => r.id === selectedRodadaId);
    const filialNome = rodada ? filiaisMap[rodada.filial_id] ?? null : null;

    const itensOrdenados = [...itensManifesto]
      .map((it) => ({ ...it, sequencia_atual: seqAtualLocal(it) }))
      .sort((a, b) => a.sequencia_atual - b.sequencia_atual);

    imprimirManifesto({
      manifestoId: manifestoSelecionado.manifesto_id,
      filialNome,
      dataRodada: rodada ? fmtDate(rodada.created_at) : '',
      veiculoPerfil: manifestoSelecionado.veiculo_perfil,
      veiculoTipo: manifestoSelecionado.veiculo_tipo,
      kmTotal: manifestoSelecionado.km_total,
      pesoTotal: manifestoSelecionado.peso_total,
      qtdEntregas: manifestoSelecionado.qtd_entregas,
      freteMinimo: manifestoSelecionado.frete_minimo,
      itens: itensOrdenados,
    });
  }

  const selectedRodada = useMemo(
    () => rodadas.find((r) => r.id === selectedRodadaId) ?? null,
    [rodadas, selectedRodadaId]
  );
  const selectedEstat = selectedRodadaId ? estatMap[selectedRodadaId] : undefined;

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aprovação</h1>
          <p className="text-gray-600 mt-1">Revisão operacional das rodadas processadas</p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Rodadas</h2>
            </div>
            {loadingRodadas ? (
              <div className="p-6 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : rodadas.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 text-center">Nenhuma rodada disponível.</div>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-auto">
                {rodadas.map((r) => {
                  const est = estatMap[r.id];
                  const ativo = r.id === selectedRodadaId;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => selecionarRodada(r.id)}
                        className={`w-full text-left px-4 py-3 transition ${
                          ativo ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{fmtDate(r.created_at)}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {filiaisMap[r.filial_id] ?? '—'}
                        </div>
                        {est && (
                          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-gray-600">
                            <span>Cart: {est.total_carteira}</span>
                            <span>Rot: {est.total_roteirizado}</span>
                            <span>Rem: {est.total_remanescente}</span>
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section className="col-span-12 lg:col-span-8 xl:col-span-9 bg-white rounded-lg shadow border border-gray-200">
            {!selectedRodada ? (
              <div className="p-12">
                <EmptyState
                  icon={<ListChecks size={64} />}
                  title="Selecione uma rodada"
                  description="Escolha uma rodada na lista à esquerda para ver seus manifestos."
                />
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Rodada</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {fmtDate(selectedRodada.created_at)} — {filiaisMap[selectedRodada.filial_id] ?? '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleReprocessar}
                      loading={reprocessando}
                      className="text-sm"
                    >
                      Reprocessar
                    </Button>
                    <StatusBadge status={selectedRodada.status} />
                  </div>
                </div>

                {!loadingDetalhe && selectedRodada.status === 'processado' && manifestos.length === 0 && (
                  <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-300 text-amber-800 rounded flex items-start gap-2 text-sm">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Rodada processada mas sem dados estruturados.</strong>{' '}
                      Clique em <em>Reprocessar</em> para persistir os manifestos a partir da resposta original do motor.
                      Se persistir o problema, verifique o console do navegador.
                    </div>
                  </div>
                )}

                <div className="border-b border-gray-200 px-6">
                  <nav className="flex gap-1">
                    <TabButton active={tab === 'manifestos'} onClick={() => setTab('manifestos')} icon={Truck}>
                      Manifestos
                    </TabButton>
                    <TabButton active={tab === 'remanescentes'} onClick={() => setTab('remanescentes')} icon={AlertCircle}>
                      Remanescentes
                    </TabButton>
                    <TabButton active={tab === 'estatisticas'} onClick={() => setTab('estatisticas')} icon={BarChart3}>
                      Estatísticas
                    </TabButton>
                  </nav>
                </div>

                <div className="p-6">
                  {loadingDetalhe ? (
                    <div className="py-10 flex justify-center"><LoadingSpinner size="md" /></div>
                  ) : (
                    <>
                      {tab === 'manifestos' && (
                        <ManifestosTable manifestos={manifestos} onSelect={abrirManifesto} />
                      )}
                      {tab === 'remanescentes' && <RemanescentesTable data={remanescentes} />}
                      {tab === 'estatisticas' && <EstatisticasView data={selectedEstat} />}
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {manifestoSelecionado && (
        <aside className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-900 text-white flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400">Manifesto</div>
              <div className="text-xl font-bold">{manifestoSelecionado.manifesto_id}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleDownloadPdf} className="flex items-center gap-2 !bg-white !text-gray-900">
                <FileDown size={16} /> PDF
              </Button>
              <button
                onClick={() => setManifestoSelecionado(null)}
                className="p-2 hover:bg-gray-800 rounded transition"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5 overflow-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoCard icon={Truck} label="Veículo" value={manifestoSelecionado.veiculo_perfil ?? manifestoSelecionado.veiculo_tipo ?? '-'} />
              <InfoCard icon={Package} label="Entregas" value={String(manifestoSelecionado.qtd_entregas)} />
              <InfoCard icon={Gauge} label="Peso (kg)" value={fmtNum(manifestoSelecionado.peso_total)} />
              <InfoCard icon={MapPin} label="KM Total" value={fmtNum(manifestoSelecionado.km_total)} />
              <InfoCard
                icon={BarChart3}
                label="Ocupação"
                value={manifestoSelecionado.ocupacao !== null ? `${fmtNum(manifestoSelecionado.ocupacao, 1)}%` : '-'}
              />
              <InfoCard icon={FileDown} label="Frete Mínimo" value={fmtMoney(manifestoSelecionado.frete_minimo)} />
              <InfoCard icon={Truck} label="Origem" value={manifestoSelecionado.origem_modulo ?? '-'} />
              <InfoCard icon={ListChecks} label="Clientes" value={String(manifestoSelecionado.qtd_clientes)} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Sequência de Entregas</h3>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={resetarSequencia} className="flex items-center gap-1 text-xs">
                    <RotateCcw size={14} /> Desfazer
                  </Button>
                  <Button
                    onClick={salvarSequencia}
                    disabled={salvandoSeq || Object.keys(itensEditados).length === 0}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Save size={14} /> Salvar
                  </Button>
                </div>
              </div>

              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left w-16">Seq</th>
                      <th className="px-3 py-2 text-left">Documento</th>
                      <th className="px-3 py-2 text-left">Destinatário</th>
                      <th className="px-3 py-2 text-left">Cidade/UF</th>
                      <th className="px-3 py-2 text-right">Peso</th>
                      <th className="px-3 py-2 text-left">Janela</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itensManifesto.map((it) => {
                      const edited = itensEditados[it.id] !== undefined;
                      return (
                        <tr key={it.id} className={edited ? 'bg-amber-50' : ''}>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={seqAtualLocal(it)}
                              onChange={(e) => atualizarSeqLocal(it.id, parseInt(e.target.value, 10) || 0)}
                              className="w-14 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{it.nro_documento ?? '-'}</td>
                          <td className="px-3 py-2">{it.destinatario ?? '-'}</td>
                          <td className="px-3 py-2">{it.cidade ?? '-'}{it.uf ? ` / ${it.uf}` : ''}</td>
                          <td className="px-3 py-2 text-right">{fmtNum(it.peso)}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {it.inicio_entrega ?? '-'} - {it.fim_entrega ?? '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {itensManifesto.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-500 text-sm">
                          Nenhum item neste manifesto.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </aside>
      )}
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
    processado: { variant: 'success', label: 'Processado' },
    erro: { variant: 'error', label: 'Erro' },
    enviando: { variant: 'warning', label: 'Enviando' },
    iniciado: { variant: 'default', label: 'Iniciado' },
  };
  const info = map[status] ?? { variant: 'default' as const, label: status };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ListChecks;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

function ManifestosTable({
  manifestos,
  onSelect,
}: {
  manifestos: ManifestoRow[];
  onSelect: (m: ManifestoRow) => void;
}) {
  if (manifestos.length === 0) {
    return <EmptyState icon={<Truck size={64} />} title="Sem manifestos" description="Esta rodada não tem manifestos persistidos." />;
  }
  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-600">
          <tr>
            <th className="px-4 py-2 text-left">Manifesto</th>
            <th className="px-4 py-2 text-left">Origem</th>
            <th className="px-4 py-2 text-left">Veículo</th>
            <th className="px-4 py-2 text-right">Entregas</th>
            <th className="px-4 py-2 text-right">Clientes</th>
            <th className="px-4 py-2 text-right">Peso (kg)</th>
            <th className="px-4 py-2 text-right">KM</th>
            <th className="px-4 py-2 text-right">Ocup.</th>
            <th className="px-4 py-2 text-right">Frete Mín.</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {manifestos.map((m) => (
            <tr
              key={m.id}
              className="hover:bg-blue-50 cursor-pointer transition"
              onClick={() => onSelect(m)}
            >
              <td className="px-4 py-2 font-mono font-semibold text-gray-900">{m.manifesto_id}</td>
              <td className="px-4 py-2 text-gray-600">{m.origem_modulo ?? '-'}</td>
              <td className="px-4 py-2">{m.veiculo_perfil ?? m.veiculo_tipo ?? '-'}</td>
              <td className="px-4 py-2 text-right">{m.qtd_entregas}</td>
              <td className="px-4 py-2 text-right">{m.qtd_clientes}</td>
              <td className="px-4 py-2 text-right">{fmtNum(m.peso_total)}</td>
              <td className="px-4 py-2 text-right">{fmtNum(m.km_total)}</td>
              <td className="px-4 py-2 text-right">{m.ocupacao !== null ? `${fmtNum(m.ocupacao, 1)}%` : '-'}</td>
              <td className="px-4 py-2 text-right font-medium text-gray-900">{fmtMoney(m.frete_minimo)}</td>
              <td className="px-4 py-2 text-right">
                {m.sequencia_editada_flag && (
                  <Badge variant="warning">editado</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RemanescentesTable({ data }: { data: RemanescenteRow[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<AlertCircle size={64} />}
        title="Sem remanescentes"
        description="Nenhum item remanescente explícito retornado nesta rodada."
      />
    );
  }
  const naoRoteirizaveis = data.filter((r) => r.grupo_remanescente === 'nao_roteirizavel');
  const saldoRoteirizacao = data.filter((r) => r.grupo_remanescente === 'saldo_roteirizacao');

  function renderTabela(rows: RemanescenteRow[], titulo: string) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900">{titulo} ({rows.length})</h4>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Documento</th>
              <th className="px-4 py-2 text-left">Cliente</th>
              <th className="px-4 py-2 text-left">Cidade/UF</th>
              <th className="px-4 py-2 text-left">Motivo</th>
              <th className="px-4 py-2 text-left">Etapa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-gray-500" colSpan={5}>Nenhum item neste grupo.</td>
              </tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono">{r.nro_documento ?? '-'}</td>
                <td className="px-4 py-2">{r.destinatario ?? '-'}</td>
                <td className="px-4 py-2">{r.cidade ?? '-'}{r.uf ? ` / ${r.uf}` : ''}</td>
                <td className="px-4 py-2">{r.motivo ?? '-'}</td>
                <td className="px-4 py-2 text-gray-600">{r.etapa_origem ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 space-y-6">
      <div className="px-6">
        {renderTabela(naoRoteirizaveis, 'Não roteirizáveis')}
      </div>
      <div className="px-6">
        {renderTabela(saldoRoteirizacao, 'Saldo da roteirização')}
      </div>
    </div>
  );
}

function EstatisticasView({ data }: { data: EstatisticaRow | undefined }) {
  if (!data) {
    return (
      <EmptyState
        icon={<BarChart3 size={64} />}
        title="Sem estatísticas"
        description="Nenhuma estatística estruturada foi persistida para esta rodada."
      />
    );
  }
  const modulos = Array.isArray(data.resumo_modulos_json) ? data.resumo_modulos_json : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Carteira" value={String(data.total_carteira)} />
        <KpiCard label="Roteirizado" value={String(data.total_roteirizado)} tone="success" />
        <KpiCard label="Remanescente" value={String(data.total_remanescente)} tone="warning" />
        <KpiCard label="Manifestos" value={String(data.total_manifestos)} />
        <KpiCard label="KM Total" value={fmtNum(data.km_total)} />
        <KpiCard
          label="Ocupação Média"
          value={data.ocupacao_media !== null ? `${fmtNum(data.ocupacao_media, 1)}%` : '-'}
        />
        <KpiCard
          label="Tempo"
          value={data.tempo_execucao_ms !== null ? `${fmtNum(data.tempo_execucao_ms / 1000, 1)} s` : '-'}
        />
      </div>

      {modulos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Módulos do Pipeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modulos.map((m: any, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded p-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-900">{m.modulo}</span>
                  <Badge variant={m.status === 'ok' ? 'success' : 'warning'}>{m.status}</Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate" title={m.mensagem}>
                  {m.mensagem}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-gray-600">
                  <span>In: {m.quantidade_entrada ?? '-'}</span>
                  <span>Out: {m.quantidade_saida ?? '-'}</span>
                  <span>{m.tempo_ms != null ? `${fmtNum(m.tempo_ms, 0)} ms` : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  const toneClass =
    tone === 'success' ? 'text-emerald-700' : tone === 'warning' ? 'text-amber-700' : 'text-gray-900';
  return (
    <div className="border border-gray-200 rounded p-3 bg-white">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListChecks;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
        <Icon size={12} /> {label}
      </div>
      <div className="text-sm font-semibold text-gray-900 mt-1 truncate">{value}</div>
    </div>
  );
}
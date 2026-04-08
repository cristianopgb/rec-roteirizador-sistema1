import { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../ui/Select';
import { MultiSelect } from '../ui/MultiSelect';
import { Filter, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { Veiculo, CarteiraFilterValues, TipoRoteirizacao, ConfiguracaoFrota } from '../../types';

interface CarteiraFiltersProps {
  onFilterChange: (filters: CarteiraFilterValues) => void;
  isAdmin?: boolean;
  userFilial?: string;
  uploadId?: string;
}

export function CarteiraFilters({
  onFilterChange,
  isAdmin = false,
  userFilial,
  uploadId,
}: CarteiraFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CarteiraFilterValues>({
    filial_r: !isAdmin && userFilial ? [userFilial] : undefined,
    uf: undefined,
    destin: undefined,
    cidade: undefined,
    tomad: undefined,
    mesoregiao: undefined,
    prioridade: undefined,
    restricao_veiculo: undefined,
    carro_dedicado: undefined,
    tipo_roteirizacao: 'carteira',
    configuracao_frota: [],
  });
  const [mesoregioes, setMesoregioes] = useState<string[]>([]);
  const [filiais, setFiliais] = useState<string[]>([]);
  const [ufs, setUfs] = useState<string[]>([]);
  const [tomadores, setTomadores] = useState<string[]>([]);
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [perfisDisponiveis, setPerfisDisponiveis] = useState<Array<{ perfil: string; count: number }>>([]);
  const [quantidadesPorPerfil, setQuantidadesPorPerfil] = useState<Record<string, number>>({});

  useEffect(() => {
    if (uploadId) {
      buscarMesoregioes();
      buscarFiliaisDisponiveis();
      buscarUfsDisponiveis();
      buscarTomadoresDisponiveis();
      buscarDestinatariosDisponiveis();
      buscarCidadesDisponiveis();
    }
  }, [uploadId]);

  useEffect(() => {
    buscarPerfisDisponiveis();
  }, []);

  const buscarMesoregioes = async () => {
    if (!uploadId) return;

    try {
      const { data, error } = await supabase
        .from('carteira_itens')
        .select('mesoregiao')
        .eq('upload_id', uploadId)
        .not('mesoregiao', 'is', null)
        .order('mesoregiao');

      if (error) throw error;

      const uniqueMesoregioes = Array.from(
        new Set((data || []).map(item => item.mesoregiao).filter(Boolean))
      ) as string[];

      setMesoregioes(uniqueMesoregioes);
    } catch (error) {
      console.error('Erro ao buscar mesoregiões:', error);
    }
  };

  const buscarFiliaisDisponiveis = async () => {
    if (!uploadId) return;

    try {
      const { data, error } = await supabase
        .from('carteira_itens')
        .select('filial_r')
        .eq('upload_id', uploadId)
        .not('filial_r', 'is', null)
        .order('filial_r');

      if (error) throw error;

      const uniqueFiliais = Array.from(
        new Set((data || []).map(item => item.filial_r).filter(Boolean))
      ) as string[];

      uniqueFiliais.sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });

      setFiliais(uniqueFiliais);
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
    }
  };

  const buscarUfsDisponiveis = async () => {
    if (!uploadId) return;

    try {
      const { data, error } = await supabase
        .from('carteira_itens')
        .select('uf')
        .eq('upload_id', uploadId)
        .not('uf', 'is', null)
        .order('uf');

      if (error) throw error;

      const uniqueUfs = Array.from(
        new Set((data || []).map(item => item.uf).filter(Boolean))
      ) as string[];

      setUfs(uniqueUfs.sort());
    } catch (error) {
      console.error('Erro ao buscar UFs:', error);
    }
  };

  const buscarTomadoresDisponiveis = async () => {
    if (!uploadId) return;

    try {
      const { data, error } = await supabase
        .from('carteira_itens')
        .select('tomad')
        .eq('upload_id', uploadId)
        .not('tomad', 'is', null)
        .order('tomad');

      if (error) throw error;

      const uniqueTomadores = Array.from(
        new Set((data || []).map(item => item.tomad).filter(Boolean))
      ) as string[];

      setTomadores(uniqueTomadores.sort());
    } catch (error) {
      console.error('Erro ao buscar tomadores:', error);
    }
  };

  const buscarDestinatariosDisponiveis = async () => {
    if (!uploadId) return;

    try {
      const { data, error } = await supabase
        .from('carteira_itens')
        .select('destin')
        .eq('upload_id', uploadId)
        .not('destin', 'is', null)
        .order('destin');

      if (error) throw error;

      const uniqueDestinatarios = Array.from(
        new Set((data || []).map(item => item.destin).filter(Boolean))
      ) as string[];

      setDestinatarios(uniqueDestinatarios.sort());
    } catch (error) {
      console.error('Erro ao buscar destinatários:', error);
    }
  };

  const buscarCidadesDisponiveis = async () => {
    if (!uploadId) return;

    try {
      const { data, error } = await supabase
        .from('carteira_itens')
        .select('cidade')
        .eq('upload_id', uploadId)
        .not('cidade', 'is', null)
        .order('cidade');

      if (error) throw error;

      const uniqueCidades = Array.from(
        new Set((data || []).map(item => item.cidade).filter(Boolean))
      ) as string[];

      setCidades(uniqueCidades.sort());
    } catch (error) {
      console.error('Erro ao buscar cidades:', error);
    }
  };

  const buscarPerfisDisponiveis = async () => {
    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('perfil')
        .is('filial_id', null)
        .eq('ativo', true);

      if (error) throw error;

      const perfisMap = new Map<string, number>();
      (data || []).forEach((v: Veiculo) => {
        perfisMap.set(v.perfil, (perfisMap.get(v.perfil) || 0) + 1);
      });

      const perfisArray = Array.from(perfisMap.entries()).map(([perfil, count]) => ({
        perfil,
        count,
      }));

      setPerfisDisponiveis(perfisArray);
    } catch (error) {
      console.error('Erro ao buscar perfis disponíveis:', error);
    }
  };

  const handleFilterChange = (key: keyof CarteiraFilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleTipoRoteirizacaoChange = (tipo: TipoRoteirizacao) => {
    setFilters({ ...filters, tipo_roteirizacao: tipo });
  };

  const handleQuantidadePerfilChange = (perfil: string, quantidade: number) => {
    const novasQuantidades = { ...quantidadesPorPerfil, [perfil]: quantidade };
    setQuantidadesPorPerfil(novasQuantidades);

    const configuracao = Object.entries(novasQuantidades)
      .filter(([_, qtd]) => qtd > 0)
      .map(([perfil, quantidade]) => ({ perfil, quantidade }));

    setFilters({ ...filters, configuracao_frota: configuracao });
  };

  const handleLimparConfiguracao = () => {
    setQuantidadesPorPerfil({});
    setFilters({ ...filters, configuracao_frota: [] });
  };

  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters: CarteiraFilterValues = {
      filial: !isAdmin && userFilial ? [userFilial] : undefined,
      uf: undefined,
      destinatario: undefined,
      cida: undefined,
      tomador: undefined,
      mesoregiao: undefined,
      tipo_roteirizacao: 'carteira',
      configuracao_frota: [],
    };
    setFilters(clearedFilters);
    setQuantidadesPorPerfil({});
    onFilterChange(clearedFilters);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => {
      if (!isAdmin && key === 'filial') return false;
      return value !== undefined && value !== '';
    }
  ).length;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
        >
          <Filter size={20} />
          <span>Filtros Avançados</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <Button onClick={handleClearFilters} variant="outline" size="sm">
            <X size={16} />
            Limpar Filtros
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status Validação
              </label>
              <Select
                value={filters.status_validacao || ''}
                onChange={(e) =>
                  handleFilterChange('status_validacao', e.target.value as any)
                }
              >
                <option value="">Todos</option>
                <option value="valida">Válida</option>
                <option value="invalida">Inválida</option>
              </Select>
            </div>

            {isAdmin && (
              <MultiSelect
                label="Filial"
                value={Array.isArray(filters.filial) ? filters.filial : (filters.filial ? [filters.filial] : [])}
                options={filiais.map(f => ({ value: f, label: f }))}
                onChange={(values) => handleFilterChange('filial_r', values.length > 0 ? values : undefined)}
                placeholder="Todas"
              />
            )}

            <MultiSelect
              label="UF"
              value={Array.isArray(filters.uf) ? filters.uf : (filters.uf ? [filters.uf] : [])}
              options={ufs.map(uf => ({ value: uf, label: uf }))}
              onChange={(values) => handleFilterChange('uf', values.length > 0 ? values : undefined)}
              placeholder="Todos"
            />

            <MultiSelect
              label="Mesorregião"
              value={Array.isArray(filters.mesoregiao) ? filters.mesoregiao : (filters.mesoregiao ? [filters.mesoregiao] : [])}
              options={mesoregioes.map(m => ({ value: m, label: m }))}
              onChange={(values) => handleFilterChange('mesoregiao', values.length > 0 ? values : undefined)}
              placeholder="Todas"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MultiSelect
              label="Destinatário"
              value={Array.isArray(filters.destinatario) ? filters.destinatario : (filters.destinatario ? [filters.destinatario] : [])}
              options={destinatarios.map(d => ({ value: d, label: d }))}
              onChange={(values) => handleFilterChange('destin', values.length > 0 ? values : undefined)}
              placeholder="Todos"
            />

            <MultiSelect
              label="Cidade"
              value={Array.isArray(filters.cida) ? filters.cida : (filters.cida ? [filters.cida] : [])}
              options={cidades.map(c => ({ value: c, label: c }))}
              onChange={(values) => handleFilterChange('cidade', values.length > 0 ? values : undefined)}
              placeholder="Todas"
            />

            <MultiSelect
              label="Tomador"
              value={Array.isArray(filters.tomador) ? filters.tomador : (filters.tomador ? [filters.tomador] : [])}
              options={tomadores.map(t => ({ value: t, label: t }))}
              onChange={(values) => handleFilterChange('tomad', values.length > 0 ? values : undefined)}
              placeholder="Todos"
            />
          </div>

          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Filtros de Período</h4>
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-2 items-center">
                <label className="text-xs font-medium text-gray-600">Agendam.</label>
                <Input
                  type="date"
                  placeholder="Data Início"
                  value={filters.agendam_inicio || ''}
                  onChange={(e) => handleFilterChange('agendam_inicio', e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Data Fim"
                  value={filters.agendam_fim || ''}
                  onChange={(e) => handleFilterChange('agendam_fim', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-2 items-center">
                <label className="text-xs font-medium text-gray-600">D.L.E.</label>
                <Input
                  type="date"
                  placeholder="Data Início"
                  value={filters.dle_inicio || ''}
                  onChange={(e) => handleFilterChange('dle_inicio', e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Data Fim"
                  value={filters.dle_fim || ''}
                  onChange={(e) => handleFilterChange('dle_fim', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-2 items-center">
                <label className="text-xs font-medium text-gray-600">Data Des</label>
                <Input
                  type="date"
                  placeholder="Data Início"
                  value={filters.data_des_inicio || ''}
                  onChange={(e) => handleFilterChange('data_des_inicio', e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Data Fim"
                  value={filters.data_des_fim || ''}
                  onChange={(e) => handleFilterChange('data_des_fim', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-2 items-center">
                <label className="text-xs font-medium text-gray-600">Data NF</label>
                <Input
                  type="date"
                  placeholder="Data Início"
                  value={filters.data_nf_inicio || ''}
                  onChange={(e) => handleFilterChange('data_nf_inicio', e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Data Fim"
                  value={filters.data_nf_fim || ''}
                  onChange={(e) => handleFilterChange('data_nf_fim', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Tipo de Roteirização</h4>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="tipo_roteirizacao"
                  value="carteira"
                  checked={filters.tipo_roteirizacao === 'carteira'}
                  onChange={(e) => handleTipoRoteirizacaoChange(e.target.value as TipoRoteirizacao)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Carteira (Maximizar Cargas)</div>
                  <div className="text-sm text-gray-600">Gera o máximo de manifestos possíveis</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="tipo_roteirizacao"
                  value="frota"
                  checked={filters.tipo_roteirizacao === 'frota'}
                  onChange={(e) => handleTipoRoteirizacaoChange(e.target.value as TipoRoteirizacao)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Frota (Configuração Manual)</div>
                  <div className="text-sm text-gray-600">Define quantidade de manifestos por perfil de veículo</div>
                </div>
              </label>
            </div>
          </div>

          {filters.tipo_roteirizacao === 'frota' && perfisDisponiveis.length > 0 && (
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Configuração de Frota</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Defina a quantidade de manifestos desejada por perfil de veículo
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLimparConfiguracao}
                >
                  Limpar
                </Button>
              </div>

              {Object.values(quantidadesPorPerfil).reduce((sum, qtd) => sum + qtd, 0) > 0 && (
                <div className="mb-3 p-2 bg-white rounded border border-blue-300">
                  <div className="text-sm font-semibold text-blue-900">
                    Total de Manifestos Solicitados:{' '}
                    <span className="text-lg">
                      {Object.values(quantidadesPorPerfil).reduce((sum, qtd) => sum + qtd, 0)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_120px] gap-2 text-xs font-semibold text-gray-700 px-3">
                  <div>Perfil</div>
                  <div className="text-center">Quantidade</div>
                </div>
                {perfisDisponiveis.map(({ perfil, count }) => (
                  <div key={perfil} className="grid grid-cols-[1fr_120px] gap-2 items-center p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <div className="font-medium text-gray-900">{perfil}</div>
                      <div className="text-xs text-gray-600">
                        {count} {count === 1 ? 'veículo disponível' : 'veículos disponíveis'}
                      </div>
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="0"
                        max="999"
                        step="1"
                        placeholder="0"
                        value={quantidadesPorPerfil[perfil] || ''}
                        onChange={(e) =>
                          handleQuantidadePerfilChange(perfil, parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              {Object.values(quantidadesPorPerfil).reduce((sum, qtd) => sum + qtd, 0) === 0 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Configure pelo menos um perfil com quantidade maior que zero
                  </p>
                </div>
              )}
            </div>
          )}

          {filters.tipo_roteirizacao === 'frota' && perfisDisponiveis.length === 0 && (
            <div className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <p className="text-sm text-yellow-800">
                ⚠️ Nenhum veículo global cadastrado. Cadastre veículos sem vinculação a filial específica para usar o modo Frota.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button onClick={handleApplyFilters}>Aplicar Filtros</Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../ui/Select';
import { Filter, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { Veiculo } from '../../types';

import type { TipoRoteirizacao, ConfiguracaoFrota } from '../../types';

export interface CarteiraFilterValues {
  status_validacao?: 'valida' | 'invalida';
  filial?: string;
  uf?: string;
  destinatario?: string;
  cida?: string;
  tomador?: string;
  data_des_inicio?: string;
  data_des_fim?: string;
  dle_inicio?: string;
  dle_fim?: string;
  agendam_inicio?: string;
  agendam_fim?: string;
  data_nf_inicio?: string;
  data_nf_fim?: string;
  mesoregiao?: string;
  tipo_roteirizacao?: TipoRoteirizacao;
  configuracao_frota?: ConfiguracaoFrota[];
}

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
    filial: !isAdmin ? userFilial : undefined,
    tipo_roteirizacao: 'carteira',
    configuracao_frota: [],
  });
  const [mesoregioes, setMesoregioes] = useState<string[]>([]);
  const [perfisDisponiveis, setPerfisDisponiveis] = useState<Array<{ perfil: string; count: number }>>([]);
  const [quantidadesPorPerfil, setQuantidadesPorPerfil] = useState<Record<string, number>>({});

  useEffect(() => {
    if (uploadId) {
      buscarMesoregioes();
    }
  }, [uploadId]);

  useEffect(() => {
    if (userFilial) {
      buscarPerfisDisponiveis();
    }
  }, [userFilial]);

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

  const buscarPerfisDisponiveis = async () => {
    if (!userFilial) return;

    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('perfil')
        .eq('filial_id', userFilial)
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
      filial: !isAdmin ? userFilial : undefined,
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
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filial
                </label>
                <Input
                  type="text"
                  placeholder="Digite a filial..."
                  value={filters.filial || ''}
                  onChange={(e) => handleFilterChange('filial', e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
              <Input
                type="text"
                placeholder="Ex: SP"
                maxLength={2}
                value={filters.uf || ''}
                onChange={(e) =>
                  handleFilterChange('uf', e.target.value.toUpperCase())
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destinatário
              </label>
              <Input
                type="text"
                placeholder="Digite o nome..."
                value={filters.destinatario || ''}
                onChange={(e) => handleFilterChange('destinatario', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cidade
              </label>
              <Input
                type="text"
                placeholder="Digite a cidade..."
                value={filters.cida || ''}
                onChange={(e) => handleFilterChange('cida', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tomador
              </label>
              <Input
                type="text"
                placeholder="Digite o tomador..."
                value={filters.tomador || ''}
                onChange={(e) => handleFilterChange('tomador', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mesorregião
              </label>
              <Select
                value={filters.mesoregiao || ''}
                onChange={(e) => handleFilterChange('mesoregiao', e.target.value)}
              >
                <option value="">Todas</option>
                {mesoregioes.map((mesoregiao) => (
                  <option key={mesoregiao} value={mesoregiao}>
                    {mesoregiao}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Período - Agendam.</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início
                </label>
                <Input
                  type="date"
                  value={filters.agendam_inicio || ''}
                  onChange={(e) => handleFilterChange('agendam_inicio', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim
                </label>
                <Input
                  type="date"
                  value={filters.agendam_fim || ''}
                  onChange={(e) => handleFilterChange('agendam_fim', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Período - D.L.E.</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início
                </label>
                <Input
                  type="date"
                  value={filters.dle_inicio || ''}
                  onChange={(e) => handleFilterChange('dle_inicio', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim
                </label>
                <Input
                  type="date"
                  value={filters.dle_fim || ''}
                  onChange={(e) => handleFilterChange('dle_fim', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Período - Data Des</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início
                </label>
                <Input
                  type="date"
                  value={filters.data_des_inicio || ''}
                  onChange={(e) =>
                    handleFilterChange('data_des_inicio', e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim
                </label>
                <Input
                  type="date"
                  value={filters.data_des_fim || ''}
                  onChange={(e) => handleFilterChange('data_des_fim', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Período - Data NF</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início
                </label>
                <Input
                  type="date"
                  value={filters.data_nf_inicio || ''}
                  onChange={(e) =>
                    handleFilterChange('data_nf_inicio', e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim
                </label>
                <Input
                  type="date"
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
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Configuração de Frota</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLimparConfiguracao}
                >
                  Limpar Configuração
                </Button>
              </div>
              <div className="space-y-3">
                {perfisDisponiveis.map(({ perfil, count }) => (
                  <div key={perfil} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{perfil}</div>
                      <div className="text-sm text-gray-600">
                        {count} {count === 1 ? 'veículo disponível' : 'veículos disponíveis'}
                      </div>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min="0"
                        max="999"
                        step="1"
                        placeholder="Qtd"
                        value={quantidadesPorPerfil[perfil] || ''}
                        onChange={(e) =>
                          handleQuantidadePerfilChange(perfil, parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
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

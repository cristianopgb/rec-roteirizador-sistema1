import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../ui/Select';
import { Filter, X } from 'lucide-react';

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
}

interface CarteiraFiltersProps {
  onFilterChange: (filters: CarteiraFilterValues) => void;
  isAdmin?: boolean;
  userFilial?: string;
}

export function CarteiraFilters({
  onFilterChange,
  isAdmin = false,
  userFilial,
}: CarteiraFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CarteiraFilterValues>({
    filial: !isAdmin ? userFilial : undefined,
  });

  const handleFilterChange = (key: keyof CarteiraFilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters: CarteiraFilterValues = {
      filial: !isAdmin ? userFilial : undefined,
    };
    setFilters(clearedFilters);
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

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button onClick={handleApplyFilters}>Aplicar Filtros</Button>
          </div>
        </div>
      )}
    </div>
  );
}

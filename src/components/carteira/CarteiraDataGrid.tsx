import { useMemo } from 'react';
import { Badge } from '../ui/Badge';
import type { CarteiraItem } from '../../types';

interface CarteiraDataGridProps {
  items: CarteiraItem[];
  itemsCount: number;
}

export function CarteiraDataGrid({ items, itemsCount }: CarteiraDataGridProps) {
  const allColumns = useMemo(() => {
    const cols = [
      { key: 'linha_numero', label: 'Linha', width: '80px', fixed: true },
      { key: 'filial', label: 'Filial', width: '100px' },
      { key: 'romane', label: 'Romane', width: '120px' },
      { key: 'filial_origem', label: 'Filial (origem)', width: '120px' },
      { key: 'serie', label: 'Série', width: '100px' },
      { key: 'nro_doc', label: 'Nro Doc.', width: '120px' },
      { key: 'data_des', label: 'Data Des', width: '110px' },
      { key: 'data_nf', label: 'Data NF', width: '110px' },
      { key: 'dle', label: 'D.L.E.', width: '110px' },
      { key: 'agendam', label: 'Agendam.', width: '110px' },
      { key: 'palet', label: 'Palet', width: '80px' },
      { key: 'conf', label: 'Conf', width: '80px' },
      { key: 'peso', label: 'Peso', width: '100px' },
      { key: 'vlr_merc', label: 'Vlr. Merc.', width: '120px' },
      { key: 'qtd', label: 'Qtd.', width: '80px' },
      { key: 'peso_c', label: 'Peso C', width: '100px' },
      { key: 'classifi', label: 'Classifi', width: '100px' },
      { key: 'tomador', label: 'Tomador', width: '200px' },
      { key: 'destinatario', label: 'Destinatário', width: '200px' },
      { key: 'bairro', label: 'Bairro', width: '150px' },
      { key: 'cida', label: 'Cidade', width: '150px' },
      { key: 'uf', label: 'UF', width: '60px' },
      { key: 'nf_serie', label: 'NF / Serie', width: '120px' },
      { key: 'tipo_carga', label: 'Tipo Carga', width: '120px' },
      { key: 'qtd_nf', label: 'Qtd.NF', width: '80px' },
      { key: 'regiao', label: 'Região', width: '150px' },
      { key: 'sub_regiao', label: 'Sub-Região', width: '150px' },
      { key: 'ocorrencias_nfs', label: 'Ocorrências NFs', width: '150px' },
      { key: 'remetente', label: 'Remetente', width: '200px' },
      { key: 'observacao_r', label: 'Observação R', width: '200px' },
      { key: 'ref_cliente', label: 'Ref Cliente', width: '150px' },
      { key: 'cidade_dest', label: 'Cidade Dest.', width: '150px' },
      { key: 'mesoregiao', label: 'Mesoregião', width: '150px' },
      { key: 'agenda', label: 'Agenda', width: '100px' },
      { key: 'tipo_c', label: 'Tipo C', width: '100px' },
      { key: 'ultima', label: 'Última', width: '100px' },
      { key: 'status', label: 'Status', width: '100px' },
      { key: 'lat', label: 'Lat.', width: '100px' },
      { key: 'lon', label: 'Lon.', width: '100px' },
      { key: 'veiculo_exclusivo', label: 'Veículo Exclusivo', width: '150px' },
      { key: 'peso_calculado', label: 'Peso Calculado', width: '130px' },
      { key: 'prioridade', label: 'Prioridade', width: '100px' },
      { key: 'status_validacao', label: 'Validação', width: '140px' },
    ];
    return cols;
  }, []);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateTimeStr: string | null | undefined) => {
    if (!dateTimeStr) return '-';
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeStr;
    }
  };

  const formatValue = (item: CarteiraItem, key: string) => {
    switch (key) {
      case 'linha_numero':
        return item.linha_numero;
      case 'filial':
        return item.filial ?? '-';
      case 'romane':
        return item.romane ?? '-';
      case 'filial_origem':
        return item.filial_origem ?? '-';
      case 'serie':
        return item.serie ?? '-';
      case 'nro_doc':
        return item.nro_doc ?? '-';
      case 'data_des':
        return formatDate(item.data_des);
      case 'data_nf':
        return formatDate(item.data_nf);
      case 'dle':
        return formatDate(item.dle);
      case 'agendam':
        return formatDateTime(item.agendam);
      case 'palet':
        return item.palet ?? '-';
      case 'conf':
        return item.conf || '-';
      case 'peso':
        return item.peso ? item.peso.toFixed(2) : '-';
      case 'vlr_merc':
        return item.vlr_merc ? `R$ ${item.vlr_merc.toFixed(2)}` : '-';
      case 'qtd':
        return item.qtd ?? '-';
      case 'peso_c':
        return item.peso_c ? item.peso_c.toFixed(2) : '-';
      case 'classifi':
        return item.classifi || '-';
      case 'tomador':
        return item.tomador || '-';
      case 'destinatario':
        return item.destinatario || '-';
      case 'bairro':
        return item.bairro || '-';
      case 'cida':
        return item.cida || '-';
      case 'uf':
        return item.uf || '-';
      case 'nf_serie':
        return item.nf_serie || '-';
      case 'tipo_carga':
        return item.tipo_carga || '-';
      case 'qtd_nf':
        return item.qtd_nf ?? '-';
      case 'regiao':
        return item.regiao || '-';
      case 'sub_regiao':
        return item.sub_regiao || '-';
      case 'ocorrencias_nfs':
        return item.ocorrencias_nfs || '-';
      case 'remetente':
        return item.remetente || '-';
      case 'observacao_r':
        return item.observacao_r || '-';
      case 'ref_cliente':
        return item.ref_cliente || '-';
      case 'cidade_dest':
        return item.cidade_dest || '-';
      case 'mesoregiao':
        return item.mesoregiao || '-';
      case 'agenda':
        return item.agenda || '-';
      case 'tipo_c':
        return item.tipo_c || '-';
      case 'ultima':
        return item.ultima || '-';
      case 'status':
        return item.status || '-';
      case 'lat':
        return item.lat ?? '-';
      case 'lon':
        return item.lon ?? '-';
      case 'veiculo_exclusivo':
        return item.veiculo_exclusivo || '-';
      case 'peso_calculado':
        return item.peso_calculado ? item.peso_calculado.toFixed(2) : '-';
      case 'prioridade':
        return item.prioridade ?? '-';
      case 'status_validacao':
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={item.status_validacao === 'valida' ? 'success' : 'error'}
            >
              {item.status_validacao}
            </Badge>
            {item.erro_validacao && (
              <span
                className="text-xs text-red-600 cursor-help truncate max-w-xs"
                title={item.erro_validacao}
              >
                ({item.erro_validacao})
              </span>
            )}
          </div>
        );
      default:
        return '-';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Prévia dos Dados - {allColumns.length} colunas ({Math.min(50, itemsCount)} de {itemsCount} linhas)
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Use o scroll horizontal e vertical para navegar por todos os dados
        </p>
      </div>

      <div className="relative">
        <div className="overflow-auto" style={{ maxHeight: '500px' }}>
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {allColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap ${
                      column.fixed
                        ? 'sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                        : ''
                    }`}
                    style={{ minWidth: column.width }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr
                  key={item.id || index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {allColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-2 text-sm text-gray-900 whitespace-nowrap ${
                        column.fixed
                          ? 'sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]'
                          : ''
                      }`}
                      style={{ minWidth: column.width }}
                    >
                      {formatValue(item, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

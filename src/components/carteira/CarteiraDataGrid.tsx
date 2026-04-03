import { useMemo } from 'react';
import { Badge } from '../ui/Badge';
import type { CarteiraItem } from '../../types';
import { COLUNAS_OBRIGATORIAS_EXCEL } from '../../constants/carteira-columns';

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
      { key: 'status_validacao', label: 'Validação', width: '140px' },
    ];
    return cols;
  }, []);

  const formatValue = (item: CarteiraItem, key: string) => {
    const rawData = item.dados_originais as Record<string, any>;

    switch (key) {
      case 'linha_numero':
        return item.linha_numero;
      case 'filial':
        return item.filial || '-';
      case 'romane':
        return item.romane || '-';
      case 'nro_doc':
        return item.nro_doc || '-';
      case 'destinatario':
        return item.destinatario || '-';
      case 'cida':
        return item.cida || '-';
      case 'uf':
        return item.uf || '-';
      case 'peso':
        return item.peso ? item.peso.toFixed(2) : '-';
      case 'vlr_merc':
        return item.vlr_merc ? `R$ ${item.vlr_merc.toFixed(2)}` : '-';
      case 'tomador':
        return item.tomador || '-';
      case 'dle':
        return rawData?.['D.L.E.'] || '-';
      case 'agendam':
        return rawData?.['Agendam.'] || '-';
      case 'data_des':
        return rawData?.['Data Des'] || '-';
      case 'data_nf':
        return rawData?.['Data NF'] || '-';
      case 'filial_origem':
        return rawData?.['Filial (origem)'] || '-';
      case 'serie':
        return rawData?.['Série'] || '-';
      case 'palet':
        return rawData?.['Palet'] || '-';
      case 'conf':
        return rawData?.['Conf'] || '-';
      case 'qtd':
        return rawData?.['Qtd.'] || '-';
      case 'peso_c':
        return rawData?.['Peso C'] || '-';
      case 'classifi':
        return rawData?.['Classifi'] || '-';
      case 'bairro':
        return rawData?.['Bairro'] || '-';
      case 'nf_serie':
        return rawData?.['NF / Serie'] || '-';
      case 'tipo_carga':
        return rawData?.['Tipo Carga'] || '-';
      case 'qtd_nf':
        return rawData?.['Qtd.NF'] || '-';
      case 'regiao':
        return rawData?.['Região'] || '-';
      case 'sub_regiao':
        return rawData?.['Sub-Região'] || '-';
      case 'ocorrencias_nfs':
        return rawData?.['Ocorrências NFs'] || '-';
      case 'remetente':
        return rawData?.['Remetente'] || '-';
      case 'observacao_r':
        return rawData?.['Observação R'] || '-';
      case 'ref_cliente':
        return rawData?.['Ref Cliente'] || '-';
      case 'cidade_dest':
        return rawData?.['Cidade Dest.'] || '-';
      case 'mesoregiao':
        return rawData?.['Mesoregião'] || '-';
      case 'agenda':
        return rawData?.['Agenda'] || '-';
      case 'tipo_c':
        return rawData?.['Tipo C'] || '-';
      case 'ultima':
        return rawData?.['Última'] || '-';
      case 'status':
        return rawData?.['Status'] || '-';
      case 'lat':
        return rawData?.['Lat.'] || '-';
      case 'lon':
        return rawData?.['Lon.'] || '-';
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

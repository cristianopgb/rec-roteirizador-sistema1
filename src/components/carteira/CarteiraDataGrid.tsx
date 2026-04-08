import { useMemo } from 'react';
import { Badge } from '../ui/Badge';
import type { CarteiraItem } from '../../types';
import { Check, X, Clock } from 'lucide-react';

interface CarteiraDataGridProps {
  items: CarteiraItem[];
  itemsCount: number;
}

export function CarteiraDataGrid({ items, itemsCount }: CarteiraDataGridProps) {
  const allColumns = useMemo(() => {
    const cols = [
      { key: 'linha_numero', label: 'Linha', width: '80px', fixed: true },
      { key: 'filial_r', label: 'Filial R', width: '100px' },
      { key: 'romane', label: 'Romane', width: '120px' },
      { key: 'filial_d', label: 'Filial D', width: '100px' },
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
      { key: 'peso_cubico', label: 'Peso Cub.', width: '110px' },
      { key: 'classif', label: 'Classif', width: '100px' },
      { key: 'tomad', label: 'Tomad', width: '200px' },
      { key: 'destin', label: 'Destin', width: '200px' },
      { key: 'bairro', label: 'Bairro', width: '150px' },
      { key: 'cidade', label: 'Cidade', width: '150px' },
      { key: 'uf', label: 'UF', width: '60px' },
      { key: 'nf_serie', label: 'NF / Serie', width: '120px' },
      { key: 'tipo_carga', label: 'Tipo Carga', width: '120px' },
      { key: 'tipo_ca', label: 'Tipo Ca', width: '100px' },
      { key: 'qtd_nf', label: 'Qtd.NF', width: '80px' },
      { key: 'sub_regiao', label: 'Sub-Região', width: '150px' },
      { key: 'ocorrencias_nf', label: 'Ocorrências NF', width: '150px' },
      { key: 'remetente', label: 'Remetente', width: '200px' },
      { key: 'observacao', label: 'Observação', width: '200px' },
      { key: 'ref_cliente', label: 'Ref Cliente', width: '150px' },
      { key: 'cidade_dest', label: 'Cidade Dest.', width: '150px' },
      { key: 'mesoregiao', label: 'Mesoregião', width: '150px' },
      { key: 'agenda', label: 'Agenda', width: '100px' },
      { key: 'ultima_ocorrencia', label: 'Última Ocorrência', width: '150px' },
      { key: 'status_r', label: 'Status R', width: '100px' },
      { key: 'latitude', label: 'Latitude', width: '100px' },
      { key: 'longitude', label: 'Longitude', width: '100px' },
      { key: 'peso_calculo', label: 'Peso Calculo', width: '130px' },
      { key: 'prioridade', label: 'Prioridade', width: '110px' },
      { key: 'restricao_veiculo', label: 'Restrição Veículo', width: '140px' },
      { key: 'carro_dedicado', label: 'Carro Dedicado', width: '140px' },
      { key: 'inicio_entrega', label: 'Inicio Ent.', width: '110px' },
      { key: 'fim_entrega', label: 'Fim En', width: '110px' },
      { key: 'endereco', label: 'Endereço', width: '250px' },
      { key: 'numero', label: 'Número', width: '100px' },
      { key: 'placa_preferencial', label: 'Placa Preferencial', width: '150px' },
      { key: 'motorista_preferencial', label: 'Motorista Preferencial', width: '200px' },
      { key: 'observacao_interna', label: 'Observação Interna', width: '200px' },
      { key: 'cliente_novo', label: 'Cliente Novo', width: '120px' },
      { key: 'temperatura_controlada', label: 'Temp. Controlada', width: '150px' },
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

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
  };

  const getPrioridadeBadge = (prioridade: string | null | undefined) => {
    if (!prioridade) return '-';

    const colors: Record<string, string> = {
      'URGENTE': 'bg-red-100 text-red-800 border-red-200',
      'ALTA': 'bg-orange-100 text-orange-800 border-orange-200',
      'MEDIA': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'BAIXA': 'bg-green-100 text-green-800 border-green-200',
      'NORMAL': 'bg-blue-100 text-blue-800 border-blue-200',
    };

    const color = colors[prioridade] || 'bg-gray-100 text-gray-800 border-gray-200';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${color}`}>
        {prioridade}
      </span>
    );
  };

  const getCarroDedicadoIcon = (dedicado: boolean | null | undefined) => {
    if (dedicado === null || dedicado === undefined) return '-';

    return dedicado ? (
      <Check className="w-4 h-4 text-green-600" />
    ) : (
      <X className="w-4 h-4 text-gray-400" />
    );
  };

  const formatValue = (item: CarteiraItem, key: string) => {
    switch (key) {
      case 'linha_numero':
        return item.linha_numero;
      case 'filial_r':
        return item.filial_r ?? '-';
      case 'romane':
        return item.romane ?? '-';
      case 'filial_d':
        return item.filial_d ?? '-';
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
        return item.conf ?? '-';
      case 'peso':
        return item.peso !== null && item.peso !== undefined
          ? item.peso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '-';
      case 'vlr_merc':
        return item.vlr_merc !== null && item.vlr_merc !== undefined
          ? item.vlr_merc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '-';
      case 'qtd':
        return item.qtd ?? '-';
      case 'peso_cubico':
        return item.peso_cubico !== null && item.peso_cubico !== undefined
          ? item.peso_cubico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '-';
      case 'classif':
        return item.classif ?? '-';
      case 'tomad':
        return item.tomad ?? '-';
      case 'destin':
        return item.destin ?? '-';
      case 'bairro':
        return item.bairro ?? '-';
      case 'cidade':
        return item.cidade ?? '-';
      case 'uf':
        return item.uf ?? '-';
      case 'nf_serie':
        return item.nf_serie ?? '-';
      case 'tipo_carga':
        return item.tipo_carga ?? '-';
      case 'tipo_ca':
        return item.tipo_ca ?? '-';
      case 'qtd_nf':
        return item.qtd_nf ?? '-';
      case 'sub_regiao':
        return item.sub_regiao ?? '-';
      case 'ocorrencias_nf':
        return item.ocorrencias_nf ?? '-';
      case 'remetente':
        return item.remetente ?? '-';
      case 'observacao':
        return item.observacao ?? '-';
      case 'ref_cliente':
        return item.ref_cliente ?? '-';
      case 'cidade_dest':
        return item.cidade_dest ?? '-';
      case 'mesoregiao':
        return item.mesoregiao ?? '-';
      case 'agenda':
        return item.agenda ?? '-';
      case 'ultima_ocorrencia':
        return item.ultima_ocorrencia ?? '-';
      case 'status_r':
        return item.status_r ?? '-';
      case 'latitude':
        return item.latitude !== null && item.latitude !== undefined
          ? item.latitude.toFixed(6)
          : '-';
      case 'longitude':
        return item.longitude !== null && item.longitude !== undefined
          ? item.longitude.toFixed(6)
          : '-';
      case 'peso_calculo':
        return item.peso_calculo !== null && item.peso_calculo !== undefined
          ? item.peso_calculo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '-';
      case 'prioridade':
        return getPrioridadeBadge(item.prioridade);
      case 'restricao_veiculo':
        return item.restricao_veiculo ? (
          <Badge variant="outline">{item.restricao_veiculo}</Badge>
        ) : '-';
      case 'carro_dedicado':
        return getCarroDedicadoIcon(item.carro_dedicado);
      case 'inicio_entrega':
        return formatTime(item.inicio_entrega);
      case 'fim_entrega':
        return formatTime(item.fim_entrega);
      case 'endereco':
        return item.endereco ?? '-';
      case 'numero':
        return item.numero ?? '-';
      case 'placa_preferencial':
        return item.placa_preferencial ?? '-';
      case 'motorista_preferencial':
        return item.motorista_preferencial ?? '-';
      case 'observacao_interna':
        return item.observacao_interna ?? '-';
      case 'cliente_novo':
        return item.cliente_novo ?? '-';
      case 'temperatura_controlada':
        return item.temperatura_controlada ?? '-';
      case 'status_validacao':
        return item.status_validacao === 'valida' ? (
          <Badge variant="success">Válida</Badge>
        ) : (
          <Badge variant="destructive" title={item.erro_validacao || ''}>
            Inválida
          </Badge>
        );
      default:
        return '-';
    }
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Itens da Carteira
          </h3>
          <span className="text-sm text-gray-600">
            Total: {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              {allColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap"
                  style={{ minWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, idx) => (
              <tr
                key={item.id || idx}
                className={`hover:bg-gray-50 ${
                  item.status_validacao === 'invalida' ? 'bg-red-50' : ''
                }`}
              >
                {allColumns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 whitespace-nowrap text-gray-900"
                    style={{ minWidth: col.width }}
                  >
                    {formatValue(item, col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhum item encontrado
        </div>
      )}
    </div>
  );
}

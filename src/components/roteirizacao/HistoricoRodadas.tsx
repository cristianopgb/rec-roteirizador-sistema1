import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { Clock, FileText, CheckCircle, XCircle, Eye } from 'lucide-react';
import {
  buscarRodadasPorUsuario,
  buscarRodadasPorFilial,
  type RodadaRoteirizacao,
} from '../../services/roteirizacao.service';

export function HistoricoRodadas() {
  const { profile } = useAuth();
  const [rodadas, setRodadas] = useState<RodadaRoteirizacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRodada, setSelectedRodada] = useState<RodadaRoteirizacao | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRodadas();
  }, [profile]);

  const loadRodadas = async () => {
    if (!profile) return;

    setIsLoading(true);
    setError(null);

    try {
      let data: RodadaRoteirizacao[];

      if (profile.role === 'admin') {
        data = await buscarRodadasPorFilial(profile.filial_id);
      } else {
        data = await buscarRodadasPorUsuario(profile.id);
      }

      setRodadas(data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setError('Erro ao carregar histórico de rodadas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (rodada: RodadaRoteirizacao) => {
    setSelectedRodada(rodada);
    setShowDetailsModal(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'processado':
        return 'success';
      case 'erro':
        return 'error';
      case 'enviando':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processado':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'erro':
        return <XCircle className="text-red-600" size={20} />;
      default:
        return <Clock className="text-gray-600" size={20} />;
    }
  };

  const downloadJson = (data: any, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (rodadas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <EmptyState
          title="Nenhuma rodada encontrada"
          description="Não há histórico de roteirizações ainda"
        />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Histórico de Rodadas</h2>
          <Badge variant="default">{rodadas.length} rodadas</Badge>
        </div>

        <div className="space-y-3">
          {rodadas.map((rodada) => {
            const totalCargas = rodada.payload_enviado?.carteira?.length || 0;
            const totalVeiculos = rodada.payload_enviado?.veiculos?.length || 0;

            return (
              <div
                key={rodada.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">{getStatusIcon(rodada.status)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge variant={getStatusBadgeVariant(rodada.status)}>
                        {rodada.status}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {new Date(rodada.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {totalCargas > 0 && (
                      <p className="text-sm text-gray-700 mb-1">
                        {totalCargas} cargas processadas com {totalVeiculos} veículos
                      </p>
                    )}

                    {rodada.mensagem_retorno && (
                      <p className="text-sm text-gray-600 truncate">
                        {rodada.mensagem_retorno}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleViewDetails(rodada)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye size={18} />
                  Ver Detalhes
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedRodada && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Detalhes da Rodada"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge variant={getStatusBadgeVariant(selectedRodada.status)}>
                  {selectedRodada.status}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">Data/Hora</p>
                <p className="text-sm text-gray-900">
                  {new Date(selectedRodada.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {selectedRodada.mensagem_retorno && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Mensagem</p>
                <p className="text-sm text-gray-900">{selectedRodada.mensagem_retorno}</p>
              </div>
            )}

            {selectedRodada.payload_enviado && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Payload Enviado</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-gray-700">
                    Cargas: {selectedRodada.payload_enviado.carteira?.length || 0}
                  </p>
                  <p className="text-sm text-gray-700">
                    Veículos: {selectedRodada.payload_enviado.veiculos?.length || 0}
                  </p>
                  <p className="text-sm text-gray-700">
                    Regionalidades: {selectedRodada.payload_enviado.regionalidades?.length || 0}
                  </p>
                  <button
                    onClick={() =>
                      downloadJson(
                        selectedRodada.payload_enviado,
                        `payload_${selectedRodada.id}.json`
                      )
                    }
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Baixar payload completo
                  </button>
                </div>
              </div>
            )}

            {selectedRodada.resposta_recebida && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Resposta Recebida</p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <pre className="text-xs text-gray-800 overflow-x-auto max-h-60">
                    {JSON.stringify(selectedRodada.resposta_recebida, null, 2)}
                  </pre>
                  <button
                    onClick={() =>
                      downloadJson(
                        selectedRodada.resposta_recebida,
                        `resposta_${selectedRodada.id}.json`
                      )
                    }
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Baixar resposta completa
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

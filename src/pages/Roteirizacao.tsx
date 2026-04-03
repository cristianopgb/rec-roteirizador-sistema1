import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { FileUpload } from '../components/ui/FileUpload';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Download, Activity } from 'lucide-react';
import { CarteiraFilters, CarteiraFilterValues } from '../components/carteira/CarteiraFilters';
import { HistoricoRodadas } from '../components/roteirizacao/HistoricoRodadas';
import {
  processCarteiraUpload,
  getUploadById,
  getCarteiraItems,
  getRecentUploads,
} from '../services/carteira.service';
import {
  verificarHealthMotor,
  montarPayloadMotor,
  enviarParaMotorPython,
  iniciarRodada,
  salvarPayloadEnviado,
  salvarRespostaRodada,
  registrarErroRodada,
  registrarAuditoriaRoteirizacao,
} from '../services/roteirizacao.service';

interface UploadStats {
  id: string;
  nome_arquivo: string;
  total_linhas: number;
  total_validas: number;
  total_invalidas: number;
  status: string;
  erro_estrutura?: string;
  created_at: string;
}

interface CarteiraItem {
  id: string;
  linha_numero: number;
  status_validacao: 'valida' | 'invalida';
  erro_validacao?: string;
  filial?: string;
  romane?: string;
  nro_doc?: string;
  destinatario?: string;
  cida?: string;
  uf?: string;
  peso?: number;
  vlr_merc?: number;
}

export function Roteirizacao() {
  const { user, profile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<UploadStats | null>(null);
  const [carteiraItems, setCarteiraItems] = useState<CarteiraItem[]>([]);
  const [itemsCount, setItemsCount] = useState(0);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentUploads, setRecentUploads] = useState<UploadStats[]>([]);
  const [activeFilters, setActiveFilters] = useState<CarteiraFilterValues>({});
  const [isRoteirizando, setIsRoteirizando] = useState(false);
  const [statusRodada, setStatusRodada] = useState<string | null>(null);
  const [mensagemRodada, setMensagemRodada] = useState<string | null>(null);
  const [respostaMotor, setRespostaMotor] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    if (profile?.filial_id) {
      loadRecentUploads();
    }
  }, [profile]);

  const loadRecentUploads = async () => {
    try {
      const uploads = await getRecentUploads(
        profile?.role === 'user' ? profile?.filial_id : undefined,
        5
      );
      setRecentUploads(uploads);
    } catch (err) {
      console.error('Erro ao carregar uploads recentes:', err);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleProcessFile = async () => {
    if (!selectedFile || !user || !profile?.filial_id) {
      setError('Arquivo ou informações de usuário ausentes');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await processCarteiraUpload(
        selectedFile,
        user.id,
        profile.filial_id
      );

      if (!result.success) {
        setError(result.error || 'Erro ao processar arquivo');
        if (result.uploadId) {
          const upload = await getUploadById(result.uploadId);
          setCurrentUpload(upload);
        }
        return;
      }

      if (result.uploadId) {
        const upload = await getUploadById(result.uploadId);
        setCurrentUpload(upload);
        await loadCarteiraItems(result.uploadId);
        await loadRecentUploads();
      }
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadCarteiraItems = async (uploadId: string, filters?: any) => {
    setIsLoadingItems(true);
    try {
      const { items, count } = await getCarteiraItems(uploadId, 50, 0, filters);
      setCarteiraItems(items);
      setItemsCount(count);
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
      setError('Erro ao carregar dados da carteira');
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleNovaCarteira = () => {
    setSelectedFile(null);
    setCurrentUpload(null);
    setCarteiraItems([]);
    setItemsCount(0);
    setError(null);
    setActiveFilters({});
  };

  const handleLoadUpload = async (uploadId: string) => {
    try {
      const upload = await getUploadById(uploadId);
      setCurrentUpload(upload);
      await loadCarteiraItems(uploadId);
      setSelectedFile(null);
      setError(null);
      setActiveFilters({});
    } catch (err) {
      console.error('Erro ao carregar upload:', err);
      setError('Erro ao carregar upload');
    }
  };

  const handleFilterChange = async (filters: CarteiraFilterValues) => {
    setActiveFilters(filters);
    if (currentUpload) {
      await loadCarteiraItems(currentUpload.id, filters);
    }
  };

  const handleTestarConexao = async () => {
    setIsTestingConnection(true);
    setError(null);

    try {
      const isHealthy = await verificarHealthMotor();

      if (isHealthy) {
        alert('Conexão com o motor de roteirização estabelecida com sucesso!');
      } else {
        setError('Motor de roteirização está indisponível. Tente novamente mais tarde.');
      }
    } catch (err) {
      setError('Falha ao testar conexão com o motor de roteirização');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleGerarRoteirizacao = async () => {
    if (!currentUpload || !user || !profile || !profile.filial_id) {
      setError('Informações necessárias não disponíveis');
      return;
    }

    if (currentUpload.total_validas === 0) {
      setError('Não há linhas válidas para roteirizar');
      return;
    }

    const tipoRoteirizacao = activeFilters.tipo_roteirizacao || 'carteira';
    const configuracaoFrota = activeFilters.configuracao_frota || [];

    if (tipoRoteirizacao === 'frota') {
      const totalManifestos = configuracaoFrota.reduce((sum, config) => sum + config.quantidade, 0);
      if (totalManifestos === 0) {
        setError('Configure ao menos um perfil com quantidade maior que 0');
        return;
      }
    }

    setIsRoteirizando(true);
    setError(null);
    setStatusRodada(null);
    setMensagemRodada(null);
    setRespostaMotor(null);

    let rodadaId: string | null = null;

    try {
      rodadaId = await iniciarRodada(profile.id, profile.filial_id, currentUpload.id);
      setStatusRodada('iniciado');

      await registrarAuditoriaRoteirizacao('roteirizacao_iniciada', {
        usuario_id: profile.id,
        upload_id: currentUpload.id,
        rodada_id: rodadaId,
        total_cargas: currentUpload.total_validas,
        tipo_roteirizacao: tipoRoteirizacao,
      });

      const payload = await montarPayloadMotor(
        currentUpload.id,
        profile.filial_id,
        profile.id,
        profile.nome,
        profile.filial?.nome || 'Filial',
        'padrao',
        activeFilters,
        tipoRoteirizacao,
        configuracaoFrota
      );

      await salvarPayloadEnviado(rodadaId, payload);
      setStatusRodada('enviando');

      const resposta = await enviarParaMotorPython(payload);

      await salvarRespostaRodada(rodadaId, resposta);
      setStatusRodada('processado');
      setMensagemRodada(resposta.mensagem || 'Roteirização processada com sucesso');
      setRespostaMotor(resposta);

      await registrarAuditoriaRoteirizacao('roteirizacao_concluida', {
        usuario_id: profile.id,
        upload_id: currentUpload.id,
        rodada_id: rodadaId,
        total_cargas: payload.carteira.length,
        total_veiculos: payload.veiculos.length,
        status_resposta: resposta.status,
      });

      const tipoMsg = tipoRoteirizacao === 'frota'
        ? `\n\nModo: Frota (${configuracaoFrota.length} perfis configurados)`
        : '\n\nModo: Carteira (maximização)';

      const alertMessage = `Roteirização concluída com sucesso!${tipoMsg}\n\n${resposta.mensagem || 'Processamento finalizado'}`;
      const resumoMsg = resposta.resumo
        ? `\n\nResumo:\n- Total carteira: ${resposta.resumo.total_carteira}\n- Total roteirizado: ${resposta.resumo.total_roteirizado}\n- Total não roteirizado: ${resposta.resumo.total_nao_roteirizado}\n- Manifestos fechados: ${resposta.resumo.total_manifestos_fechados}\n- Manifestos compostos: ${resposta.resumo.total_manifestos_compostos}\n- Ocupação média peso: ${resposta.resumo.ocupacao_media_peso.toFixed(1)}%\n- Ocupação média volume: ${resposta.resumo.ocupacao_media_volume.toFixed(1)}%`
        : '';

      alert(alertMessage + resumoMsg);

    } catch (err) {
      console.error('Erro ao roteirizar:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar roteirização';

      if (rodadaId) {
        await registrarErroRodada(rodadaId, errorMessage);
        await registrarAuditoriaRoteirizacao('roteirizacao_erro', {
          usuario_id: profile.id,
          upload_id: currentUpload.id,
          rodada_id: rodadaId,
          erro: errorMessage,
        });
      }

      setStatusRodada('erro');
      setMensagemRodada(errorMessage);
      setError(errorMessage);
    } finally {
      setIsRoteirizando(false);
    }
  };

  const hasStructureError = currentUpload?.status === 'erro' && currentUpload?.erro_estrutura;
  const allInvalid = currentUpload && currentUpload.total_invalidas === currentUpload.total_linhas && currentUpload.total_linhas > 0;
  const canGenerateRouting = currentUpload && currentUpload.total_validas > 0 && !hasStructureError;

  const validationRate = currentUpload && currentUpload.total_linhas > 0
    ? Math.round((currentUpload.total_validas / currentUpload.total_linhas) * 100)
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roteirização</h1>
          <p className="text-gray-600 mt-2">
            Upload e validação de carteira para geração de rotas
          </p>
        </div>

        {!currentUpload ? (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upload de Carteira
              </h2>

              <FileUpload
                accept=".xlsx"
                onFileSelect={handleFileSelect}
                maxSize={10 * 1024 * 1024}
              />

              {selectedFile && (
                <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-600" size={24} />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleProcessFile}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Processar Carteira
                      </>
                    )}
                  </Button>
                </div>
              )}

              {error && !currentUpload && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-600 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900">Erro ao processar arquivo</h3>
                      <p className="text-sm text-red-800 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {recentUploads.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Uploads Recentes
                </h2>
                <div className="space-y-3">
                  {recentUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleLoadUpload(upload.id)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{upload.nome_arquivo}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(upload.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {upload.total_validas} / {upload.total_linhas}
                          </p>
                          <p className="text-xs text-gray-600">válidas</p>
                        </div>
                        <Badge
                          variant={upload.status === 'concluido' ? 'success' : upload.status === 'erro' ? 'error' : 'default'}
                        >
                          {upload.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Resultado do Processamento
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{currentUpload.nome_arquivo}</p>
                </div>
                <Button onClick={handleNovaCarteira} variant="outline">
                  Nova Carteira
                </Button>
              </div>

              {hasStructureError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-600 flex-shrink-0" size={24} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 text-lg mb-2">
                        Estrutura do Arquivo Inválida
                      </h3>
                      <p className="text-red-800">{currentUpload.erro_estrutura}</p>
                      <p className="text-sm text-red-700 mt-3">
                        O arquivo foi rejeitado. Por favor, verifique se todas as colunas estão
                        presentes e escritas exatamente como esperado (incluindo acentos,
                        espaços e pontuação).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {allInvalid && !hasStructureError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 text-lg mb-2">
                        100% das Linhas Inválidas
                      </h3>
                      <p className="text-red-800">
                        Todas as linhas do arquivo possuem erros de validação. Não é possível
                        gerar roteirização sem dados válidos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!hasStructureError && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="text-gray-600" size={20} />
                      <span className="text-sm font-medium text-gray-600">Total de Linhas</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {currentUpload.total_linhas}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="text-green-600" size={20} />
                      <span className="text-sm font-medium text-green-600">Linhas Válidas</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {currentUpload.total_validas}
                    </p>
                  </div>

                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="text-red-600" size={20} />
                      <span className="text-sm font-medium text-red-600">Linhas Inválidas</span>
                    </div>
                    <p className="text-2xl font-bold text-red-900">
                      {currentUpload.total_invalidas}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="text-blue-600" size={20} />
                      <span className="text-sm font-medium text-blue-600">Taxa de Validação</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{validationRate}%</p>
                  </div>
                </div>
              )}

              {canGenerateRouting && (
                <div className="mb-6 space-y-3">
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 flex items-center justify-center gap-2"
                      size="lg"
                      onClick={handleGerarRoteirizacao}
                      disabled={isRoteirizando}
                    >
                      {isRoteirizando ? (
                        <>
                          <LoadingSpinner size="sm" />
                          {statusRodada === 'iniciado' && 'Iniciando roteirização...'}
                          {statusRodada === 'enviando' && 'Enviando para motor...'}
                          {!statusRodada && 'Roteirizando...'}
                        </>
                      ) : (
                        <>
                          <Download size={20} />
                          {activeFilters.tipo_roteirizacao === 'frota' && activeFilters.configuracao_frota && activeFilters.configuracao_frota.length > 0
                            ? `Gerar Roteirização - Modo Frota (${activeFilters.configuracao_frota.reduce((sum, c) => sum + c.quantidade, 0)} manifestos)`
                            : `Gerar Roteirização - Modo Carteira (${currentUpload.total_validas} linhas válidas)`}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleTestarConexao}
                      disabled={isTestingConnection || isRoteirizando}
                      className="flex items-center gap-2"
                    >
                      {isTestingConnection ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <Activity size={20} />
                          Testar Conexão
                        </>
                      )}
                    </Button>
                  </div>

                  {statusRodada === 'processado' && mensagemRodada && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-green-900">Roteirização Concluída</h3>
                          <p className="text-sm text-green-800 mt-1">{mensagemRodada}</p>
                          {respostaMotor && (
                            <button
                              onClick={() => {
                                const jsonStr = JSON.stringify(respostaMotor, null, 2);
                                const blob = new Blob([jsonStr], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `resposta_motor_${new Date().toISOString()}.json`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                              className="mt-3 text-sm text-green-700 underline hover:text-green-900"
                            >
                              Baixar resposta completa (JSON)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {statusRodada === 'erro' && mensagemRodada && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <XCircle className="text-red-600 flex-shrink-0" size={20} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-red-900">Erro ao Roteirizar</h3>
                          <p className="text-sm text-red-800 mt-1">{mensagemRodada}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!hasStructureError && currentUpload && (
              <CarteiraFilters
                onFilterChange={handleFilterChange}
                isAdmin={profile?.role === 'admin'}
                userFilial={profile?.filial_id}
                uploadId={currentUpload.id}
              />
            )}

            {!hasStructureError && carteiraItems.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Prévia dos Dados ({Math.min(50, itemsCount)} de {itemsCount})
                </h2>

                {isLoadingItems ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table
                      columns={[
                        { key: 'linha_numero', label: 'Linha', width: '80px' },
                        { key: 'filial', label: 'Filial', width: '100px' },
                        { key: 'romane', label: 'Romane', width: '120px' },
                        { key: 'nro_doc', label: 'Nro Doc.', width: '120px' },
                        { key: 'destinatario', label: 'Destinatário', width: '200px' },
                        { key: 'cida', label: 'Cidade', width: '150px' },
                        { key: 'uf', label: 'UF', width: '60px' },
                        { key: 'peso', label: 'Peso', width: '100px' },
                        { key: 'vlr_merc', label: 'Vlr. Merc.', width: '120px' },
                        { key: 'status', label: 'Status', width: '120px' },
                      ]}
                      data={carteiraItems.map((item) => ({
                        linha_numero: item.linha_numero,
                        filial: item.filial || '-',
                        romane: item.romane || '-',
                        nro_doc: item.nro_doc || '-',
                        destinatario: item.destinatario || '-',
                        cida: item.cida || '-',
                        uf: item.uf || '-',
                        peso: item.peso ? item.peso.toFixed(2) : '-',
                        vlr_merc: item.vlr_merc
                          ? `R$ ${item.vlr_merc.toFixed(2)}`
                          : '-',
                        status: (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                item.status_validacao === 'valida' ? 'success' : 'error'
                              }
                            >
                              {item.status_validacao}
                            </Badge>
                            {item.erro_validacao && (
                              <span
                                className="text-xs text-red-600 cursor-help"
                                title={item.erro_validacao}
                              >
                                ({item.erro_validacao})
                              </span>
                            )}
                          </div>
                        ),
                      }))}
                      className={carteiraItems.some(
                        (item) => item.status_validacao === 'invalida'
                      ) ? 'has-invalid-rows' : ''}
                    />
                  </div>
                )}
              </div>
            )}

            {!hasStructureError && carteiraItems.length === 0 && !isLoadingItems && (
              <EmptyState
                title="Nenhum dado encontrado"
                description="Não há dados para exibir"
              />
            )}

            {!hasStructureError && (
              <HistoricoRodadas />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

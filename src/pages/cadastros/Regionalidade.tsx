import { Layout } from '../../components/layout/Layout';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, MapPin, AlertCircle } from 'lucide-react';
import { UFSummary, ImportacaoRegionalidade } from '../../types';
import {
  uploadRegionalidades,
  deleteByUF,
  listUFs,
  listImportacoes
} from '../../services/regionalidade.service';
import { FileUpload } from '../../components/ui/FileUpload';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/ui/Toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';

export function Regionalidade() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [ufs, setUfs] = useState<UFSummary[]>([]);
  const [importacoes, setImportacoes] = useState<ImportacaoRegionalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    total_linhas: number;
    inseridos: number;
    duplicados: number;
    erros: number;
    erros_detalhes?: string[];
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; uf: string; count: number } | null>(null);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [profile, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ufsData, importacoesData] = await Promise.all([
        listUFs(),
        listImportacoes(),
      ]);
      setUfs(ufsData);
      setImportacoes(importacoesData);
    } catch (error) {
      setToast({ message: 'Erro ao carregar dados', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !profile?.id) {
      setToast({ message: 'Selecione um arquivo para fazer upload', type: 'warning' });
      return;
    }

    setUploading(true);
    try {
      const result = await uploadRegionalidades(selectedFile, profile.id);
      setUploadResult(result);
      setSelectedFile(null);

      if (result.erros > 0) {
        setToast({
          message: `Upload concluído com ${result.erros} erro(s). Verifique o relatório abaixo.`,
          type: 'warning',
        });
      } else if (result.duplicados > 0) {
        setToast({
          message: `Upload concluído! ${result.duplicados} registro(s) duplicado(s) foram ignorados.`,
          type: 'success',
        });
      } else {
        setToast({ message: 'Upload concluído com sucesso!', type: 'success' });
      }

      loadData();
    } catch (error: any) {
      setToast({ message: error.message || 'Erro ao processar arquivo', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUF = async () => {
    if (!confirmDialog) return;

    const result = await deleteByUF(confirmDialog.uf);

    if (result.success) {
      setToast({
        message: `${result.deletedCount} cidade(s) do estado ${confirmDialog.uf} foram removidas!`,
        type: 'success',
      });
      setConfirmDialog(null);
      loadData();
    } else {
      setToast({ message: result.error || 'Erro ao remover cidades', type: 'error' });
      setConfirmDialog(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cadastro de Regionalidade</h1>
          <p className="text-gray-600 mt-2">Importe dados de cidades e regiões do Brasil</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload de Arquivo Excel</h2>
          <div className="space-y-4">
            <FileUpload onFileSelect={handleFileSelect} accept=".xlsx,.xls" maxSizeMB={5} />

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                icon={<Upload className="w-4 h-4" />}
              >
                {uploading ? 'Processando...' : 'Processar Upload'}
              </Button>
            </div>

            {uploading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="ml-3 text-gray-600">Processando arquivo...</span>
              </div>
            )}
          </div>
        </div>

        {uploadResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Resultado do Upload</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Total Processado</p>
                    <p className="text-2xl font-bold text-gray-900">{uploadResult.total_linhas}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Inseridos</p>
                    <p className="text-2xl font-bold text-green-600">{uploadResult.inseridos}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Duplicados</p>
                    <p className="text-2xl font-bold text-yellow-600">{uploadResult.duplicados}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Erros</p>
                    <p className="text-2xl font-bold text-red-600">{uploadResult.erros}</p>
                  </div>
                </div>
                {uploadResult.erros_detalhes && uploadResult.erros_detalhes.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-red-900 mb-2">Detalhes dos Erros:</p>
                    <ul className="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.erros_detalhes.slice(0, 10).map((erro, idx) => (
                        <li key={idx} className="list-disc list-inside">
                          {erro}
                        </li>
                      ))}
                      {uploadResult.erros_detalhes.length > 10 && (
                        <li className="text-red-600 font-medium">
                          ... e mais {uploadResult.erros_detalhes.length - 10} erro(s)
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Estados Cadastrados</h2>
          {ufs.length === 0 ? (
            <EmptyState
              icon={<MapPin className="w-full h-full" />}
              title="Nenhum estado cadastrado"
              description="Faça o upload de um arquivo Excel com dados de regionalidade para começar."
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {ufs.map((uf) => (
                <div key={uf.uf} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">{uf.uf}</span>
                    <button
                      onClick={() => setConfirmDialog({ isOpen: true, uf: uf.uf, count: uf.total_cidades })}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Excluir UF"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {uf.total_cidades} {uf.total_cidades === 1 ? 'cidade' : 'cidades'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {importacoes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Importações</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arquivo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inseridos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duplicados</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erros</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {importacoes.map((imp) => (
                    <tr key={imp.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(imp.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {imp.arquivo_nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {imp.total_linhas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {imp.inseridos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                        {imp.duplicados}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {imp.erros}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog?.isOpen || false}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleDeleteUF}
        title="Excluir Estado"
        message={`Tem certeza que deseja excluir todas as ${confirmDialog?.count} cidades do estado ${confirmDialog?.uf}? Esta ação não pode ser desfeita.`}
        variant="danger"
        confirmText="Excluir"
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  );
}

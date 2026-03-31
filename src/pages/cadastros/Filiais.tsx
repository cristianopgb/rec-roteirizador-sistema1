import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Filial } from '../../types';
import {
  listFiliais,
  createFilial,
  updateFilial,
  deleteFilial,
  type CreateFilialDTO,
} from '../../services/filial.service';

export default function Filiais() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filteredFiliais, setFilteredFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFilial, setSelectedFilial] = useState<Filial | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [filialToDelete, setFilialToDelete] = useState<Filial | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState<CreateFilialDTO>({
    nome: '',
    cidade: '',
    uf: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFiliais();
  }, []);

  useEffect(() => {
    filterFiliais();
  }, [searchTerm, filiais]);

  async function loadFiliais() {
    try {
      setLoading(true);
      const data = await listFiliais();
      setFiliais(data);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Erro ao carregar filiais',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  function filterFiliais() {
    if (!searchTerm.trim()) {
      setFilteredFiliais(filiais);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = filiais.filter(
      (filial) =>
        filial.nome.toLowerCase().includes(term) ||
        filial.cidade.toLowerCase().includes(term) ||
        filial.uf.toLowerCase().includes(term)
    );
    setFilteredFiliais(filtered);
  }

  function handleOpenAddModal() {
    setFormData({ nome: '', cidade: '', uf: '' });
    setFormErrors({});
    setIsAddModalOpen(true);
  }

  function handleOpenEditModal(filial: Filial) {
    setSelectedFilial(filial);
    setFormData({
      nome: filial.nome,
      cidade: filial.cidade,
      uf: filial.uf,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  }

  function handleCloseModals() {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedFilial(null);
    setFormData({ nome: '', cidade: '', uf: '' });
    setFormErrors({});
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    }

    if (!formData.cidade.trim()) {
      errors.cidade = 'Cidade é obrigatória';
    }

    if (!formData.uf.trim()) {
      errors.uf = 'UF é obrigatória';
    } else if (!/^[A-Za-z]{2}$/.test(formData.uf.trim())) {
      errors.uf = 'UF deve conter exatamente 2 letras';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmitAdd() {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      await createFilial(formData);
      setToast({ message: 'Filial criada com sucesso', type: 'success' });
      handleCloseModals();
      await loadFiliais();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Erro ao criar filial',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitEdit() {
    if (!validateForm() || !selectedFilial) return;

    try {
      setIsSubmitting(true);
      await updateFilial(selectedFilial.id, formData);
      setToast({ message: 'Filial atualizada com sucesso', type: 'success' });
      handleCloseModals();
      await loadFiliais();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Erro ao atualizar filial',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenDeleteConfirm(filial: Filial) {
    setFilialToDelete(filial);
    setDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!filialToDelete) return;

    try {
      await deleteFilial(filialToDelete.id);
      setToast({ message: 'Filial excluída com sucesso', type: 'success' });
      setDeleteConfirmOpen(false);
      setFilialToDelete(null);
      await loadFiliais();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Erro ao excluir filial',
        type: 'error',
      });
    }
  }

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'uf', label: 'UF' },
    {
      key: 'actions',
      label: 'Ações',
      render: (filial: Filial) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenEditModal(filial)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => handleOpenDeleteConfirm(filial)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Filiais</h1>
            <p className="text-gray-600 mt-1">Gerencie as filiais do sistema</p>
          </div>
          <Button onClick={handleOpenAddModal} icon={Plus}>
            Nova Filial
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar por nome, cidade ou UF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredFiliais.length === 0 ? (
            <EmptyState
              icon={<Building2 />}
              title={searchTerm ? 'Nenhuma filial encontrada' : 'Nenhuma filial cadastrada'}
              description={
                searchTerm
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece cadastrando sua primeira filial'
              }
            />
          ) : (
            <Table columns={columns} data={filteredFiliais} />
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModals}
        title="Nova Filial"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <Input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome da filial"
              error={formErrors.nome}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cidade *
            </label>
            <Input
              type="text"
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              placeholder="Cidade"
              error={formErrors.cidade}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UF *
            </label>
            <Input
              type="text"
              value={formData.uf}
              onChange={(e) =>
                setFormData({ ...formData, uf: e.target.value.toUpperCase().slice(0, 2) })
              }
              placeholder="SP"
              maxLength={2}
              error={formErrors.uf}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleCloseModals}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitAdd}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Criando...' : 'Criar Filial'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        title="Editar Filial"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <Input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome da filial"
              error={formErrors.nome}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cidade *
            </label>
            <Input
              type="text"
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              placeholder="Cidade"
              error={formErrors.cidade}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UF *
            </label>
            <Input
              type="text"
              value={formData.uf}
              onChange={(e) =>
                setFormData({ ...formData, uf: e.target.value.toUpperCase().slice(0, 2) })
              }
              placeholder="SP"
              maxLength={2}
              error={formErrors.uf}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleCloseModals}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitEdit}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setFilialToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Excluir Filial"
        message="Tem certeza que deseja excluir esta filial?"
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      {/* Toast */}
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

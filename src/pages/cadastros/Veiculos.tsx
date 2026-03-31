import { Layout } from '../../components/layout/Layout';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Pencil, Ban, CheckCircle, Truck } from 'lucide-react';
import { Veiculo, CreateVeiculo } from '../../types';
import { createVeiculo, listVeiculos, updateVeiculo, toggleVeiculoStatus, getVeiculoById } from '../../services/veiculo.service';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/ui/Select';
import { Toast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function Veiculos() {
  const { profile } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; veiculoId: string; currentStatus: boolean } | null>(null);

  const [formData, setFormData] = useState<CreateVeiculo>({
    perfil: '',
    qtd_eixos: 2,
    capacidade_peso_kg: 0,
    capacidade_vol_m3: 0,
    max_entregas: 0,
    max_km_distancia: 0,
    ocupacao_minima_perc: 70,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const veiculosData = await listVeiculos();
      setVeiculos(veiculosData);
    } catch (error) {
      setToast({ message: 'Erro ao carregar dados', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.perfil.trim()) {
      errors.perfil = 'Perfil é obrigatório';
    }

    if (formData.qtd_eixos < 2 || formData.qtd_eixos > 9) {
      errors.qtd_eixos = 'Quantidade de eixos deve estar entre 2 e 9';
    }

    if (formData.capacidade_peso_kg <= 0) {
      errors.capacidade_peso_kg = 'Capacidade de peso deve ser maior que zero';
    }

    if (formData.capacidade_vol_m3 <= 0) {
      errors.capacidade_vol_m3 = 'Capacidade volumétrica deve ser maior que zero';
    }

    if (formData.max_entregas <= 0) {
      errors.max_entregas = 'Máximo de entregas deve ser maior que zero';
    }

    if (formData.max_km_distancia <= 0) {
      errors.max_km_distancia = 'Distância máxima deve ser maior que zero';
    }

    if (formData.ocupacao_minima_perc < 0 || formData.ocupacao_minima_perc > 100) {
      errors.ocupacao_minima_perc = 'Ocupação mínima deve estar entre 0 e 100%';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    const result = await createVeiculo(formData);

    if (result.success) {
      setToast({ message: 'Veículo criado com sucesso!', type: 'success' });
      setIsCreateModalOpen(false);
      resetForm();
      loadData();
    } else {
      setToast({ message: result.error || 'Erro ao criar veículo', type: 'error' });
    }
  };

  const handleEdit = async () => {
    if (!editingVeiculo || !validateForm()) return;

    const result = await updateVeiculo(editingVeiculo.id, formData);

    if (result.success) {
      setToast({ message: 'Veículo atualizado com sucesso!', type: 'success' });
      setIsEditModalOpen(false);
      setEditingVeiculo(null);
      resetForm();
      loadData();
    } else {
      setToast({ message: result.error || 'Erro ao atualizar veículo', type: 'error' });
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmDialog) return;

    const result = await toggleVeiculoStatus(confirmDialog.veiculoId, !confirmDialog.currentStatus);

    if (result.success) {
      setToast({
        message: `Veículo ${confirmDialog.currentStatus ? 'desativado' : 'ativado'} com sucesso!`,
        type: 'success',
      });
      setConfirmDialog(null);
      loadData();
    } else {
      setToast({ message: result.error || 'Erro ao atualizar status', type: 'error' });
      setConfirmDialog(null);
    }
  };

  const openEditModal = async (veiculo: Veiculo) => {
    const veiculoData = await getVeiculoById(veiculo.id);
    if (!veiculoData) {
      setToast({ message: 'Erro ao carregar dados do veículo', type: 'error' });
      return;
    }

    setEditingVeiculo(veiculoData);
    setFormData({
      perfil: veiculoData.perfil,
      qtd_eixos: veiculoData.qtd_eixos,
      capacidade_peso_kg: veiculoData.capacidade_peso_kg,
      capacidade_vol_m3: veiculoData.capacidade_vol_m3,
      max_entregas: veiculoData.max_entregas,
      max_km_distancia: veiculoData.max_km_distancia,
      ocupacao_minima_perc: veiculoData.ocupacao_minima_perc,
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      perfil: '',
      qtd_eixos: 2,
      capacidade_peso_kg: 0,
      capacidade_vol_m3: 0,
      max_entregas: 0,
      max_km_distancia: 0,
      ocupacao_minima_perc: 70,
    });
    setFormErrors({});
  };

  const filteredVeiculos = veiculos.filter((veiculo) => {
    const matchesSearch = veiculo.perfil.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? veiculo.ativo : !veiculo.ativo);
    return matchesSearch && matchesStatus;
  });


  const columns = [
    {
      key: 'perfil',
      header: 'Perfil',
      render: (veiculo: Veiculo) => <span className="font-medium">{veiculo.perfil}</span>,
    },
    {
      key: 'qtd_eixos',
      header: 'Eixos',
      render: (veiculo: Veiculo) => <span>{veiculo.qtd_eixos}</span>,
    },
    {
      key: 'capacidades',
      header: 'Capacidades',
      render: (veiculo: Veiculo) => (
        <div className="text-sm">
          <div>{veiculo.capacidade_peso_kg.toFixed(0)} kg</div>
          <div className="text-gray-500">{veiculo.capacidade_vol_m3.toFixed(2)} m³</div>
        </div>
      ),
    },
    {
      key: 'limites',
      header: 'Limites',
      render: (veiculo: Veiculo) => (
        <div className="text-sm">
          <div>{veiculo.max_entregas} entregas</div>
          <div className="text-gray-500">{veiculo.max_km_distancia} km</div>
        </div>
      ),
    },
    {
      key: 'ativo',
      header: 'Status',
      render: (veiculo: Veiculo) => (
        <Badge variant={veiculo.ativo ? 'success' : 'error'}>
          {veiculo.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (veiculo: Veiculo) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openEditModal(veiculo)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {profile?.role === 'admin' && (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, veiculoId: veiculo.id, currentStatus: veiculo.ativo })}
              className={`${veiculo.ativo ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'} transition-colors`}
              title={veiculo.ativo ? 'Desativar' : 'Ativar'}
            >
              {veiculo.ativo ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  const formFields = (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Identificação</h3>
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Perfil"
            value={formData.perfil}
            onChange={(e) => setFormData({ ...formData, perfil: e.target.value })}
            error={formErrors.perfil}
            placeholder="Ex: Truck, VUC, Carreta"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Capacidades</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Peso (kg)"
            type="number"
            value={formData.capacidade_peso_kg}
            onChange={(e) => setFormData({ ...formData, capacidade_peso_kg: Number(e.target.value) })}
            error={formErrors.capacidade_peso_kg}
            min={0}
          />
          <Input
            label="Volume (m³)"
            type="number"
            step="0.01"
            value={formData.capacidade_vol_m3}
            onChange={(e) => setFormData({ ...formData, capacidade_vol_m3: Number(e.target.value) })}
            error={formErrors.capacidade_vol_m3}
            min={0}
          />
          <Input
            label="Quantidade de Eixos"
            type="number"
            value={formData.qtd_eixos}
            onChange={(e) => setFormData({ ...formData, qtd_eixos: Number(e.target.value) })}
            error={formErrors.qtd_eixos}
            min={2}
            max={9}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Limites Operacionais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Máximo de Entregas"
            type="number"
            value={formData.max_entregas}
            onChange={(e) => setFormData({ ...formData, max_entregas: Number(e.target.value) })}
            error={formErrors.max_entregas}
            min={0}
          />
          <Input
            label="Distância Máxima (km)"
            type="number"
            value={formData.max_km_distancia}
            onChange={(e) => setFormData({ ...formData, max_km_distancia: Number(e.target.value) })}
            error={formErrors.max_km_distancia}
            min={0}
          />
          <Input
            label="Ocupação Mínima (%)"
            type="number"
            value={formData.ocupacao_minima_perc}
            onChange={(e) => setFormData({ ...formData, ocupacao_minima_perc: Number(e.target.value) })}
            error={formErrors.ocupacao_minima_perc}
            min={0}
            max={100}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cadastro de Veículos</h1>
            <p className="text-gray-600 mt-2">Gerencie a frota de veículos</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Novo Veículo
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Buscar por perfil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'Todos os status' },
                { value: 'active', label: 'Ativos' },
                { value: 'inactive', label: 'Inativos' },
              ]}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredVeiculos.length === 0 ? (
            <EmptyState
              icon={<Truck className="w-full h-full" />}
              title="Nenhum veículo encontrado"
              description="Não há veículos cadastrados ou nenhum corresponde aos filtros aplicados."
              action={
                <Button onClick={() => setIsCreateModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
                  Cadastrar Primeiro Veículo
                </Button>
              }
            />
          ) : (
            <Table data={filteredVeiculos} columns={columns} />
          )}
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Novo Veículo"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Criar Veículo</Button>
          </div>
        }
      >
        {formFields}
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingVeiculo(null);
          resetForm();
        }}
        title="Editar Veículo"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>Salvar Alterações</Button>
          </div>
        }
      >
        {formFields}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog?.isOpen || false}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleToggleStatus}
        title={confirmDialog?.currentStatus ? 'Desativar Veículo' : 'Ativar Veículo'}
        message={
          confirmDialog?.currentStatus
            ? 'Tem certeza que deseja desativar este veículo? Ele não será utilizado nas roteirizações.'
            : 'Tem certeza que deseja ativar este veículo? Ele será utilizado nas roteirizações.'
        }
        variant={confirmDialog?.currentStatus ? 'danger' : 'info'}
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

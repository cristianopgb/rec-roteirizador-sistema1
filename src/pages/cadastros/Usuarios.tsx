import { Layout } from '../../components/layout/Layout';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Ban, CheckCircle, Users as UsersIcon } from 'lucide-react';
import { Profile, Filial, CreateUserData } from '../../types';
import { createUser, listUsers, updateUser, deactivateUser, activateUser, getFiliais } from '../../services/usuario.service';
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

export function Usuarios() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; userId: string; currentStatus: boolean } | null>(null);

  const [formData, setFormData] = useState<CreateUserData>({
    nome: '',
    email: '',
    password: '',
    role: 'user',
    filial_id: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
      const [usersData, filiaisData] = await Promise.all([
        listUsers(profile?.role || 'user', profile?.filial_id),
        getFiliais(),
      ]);
      setUsers(usersData);
      setFiliais(filiaisData);
    } catch (error) {
      setToast({ message: 'Erro ao carregar dados', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (isCreateModalOpen) {
      if (!formData.password) {
        errors.password = 'Senha é obrigatória';
      } else if (formData.password.length < 8) {
        errors.password = 'Senha deve ter no mínimo 8 caracteres';
      }

      if (formData.password !== confirmPassword) {
        errors.confirmPassword = 'As senhas não coincidem';
      }
    }

    if (!formData.filial_id) {
      errors.filial_id = 'Filial é obrigatória';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    const result = await createUser(formData);

    if (result.success) {
      setToast({ message: 'Usuário criado com sucesso!', type: 'success' });
      setIsCreateModalOpen(false);
      resetForm();
      loadData();
    } else {
      if (result.error?.includes('CONSISTÊNCIA')) {
        setToast({ message: result.error, type: 'error' });
      } else {
        setToast({ message: result.error || 'Erro ao criar usuário', type: 'error' });
      }
    }
  };

  const handleEdit = async () => {
    if (!editingUser) return;

    const errors: Record<string, string> = {};
    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    }
    if (!formData.filial_id) {
      errors.filial_id = 'Filial é obrigatória';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await updateUser(editingUser.id, {
      nome: formData.nome,
      role: formData.role,
      filial_id: formData.filial_id,
    });

    if (result.success) {
      setToast({ message: 'Usuário atualizado com sucesso!', type: 'success' });
      setIsEditModalOpen(false);
      setEditingUser(null);
      resetForm();
      loadData();
    } else {
      setToast({ message: result.error || 'Erro ao atualizar usuário', type: 'error' });
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmDialog) return;

    const result = confirmDialog.currentStatus
      ? await deactivateUser(confirmDialog.userId)
      : await activateUser(confirmDialog.userId);

    if (result.success) {
      setToast({
        message: `Usuário ${confirmDialog.currentStatus ? 'desativado' : 'ativado'} com sucesso!`,
        type: 'success',
      });
      setConfirmDialog(null);
      loadData();
    } else {
      setToast({ message: result.error || 'Erro ao atualizar status', type: 'error' });
      setConfirmDialog(null);
    }
  };

  const openEditModal = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      password: '',
      role: user.role,
      filial_id: user.filial_id,
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      password: '',
      role: 'user',
      filial_id: filiais[0]?.id || '',
    });
    setConfirmPassword('');
    setFormErrors({});
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? user.ativo : !user.ativo);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      render: (user: Profile) => <span className="font-medium">{user.nome}</span>,
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'role',
      header: 'Perfil',
      render: (user: Profile) => (
        <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
          {user.role === 'admin' ? 'Admin' : 'Usuário'}
        </Badge>
      ),
    },
    {
      key: 'filial',
      header: 'Filial',
      render: (user: Profile) => user.filial?.nome || '-',
    },
    {
      key: 'ativo',
      header: 'Status',
      render: (user: Profile) => (
        <Badge variant={user.ativo ? 'success' : 'error'}>
          {user.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (user: Profile) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openEditModal(user)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirmDialog({ isOpen: true, userId: user.id, currentStatus: user.ativo })}
            className={`${user.ativo ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'} transition-colors`}
            title={user.ativo ? 'Desativar' : 'Ativar'}
          >
            {user.ativo ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cadastro de Usuários</h1>
            <p className="text-gray-600 mt-2">Gerencie os usuários do sistema</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setFormData({ ...formData, filial_id: filiais[0]?.id || '' });
              setIsCreateModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Novo Usuário
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              options={[
                { value: 'all', label: 'Todos os perfis' },
                { value: 'admin', label: 'Admin' },
                { value: 'user', label: 'Usuário' },
              ]}
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
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="w-full h-full" />}
              title="Nenhum usuário encontrado"
              description="Não há usuários cadastrados ou nenhum corresponde aos filtros aplicados."
              action={
                <Button onClick={() => setIsCreateModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
                  Cadastrar Primeiro Usuário
                </Button>
              }
            />
          ) : (
            <Table data={filteredUsers} columns={columns} />
          )}
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Novo Usuário"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Criar Usuário</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome completo"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            error={formErrors.nome}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
          />
          <Input
            label="Senha"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={formErrors.password}
          />
          <Input
            label="Confirmar senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={formErrors.confirmPassword}
          />
          <Select
            label="Perfil"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
            options={[
              { value: 'user', label: 'Usuário' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <Select
            label="Filial"
            value={formData.filial_id}
            onChange={(e) => setFormData({ ...formData, filial_id: e.target.value })}
            error={formErrors.filial_id}
            options={filiais.map((f) => ({ value: f.id, label: f.nome }))}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
          resetForm();
        }}
        title="Editar Usuário"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>Salvar Alterações</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome completo"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            error={formErrors.nome}
          />
          <Input label="Email" type="email" value={formData.email} disabled />
          <Select
            label="Perfil"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
            options={[
              { value: 'user', label: 'Usuário' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <Select
            label="Filial"
            value={formData.filial_id}
            onChange={(e) => setFormData({ ...formData, filial_id: e.target.value })}
            error={formErrors.filial_id}
            options={filiais.map((f) => ({ value: f.id, label: f.nome }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog?.isOpen || false}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleToggleStatus}
        title={confirmDialog?.currentStatus ? 'Desativar Usuário' : 'Ativar Usuário'}
        message={
          confirmDialog?.currentStatus
            ? 'Tem certeza que deseja desativar este usuário? Ele não poderá mais acessar o sistema.'
            : 'Tem certeza que deseja ativar este usuário? Ele poderá acessar o sistema novamente.'
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

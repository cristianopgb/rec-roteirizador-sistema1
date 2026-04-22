import { useEffect, useState } from 'react';
import { DollarSign, Plus, Pencil, Trash2 } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { supabase } from '../../services/supabase';

interface ANTTRow {
  id: string;
  tipo_carga: string;
  unidade: string;
  eixos_2: number | null;
  eixos_3: number | null;
  eixos_4: number | null;
  eixos_5: number | null;
  eixos_6: number | null;
  eixos_7: number | null;
  eixos_9: number | null;
}

interface FormState {
  tipo_carga: string;
  unidade: string;
  eixos_2: string;
  eixos_3: string;
  eixos_4: string;
  eixos_5: string;
  eixos_6: string;
  eixos_7: string;
  eixos_9: string;
}

const EMPTY_FORM: FormState = {
  tipo_carga: '',
  unidade: 'R$/km',
  eixos_2: '',
  eixos_3: '',
  eixos_4: '',
  eixos_5: '',
  eixos_6: '',
  eixos_7: '',
  eixos_9: '',
};

const EIXO_KEYS = ['eixos_2', 'eixos_3', 'eixos_4', 'eixos_5', 'eixos_6', 'eixos_7', 'eixos_9'] as const;
type EixoKey = (typeof EIXO_KEYS)[number];

function numToInput(v: number | null): string {
  return v === null || v === undefined ? '' : String(v);
}

function inputToNum(v: string): number | null {
  const s = v.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmt(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function TabelaANTT() {
  const [rows, setRows] = useState<ANTTRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ANTTRow | null>(null);

  useEffect(() => {
    loadRows();
  }, []);

  async function loadRows() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tabela_antt')
      .select('*')
      .order('tipo_carga', { ascending: true });
    if (error) {
      setToast({ message: error.message, type: 'error' });
      setRows([]);
    } else {
      setRows((data ?? []) as ANTTRow[]);
    }
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEdit(row: ANTTRow) {
    setEditingId(row.id);
    setForm({
      tipo_carga: row.tipo_carga,
      unidade: row.unidade,
      eixos_2: numToInput(row.eixos_2),
      eixos_3: numToInput(row.eixos_3),
      eixos_4: numToInput(row.eixos_4),
      eixos_5: numToInput(row.eixos_5),
      eixos_6: numToInput(row.eixos_6),
      eixos_7: numToInput(row.eixos_7),
      eixos_9: numToInput(row.eixos_9),
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.tipo_carga.trim()) errs.tipo_carga = 'Informe o tipo de carga';
    if (!form.unidade.trim()) errs.unidade = 'Informe a unidade';

    for (const k of EIXO_KEYS) {
      const v = form[k].trim();
      if (v !== '' && inputToNum(v) === null) {
        errs[k] = 'Número inválido';
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      tipo_carga: form.tipo_carga.trim(),
      unidade: form.unidade.trim(),
      eixos_2: inputToNum(form.eixos_2),
      eixos_3: inputToNum(form.eixos_3),
      eixos_4: inputToNum(form.eixos_4),
      eixos_5: inputToNum(form.eixos_5),
      eixos_6: inputToNum(form.eixos_6),
      eixos_7: inputToNum(form.eixos_7),
      eixos_9: inputToNum(form.eixos_9),
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('tabela_antt').update(payload).eq('id', editingId);
        if (error) throw new Error(error.message);
        setToast({ message: 'Tarifa ANTT atualizada', type: 'success' });
      } else {
        const { error } = await supabase.from('tabela_antt').insert(payload);
        if (error) throw new Error(error.message);
        setToast({ message: 'Tarifa ANTT criada', type: 'success' });
      }
      setIsModalOpen(false);
      await loadRows();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : String(err), type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('tabela_antt').delete().eq('id', deleteTarget.id);
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({ message: 'Tarifa removida', type: 'success' });
      await loadRows();
    }
    setDeleteTarget(null);
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign size={28} /> Tabela ANTT
            </h1>
            <p className="text-gray-600 mt-1">Tarifas oficiais para cálculo do frete mínimo por eixos</p>
          </div>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus size={18} /> Nova Tarifa
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={<DollarSign size={64} />}
                title="Nenhuma tarifa cadastrada"
                description="Cadastre as tarifas ANTT por tipo de carga para habilitar o cálculo de frete mínimo."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Tipo de Carga</th>
                    <th className="px-4 py-3 text-left">Unidade</th>
                    <th className="px-4 py-3 text-right">2 eixos</th>
                    <th className="px-4 py-3 text-right">3 eixos</th>
                    <th className="px-4 py-3 text-right">4 eixos</th>
                    <th className="px-4 py-3 text-right">5 eixos</th>
                    <th className="px-4 py-3 text-right">6 eixos</th>
                    <th className="px-4 py-3 text-right">7 eixos</th>
                    <th className="px-4 py-3 text-right">9 eixos</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{r.tipo_carga}</td>
                      <td className="px-4 py-3 text-gray-600">{r.unidade}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.eixos_2)}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.eixos_3)}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.eixos_4)}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.eixos_5)}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.eixos_6)}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.eixos_7)}</td>
                      <td className="px-4 py-3 text-right">{fmt(r.eixos_9)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                            aria-label="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="p-1.5 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded"
                            aria-label="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Tarifa ANTT' : 'Nova Tarifa ANTT'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tipo de Carga"
              value={form.tipo_carga}
              onChange={(e) => setForm({ ...form, tipo_carga: e.target.value })}
              error={formErrors.tipo_carga}
              placeholder="Ex: Carga Geral"
            />
            <Input
              label="Unidade"
              value={form.unidade}
              onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              error={formErrors.unidade}
              placeholder="R$/km"
            />
          </div>

          <div>
            <div className="text-xs uppercase font-semibold text-gray-600 mb-2">Valor por quantidade de eixos</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {EIXO_KEYS.map((k) => {
                const label = `${k.replace('eixos_', '')} eixos`;
                return (
                  <Input
                    key={k}
                    label={label}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value } as FormState)}
                    error={formErrors[k as EixoKey]}
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingId ? 'Salvar Alterações' : 'Criar Tarifa'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remover tarifa"
        message={`Tem certeza que deseja remover a tarifa de "${deleteTarget?.tipo_carga}"?`}
        confirmText="Remover"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  );
}

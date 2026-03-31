import { Layout } from '../components/layout/Layout';

export function Dashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Visão geral do Sistema Roteirizador REC</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Ocupação Média</h3>
            <p className="text-3xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-600 mt-2">Aguardando dados</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Roteirizado</h3>
            <p className="text-3xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-600 mt-2">Aguardando dados</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Manifestos</h3>
            <p className="text-3xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-600 mt-2">Aguardando dados</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Não Roteirizados</h3>
            <p className="text-3xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-600 mt-2">Aguardando dados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Agendas Atendidas</h3>
            <div className="h-48 flex items-center justify-center text-gray-500">
              Gráfico será implementado nas próximas sprints
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Eficiência por Rodada</h3>
            <div className="h-48 flex items-center justify-center text-gray-500">
              Gráfico será implementado nas próximas sprints
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparativo por Filial</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Tabela comparativa será implementada nas próximas sprints
          </div>
        </div>
      </div>
    </Layout>
  );
}

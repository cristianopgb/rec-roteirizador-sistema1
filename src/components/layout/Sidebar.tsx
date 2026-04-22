import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  CheckSquare,
  Users,
  Truck,
  Map,
  ChevronDown,
  Building2,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

export function Sidebar() {
  const { profile } = useAuth();
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const isAdmin = profile?.role === 'admin';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Roteirizador REC</h1>
        <p className="text-sm text-gray-600 mt-1">Sistema 1</p>
      </div>

      <nav className="px-4 space-y-1">
        <NavLink to="/dashboard" className={navLinkClass}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/roteirizacao" className={navLinkClass}>
          <MapPin size={20} />
          <span>Roteirização</span>
        </NavLink>

        <NavLink to="/aprovacao" className={navLinkClass}>
          <CheckSquare size={20} />
          <span>Aprovação</span>
        </NavLink>

        <div className="pt-4 pb-2">
          <button
            onClick={() => setCadastrosOpen(!cadastrosOpen)}
            className="flex items-center justify-between w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <Map size={20} />
              <span>Cadastros</span>
            </div>
            <ChevronDown
              size={16}
              className={`transition-transform ${cadastrosOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {cadastrosOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {isAdmin && (
                <NavLink to="/cadastros/filiais" className={navLinkClass}>
                  <Building2 size={18} />
                  <span>Filiais</span>
                </NavLink>
              )}

              {isAdmin && (
                <NavLink to="/cadastros/usuarios" className={navLinkClass}>
                  <Users size={18} />
                  <span>Usuários</span>
                </NavLink>
              )}

              <NavLink to="/cadastros/veiculos" className={navLinkClass}>
                <Truck size={18} />
                <span>Veículos</span>
              </NavLink>

              {isAdmin && (
                <NavLink to="/cadastros/regionalidade" className={navLinkClass}>
                  <Map size={18} />
                  <span>Regionalidade</span>
                </NavLink>
              )}

              {isAdmin && (
                <NavLink to="/cadastros/antt" className={navLinkClass}>
                  <DollarSign size={18} />
                  <span>Tabela ANTT</span>
                </NavLink>
              )}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}

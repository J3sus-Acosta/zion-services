import React, { useState, useEffect } from 'react';
import { Usuario, RolUsuario } from '../../types/auth';
import { UserPlus, Shield, CheckCircle2, XCircle, Search, Filter, RefreshCw, KeyRound, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export const UserManagementPanel: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Formulario nuevo usuario
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoRut, setNuevoRut] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('Zion2026!');
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>('CLIENTE');
  const [nuevoEmpresaId, setNuevoEmpresaId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/usuarios', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setUsuarios(json.data.usuarios);
        setLoading(false);
        return;
      }
    } catch {}

    // Mock fallback si el backend no está corriendo
    setUsuarios([
      { id: 'usr-1', email: 'superadmin@zion.cl', nombre: 'Super', apellido: 'Administrador', rut: '1-9', rol: 'SUPERADMIN', activo: true },
      { id: 'usr-2', email: 'admin@zion.cl', nombre: 'Administrador', apellido: 'Zion', rut: '2-7', rol: 'ADMIN', activo: true },
      { id: 'usr-3', email: 'operaciones@zion.cl', nombre: 'Jefe', apellido: 'Operaciones', rut: '3-5', rol: 'JEFE_OPERACIONES', activo: true },
      { id: 'usr-4', email: 'conductor@zion.cl', nombre: 'Carlos', apellido: 'Sánchez', rut: '4-3', rol: 'CONDUCTOR', conductorId: 'cond-01', activo: true },
      { id: 'usr-5', email: 'cliente@horse.cl', nombre: 'Contacto', apellido: 'Horse Chile', rut: '5-1', rol: 'CLIENTE', empresaClienteId: 'empresa-horse', activo: true },
      { id: 'usr-6', email: 'inactivo@cliente.cl', nombre: 'Usuario', apellido: 'Inactivo', rut: '6-K', rol: 'CLIENTE', empresaClienteId: 'empresa-horse', activo: false }
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleToggleEstado = async (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    try {
      await fetch(`http://localhost:3000/api/usuarios/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activo: nuevoEstado })
      });
    } catch {}

    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activo: nuevoEstado } : u))
    );
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (nuevoRol === 'CLIENTE' && !nuevoEmpresaId) {
      setFormError('Para usuarios con rol CLIENTE debe especificar el identificador de la empresa.');
      return;
    }

    const payload = {
      email: nuevoEmail,
      password: nuevoPassword,
      nombre: nuevoNombre,
      apellido: nuevoApellido,
      rut: nuevoRut,
      rol: nuevoRol,
      empresaClienteId: nuevoRol === 'CLIENTE' ? nuevoEmpresaId : null,
      activo: true
    };

    try {
      const res = await fetch('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        setUsuarios((prev) => [json.data.usuario, ...prev]);
        setIsModalOpen(false);
        resetForm();
        return;
      }
    } catch {}

    // Fallback local
    const nuevoLocal: Usuario = {
      id: `usr-${Date.now()}`,
      email: nuevoEmail,
      nombre: nuevoNombre,
      apellido: nuevoApellido,
      rut: nuevoRut,
      rol: nuevoRol,
      empresaClienteId: nuevoRol === 'CLIENTE' ? nuevoEmpresaId : null,
      activo: true
    };
    setUsuarios((prev) => [nuevoLocal, ...prev]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNuevoEmail('');
    setNuevoNombre('');
    setNuevoApellido('');
    setNuevoRut('');
    setNuevoRol('CLIENTE');
    setNuevoEmpresaId('');
    setFormError(null);
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchRol = filtroRol === 'TODOS' || u.rol === filtroRol;
    const matchEstado =
      filtroEstado === 'TODOS' ||
      (filtroEstado === 'ACTIVO' && u.activo) ||
      (filtroEstado === 'INACTIVO' && !u.activo);
    const query = busqueda.toLowerCase();
    const matchQuery =
      !query ||
      u.nombre.toLowerCase().includes(query) ||
      u.apellido.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.rut.toLowerCase().includes(query);
    return matchRol && matchEstado && matchQuery;
  });

  return (
    <div className="space-y-6">
      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span>Gestión y Habilitación de Usuarios</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administración de cuentas internas y habilitación de usuarios para empresas clientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsuarios} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span>Nuevo Usuario</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o RUT..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Rol:</span>
              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="h-9 px-2 rounded-lg border border-border bg-background text-xs focus:outline-none"
              >
                <option value="TODOS">Todos los roles</option>
                <option value="SUPERADMIN">Superadmin</option>
                <option value="ADMIN">Admin</option>
                <option value="JEFE_OPERACIONES">Jefe de Operaciones</option>
                <option value="CONDUCTOR">Conductor</option>
                <option value="CLIENTE">Cliente</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Estado:</span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="h-9 px-2 rounded-lg border border-border bg-background text-xs focus:outline-none"
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Solo Activos</option>
                <option value="INACTIVO">Solo Deshabilitados</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Usuarios */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Usuarios Registrados ({usuariosFiltrados.length})</CardTitle>
            <Badge variant="outline">{usuarios.filter((u) => u.activo).length} Habilitados</Badge>
          </div>
          <CardDescription>
            Conmute el estado para autorizar o suspender inmediatamente el acceso a la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground border-y border-border">
                <tr>
                  <th className="px-4 py-3">Usuario / RUT</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Entidad / Empresa</th>
                  <th className="px-4 py-3">Estado de Cuenta</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">
                        {u.nombre} {u.apellido}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.email} · RUT: {u.rut}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          u.rol === 'SUPERADMIN'
                            ? 'default'
                            : u.rol === 'ADMIN'
                            ? 'secondary'
                            : u.rol === 'JEFE_OPERACIONES'
                            ? 'outline'
                            : 'outline'
                        }
                      >
                        {u.rol}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.empresaClienteId ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{u.empresaClienteId}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Zion Services</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.activo ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Habilitada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                          <XCircle className="h-3.5 w-3.5" />
                          Deshabilitada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={u.activo ? 'outline' : 'default'}
                        onClick={() => handleToggleEstado(u.id, u.activo)}
                        className="text-xs h-8"
                      >
                        {u.activo ? 'Deshabilitar' : 'Habilitar Cuenta'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Crear Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-border shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <span>Registrar y Habilitar Nuevo Usuario</span>
              </CardTitle>
              <CardDescription>
                Complete los antecedentes del usuario. Podrá asignarlo como Conductor o vincularlo a un Cliente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formError && (
                <div className="mb-4 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                  {formError}
                </div>
              )}
              <form onSubmit={handleCrearUsuario} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Nombre</label>
                    <input
                      type="text"
                      required
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Juan"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Apellido</label>
                    <input
                      type="text"
                      required
                      value={nuevoApellido}
                      onChange={(e) => setNuevoApellido(e.target.value)}
                      placeholder="Pérez"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">RUT</label>
                    <input
                      type="text"
                      required
                      value={nuevoRut}
                      onChange={(e) => setNuevoRut(e.target.value)}
                      placeholder="12.345.678-9"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Rol</label>
                    <select
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
                      className="w-full h-9 px-2 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="CLIENTE">CLIENTE (Portal)</option>
                      <option value="CONDUCTOR">CONDUCTOR (Tablet)</option>
                      <option value="JEFE_OPERACIONES">JEFE DE OPERACIONES</option>
                      <option value="ADMIN">ADMINISTRADOR</option>
                      <option value="SUPERADMIN">SUPERADMIN</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Correo Electrónico Corporativo</label>
                  <input
                    type="email"
                    required
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="usuario@dominio.cl"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                  />
                </div>

                {nuevoRol === 'CLIENTE' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-primary flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      Empresa Cliente Asociada
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevoEmpresaId}
                      onChange={(e) => setNuevoEmpresaId(e.target.value)}
                      placeholder="ej: empresa-horse, bravo-energy, etc."
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5" />
                    Contraseña Inicial
                  </label>
                  <input
                    type="password"
                    required
                    value={nuevoPassword}
                    onChange={(e) => setNuevoPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar y Habilitar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

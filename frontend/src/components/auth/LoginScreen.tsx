import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RolUsuario } from '../../types/auth';
import { Lock, Mail, ShieldAlert, KeyRound, Truck, Building2, UserCheck, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export const LoginScreen: React.FC = () => {
  const { login, cambiarRolSimulado, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Por favor complete su correo y contraseña.');
      return;
    }

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Credenciales inválidas.');
    }
  };

  const rolesDemo: { rol: RolUsuario; label: string; email: string; pass: string; icon: any }[] = [
    { rol: 'SUPERADMIN', label: 'Superadmin', email: 'superadmin@zion.cl', pass: 'SuperAdmin2026!', icon: ShieldCheck },
    { rol: 'ADMIN', label: 'Admin', email: 'admin@zion.cl', pass: 'Admin2026!', icon: KeyRound },
    { rol: 'JEFE_OPERACIONES', label: 'Jefe Operaciones', email: 'operaciones@zion.cl', pass: 'Ops2026!', icon: UserCheck },
    { rol: 'CONDUCTOR', label: 'Conductor (Tablet)', email: 'conductor@zion.cl', pass: 'Conductor2026!', icon: Truck },
    { rol: 'CLIENTE', label: 'Cliente (Portal)', email: 'cliente@horse.cl', pass: 'Cliente2026!', icon: Building2 },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full space-y-6">
        {/* Branding Zion Services */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-primary text-primary-foreground font-bold items-center justify-center text-lg shadow-md">
            ZS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ZION SERVICES</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Sistema Integral de Operaciones y Flota
          </p>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span>Iniciar Sesión</span>
            </CardTitle>
            <CardDescription>
              Ingrese sus credenciales corporativas según su rol autorizado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2 animate-in fade-in">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@zion.cl"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Autenticando...' : 'Acceder al Sistema'}
              </Button>
            </form>

            {/* Accesos rápidos de prueba por rol */}
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Acceso Rápido por Rol:</span>
                <Badge variant="outline" className="text-[10px]">Pruebas / Demo</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {rolesDemo.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.rol}
                      type="button"
                      onClick={() => {
                        setEmail(item.email);
                        setPassword(item.pass);
                        if (cambiarRolSimulado) cambiarRolSimulado(item.rol);
                      }}
                      className="p-2 text-left rounded-lg border border-border hover:bg-muted/60 transition-colors text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Icon className="h-3 w-3 text-primary" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate">{item.email}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

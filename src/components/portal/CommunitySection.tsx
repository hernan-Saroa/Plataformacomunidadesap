import { useState } from 'react';
import {
  Users,
  MapPin,
  ChevronRight,
  Search,
  UserPlus,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { MOCK_USERS_WITH_SEDES as MOCK_USERS } from '../../data/mockUsersWithSedes';

interface CommunitySectionProps {
  onEventSelect?: (event: any) => void;
}

export function CommunitySection({ onEventSelect }: CommunitySectionProps) {
  const [directorySearch, setDirectorySearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-[#1e5da8]/10 rounded-lg">
              <Users className="w-7 h-7 text-[#1e5da8]" />
            </div>
            Directorio Comunidad ESAP
          </h2>
          <p className="text-gray-600 mt-1">
            Busca y conecta con estudiantes, docentes, graduados y administrativos
          </p>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, programa, correo..."
            className="pl-9"
            value={directorySearch}
            onChange={(e) => setDirectorySearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid de usuarios */}
      <div className="space-y-2">
        {MOCK_USERS
          .filter((user) => {
            if (user.status !== 'active') return false;
            if (directorySearch) {
              const searchLower = directorySearch.toLowerCase();
              const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
              const program = user.program?.toLowerCase() || '';
              const email = user.email.toLowerCase();
              return fullName.includes(searchLower) || program.includes(searchLower) || email.includes(searchLower);
            }
            return true;
          })
          .map((user) => {
            const primaryRole = user.roles[0];
            const roleColors: Record<string, { bg: string; text: string; border: string }> = {
              Estudiante: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
              Docente: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
              Graduado: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
              Administrativo: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
              Aspirante: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
            };
            const roleColor = roleColors[primaryRole.name] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

            return (
              <Card key={user.id} className="hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar className="w-14 h-14 flex-shrink-0">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="text-sm">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Información principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 group-hover:text-[#1e5da8] transition-colors truncate">
                          {user.firstName} {user.lastName}
                        </h4>
                        <Badge className={`${roleColor.bg} ${roleColor.text} border ${roleColor.border} text-xs flex-shrink-0`}>
                          {primaryRole.name}
                        </Badge>
                      </div>
                      
                      {/* Información secundaria */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        {user.program && (
                          <span className="flex items-center gap-1 truncate">
                            <GraduationCap className="w-3 h-3 flex-shrink-0" />
                            {user.program}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {user.location || 'Sin ubicación'}
                        </span>
                        {user.email && (
                          <span className="hidden md:flex items-center gap-1 text-gray-500">
                            {user.email}
                          </span>
                        )}
                      </div>

                      {/* Roles adicionales */}
                      {user.roles.length > 1 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {user.roles.slice(1, 3).map((role, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] px-2 py-0.5">
                              {role.name}
                            </Badge>
                          ))}
                          {user.roles.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              +{user.roles.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="text-xs hover:bg-blue-50 hover:text-[#1e5da8] hover:border-[#1e5da8]">
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden lg:inline ml-1">Conectar</span>
                      </Button>
                      <Button size="sm" className="text-xs bg-[#1e5da8] hover:bg-[#174a8a]">
                        Ver Perfil
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Mensaje si no hay resultados */}
      {MOCK_USERS.filter((user) => {
        if (user.status !== 'active') return false;
        if (directorySearch) {
          const searchLower = directorySearch.toLowerCase();
          const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
          const program = user.program?.toLowerCase() || '';
          const email = user.email.toLowerCase();
          return fullName.includes(searchLower) || program.includes(searchLower) || email.includes(searchLower);
        }
        return true;
      }).length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron resultados</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Intenta ajustar los filtros o buscar con otros términos
          </p>
          <Button variant="outline" onClick={() => { setDirectorySearch(''); }}>
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
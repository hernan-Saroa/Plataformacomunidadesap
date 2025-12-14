import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  User,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';

interface DisponibilidadDocentesProps {
  className?: string;
  docenteId?: string;
}

interface BloqueHorario {
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
  tipo: 'Disponible' | 'No Disponible' | 'Preferido' | 'Restringido';
  observacion?: string;
}

interface Restriccion {
  id: string;
  tipo: 'Personal' | 'Institucional' | 'Salud' | 'Otro';
  descripcion: string;
  dia_semana?: string;
  permanente: boolean;
}

export function DisponibilidadDocentes({ className = '', docenteId = '1' }: DisponibilidadDocentesProps) {
  const [bloques, setBloques] = useState<BloqueHorario[]>([
    // Lunes
    { dia: 'Lunes', hora_inicio: '06:00', hora_fin: '08:00', disponible: true, tipo: 'Disponible' },
    { dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00', disponible: true, tipo: 'Preferido' },
    { dia: 'Lunes', hora_inicio: '10:00', hora_fin: '12:00', disponible: true, tipo: 'Preferido' },
    { dia: 'Lunes', hora_inicio: '12:00', hora_fin: '14:00', disponible: false, tipo: 'No Disponible', observacion: 'Almuerzo' },
    { dia: 'Lunes', hora_inicio: '14:00', hora_fin: '16:00', disponible: true, tipo: 'Disponible' },
    { dia: 'Lunes', hora_inicio: '16:00', hora_fin: '18:00', disponible: true, tipo: 'Disponible' },
    
    // Martes
    { dia: 'Martes', hora_inicio: '08:00', hora_fin: '10:00', disponible: true, tipo: 'Preferido' },
    { dia: 'Martes', hora_inicio: '10:00', hora_fin: '12:00', disponible: true, tipo: 'Disponible' },
    { dia: 'Martes', hora_inicio: '14:00', hora_fin: '16:00', disponible: true, tipo: 'Disponible' },
    
    // Miércoles
    { dia: 'Miércoles', hora_inicio: '08:00', hora_fin: '10:00', disponible: true, tipo: 'Preferido' },
    { dia: 'Miércoles', hora_inicio: '10:00', hora_fin: '12:00', disponible: false, tipo: 'Restringido', observacion: 'Reunión departamento' },
    
    // Jueves
    { dia: 'Jueves', hora_inicio: '08:00', hora_fin: '10:00', disponible: true, tipo: 'Disponible' },
    { dia: 'Jueves', hora_inicio: '14:00', hora_fin: '16:00', disponible: true, tipo: 'Disponible' },
    
    // Viernes
    { dia: 'Viernes', hora_inicio: '08:00', hora_fin: '12:00', disponible: true, tipo: 'Preferido' }
  ]);

  const [restricciones, setRestricciones] = useState<Restriccion[]>([
    {
      id: '1',
      tipo: 'Personal',
      descripcion: 'No disponible los viernes después de las 14:00',
      dia_semana: 'Viernes',
      permanente: true
    },
    {
      id: '2',
      tipo: 'Institucional',
      descripcion: 'Reunión de departamento miércoles 10-12',
      dia_semana: 'Miércoles',
      permanente: true
    }
  ]);

  const [nuevaRestriccion, setNuevaRestriccion] = useState({
    tipo: 'Personal' as Restriccion['tipo'],
    descripcion: '',
    dia_semana: '',
    permanente: false
  });

  const docente = {
    nombre: 'María López Gómez',
    foto_url: '',
    territorial: 'Bogotá',
    dedicacion: 40
  };

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const horariosBloque = [
    '06:00-08:00',
    '08:00-10:00',
    '10:00-12:00',
    '12:00-14:00',
    '14:00-16:00',
    '16:00-18:00',
    '18:00-20:00'
  ];

  const getTipoColor = (tipo: BloqueHorario['tipo']) => {
    switch (tipo) {
      case 'Disponible':
        return 'bg-green-100 hover:bg-green-200 border-green-300 text-green-700';
      case 'Preferido':
        return 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-700';
      case 'No Disponible':
        return 'bg-red-100 hover:bg-red-200 border-red-300 text-red-700';
      case 'Restringido':
        return 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700';
    }
  };

  const getTipoIcon = (tipo: BloqueHorario['tipo']) => {
    switch (tipo) {
      case 'Disponible':
        return <CheckCircle className="w-3 h-3" />;
      case 'Preferido':
        return <CheckCircle className="w-3 h-3" />;
      case 'No Disponible':
        return <XCircle className="w-3 h-3" />;
      case 'Restringido':
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getRestriccionColor = (tipo: Restriccion['tipo']) => {
    switch (tipo) {
      case 'Personal':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Institucional':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Salud':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const toggleBloque = (dia: string, horario: string) => {
    const [inicio, fin] = horario.split('-');
    setBloques(bloques.map(b => {
      if (b.dia === dia && b.hora_inicio === inicio && b.hora_fin === fin) {
        // Ciclar entre estados
        let nuevoTipo: BloqueHorario['tipo'];
        if (b.tipo === 'Disponible') nuevoTipo = 'Preferido';
        else if (b.tipo === 'Preferido') nuevoTipo = 'No Disponible';
        else if (b.tipo === 'No Disponible') nuevoTipo = 'Restringido';
        else nuevoTipo = 'Disponible';

        return {
          ...b,
          tipo: nuevoTipo,
          disponible: nuevoTipo !== 'No Disponible'
        };
      }
      return b;
    }));
  };

  const addRestriccion = () => {
    if (nuevaRestriccion.descripcion) {
      setRestricciones([
        ...restricciones,
        {
          id: Date.now().toString(),
          ...nuevaRestriccion
        }
      ]);
      setNuevaRestriccion({
        tipo: 'Personal',
        descripcion: '',
        dia_semana: '',
        permanente: false
      });
    }
  };

  const removeRestriccion = (id: string) => {
    setRestricciones(restricciones.filter(r => r.id !== id));
  };

  const handleGuardar = () => {
    console.log('Guardando disponibilidad:', { bloques, restricciones });
    // Aquí iría la lógica para guardar
  };

  const copiarSemana = () => {
    // Copiar la configuración de lunes a toda la semana
    const lunes = bloques.filter(b => b.dia === 'Lunes');
    const nuevoBloques: BloqueHorario[] = [];
    
    diasSemana.forEach(dia => {
      lunes.forEach(bloque => {
        nuevoBloques.push({ ...bloque, dia });
      });
    });
    
    setBloques(nuevoBloques);
  };

  const getBloqueForSlot = (dia: string, horario: string) => {
    const [inicio, fin] = horario.split('-');
    return bloques.find(b => 
      b.dia === dia && 
      b.hora_inicio === inicio && 
      b.hora_fin === fin
    );
  };

  const getInitials = (nombre: string) => {
    const parts = nombre.split(' ');
    return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase();
  };

  // Calcular estadísticas
  const stats = {
    disponibles: bloques.filter(b => b.tipo === 'Disponible').length,
    preferidos: bloques.filter(b => b.tipo === 'Preferido').length,
    noDisponibles: bloques.filter(b => b.tipo === 'No Disponible').length,
    restringidos: bloques.filter(b => b.tipo === 'Restringido').length
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Disponibilidad Horaria
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configura los horarios de disponibilidad y restricciones
          </p>
        </div>
      </div>

      {/* Info del Docente */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={docente.foto_url} />
            <AvatarFallback className="bg-[#1e5da8] text-white text-xl">
              {getInitials(docente.nombre)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{docente.nombre}</h2>
            <p className="text-gray-600">{docente.territorial} • {docente.dedicacion} horas/semana</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={copiarSemana} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copiar Lunes a Toda la Semana
            </Button>
            <Button onClick={handleGuardar} size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Disponibles</p>
              <p className="text-xl font-bold text-gray-900">{stats.disponibles}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Preferidos</p>
              <p className="text-xl font-bold text-gray-900">{stats.preferidos}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">No Disponibles</p>
              <p className="text-xl font-bold text-gray-900">{stats.noDisponibles}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Restringidos</p>
              <p className="text-xl font-bold text-gray-900">{stats.restringidos}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Leyenda */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-700">Leyenda:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded" />
            <span className="text-gray-600">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded" />
            <span className="text-gray-600">Preferido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded" />
            <span className="text-gray-600">No Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-100 border-2 border-amber-300 rounded" />
            <span className="text-gray-600">Restringido</span>
          </div>
          <span className="text-xs text-gray-500 ml-auto">Click para cambiar estado</span>
        </div>
      </Card>

      {/* Grid de Disponibilidad */}
      <Card className="p-6 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="grid grid-cols-6 gap-2 mb-2">
            <div className="p-2 text-sm font-medium text-gray-600">Horario</div>
            {diasSemana.map((dia) => (
              <div key={dia} className="p-2 text-sm font-bold text-center text-gray-900 bg-gray-100 rounded-lg">
                {dia}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="space-y-2">
            {horariosBloque.map((horario) => (
              <div key={horario} className="grid grid-cols-6 gap-2">
                <div className="p-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {horario}
                </div>
                {diasSemana.map((dia) => {
                  const bloque = getBloqueForSlot(dia, horario);
                  
                  return (
                    <motion.button
                      key={`${dia}-${horario}`}
                      onClick={() => toggleBloque(dia, horario)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        bloque
                          ? getTipoColor(bloque.tipo)
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {bloque && (
                        <div className="flex flex-col items-center justify-center gap-1">
                          {getTipoIcon(bloque.tipo)}
                          {bloque.observacion && (
                            <span className="text-xs truncate w-full">
                              {bloque.observacion}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Restricciones */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">Restricciones Adicionales</h3>
        
        {/* Lista de restricciones */}
        <div className="space-y-2 mb-4">
          {restricciones.map((restriccion) => (
            <motion.div
              key={restriccion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getRestriccionColor(restriccion.tipo)}>
                      {restriccion.tipo}
                    </Badge>
                    {restriccion.permanente && (
                      <Badge variant="secondary" className="text-xs">
                        Permanente
                      </Badge>
                    )}
                    {restriccion.dia_semana && (
                      <span className="text-xs text-gray-600">{restriccion.dia_semana}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{restriccion.descripcion}</p>
                </div>
                <button
                  onClick={() => removeRestriccion(restriccion.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Nueva restricción */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Agregar Nueva Restricción</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <select
              value={nuevaRestriccion.tipo}
              onChange={(e) => setNuevaRestriccion({ ...nuevaRestriccion, tipo: e.target.value as Restriccion['tipo'] })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="Personal">Personal</option>
              <option value="Institucional">Institucional</option>
              <option value="Salud">Salud</option>
              <option value="Otro">Otro</option>
            </select>

            <select
              value={nuevaRestriccion.dia_semana}
              onChange={(e) => setNuevaRestriccion({ ...nuevaRestriccion, dia_semana: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Día (opcional)</option>
              {diasSemana.map(dia => (
                <option key={dia} value={dia}>{dia}</option>
              ))}
            </select>
          </div>

          <Textarea
            value={nuevaRestriccion.descripcion}
            onChange={(e) => setNuevaRestriccion({ ...nuevaRestriccion, descripcion: e.target.value })}
            placeholder="Describe la restricción..."
            rows={2}
            className="mb-3"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={nuevaRestriccion.permanente}
                onChange={(e) => setNuevaRestriccion({ ...nuevaRestriccion, permanente: e.target.checked })}
                className="w-4 h-4 text-[#1e5da8]"
              />
              <span>Restricción permanente</span>
            </label>

            <Button
              onClick={addRestriccion}
              size="sm"
              disabled={!nuevaRestriccion.descripcion}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * PROFESIONALES OCI - Gestión de Equipo de Control Interno
 * Configuración de capacidad y disponibilidad horaria de profesionales
 * VERSIÓN: 1.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Users,
    Clock,
    BarChart3,
    Plus,
    Edit2,
    Trash2,
    X,
    Save,
    TrendingUp,
    Award,
    UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// INTERFACES
// ============================================================================

interface ProfesionalOCI {
    id: string;
    nombre: string;
    cargo: string;
    especialidades: string[];
    capacidadMaxima: number;
    horasMensuales: number;
    estado: 'activo' | 'inactivo' | 'vacaciones' | 'comision';
    email: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const PROFESIONALES_MOCK: ProfesionalOCI[] = [
    {
        id: '1',
        nombre: 'Mario Oswaldo Bernal',
        cargo: 'Jefe de Control Interno',
        especialidades: ['Gestión', 'Estrategia'],
        capacidadMaxima: 3,
        horasMensuales: 120,
        estado: 'activo',
        email: 'mario.bernal@esap.edu.co',
    },
    {
        id: '2',
        nombre: 'Ana María López',
        cargo: 'Auditora sénior',
        especialidades: ['Financiera', 'Cumplimiento'],
        capacidadMaxima: 5,
        horasMensuales: 160,
        estado: 'activo',
        email: 'ana.lopez@esap.edu.co',
    },
    {
        id: '3',
        nombre: 'Carlos Eduardo Ramírez',
        cargo: 'Auditor',
        especialidades: ['Gestión', 'Calidad'],
        capacidadMaxima: 4,
        horasMensuales: 160,
        estado: 'activo',
        email: 'carlos.ramirez@esap.edu.co',
    },
    {
        id: '4',
        nombre: 'Laura Patricia Gómez',
        cargo: 'Auditora',
        especialidades: ['Financiera', 'Tributaria'],
        capacidadMaxima: 4,
        horasMensuales: 160,
        estado: 'activo',
        email: 'laura.gomez@esap.edu.co',
    },
    {
        id: '5',
        nombre: 'Diego Fernando Torres',
        cargo: 'Profesional de apoyo',
        especialidades: ['Cumplimiento', 'Gestión documental'],
        capacidadMaxima: 3,
        horasMensuales: 120,
        estado: 'activo',
        email: 'diego.torres@esap.edu.co',
    },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function ProfesionalesOCIModule() {
    const [profesionales, setProfesionales] = useState<ProfesionalOCI[]>(PROFESIONALES_MOCK);
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState<ProfesionalOCI | null>(null);
    const [formData, setFormData] = useState<Partial<ProfesionalOCI>>({});

    // Estadísticas
    const totalProfesionales = profesionales.filter(p => p.estado === 'activo').length;
    const capacidadTotal = profesionales.filter(p => p.estado === 'activo').reduce((acc, p) => acc + p.capacidadMaxima, 0);
    const horasTotales = profesionales.filter(p => p.estado === 'activo').reduce((acc, p) => acc + p.horasMensuales, 0);
    const promedioCap = totalProfesionales > 0 ? Math.round(capacidadTotal / totalProfesionales) : 0;

    const handleAgregar = () => {
        setEditando(null);
        setFormData({
            nombre: '',
            cargo: '',
            especialidades: [],
            capacidadMaxima: 3,
            horasMensuales: 160,
            estado: 'activo',
            email: '',
        });
        setShowModal(true);
    };

    const handleEditar = (prof: ProfesionalOCI) => {
        setEditando(prof);
        setFormData({ ...prof });
        setShowModal(true);
    };

    const handleEliminar = (id: string) => {
        const prof = profesionales.find(p => p.id === id);
        if (confirm(`¿Está seguro de eliminar a ${prof?.nombre}?`)) {
            setProfesionales(prev => prev.filter(p => p.id !== id));
            toast.success('Profesional eliminado correctamente');
        }
    };

    const handleGuardar = () => {
        if (!formData.nombre || !formData.cargo || !formData.email) {
            toast.error('Complete todos los campos obligatorios');
            return;
        }

        if (editando) {
            setProfesionales(prev =>
                prev.map(p =>
                    p.id === editando.id ? { ...p, ...formData } as ProfesionalOCI : p
                )
            );
            toast.success('Profesional actualizado correctamente');
        } else {
            const nuevo: ProfesionalOCI = {
                id: Date.now().toString(),
                nombre: formData.nombre || '',
                cargo: formData.cargo || '',
                especialidades: formData.especialidades || [],
                capacidadMaxima: formData.capacidadMaxima || 3,
                horasMensuales: formData.horasMensuales || 160,
                estado: 'activo',
                email: formData.email || '',
            };
            setProfesionales(prev => [...prev, nuevo]);
            toast.success('Profesional agregado correctamente');
        }
        setShowModal(false);
    };

    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Configuración de Profesionales OCI
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Gestiona la capacidad de auditorías y disponibilidad horaria de cada profesional
                    </p>
                </div>
                <button
                    onClick={handleAgregar}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Agregar Profesional
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Profesionales"
                    value={totalProfesionales}
                    subtitle="activos en el equipo"
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    color="blue"
                />
                <StatCard
                    label="Capacidad Total"
                    value={capacidadTotal}
                    subtitle="auditorías simultáneas"
                    icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
                    color="orange"
                />
                <StatCard
                    label="Horas Totales"
                    value={horasTotales}
                    subtitle="horas/mes disponibles"
                    icon={<Clock className="w-5 h-5 text-green-600" />}
                    color="green"
                />
                <StatCard
                    label="Promedio Capacidad"
                    value={promedioCap}
                    subtitle="auditorías por profesional"
                    icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
                    color="purple"
                />
            </div>

            {/* Lista de Profesionales */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    Profesionales del Equipo OCI
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    Configure la capacidad máxima y horas disponibles para cada profesional
                </p>

                <div className="space-y-6">
                    {profesionales.map((prof) => (
                        <ProfesionalCard
                            key={prof.id}
                            profesional={prof}
                            onEditar={() => handleEditar(prof)}
                            onEliminar={() => handleEliminar(prof.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Modal Agregar/Editar */}
            <AnimatePresence>
                {showModal && (
                    <ModalProfesional
                        formData={formData}
                        setFormData={setFormData}
                        onGuardar={handleGuardar}
                        onCerrar={() => setShowModal(false)}
                        esEdicion={!!editando}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function StatCard({ label, value, subtitle, icon, color }: {
    label: string;
    value: number;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
}) {
    const borderColors: Record<string, string> = {
        blue: 'border-blue-200 bg-blue-50/50',
        orange: 'border-orange-200 bg-orange-50/50',
        green: 'border-green-200 bg-green-50/50',
        purple: 'border-purple-200 bg-purple-50/50',
    };

    return (
        <div className={`rounded-xl border-2 p-5 ${borderColors[color] || 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {label}
                </span>
                {icon}
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
    );
}

function ProfesionalCard({ profesional, onEditar, onEliminar }: {
    profesional: ProfesionalOCI;
    onEditar: () => void;
    onEliminar: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
        >
            {/* Header del profesional */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h4 className="text-lg font-semibold text-gray-900">{profesional.nombre}</h4>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {profesional.cargo}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onEditar}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar profesional"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onEliminar}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar profesional"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Especialidades */}
            <div className="flex gap-2 mb-4">
                {profesional.especialidades.map((esp, idx) => (
                    <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                        {esp}
                    </span>
                ))}
            </div>

            {/* Stats del profesional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-700 uppercase">Capacidad Máxima</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{profesional.capacidadMaxima}</p>
                    <p className="text-xs text-blue-600 mt-1">auditorías simultáneas</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-700 uppercase">Horas Mensuales</span>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{profesional.horasMensuales}</p>
                    <p className="text-xs text-green-600 mt-1">horas disponibles</p>
                </div>
            </div>
        </motion.div>
    );
}

function ModalProfesional({ formData, setFormData, onGuardar, onCerrar, esEdicion }: {
    formData: Partial<ProfesionalOCI>;
    setFormData: (data: Partial<ProfesionalOCI>) => void;
    onGuardar: () => void;
    onCerrar: () => void;
    esEdicion: boolean;
}) {
    const [especialidadInput, setEspecialidadInput] = useState('');

    const agregarEspecialidad = () => {
        if (especialidadInput.trim()) {
            setFormData({
                ...formData,
                especialidades: [...(formData.especialidades || []), especialidadInput.trim()],
            });
            setEspecialidadInput('');
        }
    };

    const eliminarEspecialidad = (idx: number) => {
        setFormData({
            ...formData,
            especialidades: (formData.especialidades || []).filter((_, i) => i !== idx),
        });
    };

    return (
        <>
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCerrar}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {esEdicion ? 'Editar Profesional' : 'Agregar Profesional'}
                                </h3>
                                <p className="text-sm text-gray-500">Complete la información del profesional</p>
                            </div>
                        </div>
                        <button onClick={onCerrar} className="p-2 hover:bg-gray-100 rounded-lg">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre completo *
                            </label>
                            <input
                                type="text"
                                value={formData.nombre || ''}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Nombre del profesional"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cargo *
                            </label>
                            <input
                                type="text"
                                value={formData.cargo || ''}
                                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ej: Jefe de Control Interno"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="correo@esap.edu.co"
                            />
                        </div>

                        {/* Especialidades */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Especialidades
                            </label>
                            <div className="flex gap-2 mb-2 flex-wrap">
                                {(formData.especialidades || []).map((esp, idx) => (
                                    <span key={idx} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                        {esp}
                                        <button onClick={() => eliminarEspecialidad(idx)} className="hover:text-red-600">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={especialidadInput}
                                    onChange={(e) => setEspecialidadInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarEspecialidad())}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Escribir y Enter"
                                />
                                <button
                                    onClick={agregarEspecialidad}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-700"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Capacidad máxima
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={formData.capacidadMaxima || 3}
                                    onChange={(e) => setFormData({ ...formData, capacidadMaxima: parseInt(e.target.value) || 3 })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-400 mt-1">auditorías simultáneas</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Horas mensuales
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={300}
                                    value={formData.horasMensuales || 160}
                                    onChange={(e) => setFormData({ ...formData, horasMensuales: parseInt(e.target.value) || 160 })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-400 mt-1">horas disponibles</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
                        <button
                            onClick={onCerrar}
                            className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onGuardar}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#1e5da8] hover:bg-[#174a85] text-white rounded-xl font-medium transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {esEdicion ? 'Guardar cambios' : 'Agregar profesional'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}

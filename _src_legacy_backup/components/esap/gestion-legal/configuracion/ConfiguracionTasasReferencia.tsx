import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, LayoutGrid, Calendar, Percent, Tag, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface TasaReferencia {
    id: string;
    anio: number;
    mes: number;
    valorTasa: number;
    tipoTasa: 'USURA' | 'DIAN' | 'ESCOLAR';
}

export function ConfiguracionTasasReferencia() {
    const [tasas, setTasas] = useState<TasaReferencia[]>([]);
    const [loading, setLoading] = useState(false);

    // Para el formulario de nueva tasa
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [valorTasa, setValorTasa] = useState('');
    const [tipoTasa, setTipoTasa] = useState<'USURA' | 'DIAN' | 'ESCOLAR'>('USURA');

    // Nombres de los meses para el select
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    useEffect(() => {
        // Aquí cargaríamos las tasas desde el backend (simulación por ahora)
        const mockTasas: TasaReferencia[] = [
            { id: 't-1', anio: 2024, mes: 1, valorTasa: 34.98, tipoTasa: 'USURA' },
            { id: 't-2', anio: 2024, mes: 1, valorTasa: 32.50, tipoTasa: 'DIAN' }
        ];
        setTasas(mockTasas);
    }, []);

    const handleAgregarTasa = async () => {
        if (!valorTasa) {
            toast.error('Debe ingresar un valor para la tasa');
            return;
        }

        const valorNum = parseFloat(valorTasa);
        if (isNaN(valorNum) || valorNum <= 0) {
            toast.error('Ingrese un valor de tasa válido');
            return;
        }

        // Verificar si ya existe una tasa para ese mismo periodo y tipo
        const existe = tasas.find(t => t.anio === anio && t.mes === mes && t.tipoTasa === tipoTasa);
        if (existe) {
            toast.error(`Ya existe una tasa de ${tipoTasa} registrada para este período`);
            return;
        }

        const nuevaTasa: TasaReferencia = {
            id: `tasa-${Date.now()}`,
            anio,
            mes,
            valorTasa: valorNum,
            tipoTasa
        };

        setLoading(true);
        try {
            // Simular llamada al API
            await new Promise(resolve => setTimeout(resolve, 800));
            setTasas([nuevaTasa, ...tasas].sort((a, b) => {
                if (a.anio !== b.anio) return b.anio - a.anio;
                if (a.mes !== b.mes) return b.mes - a.mes;
                return a.tipoTasa.localeCompare(b.tipoTasa);
            }));
            setValorTasa('');
            toast.success('Tasa registrada exitosamente');
        } catch {
            toast.error('Error al guardar la tasa');
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async (id: string) => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            setTasas(tasas.filter(t => t.id !== id));
            toast.success('Tasa eliminada');
        } catch {
            toast.error('Error al eliminar la tasa');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 lg:p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
                        <Activity className="w-6 h-6" style={{ color: '#2E7D32' }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Tasas de Referencia (Intereses)</h2>
                        <p className="text-sm text-gray-600">Configura los valores mensuales utilizados para la liquidación de créditos en procesos coactivos.</p>
                    </div>
                </div>

                <div className="p-4 lg:p-6 space-y-6">
                    {/* Formulario para agregar nueva tasa */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-600" />
                            Registrar Nueva Tasa
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Año</label>
                                <input
                                    type="number"
                                    value={anio}
                                    onChange={e => setAnio(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Mes</label>
                                <select
                                    value={mes}
                                    onChange={e => setMes(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-blue-500"
                                >
                                    {meses.map((nombre, i) => (
                                        <option key={i + 1} value={i + 1}>{nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Tasa</label>
                                <select
                                    value={tipoTasa}
                                    onChange={e => setTipoTasa(e.target.value as any)}
                                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-blue-500"
                                >
                                    <option value="USURA">Tasa de Usura Vigente</option>
                                    <option value="DIAN">Interés DIAN</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Valor (%) E.A.</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Ej: 34.50"
                                        value={valorTasa}
                                        onChange={e => setValorTasa(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-blue-500 pr-8"
                                    />
                                    <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                                </div>
                            </div>
                            <button
                                onClick={handleAgregarTasa}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition"
                            >
                                {loading ? 'Guardando...' : 'Guardar Tasa'}
                            </button>
                        </div>
                    </div>

                    {/* Lista de Tasas Registradas */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            Histórico de Tasas Registradas
                        </h3>

                        {tasas.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 border border-gray-200 border-dashed rounded-lg">
                                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 font-medium text-sm">No hay tasas registradas</p>
                                <p className="text-gray-400 text-xs mt-1">Utilice el formulario superior para registrar la primera tasa.</p>
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-gray-700">Período</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700">Tipo</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700 text-right">Valor Efectivo Anual</th>
                                            <th className="px-4 py-3 font-semibold text-gray-700 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {tasas.map(tasa => (
                                            <tr key={tasa.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {meses[tasa.mes - 1]} {tasa.anio}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${tasa.tipoTasa === 'USURA' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                                                        }`}>
                                                        {tasa.tipoTasa}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-900 text-right">
                                                    {tasa.valorTasa.toFixed(2)}%
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleEliminar(tasa.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                        title="Eliminar tasa"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

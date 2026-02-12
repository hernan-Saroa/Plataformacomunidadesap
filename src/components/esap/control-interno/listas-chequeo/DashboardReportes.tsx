import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Filter,
  Calendar,
  Award,
  AlertTriangle,
} from "lucide-react";
import { useListasChequeo } from "./ListasChequeoContext";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD DE REPORTES Y ESTADÍSTICAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function DashboardReportes() {
  const { plantillas, obtenerListasPorEstado, listasAplicadas } = useListasChequeo();
  const [periodoFiltro, setPeriodoFiltro] = useState<string>("mes");
  console.log('🚀 Listas:', listasAplicadas);

  // Calcular estadísticas
  const listasCompletadas = obtenerListasPorEstado("completada");
  const listasEnProceso = obtenerListasPorEstado("en-proceso");
  const listasBorrador = obtenerListasPorEstado("borrador");

  const totalListas = listasAplicadas.length;
  const tasaCompletadas = totalListas > 0 
    ? Math.round((listasCompletadas.length / totalListas) * 100)
    : 0;

  // Calcular promedio de cumplimiento
  const promediosCumplimiento = listasCompletadas.map((lista) => {
    const respuestas = lista.respuestas;
    const cumple = respuestas.filter(
      (r) => r.respuesta === "cumple" || r.respuesta === "si"
    ).length;
    return respuestas.length > 0 ? (cumple / respuestas.length) * 100 : 0;
  });

  const promedioCumplimiento = promediosCumplimiento.length > 0
    ? Math.round(
        promediosCumplimiento.reduce((a, b) => a + b, 0) /
          promediosCumplimiento.length
      )
    : 0;

  // Plantillas más usadas
  const plantillasUsadas = listasAplicadas.reduce((acc, lista) => {
    acc[lista.plantillaId] = (acc[lista.plantillaId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topPlantillas = Object.entries(plantillasUsadas)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, cantidad]) => {
      const plantilla = plantillas.find((p) => p.id === id);
      return { plantilla, cantidad };
    });

  return (
    <div className="space-y-6">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* HEADER */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#003DA5] to-[#0051D5] flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Dashboard de Reportes
              </h2>
              <p className="text-sm text-slate-600">
                Análisis y métricas de listas de chequeo
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              <select
                value={periodoFiltro}
                onChange={(e) => setPeriodoFiltro(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent text-sm"
              >
                <option value="semana">Última semana</option>
                <option value="mes">Último mes</option>
                <option value="trimestre">Último trimestre</option>
                <option value="año">Último año</option>
                <option value="todo">Todo el tiempo</option>
              </select>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white rounded-lg hover:shadow-md transition-all duration-200">
              <Download className="w-4 h-4" />
              Exportar Reporte
            </button>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MÉTRICAS PRINCIPALES */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Listas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              +12% vs mes anterior
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-1">
            {totalListas}
          </h3>
          <p className="text-sm text-slate-600">Total de Listas</p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-600">
                {listasCompletadas.length} Completadas
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-slate-600">
                {listasEnProceso.length} En proceso
              </span>
            </div>
          </div>
        </div>

        {/* Tasa de Completadas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              Excelente
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-1">
            {tasaCompletadas}%
          </h3>
          <p className="text-sm text-slate-600">Tasa de Completadas</p>
          <div className="mt-4">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                style={{ width: `${tasaCompletadas}%` }}
              />
            </div>
          </div>
        </div>

        {/* Promedio de Cumplimiento */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#E0EDFF] flex items-center justify-center">
              <Award className="w-6 h-6 text-[#003DA5]" />
            </div>
            <span className="text-xs font-medium text-[#003DA5] bg-[#E0EDFF] px-2 py-1 rounded">
              {promedioCumplimiento >= 80 ? "Alto" : promedioCumplimiento >= 60 ? "Medio" : "Bajo"}
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-1">
            {promedioCumplimiento}%
          </h3>
          <p className="text-sm text-slate-600">Promedio de Cumplimiento</p>
          <div className="mt-4">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#003DA5] to-[#0051D5] rounded-full"
                style={{ width: `${promedioCumplimiento}%` }}
              />
            </div>
          </div>
        </div>

        {/* Plantillas Activas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
              Total disponibles
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-1">
            {plantillas.length}
          </h3>
          <p className="text-sm text-slate-600">Plantillas Disponibles</p>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            {plantillas.filter((p) => p.esPlantillaSistema).length} del sistema,{" "}
            {plantillas.filter((p) => !p.esPlantillaSistema).length}{" "}
            personalizadas
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* GRÁFICOS Y ANÁLISIS */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Plantillas Más Usadas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#003DA5]" />
            Top 5 Plantillas Más Usadas
          </h3>
          <div className="space-y-3">
            {topPlantillas.map(({ plantilla, cantidad }, index) => {
              if (!plantilla) return null;
              const porcentaje = totalListas > 0 ? (cantidad / totalListas) * 100 : 0;
              return (
                <div key={plantilla.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-400">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {plantilla.nombre}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#003DA5]">
                      {cantidad} usos
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#003DA5] to-[#0051D5] rounded-full transition-all duration-500"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribución por Estado */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#003DA5]" />
            Distribución por Estado
          </h3>
          <div className="space-y-4">
            {[
              {
                label: "Completadas",
                cantidad: listasCompletadas.length,
                color: "green",
                icon: CheckCircle,
              },
              {
                label: "En Proceso",
                cantidad: listasEnProceso.length,
                color: "orange",
                icon: Clock,
              },
              {
                label: "Borrador",
                cantidad: listasBorrador.length,
                color: "slate",
                icon: FileText,
              },
            ].map((estado) => {
              const porcentaje = totalListas > 0 
                ? (estado.cantidad / totalListas) * 100 
                : 0;
              const Icon = estado.icon;

              return (
                <div key={estado.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-5 h-5 text-${estado.color}-600`}
                        style={{
                          color:
                            estado.color === "green"
                              ? "#16a34a"
                              : estado.color === "orange"
                              ? "#ea580c"
                              : "#64748b",
                        }}
                      />
                      <span className="text-sm font-medium text-slate-900">
                        {estado.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {estado.cantidad}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({porcentaje.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${porcentaje}%`,
                        background:
                          estado.color === "green"
                            ? "linear-gradient(to right, #16a34a, #22c55e)"
                            : estado.color === "orange"
                            ? "linear-gradient(to right, #ea580c, #f97316)"
                            : "linear-gradient(to right, #64748b, #94a3b8)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TABLA DE LISTAS RECIENTES */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#003DA5]" />
          Listas Recientes
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                  Código
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                  Plantilla
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                  Auditoría
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                  Estado
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                  Progreso
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody>
              {listasAplicadas.slice(0, 10).map((lista) => (
                <tr key={lista.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="text-xs font-mono text-[#003DA5] bg-[#E0EDFF] px-2 py-1 rounded">
                      {lista.id}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {lista.plantillaNombre}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {lista.auditoriaCodigo}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        lista.estado === "completada"
                          ? "bg-green-100 text-green-700"
                          : lista.estado === "en-proceso"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {lista.estado === "completada"
                        ? "Completada"
                        : lista.estado === "en-proceso"
                        ? "En Proceso"
                        : "Borrador"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#003DA5] to-[#0051D5] rounded-full"
                          style={{ width: `${lista.progreso}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">
                        {lista.progreso}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {lista.fechaInicio}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ALERTAS Y RECOMENDACIONES */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {listasEnProceso.length > 5 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-2">
                Atención: Listas Pendientes
              </h4>
              <p className="text-sm text-amber-800 mb-3">
                Tienes {listasEnProceso.length} listas en proceso. Considera
                completarlas para mejorar tus indicadores de gestión.
              </p>
              <button className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-all duration-200">
                Ver Listas Pendientes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

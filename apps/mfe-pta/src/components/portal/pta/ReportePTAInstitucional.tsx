import React, { useRef } from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, PieChart, Pie, Legend } from 'recharts';
import { PTA_COLORS } from '../../pta/shared/ptaColors';

interface ReportePTAInstitucionalProps {
  pta: any;
  userPerfil: any;
  onClose: () => void;
  isParcial?: boolean;
  certificadoId?: string;
  signedAt?: string;
}

export function ReportePTAInstitucional({
  pta, userPerfil, onClose, isParcial = true, certificadoId, signedAt
}: ReportePTAInstitucionalProps) {
  const chartRef = useRef(null);

  // Cálculos de horas (similar al dashboard de backoffice)
  const horasDisp = pta.horas_a_programar || 800;
  
  const asignaturas = pta.asignaturas || [];

  // Normaliza desde el DTO plano (o forma agrupada del backoffice como fallback).
  const proyectosInv = (pta?.investigacion_proyecto?.nombre || pta?.investigacion_proyecto?.rol)
    ? [pta.investigacion_proyecto]
    : (pta?.investigacion?.proyectos || []);
  const actInv = pta?.investigacion_actividades || pta?.investigacion?.actividades || [];
  const extActs = Array.isArray(pta?.extension_actividades)
    ? pta.extension_actividades
    : (pta?.extension ? (Object.values(pta.extension).flat() as any[]) : []);
  const compActs = Array.isArray(pta?.complementarias)
    ? pta.complementarias
    : (pta?.complementarias?.actividades || []);
  const acadActs = Array.isArray(pta?.academico_admin)
    ? pta.academico_admin
    : (pta?.acad_admin?.actividades || pta?.academico_administrativo?.actividades || []);

  // Prioriza los agregados ya calculados por el backend (incluyen el multiplicador de sección config-driven).
  const horasDocencia = pta.horas_docencia ?? asignaturas.reduce((sum: number, a: any) => sum + (a.total_horas || a.horas || 0), 0);
  const horasInvestigacion = pta.horas_investigacion ?? (proyectosInv.reduce((s: number, p: any) => s + (p.horas_solicitadas || 0), 0) + actInv.reduce((s: number, a: any) => s + (a.horas_total || a.horas || 0), 0));
  const horasExtension = pta.horas_extension ?? extActs.reduce((s: number, a: any) => s + (a.horas || 0), 0);
  const horasComplementarias = pta.horas_complementarias ?? compActs.reduce((s: number, a: any) => s + (a.horas || 0), 0);
  const horasAcadAdmin = pta.horas_acad_admin ?? acadActs.reduce((s: number, a: any) => s + (a.horas || 0), 0);

  const horasProg = horasDocencia + horasInvestigacion + horasExtension + horasComplementarias + horasAcadAdmin;

  // Calculo %
  const getPct = (val: number) => horasProg > 0 ? ((val / horasProg) * 100).toFixed(0) : '0';

  // Datos para Charts
  const chartData = [
    { name: 'Sede/Territorial', Docencia: horasDocencia, Investigación: horasInvestigacion, Extensión: horasExtension, Complementarias: horasComplementarias, Académico: horasAcadAdmin }
  ];

  const pieData = [
    { name: 'Docencia', value: horasDocencia, color: PTA_COLORS.DOCENCIA },
    { name: 'Investigación', value: horasInvestigacion, color: PTA_COLORS.INVESTIGACION },
    { name: 'Extensión', value: horasExtension, color: PTA_COLORS.EXTENSION },
    { name: 'Complementarias', value: horasComplementarias, color: PTA_COLORS.COMPLEMENTARIAS },
    { name: 'Acad. Admin.', value: horasAcadAdmin, color: PTA_COLORS.ACAD_ADMIN },
  ].filter(d => d.value > 0);

  const handlePrint = () => window.print();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center p-2 bg-gray-900/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white pt-4 md:pt-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-[1200px] mb-20 relative print:shadow-none print:w-full print:max-w-none print:m-0"
        >
          {/* Top floating controls hide on print */}
          <div className="absolute -top-12 right-0 flex gap-2 print:hidden">
            <button onClick={handlePrint} className="bg-white text-gray-800 px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2 hover:bg-gray-100">
              <Printer className="w-4 h-4" /> Exportar / Imprimir
            </button>
            <button onClick={onClose} className="bg-red-500 text-white p-2 rounded-lg shadow hover:bg-red-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="border-[8px] border-[#203764] m-1 print:m-0 print:border-[4px]">
            {/* Header Area */}
            <div className="bg-[#203764] text-white flex items-center p-2 relative h-20">
              <div className="w-16 h-16 bg-white mr-4 flex-shrink-0 flex items-center justify-center rounded p-1">
                 {/* Placeholder for Logo ESAP if we lack the svg */}
                 <div className="grid grid-cols-4 gap-0.5">
                   {Array(10).fill(0).map((_, i) => <div key={i} className="w-2 h-2 bg-[#003DA5] rounded-full"></div>)}
                 </div>
              </div>
              <div className="flex-1 text-center font-bold">
                <div className="text-xl tracking-wide uppercase">PLAN DE TRABAJO ACADÉMICO DOCENTE - PTA</div>
                <div className="text-sm">Escuela Superior de Administración Pública - ESAP</div>
                <div className="text-sm">Grupo de Gestión Profesoral - {pta?.periodo?.split('-')[0] || '2025'}</div>
              </div>
              <div className="absolute right-2 bottom-1 text-[10px] text-gray-300">Versión 08.2025</div>
              {isParcial && (
                <div className="absolute right-2 top-2 px-2 py-0.5 bg-yellow-500 text-black text-xs font-black uppercase rounded shadow-sm opacity-80 border border-yellow-700">
                  Informe Parcial
                </div>
              )}
            </div>

            {/* IDENTIFICACION DOCENTE */}
            <div className="bg-[#5B9BD5] text-white text-center font-bold py-1 border-b-[3px] border-[#203764] uppercase text-sm">
              IDENTIFICACIÓN DOCENTE
            </div>

            {/* Grid de Identificacion */}
            <div className="grid grid-cols-[1fr_2fr_3fr_1fr_1fr_1fr_1fr_2fr_2fr_1.5fr] text-[10px] text-center border-b-[3px] border-[#203764]">
              {/* Encabezados Fila 1 */}
              {['Número de Cédula', 'Nombre', 'Perfil Académico', 'Categoría', 'Sede Territorial', 'Situación Adm.', 'Última Eval.', 'Correo Inst.', 'Correo Personal', 'Num Celular'].map((h, i) => (
                 <div key={i} className="bg-[#D9E1F2] text-black font-bold p-1 border-r border-b border-black flex items-center justify-center">{h}</div>
              ))}
              {/* Valores Fila 1 */}
              {[
                userPerfil?.identificacion || '12345678',
                userPerfil?.nombre || 'Docente ESAP',
                'Magíster en Administración, Especialista', // Hardcoded fallback for layout
                userPerfil?.escalafon || 'Auxiliar',
                userPerfil?.territorial || 'Sede Central',
                'No Aplica', // fallback
                'Excelente 2025-1', // fallback
                userPerfil?.email || 'docente@esap.edu.co',
                'personal@gmail.com',
                userPerfil?.telefono || '3000000000'
              ].map((v, i) => (
                 <div key={i} className="bg-white text-black p-1 border-r border-black font-semibold flex items-center justify-center">{v}</div>
              ))}
            </div>

            {/* Grid Fila 2 (Vinculacion) */}
            <div className="grid grid-cols-[1.5fr_1.5fr_4fr_3fr_1fr_1fr_1.5fr_1.5fr_1fr] text-[10px] text-center border-b-[6px] border-[#203764]">
              {/* Encabezados Fila 2 */}
              {['Tipo Vinculación', 'Dedicación', 'Núcleo Temático', 'Acto Administ.', 'Inicio Vinc.', 'Fin Vinc.', 'Inicio Periodo', 'Fin Periodo', 'Total Horas'].map((h, i) => (
                 <div key={i} className="bg-[#D9E1F2] text-black font-bold p-1 border-r border-b border-black flex items-center justify-center">{h}</div>
              ))}
              {/* Valores Fila 2 */}
              <div className="bg-white font-semibold flex justify-center items-center p-1 border-r border-black">{userPerfil?.tipoVinculacion || 'Ocasional'}</div>
              <div className="bg-white font-semibold flex justify-center items-center p-1 border-r border-black">{userPerfil?.dedicacion || 'Tiempo Completo'}</div>
              <div className="bg-white font-semibold flex justify-center items-center p-1 border-r border-black leading-tight">Labores docencia y demás actividades de docentes de TC establecidas en Estatuto Profesoral</div>
              <div className="bg-white font-semibold flex justify-center items-center p-1 border-r border-black">Resolución DT-123-2025</div>
              <div className="bg-white font-semibold flex justify-center items-center p-1 border-r border-black">#REF!</div>
              <div className="bg-white font-semibold flex justify-center items-center p-1 border-r border-black">#REF!</div>
              <div className="bg-white font-semibold flex justify-center items-center p-1 border-r border-black">1 Julio 2025</div>
              <div className="bg-white font-semibold flex justify-center items-center p-1 border-r border-black">31 Dic 2025</div>
              <div className="bg-[#F2F2F2] font-black text-lg flex justify-center items-center p-1 border-black text-[#C00000]">{horasDisp}</div>
            </div>

            {/* Título PTA PERIODO */}
            <div className="bg-[#5B9BD5] text-white text-center font-bold py-1 border-b-[3px] border-[#203764] uppercase text-sm">
              PLAN DE TRABAJO ACADÉMICO - PTA <br />
              PERIODO {pta?.periodo || '2025-2'}
            </div>

            {/* BOTONES 3D DE COMPONENTES */}
            <div className="bg-white py-6 px-4 border-b-[6px] border-[#203764] flex justify-between items-center relative overflow-hidden">
                {/* Decoration background lines */}
                <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px), linear-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                
                {[
                  { label: "DOCENCIA", color: PTA_COLORS.DOCENCIA },
                  { label: "INVESTIGACIÓN", color: PTA_COLORS.INVESTIGACION },
                  { label: "EXTENSIÓN\nACADÉMICA", color: PTA_COLORS.EXTENSION },
                  { label: "ACTIVIDADES\nCOMPLEMENTARIAS", color: PTA_COLORS.COMPLEMENTARIAS },
                  { label: "ACADÉMICO-ADMIN\nISTRATIVAS", color: PTA_COLORS.ACAD_ADMIN }
                ].map((btn, i) => (
                   <div key={i} className="flex-1 px-2 relative z-10">
                      <div 
                        className="w-full h-24 xl:h-28 text-white font-bold text-xs xl:text-sm flex items-center justify-center text-center px-2 cursor-default whitespace-pre-wrap leading-snug border border-black/10"
                        style={{ 
                          backgroundColor: btn.color,
                          boxShadow: `inset 4px 4px 8px rgba(255,255,255,0.3), inset -4px -4px 8px rgba(0,0,0,0.2), 6px 6px 0px rgba(0,0,0,0.15)`
                        }}
                      >
                         {btn.label}
                      </div>
                   </div>
                ))}
            </div>

            {/* RESUMEN PLAN DE TRABAJO */}
            <div className="bg-[#5B9BD5] text-white text-center font-bold py-1 border-b-[3px] border-[#203764] uppercase text-[12px]">
              RESUMEN PLAN DE TRABAJO
            </div>

            <div className="grid grid-cols-[1fr_2.5fr_1fr_2.5fr_1fr_2.5fr_1fr_2.5fr_1fr_2.5fr] border-b-[6px] border-[#203764]">
               {[
                 { label: 'CARGA EN DOCENCIA', pct: getPct(horasDocencia), val: horasDocencia },
                 { label: 'CARGA EN INVESTIGACIÓN', pct: getPct(horasInvestigacion), val: horasInvestigacion },
                 { label: 'CARGA EN EXTENSIÓN ACADÉMICA', pct: getPct(horasExtension), val: horasExtension },
                 { label: 'CARGA EN ACTIVIDADES COMPLEMENTARIAS', pct: getPct(horasComplementarias), val: horasComplementarias },
                 { label: 'CARGA EN ACADÉMICO-ADMIN.', pct: getPct(horasAcadAdmin), val: horasAcadAdmin }
               ].map((c, i) => (
                  <React.Fragment key={i}>
                     <div className="col-span-1 border-r border-[#203764]">
                        <div className="flex flex-col text-[7px] xl:text-[8px] font-bold text-center h-full">
                           <div className="flex-1 flex items-center justify-center border-b border-[#203764] p-1 uppercase leading-tight bg-white">{c.label}</div>
                        </div>
                     </div>
                     <div className="col-span-1 border-r border-[#203764]">
                        <div className="flex text-[8px] font-bold text-center h-full bg-white">
                           <div className="flex-1 border-r border-[#203764] flex flex-col">
                              <span className="border-b border-[#203764] py-1 bg-[#D9E1F2]">PORCENTAJE</span>
                              <span className="flex-1 items-center flex justify-center text-base">{c.pct}%</span>
                           </div>
                           <div className="flex-1 flex flex-col">
                              <span className="border-b border-[#203764] py-1 bg-[#D9E1F2]">TOTAL HORAS</span>
                              <span className="flex-1 items-center flex justify-center text-base">{c.val}</span>
                           </div>
                        </div>
                     </div>
                  </React.Fragment>
               ))}
            </div>

            {/* GRÁFICOS */}
            <div className="flex h-72 border-b-[6px] border-[#203764] bg-white p-2">
               {/* Left Chart (Bar) */}
               <div className="w-[60%] border border-gray-300 mr-2 flex flex-col relative px-2 pb-4 pt-2">
                  <div className="text-center font-bold text-xs uppercase mb-2">TOTAL PLAN DE TRABAJO ACADÉMICO POR SEDE TERRITORIAL Y ACTIVIDAD</div>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{fontSize: 9}} />
                        <YAxis tick={{fontSize: 9}} />
                        <RechartsTooltip />
                        <Legend wrapperStyle={{fontSize: "10px", marginTop: "-10px"}} />
                        <Bar dataKey="Docencia" stackId="a" fill={PTA_COLORS.DOCENCIA} />
                        <Bar dataKey="Investigación" stackId="a" fill={PTA_COLORS.INVESTIGACION} />
                        <Bar dataKey="Extensión" stackId="a" fill={PTA_COLORS.EXTENSION} />
                        <Bar dataKey="Complementarias" stackId="a" fill={PTA_COLORS.COMPLEMENTARIAS} />
                        <Bar dataKey="Académico" stackId="a" fill={PTA_COLORS.ACAD_ADMIN} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               
               {/* Right Chart (Pie) */}
               <div className="w-[40%] border border-gray-300 flex flex-col relative p-2">
                 <div className="text-center font-bold text-sm uppercase mb-0 text-gray-600">Distribución Plan de Trabajo <br/><span className="text-[10px]">por tipo de carga</span></div>
                 <div className="flex-1">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={1}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                            labelLine={false}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-pink-500/50 bg-[#FFE5E5] font-bold text-2xl uppercase opacity-20">
                        SIN DATOS
                      </div>
                    )}
                 </div>
               </div>
            </div>

            {/* FLUJO DE APROBACION */}
            <div className="bg-[#5B9BD5] text-white text-center font-bold py-1 border-b-[3px] border-[#203764] uppercase text-sm">
              FLUJO DE APROBACIÓN
            </div>

            <div className="flex bg-white">
               {/* Tabla de Aprobadores */}
               <div className="flex-[2] border-r-[6px] border-[#203764]">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-white border-b-2 border-black text-[9px] font-bold">
                         <th className="p-1 border-r border-black w-20"></th>
                         <th className="p-1 border-r border-black w-32"></th>
                         <th className="p-1 border-r border-black">HORAS APROBADAS</th>
                         <th className="p-1 border-r border-black bg-[#FCE4D6]">HORAS PROGRAMADAS</th>
                         <th className="p-1 border-r border-black bg-[#FCE4D6]">HORAS PENDIENTES DE APROBACIÓN</th>
                         <th className="p-1">% PORCENTAJE DE APROBACIÓN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* DOCENTE */}
                      {[
                        { title: 'DOCENTE', pct: '100%', rows: [
                          { label: 'DOCENCIA', apr: horasDocencia, prog: horasDocencia, pend: 0, pct: '100%', color: PTA_COLORS.DOCENCIA },
                          { label: 'INVESTIGACIÓN', apr: horasInvestigacion, prog: horasInvestigacion, pend: 0, pct: '100%', color: PTA_COLORS.INVESTIGACION },
                          { label: 'EXTENSIÓN', apr: horasExtension, prog: horasExtension, pend: 0, pct: '100%', color: PTA_COLORS.EXTENSION },
                          { label: 'COMPLEMENTARIAS', apr: horasComplementarias, prog: horasComplementarias, pend: 0, pct: '100%', color: PTA_COLORS.COMPLEMENTARIAS },
                          { label: 'ACAD. ADMIN.', apr: horasAcadAdmin, prog: horasAcadAdmin, pend: 0, pct: '100%', color: PTA_COLORS.ACAD_ADMIN }
                        ], totalApr: horasProg, totalProg: horasProg, totalPend: 0, totalColor: '#D9E1F2' },
                        
                        /* RESPONSABLE DE AREA */
                        { title: 'RESPONSABLE\nDE ÁREA', pct: '0%', rows: [
                          { label: 'DOCENCIA', apr: 0, prog: horasDocencia, pend: horasDocencia, pct: '0%', color: PTA_COLORS.DOCENCIA },
                          { label: 'INVESTIGACIÓN', apr: 0, prog: horasInvestigacion, pend: horasInvestigacion, pct: '0%', color: PTA_COLORS.INVESTIGACION },
                          { label: 'EXTENSIÓN', apr: 0, prog: horasExtension, pend: horasExtension, pct: '0%', color: PTA_COLORS.EXTENSION },
                          { label: 'COMPLEMENTARIAS', apr: 0, prog: horasComplementarias, pend: horasComplementarias, pct: '0%', color: PTA_COLORS.COMPLEMENTARIAS },
                          { label: 'ACAD. ADMIN.', apr: 0, prog: horasAcadAdmin, pend: horasAcadAdmin, pct: '0%', color: PTA_COLORS.ACAD_ADMIN }
                        ], totalApr: 0, totalProg: horasProg, totalPend: horasProg, totalColor: '#E2EFDA' },

                        /* JEFE INMEDIATO */
                        { title: 'JEFE\nINMEDIATO', pct: '0%', rows: [
                          { label: 'DOCENCIA', apr: 0, prog: horasDocencia, pend: horasDocencia, pct: '0%', color: PTA_COLORS.DOCENCIA },
                          { label: 'INVESTIGACIÓN', apr: 0, prog: horasInvestigacion, pend: horasInvestigacion, pct: '0%', color: PTA_COLORS.INVESTIGACION },
                          { label: 'EXTENSIÓN', apr: 0, prog: horasExtension, pend: horasExtension, pct: '0%', color: PTA_COLORS.EXTENSION },
                          { label: 'COMPLEMENTARIAS', apr: 0, prog: horasComplementarias, pend: horasComplementarias, pct: '0%', color: PTA_COLORS.COMPLEMENTARIAS },
                          { label: 'ACAD. ADMIN.', apr: 0, prog: horasAcadAdmin, pend: horasAcadAdmin, pct: '0%', color: PTA_COLORS.ACAD_ADMIN }
                        ], totalApr: 0, totalProg: horasProg, totalPend: horasProg, totalColor: '#DDEBF7' },
                      ].map((section, sidx) => (
                        <React.Fragment key={sidx}>
                           {section.rows.map((r, ridx) => (
                             <tr key={`${sidx}-${ridx}`} className="text-[9px]">
                                {ridx === 0 && (
                                   <td rowSpan={5} className="border-r border-b border-black font-bold whitespace-pre-line p-1" style={{backgroundColor: section.totalColor}}>
                                     <div>{section.title}</div>
                                     <div className="text-sm mt-1">{section.pct}</div>
                                   </td>
                                )}
                                <td className="border-r border-b border-black text-left px-1 py-0.5" style={{borderLeft: `3px solid ${r.color}`}}>{r.label}</td>
                                <td className="border-r border-b border-black font-semibold text-gray-600" style={{backgroundColor: section.totalColor}}>{r.apr}</td>
                                <td className="border-r border-b border-black font-semibold bg-[#FCE4D6] text-gray-600">{r.prog}</td>
                                <td className="border-r border-b border-black font-semibold bg-[#FCE4D6] text-gray-600">{r.pend}</td>
                                <td className="border-b border-black" style={{backgroundColor: section.totalColor}}>{r.pct}</td>
                             </tr>
                           ))}
                           <tr className="text-[10px] font-bold border-b border-black text-black">
                              <td className="border-r border-black bg-gray-100 p-0.5">TOTAL</td>
                              <td className="border-r border-black" style={{backgroundColor: section.totalColor}}>{section.totalApr}</td>
                              <td className="border-r border-black bg-[#FCE4D6]">{section.totalProg}</td>
                              <td className="border-r border-black bg-[#FCE4D6]">{section.totalPend}</td>
                              <td style={{backgroundColor: section.totalColor}}></td>
                           </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
               </div>
               
               {/* Sección de Firma Lateral */}
               <div className="flex-1 flex flex-col p-4 relative bg-white min-h-[300px] justify-center items-center">
                  <div className="absolute top-2 left-4 text-xs font-bold text-gray-600 uppercase border-b border-gray-300 w-[90%] pb-1">
                    PORCENTAJE DE APROBACIÓN DEL PTA
                  </div>
                  
                  {isParcial ? (
                     <div className="text-center opacity-30 mt-6 relative z-10 w-full px-6 flex flex-col items-center">
                         <div className="text-2xl font-black mb-2 opacity-60">¡INFORME PARCIAL!</div>
                         <div className="text-xl font-bold uppercase mb-12">Añade una firma para empezar a avalar tus datos</div>
                         <div className="w-24 h-24 border-[4px] border-blue-800 rounded-lg opacity-40"> {/* Simulates House Graphic */}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-blue-800 p-2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                         </div>
                     </div>
                  ) : (
                     <div className="mt-8 flex flex-col items-center text-center">
                         <div className="mb-4">
                           <ShieldCheck className="w-16 h-16 text-emerald-600 mb-2 mx-auto" />
                           <div className="text-lg font-black text-emerald-700 uppercase">DOCUMENTO FIRMADO</div>
                         </div>
                         <div className="bg-gray-50 border border-gray-200 p-4 rounded text-xs text-left w-full shadow-inner">
                            <p className="font-bold text-gray-800 mb-1">CERTIFICADO DIGITAL DE APROBACIÓN</p>
                            <p className="font-mono bg-gray-200 p-1 mb-2 break-all">{certificadoId || 'CERT-N/A'}</p>
                            <p className="text-gray-500">
                               <strong>Fecha de Firma:</strong> {signedAt ? new Date(signedAt).toLocaleString() : 'N/A'}<br/>
                               <strong>Firmante Autenticado:</strong> {userPerfil?.nombre}<br/>
                               El documento ha surtido efecto y ha sido anclado al expediente.
                            </p>
                         </div>
                     </div>
                  )}
               </div>
            </div>

            {/* Bottom Final Row */}
            <div className="flex text-xs font-bold bg-black text-white p-1 pb-0 relative mb-[1px]">
               <div className="px-2">REVISIÓN GRUPO DE GESTIÓN PROFESORAL</div>
               <div className="flex-1 border-l border-gray-600 px-2 flex">
                  <div className="w-32">FECHA REVISIÓN<br/><span className="font-normal text-[10px]">30/6/2025</span></div>
                  <div className="flex-1 text-center">RESPONSABLE REVISIÓN<br/><span className="font-normal text-[10px] text-gray-300">Arley Carvajal V</span></div>
               </div>
               <div className="w-32 border-l border-gray-600 px-2 text-center text-[10px] flex items-center justify-center">
                  APRUEBA
               </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

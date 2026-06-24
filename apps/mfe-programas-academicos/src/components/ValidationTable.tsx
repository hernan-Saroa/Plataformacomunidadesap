import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2, GraduationCap, Building, BookOpen } from 'lucide-react';
import { Card, Badge } from '@esap-mfe/shared-ui';

interface ValidationTableProps {
  relaciones: any[];
}

export function ValidationTable({ relaciones }: ValidationTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (code: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  if (!relaciones || relaciones.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden border border-gray-200">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#003DA5]" />
          Relaciones y Validaciones
        </h3>
        <Badge className="bg-blue-100 text-[#003DA5] font-bold">
          {relaciones.length} Programas Ofertados
        </Badge>
      </div>

      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {relaciones.map((rel) => {
          const isExpanded = !!expandedRows[rel.codigo_programa];
          
          return (
            <div key={rel.codigo_programa} className={`transition-colors ${!rel.valido ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
              <div 
                onClick={() => toggleRow(rel.codigo_programa)}
                className="p-4 flex items-center gap-4 cursor-pointer"
              >
                <div className="text-gray-400">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900">{rel.codigo_programa}</span>
                    <span className="text-sm font-bold text-gray-600">- {rel.nombre_programa}</span>
                    
                    {!rel.valido ? (
                      <Badge className="bg-red-100 text-red-700 ml-auto border border-red-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Con Errores
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 ml-auto border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Válido
                      </Badge>
                    )}
                  </div>
                  
                  {/* Warning summary if any */}
                  {!rel.valido && rel.errores?.length > 0 && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      {rel.errores[0]} {rel.errores.length > 1 && ` (+${rel.errores.length - 1} más)`}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-12 pb-4 pt-2 border-t border-dashed border-gray-200 bg-gray-50/50">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Asignaturas Column */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-3">
                        <BookOpen className="w-3.5 h-3.5" />
                        Asignaturas Asociadas ({rel.asignaturas?.length || 0})
                      </h4>
                      {rel.asignaturas?.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {rel.asignaturas.map((a: any, i: number) => (
                            <div key={i} className="text-xs flex gap-2 justify-between p-2 bg-white rounded border border-gray-100 shadow-sm">
                              <span className="font-semibold text-gray-700 truncate" title={a.nombre}>{a.nombre}</span>
                              <span className="text-gray-400 shrink-0">{a.codigo}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-red-500 p-2 bg-red-50 rounded border border-red-100">
                          Sin asignaturas asociadas
                        </div>
                      )}
                    </div>

                    {/* CETAPs Column */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-3">
                        <Building className="w-3.5 h-3.5" />
                        Oferta Territorial ({rel.cetaps?.length || 0})
                      </h4>
                      {rel.cetaps?.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {rel.cetaps.map((c: any, i: number) => (
                            <div key={i} className="text-xs flex gap-2 justify-between p-2 bg-white rounded border border-gray-100 shadow-sm">
                              <span className="font-semibold text-gray-700 truncate" title={c.nombre_dt}>{c.nombre_dt}</span>
                              <span className="text-gray-400 shrink-0">{c.codigo}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-red-500 p-2 bg-red-50 rounded border border-red-100">
                          Sin oferta territorial en matriz
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Detailed Errors List */}
                  {!rel.valido && rel.errores?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-red-100">
                      <h4 className="text-xs font-bold text-red-800 uppercase mb-2">Detalle de Errores:</h4>
                      <ul className="list-disc pl-4 text-xs text-red-700 space-y-1">
                        {rel.errores.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

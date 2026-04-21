                          {/* Seguimiento - Tareas interactivas (desde tareas_seguimiento BD) */}
                          {(actividad.tareasSeguimiento || []).length > 0 && (
                            <div className="bg-white rounded-lg border-2 border-green-200 p-4">
                              <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                                ✅ Tareas de seguimiento
                                <span className="text-xs text-gray-500 font-normal">
                                  ({(actividad.tareasSeguimiento || []).filter((e: any) => e.completada).length}/{(actividad.tareasSeguimiento || []).length} completadas)
                                </span>
                              </label>

                              {/* Lista de tareas */}
                              <div className="space-y-3 mt-3">
                                {(actividad.tareasSeguimiento || []).map((tarea: any) => {
                                  const avance = tarea.avance ?? (tarea.completada ? 100 : 0);
                                  const vencida = tarea.fechaEntrega && new Date(tarea.fechaEntrega) < new Date() && !tarea.completada;
                                  return (
                                  <div key={tarea.id} className={`rounded-lg border transition-all overflow-hidden ${
                                    tarea.completada ? 'bg-green-50 border-green-200' : vencida ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                  }`}>
                                    {/* Barra de progreso visual */}
                                    <div className="h-1 bg-gray-200 relative">
                                      <div className={`h-full transition-all ${avance >= 100 ? 'bg-green-500' : avance >= 50 ? 'bg-blue-500' : avance > 0 ? 'bg-amber-500' : 'bg-gray-300'}`} style={{ width: `${Math.min(avance, 100)}%` }} />
                                    </div>

                                    <div className="p-3 space-y-2">
                                      {/* Fila 1: checkbox + descripción + badges */}
                                      <div className="flex items-start gap-3">
                                        <button
                                          onClick={async () => {
                                            const nuevasTareas = (actividad.tareasSeguimiento || []).map((e: any) =>
                                              e.id === tarea.id ? { ...e, completada: !e.completada, avance: !e.completada ? 100 : e.avance, fechaCompletado: !e.completada ? new Date().toISOString() : undefined } : e
                                            );
                                            try {
                                              await actividadesApi.update(String(actividad.id), { tareas_seguimiento: nuevasTareas });
                                              const nuevoRoles = plan.roles.map(r => ({
                                                ...r,
                                                actividades: r.actividades.map(a =>
                                                  a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                                )
                                              }));
                                              onActualizar({ ...plan, roles: nuevoRoles });
                                              toast.success('Tarea actualizada');
                                            } catch (error) {
                                              console.error('Error al actualizar tarea:', error);
                                              toast.error('Error al actualizar la tarea');
                                            }
                                          }}
                                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                            tarea.completada ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white hover:border-blue-400'
                                          }`}
                                        >
                                          {tarea.completada && (
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium ${tarea.completada ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                            {tarea.texto}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {tarea.fechaCompletado && (
                                              <span className="text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">✓ {new Date(tarea.fechaCompletado).toLocaleDateString()}</span>
                                            )}
                                            {tarea.fechaEntrega && (
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${vencida ? 'bg-red-100 text-red-700 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
                                                📅 {vencida ? '⚠ Vencida: ' : 'Entrega: '}{new Date(tarea.fechaEntrega).toLocaleDateString()}
                                              </span>
                                            )}
                                            {tarea.requiereObservaciones && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">📝 Obs.</span>}
                                            {tarea.requiereAdjuntos && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">📎 Adj.</span>}
                                            <span className="text-[10px] text-gray-500">Por: {tarea.registradoPor}</span>
                                          </div>
                                        </div>
                                        {/* Badge de avance */}
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                          avance >= 100 ? 'bg-green-100 text-green-700' : avance >= 50 ? 'bg-blue-100 text-blue-700' : avance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                          {avance}%
                                        </span>
                                      </div>

                                      {/* Fila 2: Slider de avance */}
                                      {!tarea.completada && (
                                        <div className="flex items-center gap-2 pl-8">
                                          <span className="text-[10px] text-gray-500 w-10">Avance:</span>
                                          <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={5}
                                            value={avance}
                                            onChange={async (e) => {
                                              const nuevoAvance = Number(e.target.value);
                                              const nuevasTareas = (actividad.tareasSeguimiento || []).map((t: any) =>
                                                t.id === tarea.id ? { ...t, avance: nuevoAvance, completada: nuevoAvance >= 100, fechaCompletado: nuevoAvance >= 100 ? new Date().toISOString() : t.fechaCompletado } : t
                                              );
                                              try {
                                                await actividadesApi.update(String(actividad.id), { tareas_seguimiento: nuevasTareas });
                                                const nuevoRoles = plan.roles.map(r => ({
                                                  ...r,
                                                  actividades: r.actividades.map(a =>
                                                    a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                                  )
                                                }));
                                                onActualizar({ ...plan, roles: nuevoRoles });
                                              } catch (error) {
                                                console.error('Error avance:', error);
                                              }
                                            }}
                                            className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
                                          />
                                          <span className="text-[10px] font-bold text-gray-700 w-8 text-right">{avance}%</span>
                                        </div>
                                      )}

                                      {/* Fila 3: Observaciones si es requerido */}
                                      {tarea.requiereObservaciones && !tarea.completada && (
                                        <div className="pl-8">
                                          <textarea
                                            placeholder="Escribir observaciones de la tarea..."
                                            value={tarea.observaciones || ''}
                                            onChange={async (e) => {
                                              const nuevasTareas = (actividad.tareasSeguimiento || []).map((t: any) =>
                                                t.id === tarea.id ? { ...t, observaciones: e.target.value } : t
                                              );
                                              const nuevoRoles = plan.roles.map(r => ({
                                                ...r,
                                                actividades: r.actividades.map(a =>
                                                  a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                                )
                                              }));
                                              onActualizar({ ...plan, roles: nuevoRoles });
                                            }}
                                            onBlur={async () => {
                                              try {
                                                await actividadesApi.update(String(actividad.id), { tareas_seguimiento: actividad.tareasSeguimiento });
                                              } catch (_) {}
                                            }}
                                            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none resize-none"
                                            rows={2}
                                          />
                                        </div>
                                      )}

                                      {/* Fila 4: Evidencias aceptadas / Evaluación del Jefe */}
                                      {tarea.completada && (
                                        <div className="pl-8 flex items-center gap-2 flex-wrap">
                                          {tarea.evaluada ? (
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tarea.aceptada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {tarea.aceptada ? '✅ Evidencia aceptada' : '❌ Evidencia rechazada'}
                                            </span>
                                          ) : (
                                            <>
                                              <button
                                                onClick={async () => {
                                                  const nuevasTareas = (actividad.tareasSeguimiento || []).map((t: any) =>
                                                    t.id === tarea.id ? { ...t, evaluada: true, aceptada: true, fechaEvaluacion: new Date().toISOString() } : t
                                                  );
                                                  try {
                                                    await actividadesApi.update(String(actividad.id), { tareas_seguimiento: nuevasTareas });
                                                    const nuevoRoles = plan.roles.map(r => ({
                                                      ...r,
                                                      actividades: r.actividades.map(a =>
                                                        a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                                      )
                                                    }));
                                                    onActualizar({ ...plan, roles: nuevoRoles });
                                                    toast.success('Tarea aceptada');
                                                  } catch (error) {
                                                    toast.error('Error al evaluar');
                                                  }
                                                }}
                                                className="text-[10px] font-semibold px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
                                              >
                                                ✓ Aceptar
                                              </button>
                                              <button
                                                onClick={async () => {
                                                  const nuevasTareas = (actividad.tareasSeguimiento || []).map((t: any) =>
                                                    t.id === tarea.id ? { ...t, evaluada: true, aceptada: false, completada: false, avance: 0, fechaEvaluacion: new Date().toISOString() } : t
                                                  );
                                                  try {
                                                    await actividadesApi.update(String(actividad.id), { tareas_seguimiento: nuevasTareas });
                                                    const nuevoRoles = plan.roles.map(r => ({
                                                      ...r,
                                                      actividades: r.actividades.map(a =>
                                                        a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                                      )
                                                    }));
                                                    onActualizar({ ...plan, roles: nuevoRoles });
                                                    toast.info('Tarea devuelta para corrección');
                                                  } catch (error) {
                                                    toast.error('Error al evaluar');
                                                  }
                                                }}
                                                className="text-[10px] font-semibold px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
                                              >
                                                ✕ Rechazar
                                              </button>
                                              <span className="text-[10px] text-gray-400 italic">Pendiente de evaluación</span>
                                            </>
                                          )}
                                          {tarea.fechaEvaluacion && (
                                            <span className="text-[10px] text-gray-500">Evaluada: {new Date(tarea.fechaEvaluacion).toLocaleDateString()}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}


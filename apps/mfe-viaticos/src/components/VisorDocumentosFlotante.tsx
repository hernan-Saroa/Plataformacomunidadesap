import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  ExternalLink,
  X,
  Maximize2,
  Minimize2,
  GripHorizontal,
  Layers,
  Image as ImageIcon,
  PanelLeft,
  PanelRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { esPdfMime } from '../utils/viaticosUtils';

export interface DocumentoVisualizar {
  id?: string;
  url: string;
  nombre: string;
  tipo?: string;
  mime?: string;
}

interface VentanaProps {
  doc: DocumentoVisualizar;
  index: number;
  totalVentanas: number;
  zIndex: number;
  esActiva: boolean;
  onFocus: (id: string) => void;
  onCerrar: (id: string) => void;
}

type SnapMode = 'none' | 'left' | 'right' | 'maximized';
type ResizeDirection = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 's' | 'n';

function VentanaDocumentoFlotante({
  doc,
  index,
  totalVentanas,
  zIndex,
  esActiva,
  onFocus,
  onCerrar,
}: VentanaProps) {
  const docId = doc.id || doc.url;
  const [snapMode, setSnapMode] = useState<SnapMode>('none');
  const [snapCandidate, setSnapCandidate] = useState<'left' | 'right' | 'top' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);

  // Dimensiones base libres
  const calcularDimensionesIniciales = useCallback(() => {
    if (typeof window === 'undefined') return { width: 840, height: 680 };
    return {
      width: Math.min(880, Math.max(500, Math.round(window.innerWidth * 0.58))),
      height: Math.min(860, Math.max(560, Math.round(window.innerHeight * 0.82))),
    };
  }, []);

  const [dimensiones, setDimensiones] = useState<{ width: number; height: number }>(calcularDimensionesIniciales);
  const dimensionesRef = useRef(dimensiones);
  dimensionesRef.current = dimensiones;

  // Calcular posición inicial escalonada
  const calcularPosicionInicial = useCallback(() => {
    if (typeof window === 'undefined') return { x: 40, y: 50 };
    const baseW = Math.min(880, Math.max(500, Math.round(window.innerWidth * 0.58)));
    const baseLeft = Math.max(16, (window.innerWidth - baseW) / 2);
    const offsetX = (index % 6) * 40;
    const offsetY = (index % 6) * 40;
    const x = Math.min(Math.max(10, window.innerWidth - 320), baseLeft + offsetX);
    const y = Math.min(Math.max(10, window.innerHeight - 300), 40 + offsetY);
    return { x, y };
  }, [index]);

  const [posicion, setPosicion] = useState<{ x: number; y: number }>(calcularPosicionInicial);
  const posicionRef = useRef(posicion);
  posicionRef.current = posicion;

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
  });

  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startW: number;
    startH: number;
    startX: number;
    startY: number;
    direction: ResizeDirection;
  }>({ mouseX: 0, mouseY: 0, startW: 0, startH: 0, startX: 0, startY: 0, direction: 'se' });

  // Iniciar arrastre
  const iniciarArrastre = (clientX: number, clientY: number) => {
    onFocus(docId);
    let startX = posicionRef.current.x;
    let startY = posicionRef.current.y;

    // Si estaba acoplado (snap) y el usuario vuelve a arrastrar, desacoplar y centrar en el cursor
    if (snapMode !== 'none') {
      const normalW = dimensionesRef.current.width;
      startX = Math.max(10, Math.min(window.innerWidth - normalW - 10, clientX - normalW / 2));
      startY = Math.max(10, Math.min(window.innerHeight - 300, clientY - 20));
      setPosicion({ x: startX, y: startY });
      setSnapMode('none');
    }

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX: startX,
      posY: startY,
    };
    setIsDragging(true);
  };

  // Mover arrastre con detección magnética de límites de pantalla
  const moverArrastre = (clientX: number, clientY: number) => {
    const SNAP_THRESHOLD = 50; // píxeles de detección en bordes

    if (clientX <= SNAP_THRESHOLD) {
      setSnapCandidate('left');
    } else if (clientX >= window.innerWidth - SNAP_THRESHOLD) {
      setSnapCandidate('right');
    } else if (clientY <= 25) {
      setSnapCandidate('top');
    } else {
      setSnapCandidate(null);
    }

    const dx = clientX - dragStartRef.current.mouseX;
    const dy = clientY - dragStartRef.current.mouseY;
    const nuevoX = Math.max(-100, Math.min(window.innerWidth - 80, dragStartRef.current.posX + dx));
    const nuevoY = Math.max(0, Math.min(window.innerHeight - 60, dragStartRef.current.posY + dy));
    setPosicion({ x: nuevoX, y: nuevoY });
  };

  const terminarArrastre = () => {
    setIsDragging(false);
    if (snapCandidate === 'left') {
      setSnapMode('left');
    } else if (snapCandidate === 'right') {
      setSnapMode('right');
    } else if (snapCandidate === 'top') {
      setSnapMode('maximized');
    }
    setSnapCandidate(null);
  };

  // Handlers para encabezado
  const handlePointerDownHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op
    }

    iniciarArrastre(e.clientX, e.clientY);
  };

  const handlePointerMoveHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    moverArrastre(e.clientX, e.clientY);
  };

  const handlePointerUpHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // no-op
    }
    terminarArrastre();
  };

  // Listener global de respaldo
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      moverArrastre(e.clientX, e.clientY);
    };

    const handleWindowPointerUp = () => {
      terminarArrastre();
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [isDragging, snapCandidate]);

  // ================= Resize Handlers (Estilo Ventanas Windows) =================
  const handleResizePointerDown = (e: React.PointerEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus(docId);
    if (snapMode !== 'none') {
      setSnapMode('none');
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op
    }

    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startW: dimensionesRef.current.width,
      startH: dimensionesRef.current.height,
      startX: posicionRef.current.x,
      startY: posicionRef.current.y,
      direction,
    };
    setResizeDirection(direction);
    setIsResizing(true);
  };

  const ejecutarResize = (clientX: number, clientY: number) => {
    const { mouseX, mouseY, startW, startH, startX, startY, direction } = resizeStartRef.current;
    const dx = clientX - mouseX;
    const dy = clientY - mouseY;

    const MIN_W = 340;
    const MIN_H = 260;

    let newW = startW;
    let newH = startH;
    let newX = posicionRef.current.x;
    let newY = posicionRef.current.y;

    // Redimensión horizontal
    if (direction === 'se' || direction === 'ne' || direction === 'e') {
      const maxW = window.innerWidth - startX - 10;
      newW = Math.max(MIN_W, Math.min(maxW, startW + dx));
      newX = startX;
    } else if (direction === 'sw' || direction === 'nw' || direction === 'w') {
      let candidateW = startW - dx;
      let candidateX = startX + dx;
      if (candidateW < MIN_W) {
        candidateW = MIN_W;
        candidateX = startX + (startW - MIN_W);
      } else if (candidateX < 10) {
        candidateX = 10;
        candidateW = startW + (startX - 10);
      }
      newW = candidateW;
      newX = candidateX;
    }

    // Redimensión vertical
    if (direction === 'se' || direction === 'sw' || direction === 's') {
      const maxH = window.innerHeight - startY - 10;
      newH = Math.max(MIN_H, Math.min(maxH, startH + dy));
      newY = startY;
    } else if (direction === 'ne' || direction === 'nw' || direction === 'n') {
      let candidateH = startH - dy;
      let candidateY = startY + dy;
      if (candidateH < MIN_H) {
        candidateH = MIN_H;
        candidateY = startY + (startH - MIN_H);
      } else if (candidateY < 0) {
        candidateY = 0;
        candidateH = startH + startY;
      }
      newH = candidateH;
      newY = candidateY;
    }

    setDimensiones({ width: Math.round(newW), height: Math.round(newH) });
    setPosicion({ x: Math.round(newX), y: Math.round(newY) });
  };

  const terminarResize = (e?: React.PointerEvent) => {
    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // no-op
      }
    }
    setIsResizing(false);
    setResizeDirection(null);
  };

  // Listener global continuo para redimensión suave en cualquier parte de la pantalla
  useEffect(() => {
    if (!isResizing) return;

    const handleWindowResizeMove = (e: PointerEvent) => {
      ejecutarResize(e.clientX, e.clientY);
    };

    const handleWindowResizeUp = () => {
      terminarResize();
    };

    window.addEventListener('pointermove', handleWindowResizeMove);
    window.addEventListener('pointerup', handleWindowResizeUp);
    window.addEventListener('pointercancel', handleWindowResizeUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowResizeMove);
      window.removeEventListener('pointerup', handleWindowResizeUp);
      window.removeEventListener('pointercancel', handleWindowResizeUp);
    };
  }, [isResizing]);

  const getCursorClass = (dir: ResizeDirection | null) => {
    switch (dir) {
      case 'nw':
      case 'se':
        return 'cursor-nwse-resize';
      case 'ne':
      case 'sw':
        return 'cursor-nesw-resize';
      case 'e':
      case 'w':
        return 'cursor-ew-resize';
      case 'n':
      case 's':
        return 'cursor-ns-resize';
      default:
        return 'cursor-nwse-resize';
    }
  };

  // Botones de ajuste de tamaño rápido (agrandar / achiquitar)
  const agrandarVentana = () => {
    if (snapMode !== 'none') setSnapMode('none');
    setDimensiones((prev) => ({
      width: Math.min(window.innerWidth - 20, prev.width + 120),
      height: Math.min(window.innerHeight - 30, prev.height + 90),
    }));
  };

  const achiquitarVentana = () => {
    if (snapMode !== 'none') setSnapMode('none');
    setDimensiones((prev) => ({
      width: Math.max(420, prev.width - 120),
      height: Math.max(380, prev.height - 90),
    }));
  };

  const restablecerTamano = () => {
    setSnapMode('none');
    setDimensiones(calcularDimensionesIniciales());
    setPosicion(calcularPosicionInicial());
  };

  const esPdf =
    esPdfMime(doc.mime || '') ||
    doc.url.toLowerCase().includes('.pdf') ||
    doc.nombre.toLowerCase().endsWith('.pdf');

  const esImagen =
    doc.url.match(/\.(png|jpe?g|webp|gif)$/i) ||
    Boolean(doc.mime && doc.mime.startsWith('image/'));

  // Definición de estilo dinámico según el modo de acople (snap)
  let windowStyle: React.CSSProperties = {
    zIndex,
    pointerEvents: 'auto',
  };

  if (snapMode === 'left') {
    windowStyle = {
      ...windowStyle,
      position: 'fixed',
      top: '8px',
      left: '8px',
      bottom: '8px',
      width: 'calc(50vw - 12px)',
      height: 'calc(100vh - 16px)',
      borderRadius: '16px',
    };
  } else if (snapMode === 'right') {
    windowStyle = {
      ...windowStyle,
      position: 'fixed',
      top: '8px',
      left: 'calc(50vw + 4px)',
      bottom: '8px',
      width: 'calc(50vw - 12px)',
      height: 'calc(100vh - 16px)',
      borderRadius: '16px',
    };
  } else if (snapMode === 'maximized') {
    windowStyle = {
      ...windowStyle,
      position: 'fixed',
      top: '8px',
      left: '8px',
      right: '8px',
      bottom: '8px',
      width: 'calc(100vw - 16px)',
      height: 'calc(100vh - 16px)',
      borderRadius: '16px',
    };
  } else {
    // Libre flotante
    windowStyle = {
      ...windowStyle,
      position: 'fixed',
      top: `${posicion.y}px`,
      left: `${posicion.x}px`,
      width: `${dimensiones.width}px`,
      height: `${dimensiones.height}px`,
      maxWidth: 'calc(100vw - 16px)',
      maxHeight: 'calc(100vh - 16px)',
      borderRadius: '16px',
    };
  }

  return (
    <>
      {/* ================= Zona fantasma indicadora de Snap (Mitad Izquierda / Derecha / Completa) ================= */}
      {isDragging && snapCandidate === 'left' && (
        <div
          className="fixed top-2 left-2 bottom-2 w-[calc(50vw-12px)] bg-blue-500/15 border-2 border-dashed border-blue-600 rounded-2xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px] transition-all animate-pulse"
          style={{ zIndex: 2147483646, pointerEvents: 'none' }}
        >
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg mb-2">
            <PanelLeft className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-blue-950 bg-white/90 px-3 py-1.5 rounded-lg shadow-xs border border-blue-200">
            Soltar para acoplar a la mitad izquierda (50%)
          </p>
          <p className="text-xs text-blue-800 mt-1 font-medium bg-white/70 px-2 py-0.5 rounded">
            Podrá colocar otro visor en la mitad derecha para comparar lado a lado
          </p>
        </div>
      )}

      {isDragging && snapCandidate === 'right' && (
        <div
          className="fixed top-2 right-2 bottom-2 w-[calc(50vw-12px)] bg-blue-500/15 border-2 border-dashed border-blue-600 rounded-2xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px] transition-all animate-pulse"
          style={{ zIndex: 2147483646, pointerEvents: 'none' }}
        >
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg mb-2">
            <PanelRight className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-blue-950 bg-white/90 px-3 py-1.5 rounded-lg shadow-xs border border-blue-200">
            Soltar para acoplar a la mitad derecha (50%)
          </p>
          <p className="text-xs text-blue-800 mt-1 font-medium bg-white/70 px-2 py-0.5 rounded">
            Podrá comparar lado a lado con el visor de la mitad izquierda
          </p>
        </div>
      )}

      {isDragging && snapCandidate === 'top' && (
        <div
          className="fixed inset-2 bg-blue-500/15 border-2 border-dashed border-blue-600 rounded-2xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px] transition-all animate-pulse"
          style={{ zIndex: 2147483646, pointerEvents: 'none' }}
        >
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg mb-2">
            <Maximize2 className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-blue-950 bg-white/90 px-3 py-1.5 rounded-lg shadow-xs border border-blue-200">
            Soltar para maximizar a pantalla completa
          </p>
        </div>
      )}

      {/* Escudo global anti-iframe mientras se arrastra o redimensiona */}
      {(isDragging || isResizing) && (
        <div
          className={`fixed inset-0 select-none bg-transparent ${
            isResizing ? getCursorClass(resizeDirection) : 'cursor-grabbing'
          }`}
          style={{
            zIndex: 2147483645,
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* ================= Ventana Flotante ================= */}
      <div
        onMouseDown={() => onFocus(docId)}
        style={windowStyle}
        className={`bg-white flex flex-col overflow-hidden border transition-all duration-75 select-none ${
          esActiva
            ? 'shadow-2xl ring-3 ring-[#003DA5]/50 border-blue-500'
            : 'shadow-xl border-slate-300 opacity-97 hover:opacity-100'
        }`}
      >
        {/* Barra superior de arrastre visual */}
        {snapMode === 'none' && (
          <div
            onPointerDown={handlePointerDownHeader}
            onPointerMove={handlePointerMoveHeader}
            onPointerUp={handlePointerUpHeader}
            style={{ touchAction: 'none' }}
            className={`h-2 w-full cursor-grab active:cursor-grabbing transition-colors ${
              isDragging
                ? 'bg-blue-600'
                : esActiva
                ? 'bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 hover:opacity-95'
                : 'bg-slate-300 hover:bg-slate-400'
            }`}
            title="Haz clic y arrastra aquí para mover o acoplar la ventana"
          />
        )}

        {/* ================= Cabecera Arrastrable ================= */}
        <div
          onPointerDown={handlePointerDownHeader}
          onPointerMove={handlePointerMoveHeader}
          onPointerUp={handlePointerUpHeader}
          style={{ touchAction: 'none' }}
          className={`flex items-center justify-between px-3 py-2 border-b select-none transition-colors gap-2 ${
            isDragging
              ? 'bg-blue-50 border-blue-300 cursor-grabbing'
              : esActiva
              ? 'bg-gradient-to-r from-slate-50 via-blue-50/70 to-slate-50 border-blue-200 cursor-grab'
              : 'bg-slate-100 border-slate-200 cursor-grab'
          }`}
          title="Haz clic y arrastra para mover; arrastra a los bordes laterales para acoplar al 50%"
        >
          {/* Lado izquierdo: botón mover, icono, títulos */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Pill interactivo de Arrastrar */}
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-grab active:cursor-grabbing border ${
                isDragging
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : esActiva
                  ? 'bg-white text-[#003DA5] border-blue-300 hover:bg-blue-50 shadow-2xs'
                  : 'bg-white/80 text-slate-700 border-slate-300 hover:bg-white'
              }`}
              title="Arrastra hacia el borde izquierdo o derecho de la pantalla para acoplar al 50%"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">
                {snapMode === 'left' ? 'Mitad Izq (50%)' : snapMode === 'right' ? 'Mitad Der (50%)' : 'Mover'}
              </span>
            </div>

            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                esPdf
                  ? 'bg-rose-100 text-rose-700'
                  : esImagen
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-[#003DA5]'
              }`}
            >
              {esImagen ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={doc.nombre}>
                  {doc.nombre}
                </h3>
                {doc.tipo && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200 uppercase tracking-wider shrink-0">
                    {doc.tipo}
                  </span>
                )}
                {totalVentanas > 1 && (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0"
                    title="Múltiples documentos abiertos para comparación simultánea"
                  >
                    <Layers className="w-2.5 h-2.5 text-indigo-500" />
                    Doc {index + 1} de {totalVentanas}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lado derecho: controles de tamaño, acople 50/50 y acciones */}
          <div
            className="flex items-center gap-1 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Controles rápidos de Agrandar / Achiquitar */}
            <button
              type="button"
              onClick={achiquitarVentana}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
              title="Achiquitar ventana"
              aria-label="Achiquitar ventana"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={agrandarVentana}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
              title="Agrandar ventana"
              aria-label="Agrandar ventana"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            {/* Acople a Mitad Izquierda (50%) */}
            <button
              type="button"
              onClick={() => setSnapMode(snapMode === 'left' ? 'none' : 'left')}
              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                snapMode === 'left'
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-white border-transparent hover:border-slate-200'
              }`}
              title="Acoplar a mitad izquierda de la pantalla (50%)"
              aria-label="Acoplar izquierda"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>

            {/* Acople a Mitad Derecha (50%) */}
            <button
              type="button"
              onClick={() => setSnapMode(snapMode === 'right' ? 'none' : 'right')}
              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                snapMode === 'right'
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-white border-transparent hover:border-slate-200'
              }`}
              title="Acoplar a mitad derecha de la pantalla (50%)"
              aria-label="Acoplar derecha"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>

            {/* Maximizar o restaurar a tamaño estándar */}
            <button
              type="button"
              onClick={() => setSnapMode(snapMode === 'maximized' ? 'none' : 'maximized')}
              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                snapMode === 'maximized'
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white border-transparent hover:border-slate-200'
              }`}
              title={snapMode === 'maximized' ? 'Restaurar tamaño flotante' : 'Maximizar ventana'}
              aria-label={snapMode === 'maximized' ? 'Restaurar' : 'Maximizar'}
            >
              {snapMode === 'maximized' ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {snapMode !== 'none' && (
              <button
                type="button"
                onClick={restablecerTamano}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                title="Restaurar a flotante centrado"
                aria-label="Restaurar flotante"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            {/* Abrir en pestaña nueva */}
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[#003DA5] border border-blue-200 hover:bg-blue-50 rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
              title="Abrir en pestaña nueva o descargar"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Abrir en pestaña nueva</span>
            </a>

            {/* Cerrar visor */}
            <button
              type="button"
              onClick={() => onCerrar(docId)}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-transparent hover:border-rose-200 transition-colors cursor-pointer ml-1"
              title="Cerrar visor"
              aria-label="Cerrar visor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= Cuerpo / Contenido del Documento ================= */}
        <div className="flex-1 min-h-0 bg-slate-100 flex flex-col overflow-hidden relative select-text">
          {esPdf ? (
            <iframe
              src={doc.url}
              title={doc.nombre}
              className="w-full flex-1 border-0 bg-white"
              style={{ height: '100%', minHeight: '480px' }}
              tabIndex={0}
            />
          ) : esImagen ? (
            <div className="w-full flex-1 overflow-auto flex items-center justify-center bg-slate-900/10 p-4">
              <img
                src={doc.url}
                alt={doc.nombre}
                className="max-h-full max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
              <FileText className="w-14 h-14 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-800 mb-1">{doc.nombre}</p>
              <p className="text-xs text-slate-500 mb-4 max-w-md">
                Este formato de archivo se puede consultar directamente en una pestaña nueva de su navegador.
              </p>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] text-white rounded-lg text-xs font-semibold hover:bg-[#002a7d] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir soporte en pestaña nueva
              </a>
            </div>
          )}
        </div>

        {/* ================= Manillas de Redimensionamiento Estilo Ventanas Windows ================= */}
        {snapMode === 'none' && (
          <>
            {/* Esquinas (Corners) */}
            {/* Esquina Inferior Derecha (SE) */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, 'se')}
              onPointerUp={(e) => terminarResize(e)}
              style={{ touchAction: 'none' }}
              className="absolute bottom-0 right-0 w-7 h-7 cursor-nwse-resize z-50 flex items-end justify-end p-1.5 hover:bg-blue-300/40 rounded-br-2xl transition-colors group"
              title="Arrastre para cambiar tamaño (inferior derecha)"
            >
              <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-400 group-hover:border-blue-600 transition-colors" />
            </div>

            {/* Esquina Inferior Izquierda (SW) */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
              onPointerUp={(e) => terminarResize(e)}
              style={{ touchAction: 'none' }}
              className="absolute bottom-0 left-0 w-7 h-7 cursor-nesw-resize z-50 flex items-end justify-start p-1.5 hover:bg-blue-300/40 rounded-bl-2xl transition-colors group"
              title="Arrastre para cambiar tamaño (inferior izquierda)"
            >
              <div className="w-2.5 h-2.5 border-l-2 border-b-2 border-slate-400 group-hover:border-blue-600 transition-colors" />
            </div>

            {/* Esquina Superior Derecha (NE) */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
              onPointerUp={(e) => terminarResize(e)}
              style={{ touchAction: 'none' }}
              className="absolute top-0 right-0 w-6 h-6 cursor-nesw-resize z-40 flex items-start justify-end p-1 hover:bg-blue-300/40 rounded-tr-2xl transition-colors group"
              title="Arrastre para cambiar tamaño (superior derecha)"
            >
              <div className="w-2 h-2 border-r-2 border-t-2 border-slate-400 group-hover:border-blue-600 transition-colors" />
            </div>

            {/* Esquina Superior Izquierda (NW) */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
              onPointerUp={(e) => terminarResize(e)}
              style={{ touchAction: 'none' }}
              className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-40 flex items-start justify-start p-1 hover:bg-blue-300/40 rounded-tl-2xl transition-colors group"
              title="Arrastre para cambiar tamaño (superior izquierda)"
            >
              <div className="w-2 h-2 border-l-2 border-t-2 border-slate-400 group-hover:border-blue-600 transition-colors" />
            </div>

            {/* Bordes (Edges) */}
            {/* Borde Derecho (E) */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, 'e')}
              onPointerUp={(e) => terminarResize(e)}
              style={{ touchAction: 'none' }}
              className="absolute top-6 right-0 bottom-6 w-2.5 cursor-ew-resize z-40 hover:bg-blue-400/30 transition-colors"
              title="Arrastre para cambiar ancho (derecha)"
            />

            {/* Borde Izquierdo (W) */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, 'w')}
              onPointerUp={(e) => terminarResize(e)}
              style={{ touchAction: 'none' }}
              className="absolute top-6 left-0 bottom-6 w-2.5 cursor-ew-resize z-40 hover:bg-blue-400/30 transition-colors"
              title="Arrastre para cambiar ancho (izquierda)"
            />

            {/* Borde Inferior (S) */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, 's')}
              onPointerUp={(e) => terminarResize(e)}
              style={{ touchAction: 'none' }}
              className="absolute bottom-0 left-7 right-7 h-2.5 cursor-ns-resize z-40 hover:bg-blue-400/30 transition-colors"
              title="Arrastre para cambiar altura (inferior)"
            />

            {/* Borde Superior (N) */}
            <div
              onPointerDown={(e) => handleResizePointerDown(e, 'n')}
              onPointerUp={(e) => terminarResize(e)}
              style={{ touchAction: 'none' }}
              className="absolute top-0 left-7 right-7 h-2 cursor-ns-resize z-30 hover:bg-blue-400/30 transition-colors"
              title="Arrastre para cambiar altura (superior)"
            />
          </>
        )}
      </div>
    </>
  );
}

export interface VisorDocumentosFlotanteProps {
  documentos: DocumentoVisualizar[];
  onCerrar: (id: string) => void;
}

export default function VisorDocumentosFlotante({
  documentos,
  onCerrar,
}: VisorDocumentosFlotanteProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [zOrder, setZOrder] = useState<Record<string, number>>({});
  const zCounterRef = useRef<number>(2147483600);

  // Inicializar o actualizar zIndex al enfocar una ventana
  const handleFocus = useCallback((id: string) => {
    setActiveId(id);
    zCounterRef.current += 1;
    setZOrder((prev) => ({
      ...prev,
      [id]: zCounterRef.current,
    }));
  }, []);

  // Al abrir un nuevo documento, darle el foco inmediatamente
  useEffect(() => {
    if (documentos.length > 0) {
      const ultimo = documentos[documentos.length - 1];
      const id = ultimo.id || ultimo.url;
      handleFocus(id);
    }
  }, [documentos.length, handleFocus]);

  if (typeof document === 'undefined' || documentos.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 2147483500 }}
    >
      {documentos.map((doc, idx) => {
        const id = doc.id || doc.url;
        const zIndex = zOrder[id] || 2147483600 + idx;
        const esActiva = activeId === id;

        return (
          <div key={id} className="pointer-events-auto">
            <VentanaDocumentoFlotante
              doc={doc}
              index={idx}
              totalVentanas={documentos.length}
              zIndex={zIndex}
              esActiva={esActiva}
              onFocus={handleFocus}
              onCerrar={onCerrar}
            />
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

/**
 * Hook reutilizable para gestionar múltiples documentos previsualizados de forma flotante y superponible.
 */
export function useVisorDocumentos() {
  const [documentosVisor, setDocumentosVisor] = useState<DocumentoVisualizar[]>([]);

  const abrirDocumentoVisor = useCallback((doc: DocumentoVisualizar) => {
    setDocumentosVisor((prev) => {
      const docId = doc.id || doc.url;
      const existe = prev.find((d) => (d.id || d.url) === docId);
      if (existe) {
        // Mover al final para darle foco
        return [...prev.filter((d) => (d.id || d.url) !== docId), existe];
      }
      return [...prev, doc];
    });
  }, []);

  const cerrarDocumentoVisor = useCallback((id: string) => {
    setDocumentosVisor((prev) => prev.filter((d) => (d.id || d.url) !== id));
  }, []);

  const cerrarTodosVisores = useCallback(() => {
    setDocumentosVisor([]);
  }, []);

  return {
    documentosVisor,
    abrirDocumentoVisor,
    cerrarDocumentoVisor,
    cerrarTodosVisores,
  };
}

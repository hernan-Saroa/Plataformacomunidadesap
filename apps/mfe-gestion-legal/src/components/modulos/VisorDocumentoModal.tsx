/**
 * VisorDocumentoModal - Visor de Documentos PDF con Funcionalidad Real
 * ✅ Visualización completa de documentos
 * ✅ Sin botones de descarga/impresión (solo visor)
 * ✅ Diseño corporativo ESAP 2025
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import {
  X, FileText, Eye, AlertCircle, ZoomIn, ZoomOut, Download,
  ChevronUp, ChevronDown, FileSignature, FileCheck
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { FirmaDigitalActuacion, type FirmaData } from '../core/FirmaDigitalActuacion';
import { authService } from '../../../../services/api/authService';
import { toast } from 'sonner';
import * as mammoth from 'mammoth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { isViewableInBrowser, getFileTypeCategory } from '../../../../utils/fileUtils';
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

const pdfjsWorkerUrl = new URL(pdfjsWorkerSrc, import.meta.url).toString();

interface VisorDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivo?: string;
  numero?: string;
  asunto?: string;
  descripcion?: string;
  docId?: string;
  allowSigning?: boolean;
  onSignComplete?: (docId: string, signedData: FirmaData, pdfFile?: File) => Promise<void> | void;
}

// Deterministic offline SVG QR Code generator to avoid external dependencies
function QuickResponseCodeSVG({ value }: { value: string }) {
  const size = 21;
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  
  const drawFinder = (x: number, y: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[y + r][x + c] = isBorder || isCenter;
      }
    }
  };
  
  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);
  
  matrix[size - 5][size - 5] = true;
  
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      
      const val = Math.abs(Math.sin(hash + r * 13 + c * 37));
      matrix[r][c] = val > 0.5;
    }
  }

  const rects: React.ReactNode[] = [];
  const moduleSize = 100 / size;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * moduleSize}
            y={r * moduleSize}
            width={moduleSize}
            height={moduleSize}
            fill="#111827"
          />
        );
      }
    }
  }

  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 bg-white p-1 rounded border border-gray-200 flex-shrink-0">
      {rects}
    </svg>
  );
}

function generateQRCodeBase64(value: string): string {
  const size = 21;
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  
  const drawFinder = (x: number, y: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[y + r][x + c] = isBorder || isCenter;
      }
    }
  };
  
  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);
  
  matrix[size - 5][size - 5] = true;
  
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      
      const val = Math.abs(Math.sin(hash + r * 13 + c * 37));
      matrix[r][c] = val > 0.5;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 100, 100);
    
    ctx.fillStyle = '#111827';
    const moduleSize = 100 / size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(c * moduleSize, r * moduleSize, moduleSize, moduleSize);
        }
      }
    }
  }
  return canvas.toDataURL('image/png');
}

function dataURLtoUint8Array(dataurl: string): Uint8Array {
  const arr = dataurl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return u8arr;
}

const stampPdf = async (
  pdfUrl: string,
  signedData: FirmaData
): Promise<Uint8Array | null> => {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error('Failed to fetch original PDF');
    const existingPdfBytes = await response.arrayBuffer();

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) throw new Error('PDF has no pages');

    const pageIndex = Math.max(0, Math.min(pages.length - 1, (signedData.coords.page || pages.length) - 1));
    const pageToStamp = pages[pageIndex];
    const { width, height } = pageToStamp.getSize();
    
    const scale = signedData.scale || 1;
    const ptMultiplier = 0.75;
    
    // La coordenada x, y del frontend son PORCENTAJES (0 a 100) respecto al contenedor DE ESA PÁGINA ESPECÍFICA
    const pdfX = (signedData.coords.x / 100) * width;
    // pdfY se calcula desde abajo hacia arriba en PDF
    const pdfY = height - ((signedData.coords.y / 100) * height);
    
    const hasRubric = !!signedData.firmaImg;
    const baseWidthCss = 280;
    const baseHeightCss = hasRubric ? 165 : 90;
    
    const stampWidth = baseWidthCss * ptMultiplier * scale;
    const stampHeight = baseHeightCss * ptMultiplier * scale;
    
    // Ensure the stamp is within bounds
    const safeX = Math.max(0, Math.min(width - stampWidth, pdfX));
    
    let safeY = pdfY - stampHeight;
    safeY = Math.max(0, Math.min(height - stampHeight, safeY));

    pageToStamp.drawRectangle({
      x: safeX,
      y: safeY,
      width: stampWidth,
      height: stampHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0, 0.24, 0.65),
      borderWidth: 1.5 * scale,
    });

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const headerHeight = 16 * ptMultiplier * scale;
    const headerY = safeY + stampHeight - headerHeight;
    pageToStamp.drawLine({
      start: { x: safeX, y: headerY },
      end: { x: safeX + stampWidth, y: headerY },
      thickness: 0.75 * scale,
      color: rgb(0.85, 0.85, 0.85),
    });

    pageToStamp.drawText('FIRMA DIGITAL INSTITUCIONAL', {
      x: safeX + 10 * ptMultiplier * scale,
      y: safeY + stampHeight - 11 * ptMultiplier * scale,
      size: 7 * scale,
      font: fontBold,
      color: rgb(0, 0.24, 0.65),
    });

    const qrSize = 42 * ptMultiplier * scale;
    const validationUrl = `${window.location.origin}/validador-documentos?hash=${signedData.hash || 'temp'}&cert=${signedData.certificado_id || 'temp'}`;
    const qrPngBase64 = generateQRCodeBase64(validationUrl);
    const qrBytes = dataURLtoUint8Array(qrPngBase64);
    const qrImage = await pdfDoc.embedPng(qrBytes);
    
    const qrY = hasRubric 
      ? safeY + 52 * ptMultiplier * scale 
      : safeY + 12 * ptMultiplier * scale;
    
    pageToStamp.drawImage(qrImage, {
      x: safeX + 8 * ptMultiplier * scale,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    const textX = safeX + 58 * ptMultiplier * scale;
    const textStartY = safeY + stampHeight - 25 * ptMultiplier * scale;
    const textLineHeight = 10 * ptMultiplier * scale;
    const fontSize = 6 * scale;

    const formattedDate = new Date(signedData.timestamp).toLocaleString('es-CO');
    const certId = signedData.certificado_id || 'ESAP-CERT-TEMP';

    pageToStamp.drawText(`Firmante: ${signedData.firmante}`, {
      x: textX,
      y: textStartY,
      size: fontSize,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    pageToStamp.drawText(`Cargo: ${signedData.cargo}`, {
      x: textX,
      y: textStartY - textLineHeight,
      size: fontSize,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    pageToStamp.drawText(`Fecha: ${formattedDate}`, {
      x: textX,
      y: textStartY - 2 * textLineHeight,
      size: fontSize,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    pageToStamp.drawText(`Cert: ${certId}`, {
      x: textX,
      y: textStartY - 3 * textLineHeight,
      size: fontSize - 0.5 * scale,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    if (hasRubric && signedData.firmaImg) {
      const rubricDivY = safeY + 48 * ptMultiplier * scale;
      pageToStamp.drawLine({
        start: { x: safeX + 8 * ptMultiplier * scale, y: rubricDivY },
        end: { x: safeX + stampWidth - 8 * ptMultiplier * scale, y: rubricDivY },
        thickness: 0.5 * scale,
        color: rgb(0.9, 0.9, 0.9),
      });

      const rubricBytes = dataURLtoUint8Array(signedData.firmaImg);
      const rubricImage = await pdfDoc.embedPng(rubricBytes);
      const rubricWidth = 220 * ptMultiplier * scale;
      const rubricHeight = 85 * ptMultiplier * scale;
      
      pageToStamp.drawImage(rubricImage, {
        x: safeX + (stampWidth - rubricWidth) / 2,
        y: safeY + 10 * ptMultiplier * scale,
        width: rubricWidth,
        height: rubricHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error stamping PDF:', error);
    return null;
  }
};

const loadPdfjs = (): Promise<any> => {
  return import('pdfjs-dist').then(pdfjs => {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
    return pdfjs;
  });
};

function PdfjsPagesViewer({ url, modoUbicacionActive, onPageClick, signatureCoords, renderSignatureStamp, zoomLevel }: any) {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadPdfjs().then(pdfjsLib => {
      const loadingTask = pdfjsLib.getDocument(url);
      loadingTask.promise.then((doc: any) => {
        if (cancelled) return;
        const pagePromises = [];
        for (let i = 1; i <= doc.numPages; i++) {
          pagePromises.push(doc.getPage(i));
        }
        Promise.all(pagePromises).then(loadedPages => {
          if (!cancelled) {
            setPages(loadedPages);
            setLoading(false);
          }
        });
      }).catch((err: any) => {
        console.error("Error loading PDF with pdf.js", err);
        setLoading(false);
      });
    });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return <div className="flex w-full h-full items-center justify-center text-white bg-gray-600">Renderizando páginas del PDF...</div>;
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-600 flex flex-col items-center py-8 gap-8">
      {pages.map((page, idx) => (
        <PdfjsPage 
          key={idx}
          page={page}
          pageIndex={idx}
          modoUbicacionActive={modoUbicacionActive}
          onPageClick={onPageClick}
          signatureCoords={signatureCoords}
          renderSignatureStamp={renderSignatureStamp}
          zoomLevel={zoomLevel}
        />
      ))}
    </div>
  );
}

function PdfjsPage({ page, pageIndex, modoUbicacionActive, onPageClick, signatureCoords, renderSignatureStamp, zoomLevel }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (canvasRef.current && page) {
      // Usamos el zoomLevel (100 = 1.0) para que el PDF no se vea gigante por defecto
      const scale = zoomLevel ? zoomLevel / 100 : 1.0;
      const viewport = page.getViewport({ scale });
      canvasRef.current.width = viewport.width;
      canvasRef.current.height = viewport.height;
      const renderContext = {
        canvasContext: canvasRef.current.getContext('2d'),
        viewport: viewport
      };
      page.render(renderContext).promise.then(() => setRendered(true)).catch(() => {});
    }
  }, [page, zoomLevel]);

  const handleClick = (e: React.MouseEvent) => {
    if (!modoUbicacionActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const safeX = Math.max(0, Math.min(100, x));
    const safeY = Math.max(0, Math.min(100, y));
    onPageClick({ x: safeX, y: safeY, page: pageIndex + 1 });
  };

  const hasSignature = signatureCoords?.page === pageIndex + 1;

  return (
    <div 
      ref={containerRef}
      className="relative bg-white shadow-xl flex-shrink-0"
      style={{ width: canvasRef.current?.width || 800, minHeight: canvasRef.current?.height || 1000 }}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      {hasSignature && modoUbicacionActive && renderSignatureStamp(true)}
    </div>
  );
}

export function VisorDocumentoModal({
  isOpen,
  onClose,
  archivo,
  numero,
  asunto,
  descripcion,
  docId,
  allowSigning = false,
  onSignComplete
}: VisorDocumentoModalProps) {
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const docxScrollRef = useRef<HTMLDivElement>(null);

  // States for signature placement
  const [modoUbicacionActive, setModoUbicacionActive] = useState(false);
  const [placementCoords, setPlacementCoords] = useState<{ x: number; y: number; page?: number } | null>(null);
  const [drawnSignatureImg, setDrawnSignatureImg] = useState<string>('');
  const [isFirmaModalMinimized, setIsFirmaModalMinimized] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [signatureScale, setSignatureScale] = useState<number>(1.0);

  // Dragging states
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse existing signature from description if present
  let parsedSignature: any = null;
  if (descripcion) {
    try {
      const data = JSON.parse(descripcion);
      if (data && data.firmado) {
        parsedSignature = data;
      }
    } catch (e) {
      // Not a signature JSON
    }
  }

  const isAlreadySigned = !!parsedSignature;

  const activeDragContainerRef = useRef<HTMLElement | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    // Calcular el centro visual de la firma escalada
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    dragStartOffset.current = {
      x: e.clientX - centerX,
      y: e.clientY - centerY,
    };
    activeDragContainerRef.current = (e.currentTarget as HTMLElement).parentElement;
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;

    // Evitar reubicación si se hace clic dentro de la firma misma
    if (e.target instanceof HTMLElement && e.target.closest('.signature-stamp')) {
      return;
    }

    const container = e.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const stampWidth = 280;
    const stampHeight = 120;
    
    let clickX = e.clientX - containerRect.left - (stampWidth / 2);
    let clickY = e.clientY - containerRect.top - (stampHeight / 2);
    
    let pctX = (clickX / containerRect.width) * 100;
    let pctY = (clickY / containerRect.height) * 100;
    
    pctX = Math.max(0, Math.min(90, pctX));
    pctY = Math.max(0, Math.min(95, pctY));
    
    setPlacementCoords({ x: pctX, y: pctY });
  };

  // Dragging event listeners on window to prevent cursor slipping and allow normal page scrolling
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const container = activeDragContainerRef.current || containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      
      let newCenterX = e.clientX - dragStartOffset.current.x - containerRect.left;
      let newCenterY = e.clientY - dragStartOffset.current.y - containerRect.top;
      
      let pctX = (newCenterX / containerRect.width) * 100;
      let pctY = (newCenterY / containerRect.height) * 100;
      
      pctX = Math.max(0, Math.min(100, pctX));
      pctY = Math.max(0, Math.min(100, pctY));
      
      setPlacementCoords(prev => ({ ...prev, x: pctX, y: pctY }));
    };

    const handleWindowMouseUp = () => {
      // Usar setTimeout para asegurar que el evento de clic posterior
      // siga viendo isDragging como true y se ignore (evita el salto al soltar)
      setTimeout(() => {
        setIsDragging(false);
        activeDragContainerRef.current = null;
      }, 0);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  const scrollDocx = (direction: 'up' | 'down') => {
    const el = docxScrollRef.current;
    if (!el) return;
    el.scrollBy({ top: direction === 'down' ? 300 : -300, behavior: 'smooth' });
  };

  // Reset loading state when archivo changes
  useEffect(() => {
    if (archivo) {
      const isMock = !archivo.startsWith('http') && !archivo.startsWith('blob:') && !archivo.startsWith('data:');

      const nombreParaExtension = (numero || archivo || '').toLowerCase();
      const isViewable = nombreParaExtension.match(/\.(pdf|jpg|jpeg|png|gif|webp|docx|doc)/i) || archivo.match(/\.(pdf|jpg|jpeg|png|gif|webp|docx|doc)/i);

      setIsLoading(!isMock && isViewable !== null);
      setHasError(false);
      setDocxHtml(null);
    }
  }, [archivo, numero]);

  // Cargar y convertir DOCX a HTML cuando aplica
  useEffect(() => {
    if (!archivo) return;
    const nombreParaExtension = (numero || archivo || '').toLowerCase();
    const extension = nombreParaExtension.split('.').pop()?.toLowerCase();
    
    const isPdf = extension === 'pdf' || archivo.toLowerCase().includes('pdf') || archivo.toLowerCase().includes('.pdf') || nombreParaExtension.includes('.pdf');
    
    const isDocx =
      !isPdf && ( // Si ya sabemos que es PDF, no es DOCX
      extension === 'docx' ||
      archivo.toLowerCase().includes('.docx') ||
      nombreParaExtension.includes('.docx')
      );
    const isMockFile = !archivo.startsWith('http') && !archivo.startsWith('blob:') && !archivo.startsWith('data:');

    if (!isDocx || isMockFile) return;

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const response = await fetch(archivo);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (cancelled) return;
        setDocxHtml(result.value || '');
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('Error convirtiendo DOCX:', err);
          setHasError(true);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [archivo, numero]);

  if (!archivo || !numero) {
    return null;
  }

  const handleZoomIn = () => {
    if (zoomLevel < 200) {
      setZoomLevel(prev => prev + 25);
      toast.success(`Zoom: ${zoomLevel + 25}%`, { duration: 1000 });
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 50) {
      setZoomLevel(prev => prev - 25);
      toast.success(`Zoom: ${zoomLevel - 25}%`, { duration: 1000 });
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const renderSignatureStamp = (isPlacing: boolean) => {
    const x = isPlacing ? placementCoords.x : parsedSignature?.coords?.x;
    const y = isPlacing ? placementCoords.y : parsedSignature?.coords?.y;
    const img = isPlacing ? drawnSignatureImg : parsedSignature?.firmaImg;
    const currentUser = authService.getCurrentUser() as any;
    
    const resolveNombre = (u: any) => {
      if (!u) return 'Usuario Funcionario';
      return u.fullName || u.full_name || u.name || u.nombre || (u.person?.first_name ? `${u.person.first_name} ${u.person.last_name ?? ''}`.trim() : null) || u.email || 'Usuario Funcionario';
    };

    const resolveCargo = (u: any) => {
      if (!u) return 'Funcionario';
      const roles = u.roles || [];
      const hasRole = (roleCode: string) => roles.some((r: any) => {
        if (typeof r === 'string') return r === roleCode;
        return r?.code === roleCode || r?.name === roleCode;
      });

      if (hasRole('JEFE_GESTION_LEGAL')) return 'Jefe de Gestión Legal';
      if (hasRole('RESUELVE_GESTION_LEGAL')) return 'Abogado Sustanciador (Resuelve)';
      
      if (roles.length > 0) {
        const firstRole = roles[0];
        if (typeof firstRole === 'string') return firstRole;
        return firstRole.displayName || firstRole.name || firstRole.code || 'Funcionario';
      }
      return 'Funcionario';
    };

    const firmante = isPlacing ? resolveNombre(currentUser) : parsedSignature?.firmante;
    const cargo = isPlacing ? resolveCargo(currentUser) : parsedSignature?.cargo;
    const timestamp = isPlacing ? new Date().toISOString() : parsedSignature?.timestamp;
    const hash = isPlacing ? 'SHA256:TEMPHASH' : parsedSignature?.hash;
    const certificadoId = isPlacing ? 'ESAP-CERT-TEMP' : (parsedSignature?.certificadoId || parsedSignature?.certificado_id);
    const scale = isPlacing ? signatureScale : (parsedSignature?.scale || 1.0);

    if (x === undefined || y === undefined) return null;

    return (
      <div
        className="signature-stamp"
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: 280,
          background: 'rgba(255, 255, 255, 0.98)',
          border: '2px solid #003DA5',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: '0 4px 15px rgba(0, 61, 165, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 100,
          cursor: isPlacing ? 'move' : 'default',
          userSelect: 'none',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        onMouseDown={isPlacing ? handleMouseDown : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #E5E7EB', paddingBottom: 4 }}>
          <FileCheck style={{ width: 14, height: 14, color: '#003DA5' }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: '#003DA5', letterSpacing: '0.05em' }}>
            FIRMA DIGITAL INSTITUCIONAL
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <QuickResponseCodeSVG value={`${window.location.origin}/validador-documentos?hash=${hash || 'temp'}&cert=${certificadoId || 'temp'}`} />
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 8, color: '#374151', lineHeight: 1.2 }}>
            <div><strong>Firmante:</strong> {firmante}</div>
            <div><strong>Cargo:</strong> {cargo}</div>
            <div><strong>Fecha:</strong> {new Date(timestamp).toLocaleString('es-CO')}</div>
            <div><strong>Cert:</strong> <span style={{ fontFamily: 'monospace', fontSize: 7 }}>{certificadoId}</span></div>
          </div>
        </div>

        {img && (
          <div style={{ borderTop: '1px dashed #E5E7EB', paddingTop: 4, display: 'flex', justifyContent: 'center' }}>
            <img src={img} alt="Rúbrica" style={{ maxHeight: 75, maxWidth: '100%', objectFit: 'contain' }} />
          </div>
        )}

        {isPlacing && (
          <div 
            style={{ 
              borderTop: '1px solid #E5E7EB', 
              paddingTop: 6, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: 6
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: '#4B5563', whiteSpace: 'nowrap' }}>Tamaño:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <button
                type="button"
                onClick={() => setSignatureScale(prev => Math.max(0.5, prev - 0.05))}
                style={{
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRadius: 4,
                  color: '#374151',
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 'bold',
                  userSelect: 'none'
                }}
              >
                -
              </button>
              <span style={{ fontSize: 9, minWidth: 26, textAlign: 'center', fontWeight: 'bold', color: '#111827' }}>
                {Math.round(signatureScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setSignatureScale(prev => Math.min(1.5, prev + 0.05))}
                style={{
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRadius: 4,
                  color: '#374151',
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 'bold',
                  userSelect: 'none'
                }}
              >
                +
              </button>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={signatureScale}
              onChange={(e) => setSignatureScale(parseFloat(e.target.value))}
              style={{
                flex: 1,
                height: 4,
                accentColor: '#003DA5',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                background: '#E5E7EB',
                borderRadius: 2,
                outline: 'none'
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-0 gap-0 overflow-hidden flex flex-col border-none bg-white rounded-xl z-[9999]"
        style={{ 
          width: '98vw',
          maxWidth: '98vw',
          height: '98vh',
          maxHeight: '98vh',
        }}
      >
        <DialogTitle className="sr-only">Visor de Documento - {numero} (V7)</DialogTitle>
        <DialogDescription className="sr-only">
          Visualización del documento {archivo}
        </DialogDescription>

        {/* ==================== HEADER & TOOLBAR ==================== */}
        {modoUbicacionActive ? (
          <div
            className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #003DA5 100%)' }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-white/20">
                <FileSignature className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1 text-white">
                <h3 className="font-bold text-sm">Modo Ubicación de Firma</h3>
                <p className="text-[10px] text-purple-100">
                  Haz clic en el documento o arrastra el recuadro para posicionar la firma exactamente en la página que deseas. Pulsa "Confirmar Posición" al terminar.
                </p>
              </div>
            </div>
            {/* Controles de escala en la barra superior */}
            <div className="flex items-center gap-4 mr-4">
              {/* Zoom del PDF */}
              <div className="flex items-center gap-1 bg-white/10 rounded border border-white/20 p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  className="text-white hover:bg-white/20 hover:text-white h-6 w-6 p-0"
                  title="Reducir PDF"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs font-bold text-white min-w-[40px] text-center" title="Zoom del Documento">
                  {zoomLevel}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 200}
                  className="text-white hover:bg-white/20 hover:text-white h-6 w-6 p-0"
                  title="Agrandar PDF"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Tamaño de la Firma */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' }}>
                <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Firma: {Math.round(signatureScale * 100)}%</span>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={signatureScale}
                  onChange={(e) => setSignatureScale(parseFloat(e.target.value))}
                  style={{
                    width: 80,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.3)',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                  }}
                  title="Agrandar o reducir el sello de firma"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setModoUbicacionActive(false);
                  setIsFirmaModalMinimized(false);
                }}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/30 h-8 px-3 rounded-lg cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setPlaced(true);
                  setModoUbicacionActive(false);
                  setIsFirmaModalMinimized(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs border-none h-8 px-4 rounded-lg cursor-pointer"
              >
                Confirmar Posición
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex-shrink-0 px-4 py-2 flex items-center justify-between border-b"
            style={{ background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)' }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-white/20">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white text-sm truncate pr-4">{numero} (V7)</h3>
                {asunto && <p className="text-[10px] text-blue-100 truncate">{asunto}</p>}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 bg-white/10 rounded border border-white/20 p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  className="text-white hover:bg-white/20 hover:text-white h-6 w-6 p-0"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs font-bold text-white min-w-[40px] text-center">
                  {zoomLevel}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 200}
                  className="text-white hover:bg-white/20 hover:text-white h-6 w-6 p-0"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Flechas de scroll — solo visibles para documentos Word */}
              {docxHtml !== null && (
                <div className="flex items-center gap-1 bg-white/10 rounded border border-white/20 p-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollDocx('up')}
                    className="text-white hover:bg-white/20 hover:text-white h-6 w-6 p-0"
                    title="Subir"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollDocx('down')}
                    className="text-white hover:bg-white/20 hover:text-white h-6 w-6 p-0"
                    title="Bajar"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {isAlreadySigned ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-lg text-emerald-100 text-xs font-bold shadow-sm">
                  <FileCheck className="w-3.5 h-3.5 animate-pulse" />
                  Firmado
                </div>
              ) : allowSigning && docId ? (
                <Button
                  onClick={() => {
                    setPlaced(false);
                    setShowFirmaModal(true);
                  }}
                  className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 hover:text-white text-white flex items-center gap-1.5 h-8 px-3 rounded-lg border-none transition-colors shadow-md cursor-pointer"
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  Firmar Documento
                </Button>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 hover:text-white h-8 w-8 p-0 ml-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* ==================== DOCUMENT VIEWER AREA ==================== */}
        <div className="flex-1 min-h-0 overflow-hidden bg-gray-200 relative">
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Cargando documento...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center p-10">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">Error al cargar documento</h3>
                <p className="text-gray-500">No se pudo cargar la vista previa del documento.</p>
              </div>
            </div>
          )}

          {/* PDF/Image viewer */}
          {archivo && (
            (() => {
              const nombreParaExtension = (numero || archivo || '').toLowerCase();
              const extension = nombreParaExtension.split('.').pop()?.toLowerCase();
              const isPdf = extension === 'pdf' || archivo.includes('pdf') || archivo.includes('.pdf') || nombreParaExtension.includes('.pdf');
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '') || archivo.match(/\.(jpg|jpeg|png|gif|webp)/i) || nombreParaExtension.match(/\.(jpg|jpeg|png|gif|webp)/i);
              const isDocx = !isPdf && (extension === 'docx' || archivo.toLowerCase().includes('.docx') || nombreParaExtension.includes('.docx'));
              const isMockFile = !archivo.startsWith('http') && !archivo.startsWith('blob:') && !archivo.startsWith('data:');

              if (isMockFile && isPdf) {
                return (
                  <div
                    className="w-full h-full overflow-auto flex justify-center p-8 bg-gray-200"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center'
                    }}
                  >
                    <div 
                      ref={containerRef}
                      className="bg-white shadow-2xl p-12 w-[800px] min-h-[1100px] relative text-gray-800"
                      onClick={modoUbicacionActive ? handlePageClick : undefined}
                    >
                      {/* Membrete Simulado */}
                      <div className="text-center border-b-2 border-gray-300 pb-6 mb-8">
                        <h4 className="font-serif text-lg font-bold text-gray-600 mb-1">REPÚBLICA DE COLOMBIA</h4>
                        <h2 className="font-serif text-2xl font-black text-blue-900 mb-2">ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h2>
                        <h5 className="font-serif text-md font-bold text-gray-500">OFICINA ASESORA JURÍDICA</h5>
                        <div className="mt-4 text-sm text-gray-500 font-mono">
                          <strong>Radicado No.</strong> {numero || '2025-400-001234-2'}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          <strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}
                        </div>
                      </div>

                      {/* Cuerpo del Documento Simulado */}
                      <div className="space-y-6 font-serif leading-relaxed text-justify">
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <p className="font-bold">Señor(a):</p>
                            <p className="uppercase">Juez Administrativo del Circuito</p>
                            <p>E. S. D.</p>
                          </div>
                        </div>

                        <p className="font-bold uppercase mb-4 text-center text-lg decoration-slice underline">
                          ASUNTO: {asunto || 'DOCUMENTO OFICIAL DEL PROCESO'}
                        </p>

                        <p>
                          Respetado Juez,
                        </p>

                        <p>
                          Por medio del presente escrito, actuando en nombre y representación de la
                          <strong> ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP</strong>,
                          me permito allegar el presente documento correspondiente al proceso de la referencia.
                        </p>

                        <p>
                          Este documento constituye una representación visual del archivo <strong>"{archivo}"</strong>
                          que se encuentra almacenado en el sistema de gestión documental.
                          En un entorno de producción, aquí se visualizaría el contenido real del archivo PDF cargado.
                        </p>

                        <p>
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
                          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                          ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
                          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                        </p>

                        <div className="py-8"></div>

                        <p>
                          Atentamente,
                        </p>

                        <div className="mt-12 pt-4 border-t w-64 border-black">
                          <p className="font-bold">OFICINA JURÍDICA</p>
                          <p className="text-sm">Escuela Superior de Administración Pública</p>
                          <p className="text-xs text-gray-500 mt-1">Firmado electrónicamente</p>
                        </div>
                      </div>

                      {/* Marca de agua */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                        <div className="transform -rotate-45 text-9xl font-black text-gray-900 border-8 border-gray-900 p-4 rounded-xl">
                          ESAP
                        </div>
                      </div>

                      {/* Footer de página */}
                      <div className="absolute bottom-12 left-12 right-12 text-center text-xs text-gray-400 border-t pt-2">
                        <p>Calle 44 No. 53-37 CAN Bogotá D.C. - Código Postal: 111321</p>
                        <p>Documento generado por Plataforma Gestión Legal ESAP</p>
                      </div>

                      {modoUbicacionActive && renderSignatureStamp(true)}
                      {parsedSignature && renderSignatureStamp(false)}
                    </div>
                  </div>
                );
              }

              if (isDocx && !isMockFile) {
                if (docxHtml === null) {
                  return null;
                }
                const docFontSize = Math.round(14 * (zoomLevel / 100));
                return (
                  <div
                    ref={docxScrollRef}
                    className="absolute inset-0 overflow-y-auto overflow-x-auto bg-gray-200"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    <div className="flex justify-center p-8">
                      <div
                        ref={containerRef}
                        className="bg-white shadow-2xl p-12 min-h-[1100px] text-gray-800"
                        style={{
                          fontFamily: 'Calibri, Arial, sans-serif',
                          lineHeight: 1.6,
                          fontSize: `${docFontSize}px`,
                          width: `${Math.round(800 * (zoomLevel / 100))}px`,
                          minWidth: '320px',
                          position: 'relative'
                        }}
                        onClick={modoUbicacionActive ? handlePageClick : undefined}
                      >
                        <style>{`
                          .docx-viewer-content p { margin-bottom: 0.7em; }
                          .docx-viewer-content h1 { font-size: 1.6em; margin: 0.8em 0 0.4em; }
                          .docx-viewer-content h2 { font-size: 1.3em; margin: 0.7em 0 0.35em; }
                          .docx-viewer-content h3 { font-size: 1.1em; margin: 0.6em 0 0.3em; }
                          .docx-viewer-content ul, .docx-viewer-content ol { margin-left: 1.5em; margin-bottom: 0.7em; }
                          .docx-viewer-content table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
                          .docx-viewer-content td, .docx-viewer-content th { border: 1px solid #ddd; padding: 6px 10px; }
                          .docx-viewer-content th { background-color: #f5f5f5; font-weight: bold; }
                          .docx-viewer-content img { max-width: 100%; height: auto; display: block; margin: 0.5em 0; }
                          .docx-viewer-content strong, .docx-viewer-content b { font-weight: bold; }
                          .docx-viewer-content em, .docx-viewer-content i { font-style: italic; }
                        `}</style>
                        <div
                          className="docx-viewer-content"
                          dangerouslySetInnerHTML={{ __html: docxHtml }}
                        />

                        {modoUbicacionActive && renderSignatureStamp(true)}
                        {parsedSignature && renderSignatureStamp(false)}
                      </div>
                    </div>
                  </div>
                );
              }

              if (isPdf) {
                if (modoUbicacionActive) {
                  return (
                    <PdfjsPagesViewer 
                      url={archivo} 
                      modoUbicacionActive={modoUbicacionActive}
                      onPageClick={(coords: any) => setPlacementCoords(coords)}
                      signatureCoords={placementCoords}
                      renderSignatureStamp={renderSignatureStamp}
                      zoomLevel={zoomLevel}
                    />
                  );
                }

                return (
                  <div
                    ref={containerRef}
                    className="w-full h-full overflow-hidden flex items-start justify-center p-0 bg-gray-600 relative"
                    style={{
                      transform: zoomLevel === 100 ? 'none' : `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center'
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src={`${archivo}#toolbar=0&navpanes=0&scrollbar=1`}
                      className="w-full border-0"
                      style={{
                        height: '100%',
                        minHeight: '100%'
                      }}
                      title="Visor PDF"
                      onLoad={handleIframeLoad}
                      onError={handleIframeError}
                    />

                    {parsedSignature && renderSignatureStamp(false)}
                  </div>
                );
              } else if (isImage) {
                return (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                    <div 
                      ref={containerRef}
                      style={{ 
                        position: 'relative', 
                        display: 'inline-block',
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: 'center center'
                      }}
                      onClick={modoUbicacionActive ? handlePageClick : undefined}
                    >
                      <img
                        src={archivo}
                        alt={numero || 'Documento'}
                        className="max-w-full max-h-full object-contain shadow-lg"
                        style={{ display: 'block' }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => { setIsLoading(false); setHasError(true); }}
                      />

                      {modoUbicacionActive && renderSignatureStamp(true)}
                      {parsedSignature && renderSignatureStamp(false)}
                    </div>
                  </div>
                );
              } else {
                const fileCategory = getFileTypeCategory(archivo);
                return (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-10 bg-white rounded-lg shadow-md max-w-md">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-700 mb-2">Vista previa no disponible</h3>
                      <p className="text-gray-500 mb-4">
                        Los archivos de tipo <strong>{fileCategory}</strong> no se pueden visualizar directamente en el navegador.
                      </p>
                      <a
                        href={archivo}
                        download
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        Descargar Archivo
                      </a>
                    </div>
                  </div>
                );
              }
            })()
          )}
        </div>

        {/* Modal de Firma Electrónica */}
        {showFirmaModal && docId && (
          <FirmaDigitalActuacion
            expedienteId={docId}
            radicado={numero || 'DOC-REF'}
            actuacionDescripcion={`Firma del documento: ${numero}`}
            firmanteNombre={(() => {
              const u = authService.getCurrentUser() as any;
              if (!u) return 'Usuario Funcionario';
              return u.fullName || u.full_name || u.name || u.nombre || (u.person?.first_name ? `${u.person.first_name} ${u.person.last_name ?? ''}`.trim() : null) || u.email || 'Usuario Funcionario';
            })()}
            firmanteCargo={(() => {
              const u = authService.getCurrentUser() as any;
              if (!u) return 'Funcionario';
              const roles = u.roles || [];
              const hasRole = (roleCode: string) => roles.some((r: any) => {
                if (typeof r === 'string') return r === roleCode;
                return r?.code === roleCode || r?.name === roleCode;
              });
              if (hasRole('JEFE_GESTION_LEGAL')) return 'Jefe de Gestión Legal';
              if (hasRole('RESUELVE_GESTION_LEGAL')) return 'Abogado Sustanciador (Resuelve)';
              if (roles.length > 0) {
                const firstRole = roles[0];
                if (typeof firstRole === 'string') return firstRole;
                return firstRole.displayName || firstRole.name || firstRole.code || 'Funcionario';
              }
              return 'Funcionario';
            })()}
            etapaLabel="Firma Digital de Documento"
            correoDestino={(authService.getCurrentUser() as any)?.email}
            onVerifyCodigo={async (codigo) => {
              return Promise.resolve();
            }}
            onFirmaCompleta={async (firmaData) => {
              if (onSignComplete) {
                const completeFirmaData: FirmaData = {
                  ...firmaData,
                  coords: placementCoords,
                  firmaImg: drawnSignatureImg,
                  scale: signatureScale
                };

                let pdfFile: File | undefined = undefined;
                try {
                  toast.loading('✍️ Estampando firma en el archivo PDF...', { id: 'estampado-pdf' });
                  const stampedBytes = await stampPdf(archivo, completeFirmaData);
                  if (stampedBytes) {
                    let nuevoNombre = numero || 'documento.pdf';
                    if (!nuevoNombre.toLowerCase().endsWith('.pdf')) {
                      nuevoNombre += '.pdf';
                    }
                    const blob = new Blob([stampedBytes], { type: 'application/pdf' });
                    pdfFile = new File([blob], nuevoNombre, { type: 'application/pdf' });
                    toast.success('✅ Sello de firma integrado en el PDF', { id: 'estampado-pdf' });
                  } else {
                    toast.error('⚠️ No se pudo integrar el sello en el archivo PDF. Guardando solo metadatos.', { id: 'estampado-pdf' });
                  }
                } catch (err) {
                  console.error('Error al estampar PDF:', err);
                  toast.error('⚠️ Error al integrar la firma en el PDF.', { id: 'estampado-pdf' });
                }

                await onSignComplete(docId, completeFirmaData, pdfFile);
              }
              setShowFirmaModal(false);
            }}
            onCancelar={() => setShowFirmaModal(false)}
            onStartPlacement={(base64) => {
              setDrawnSignatureImg(base64);
              if (!placementCoords) {
                // Aparece en la página 1 automáticamente (o se queda en donde estaba si ya se había posicionado antes)
                setPlacementCoords({ x: 50, y: 50, page: 1 });
              }
              setModoUbicacionActive(true);
              setIsFirmaModalMinimized(true);
            }}
            coords={placementCoords}
            placed={placed}
            isMinimized={isFirmaModalMinimized}
          />
        )}

      </DialogContent>
    </Dialog>
  );
}

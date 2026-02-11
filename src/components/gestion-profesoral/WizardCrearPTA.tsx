/**
 * Wizard Crear PTA - Plan de Trabajo Académico
 * Componente temporal placeholder
 */

interface WizardCrearPTAProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WizardCrearPTA({ isOpen, onClose }: WizardCrearPTAProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <h3 className="text-lg font-bold mb-4">Crear Plan de Trabajo Académico</h3>
        <p className="text-gray-600 mb-4">Este wizard está en desarrollo</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

import { lazy, Suspense } from 'react';

interface PortalDocentePTAProps {
  onBack: () => void;
  userPersonId: string;
  userName?: string;
  userEmail?: string;
}

const PTAModuleRemote = lazy(async () => {
  const mod: any = await import('pta/Portal');
  const component =
    mod?.default ||
    mod?.PTAPortalModule ||
    mod?.PortalModule ||
    mod?.default?.PTAPortalModule ||
    mod?.default?.PortalModule;
  if (!component) throw new Error('No se pudo resolver el componente del MFE PTA (pta/Portal)');
  return { default: component };
});

export function PortalDocentePTA({ onBack, userPersonId, userName, userEmail }: PortalDocentePTAProps) {
  return (
    <div className="min-w-0">
      <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando PTA...</div>}>
        <PTAModuleRemote
          key={userPersonId}
          onBack={onBack}
          userPersonId={userPersonId}
          userName={userName}
          userEmail={userEmail}
          userRoles={['Docente']}
          embedded
        />
      </Suspense>
    </div>
  );
}

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Download } from 'lucide-react'

export default function CartaRepresentacionOCI() {
  const [formData, setFormData] = useState({
    fecha: '',
    nombreJefe: '',
    unidadAuditable: '',
    nombreResponsable: '',
    cargoResponsable: '',
    elaboro: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDownload = () => {
    // Descargar el archivo Word desde public
    const link = document.createElement('a')
    link.href = '/EM-FO-010FormatocartaderepresentacinOCI_V02.docx'
    link.download = 'EM-FO-010FormatocartaderepresentacinOCI_V02.docx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 print:p-0 print:bg-white">
      {/* Botones de acción - solo visible en pantalla */}
      <div className="max-w-[210mm] mx-auto mb-4 flex gap-2 print:hidden">
        <Button onClick={handleDownload} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Descargar Word
        </Button>
        <Button onClick={() => window.print()} variant="outline">
          Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none">
        {/* Document content */}
        <div className="p-8 font-['Arial',sans-serif] text-[11pt] text-black leading-normal">
          {/* Header - SIEMPRE IGUAL */}
          <table className="w-full border-collapse mb-4">
            <tbody>
              <tr>
                <td rowSpan={3} className="border border-black w-[140px] p-2 align-middle text-center">
                  <img
                    src="/images/logo-esap-2.jpg"
                    alt="Logo ESAP - Escuela Superior de Administración Pública"
                    className="w-[100px] h-auto mx-auto"
                  />
                </td>
                <td rowSpan={3} className="border border-black text-center align-middle px-4 font-bold">
                  <div className="text-[12pt]">FORMATO</div>
                  <div className="text-[12pt]">CARTA DE REPRESENTACIÓN OCI</div>
                </td>
                <td className="border border-black px-3 py-1 text-[10pt] w-[160px]">
                  <span className="font-bold">CÓDIGO:</span> EM-FO-010
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-1 text-[10pt]">
                  <span className="font-bold">VERSIÓN:</span> 02
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-1 text-[10pt]">
                  <span className="font-bold">FECHA:</span> 24/02/2025
                </td>
              </tr>
            </tbody>
          </table>

          {/* Process info - SIEMPRE IGUAL */}
          <div className="mb-6 text-[10pt]">
            <p className="mb-1">
              <span className="font-bold">Proceso: Evaluación Control y Mejora</span>
            </p>
            <p>
              <span className="font-bold">Documento de referencia: Procedimiento de Auditorías internas basadas en riesgos EM-PT-004</span>
            </p>
          </div>

          {/* Letter header - EDITABLE */}
          <div className="mb-6">
            <p className="mb-1">D</p>
            <table className="mb-1 w-full">
              <tbody>
                <tr>
                  <td className="pr-4 align-top font-bold w-[100px]">Fecha:</td>
                  <td>
                    <Input
                      type="text"
                      value={formData.fecha}
                      onChange={(e) => handleInputChange('fecha', e.target.value)}
                      placeholder="(día – mes – año)"
                      className="print:hidden border-gray-300"
                    />
                    <span className="hidden print:inline">{formData.fecha || '(día – mes – año)'}</span>
                  </td>
                </tr>
                <tr>
                  <td className="pr-4 align-top font-bold">Para:</td>
                  <td>
                    <Input
                      type="text"
                      value={formData.nombreJefe}
                      onChange={(e) => handleInputChange('nombreJefe', e.target.value)}
                      placeholder="nombre del jefe de la Oficina de Control Interno"
                      className="print:hidden border-gray-300"
                    />
                    <span className="hidden print:inline">{formData.nombreJefe || 'nombre del jefe de la Oficina de Control Interno'}</span>
                  </td>
                </tr>
                <tr>
                  <td className="pr-4 align-top font-bold">Cargo:</td>
                  <td className="pt-2">
                    <span className="print:inline">Jefe de la Oficina de Control Interno</span>
                    <span className="hidden">Jefe de la Oficina de Control Interno</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Subject - EDITABLE */}
          <div className="mb-6">
            <p className="mb-2">
              <span className="font-bold">Asunto:</span>
              <span className="ml-2 print:hidden">
                Carta de representación de la auditoría interna basada en riesgos al
              </span>
            </p>
            <div className="ml-[80px]">
              <Input
                type="text"
                value={formData.unidadAuditable}
                onChange={(e) => handleInputChange('unidadAuditable', e.target.value)}
                placeholder="(se menciona unidad auditable)"
                className="print:hidden border-gray-300"
              />
              <span className="hidden print:inline">
                Carta de representación de la auditoría interna basada en riesgos al {formData.unidadAuditable || '(se menciona unidad auditable)'}
              </span>
            </div>
          </div>

          {/* Greeting */}
          <p className="mb-4">Cordial saludo</p>

          {/* Body */}
          <p className="mb-4 text-justify">
            Mediante la presente carta de representación me permito comunicar que, para el desarrollo de la auditoria interna basada en riesgos al <span className="font-semibold">{formData.unidadAuditable || '(se menciona unidad auditable)'}</span>, que será adelantada por parte de la Oficina de Control Interno - OCI, declaramos lo siguiente:
          </p>

          {/* Numbered list */}
          <ol className="list-decimal pl-8 mb-8 space-y-3">
            <li className="text-justify pl-2">
              Somos responsables de la oportuna preparación, presentación y consistencia de la información que será entregada en el marco de la auditoría a la OCI para su revisión.
            </li>
            <li className="text-justify pl-2">
              Se hará entrega oficialmente de toda la información relacionada con la gestión del proceso a evaluar, atendiendo los requerimientos hechos por la Oficina de Control Interno y en los plazos que así sean establecidos.
            </li>
            <li className="text-justify pl-2">
              La información a suministrar será válida, integral (suficiente y pertinente) y completa para los propósitos del proceso auditor.
            </li>
          </ol>

          {/* Closing */}
          <p className="mb-16">Cordialmente,</p>

          {/* Signature - EDITABLE */}
          <div className="mb-8">
            <p className="mb-1">(firma)</p>
            <p className="border-b border-black w-[350px] mb-1"></p>
            <div className="print:hidden mb-2">
              <Input
                type="text"
                value={formData.nombreResponsable}
                onChange={(e) => handleInputChange('nombreResponsable', e.target.value)}
                placeholder="(nombre del responsable de la unidad a auditar)"
                className="border-gray-300 w-[350px]"
              />
            </div>
            <p className="hidden print:block">{formData.nombreResponsable || '(nombre del responsable de la unidad a auditar)'}</p>
            <div className="print:hidden">
              <Input
                type="text"
                value={formData.cargoResponsable}
                onChange={(e) => handleInputChange('cargoResponsable', e.target.value)}
                placeholder="Cargo del responsable de la unidad a auditar"
                className="border-gray-300 w-[350px]"
              />
            </div>
            <p className="hidden print:block">{formData.cargoResponsable || 'Cargo del responsable de la unidad a auditar'}</p>
          </div>

          {/* Elaboró - EDITABLE */}
          <div className="mt-8">
            <p className="font-bold mb-2">Elaboró:</p>
            <Input
              type="text"
              value={formData.elaboro}
              onChange={(e) => handleInputChange('elaboro', e.target.value)}
              placeholder="Nombre de quien elaboró"
              className="print:hidden border-gray-300 w-[350px]"
            />
            <p className="hidden print:block">{formData.elaboro}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

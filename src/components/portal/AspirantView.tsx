/**
 * Vista de Aspirante - Portal Transaccional
 * 
 * Vista especializada para usuarios con rol ASPIRANTE activo.
 * Muestra estado de solicitud, documentos pendientes y proceso de admisión.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  UserCircle,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Calendar,
  ChevronRight,
  Phone,
  Mail,
  Download,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';

interface AspirantViewProps {
  userName: string;
  userEmail: string;
  aspirantData?: {
    radicado: string;
    programa_interes: string;
    modalidad_interes: string;
    estado_solicitud: string;
    fecha_solicitud: string;
    documentos_pendientes: number;
    siguiente_paso: string;
  };
}

export function AspirantView({ userName, userEmail, aspirantData }: AspirantViewProps) {
  // Datos mock si no se proveen
  const data = aspirantData || {
    radicado: 'VIN-2024-ABC123',
    programa_interes: 'Administración Pública',
    modalidad_interes: 'Presencial',
    estado_solicitud: 'En Revisión',
    fecha_solicitud: '2024-11-10',
    documentos_pendientes: 2,
    siguiente_paso: 'Subir certificado de bachillerato',
  };

  const progreso = 60; // Calculado según documentos completados

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header aspirante */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserCircle className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold">
                ¡Bienvenido(a), {userName.split(' ')[0]}!
              </h1>
            </div>
            <p className="text-blue-100 text-sm sm:text-base mb-1">
              Solicitud de Admisión • {data.programa_interes}
            </p>
            <p className="text-blue-50 text-xs mb-4">
              Radicado: {data.radicado} • Modalidad {data.modalidad_interes}
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-blue-100">Estado</p>
                <p className="text-sm font-bold">{data.estado_solicitud}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-blue-100">Documentos Pendientes</p>
                <p className="text-sm font-bold">{data.documentos_pendientes}</p>
              </div>
            </div>
          </div>
          <Badge className={`${
            data.estado_solicitud === 'Aprobado' ? 'bg-green-500' :
            data.estado_solicitud === 'En Revisión' ? 'bg-yellow-500' :
            'bg-gray-500'
          } text-white border-none`}>
            {data.estado_solicitud}
          </Badge>
        </div>

        {/* Progreso de solicitud */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-100">Progreso de tu Solicitud</span>
            <span className="text-sm font-bold">{progreso}%</span>
          </div>
          <Progress value={progreso} className="h-3 bg-white/20" />
        </div>
      </motion.div>

      {/* Timeline del proceso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Proceso de Admisión
          </CardTitle>
          <CardDescription>
            Sigue el estado de tu solicitud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                paso: 'Solicitud Recibida',
                descripcion: 'Tu solicitud ha sido registrada en nuestro sistema',
                estado: 'completado',
                fecha: new Date(data.fecha_solicitud).toLocaleDateString('es-CO'),
              },
              {
                paso: 'Documentos Básicos',
                descripcion: 'Documento de identidad y formulario de inscripción',
                estado: 'completado',
                fecha: new Date(data.fecha_solicitud).toLocaleDateString('es-CO'),
              },
              {
                paso: 'Documentos Académicos',
                descripcion: 'Certificado de bachillerato y resultados ICFES',
                estado: 'en_proceso',
                fecha: 'En progreso',
              },
              {
                paso: 'Revisión Admisiones',
                descripcion: 'El equipo de admisiones revisará tu solicitud',
                estado: 'pendiente',
                fecha: 'Pendiente',
              },
              {
                paso: 'Decisión Final',
                descripcion: 'Recibirás la decisión sobre tu admisión',
                estado: 'pendiente',
                fecha: 'Pendiente',
              },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.estado === 'completado' ? 'bg-green-100' :
                    item.estado === 'en_proceso' ? 'bg-yellow-100' :
                    'bg-gray-100'
                  }`}>
                    {item.estado === 'completado' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : item.estado === 'en_proceso' ? (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  {index < 4 && (
                    <div className={`w-0.5 h-12 ${
                      item.estado === 'completado' ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm">{item.paso}</h4>
                    <Badge variant="outline" className="text-xs">
                      {item.fecha}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{item.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documentos requeridos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Documentos Requeridos
          </CardTitle>
          <CardDescription>
            Completa tu solicitud subiendo los documentos faltantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              nombre: 'Documento de Identidad',
              descripcion: 'Cédula o documento válido (ambas caras)',
              estado: 'completado',
              formato: 'PDF, JPG, PNG',
            },
            {
              nombre: 'Fotografía 3x4',
              descripcion: 'Fondo blanco, reciente (max 6 meses)',
              estado: 'completado',
              formato: 'JPG, PNG',
            },
            {
              nombre: 'Certificado de Bachillerato',
              descripcion: 'Documento oficial de culminación',
              estado: 'pendiente',
              formato: 'PDF',
            },
            {
              nombre: 'Resultados ICFES',
              descripcion: 'Certificado oficial del ICFES',
              estado: 'pendiente',
              formato: 'PDF',
            },
            {
              nombre: 'Certificado EPS',
              descripcion: 'Afiliación vigente a EPS',
              estado: 'opcional',
              formato: 'PDF',
            },
          ].map((documento, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                documento.estado === 'completado' ? 'bg-green-50 border-green-200' :
                documento.estado === 'pendiente' ? 'bg-yellow-50 border-yellow-200' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {documento.estado === 'completado' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : documento.estado === 'pendiente' ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                ) : (
                  <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <h4 className="font-bold text-sm mb-0.5">{documento.nombre}</h4>
                  <p className="text-xs text-gray-600">{documento.descripcion}</p>
                  <p className="text-xs text-gray-500 mt-1">Formato: {documento.formato}</p>
                </div>
              </div>
              {documento.estado === 'completado' ? (
                <Button size="sm" variant="outline" className="text-xs">
                  <Download className="w-3 h-3 mr-1" /> Ver
                </Button>
              ) : documento.estado === 'pendiente' ? (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs">
                  <Upload className="w-3 h-3 mr-1" /> Subir
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="text-xs">
                  Opcional
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Próximo paso */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">Próximo Paso</h3>
              <p className="text-sm text-gray-700 mb-4">
                {data.siguiente_paso}
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Continuar Solicitud
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            ¿Necesitas Ayuda?
          </CardTitle>
          <CardDescription>
            Nuestro equipo de admisiones está disponible para asistirte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Teléfono</p>
                <p className="font-bold text-sm">(601) 123-4567</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Email</p>
                <p className="font-bold text-sm">admisiones@esap.edu.co</p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Horario de Atención
            </h4>
            <p className="text-xs text-gray-700">
              Lunes a Viernes: 8:00 AM - 5:00 PM<br />
              Sábados: 9:00 AM - 1:00 PM
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

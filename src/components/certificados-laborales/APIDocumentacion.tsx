import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Code,
  Copy,
  CheckCircle,
  Key,
  Shield,
  Globe,
  Book,
  Terminal,
  AlertCircle,
  ExternalLink,
  Lock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { copyToClipboard } from '../../utils/clipboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface CodeExample {
  language: string;
  code: string;
}

export function APIDocumentacion() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string, label: string) => {
    const copiado = await copyToClipboard(code);
    
    if (copiado) {
      setCopiedCode(label);
      toast.success('Código copiado', {
        description: `${label} copiado al portapapeles`,
        duration: 2000
      });
      
      setTimeout(() => setCopiedCode(null), 2000);
    } else {
      toast.info(label, {
        description: code,
        duration: 5000
      });
    }
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/api/v1/certificados/validar',
      description: 'Valida un certificado laboral por su código QR',
      authRequired: true,
      rateLimit: '100 req/min'
    },
    {
      method: 'GET',
      path: '/api/v1/certificados/consultar/{qrCode}',
      description: 'Consulta información pública de un certificado',
      authRequired: true,
      rateLimit: '100 req/min'
    },
    {
      method: 'POST',
      path: '/api/v1/certificados/webhook',
      description: 'Registra webhook para notificaciones de validación',
      authRequired: true,
      rateLimit: '10 req/min'
    }
  ];

  const codeExamples: { [key: string]: CodeExample[] } = {
    validar: [
      {
        language: 'curl',
        code: `curl -X POST https://api.esap.edu.co/v1/certificados/validar \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "qrCode": "ESAP-CERT-2025-ABC123XYZ",
    "includeDetails": true
  }'`
      },
      {
        language: 'JavaScript',
        code: `const response = await fetch('https://api.esap.edu.co/v1/certificados/validar', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    qrCode: 'ESAP-CERT-2025-ABC123XYZ',
    includeDetails: true
  })
});

const data = await response.json();
console.log(data);`
      },
      {
        language: 'Python',
        code: `import requests

url = "https://api.esap.edu.co/v1/certificados/validar"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "qrCode": "ESAP-CERT-2025-ABC123XYZ",
    "includeDetails": True
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`
      },
      {
        language: 'PHP',
        code: `<?php
$url = 'https://api.esap.edu.co/v1/certificados/validar';
$headers = [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
];
$data = [
    'qrCode' => 'ESAP-CERT-2025-ABC123XYZ',
    'includeDetails' => true
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`
      }
    ],
    response: [
      {
        language: 'JSON',
        code: `{
  "success": true,
  "data": {
    "isValid": true,
    "certificado": {
      "consecutivo": "001-2025-TH",
      "qrCode": "ESAP-CERT-2025-ABC123XYZ",
      "estado": "VIGENTE",
      "empleado": {
        "nombre": "María Fernanda Rodríguez López",
        "documento": "52.345.678",
        "cargo": "Docente Tiempo Completo",
        "dependencia": "Dirección Territorial Bogotá"
      },
      "fechaEmision": "2025-11-20T08:35:00Z",
      "fechaVigencia": "2026-11-20",
      "firmante": {
        "nombre": "Dr. Jorge Luis Ramírez Mora",
        "cargo": "Director Nacional de Talento Humano"
      }
    },
    "metadata": {
      "validatedAt": "2025-11-25T14:30:00Z",
      "validationSource": "API v1",
      "requestId": "req_abc123xyz"
    }
  }
}`
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F6FF] to-[#E0EEFF] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
              boxShadow: '0 8px 24px rgba(0, 61, 165, 0.25)'
            }}
          >
            <Code className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          
          <h1 
            className="font-bold mb-3"
            style={{
              fontSize: '36px',
              lineHeight: '44px',
              letterSpacing: '-0.5px',
              color: '#1F2937'
            }}
          >
            API de Validación de Certificados
          </h1>
          
          <p 
            className="font-normal max-w-3xl mx-auto"
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              color: '#6B7280'
            }}
          >
            Integra la validación de certificados laborales ESAP en tu sistema con nuestra API REST segura y escalable
          </p>

          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge className="bg-green-100 text-green-800 border-green-300 px-4 py-1">
              <Zap className="w-3 h-3 mr-1 inline" />
              API v1.0 - Estable
            </Badge>
            <Badge variant="outline" className="px-4 py-1">
              <Shield className="w-3 h-3 mr-1 inline" />
              OAuth 2.0 + API Key
            </Badge>
            <Badge variant="outline" className="px-4 py-1">
              <Globe className="w-3 h-3 mr-1 inline" />
              REST/JSON
            </Badge>
          </div>
        </motion.div>

        {/* Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="p-8 bg-white rounded-2xl shadow-xl border-2">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-[#003DA5]/10 p-3 rounded-xl">
                <Key className="w-6 h-6 text-[#003DA5]" />
              </div>
              <div>
                <h2 
                  className="font-bold mb-2"
                  style={{
                    fontSize: '24px',
                    lineHeight: '32px',
                    color: '#1F2937'
                  }}
                >
                  Inicio Rápido
                </h2>
                <p className="text-gray-600">
                  Obtén tu API Key y comienza a validar certificados en minutos
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-6 border-2 hover:border-[#003DA5] transition-colors">
                <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-[#003DA5] text-xl font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">Registra tu aplicación</h3>
                <p className="text-sm text-gray-600">
                  Crea una cuenta en el portal de desarrolladores ESAP
                </p>
                <Button variant="link" className="p-0 h-auto mt-3 text-[#003DA5]">
                  Ir al portal <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Card>

              <Card className="p-6 border-2 hover:border-[#003DA5] transition-colors">
                <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-[#003DA5] text-xl font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">Obtén tu API Key</h3>
                <p className="text-sm text-gray-600">
                  Genera tus credenciales de producción o sandbox
                </p>
                <div className="mt-3 p-2 bg-gray-50 rounded border font-mono text-xs break-all">
                  esap_live_sk_abc123...
                </div>
              </Card>

              <Card className="p-6 border-2 hover:border-[#003DA5] transition-colors">
                <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-[#003DA5] text-xl font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">Haz tu primera llamada</h3>
                <p className="text-sm text-gray-600">
                  Valida un certificado con un simple POST request
                </p>
                <Button variant="link" className="p-0 h-auto mt-3 text-[#003DA5]">
                  Ver ejemplos <Book className="w-3 h-3 ml-1" />
                </Button>
              </Card>
            </div>
          </Card>
        </motion.div>

        {/* Endpoints */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="p-8 bg-white rounded-2xl shadow-xl border-2">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-[#003DA5]/10 p-3 rounded-xl">
                <Terminal className="w-6 h-6 text-[#003DA5]" />
              </div>
              <div>
                <h2 
                  className="font-bold mb-2"
                  style={{
                    fontSize: '24px',
                    lineHeight: '32px',
                    color: '#1F2937'
                  }}
                >
                  Endpoints Disponibles
                </h2>
                <p className="text-gray-600">
                  Base URL: <code className="bg-gray-100 px-2 py-1 rounded text-sm">https://api.esap.edu.co</code>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {endpoints.map((endpoint, index) => (
                <Card key={index} className="p-6 border-2 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`
                          ${endpoint.method === 'POST' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                          ${endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
                          font-mono
                        `}
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="font-mono text-sm text-gray-900">{endpoint.path}</code>
                    </div>
                    {endpoint.authRequired && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Auth Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{endpoint.description}</p>
                  <p className="text-xs text-gray-500">
                    Rate Limit: <span className="font-semibold">{endpoint.rateLimit}</span>
                  </p>
                </Card>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Code Examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="p-8 bg-white rounded-2xl shadow-xl border-2">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-[#003DA5]/10 p-3 rounded-xl">
                <Book className="w-6 h-6 text-[#003DA5]" />
              </div>
              <div>
                <h2 
                  className="font-bold mb-2"
                  style={{
                    fontSize: '24px',
                    lineHeight: '32px',
                    color: '#1F2937'
                  }}
                >
                  Ejemplos de Código
                </h2>
                <p className="text-gray-600">
                  Implementaciones en múltiples lenguajes de programación
                </p>
              </div>
            </div>

            <Tabs defaultValue="validar" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="validar">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
              </TabsList>

              <TabsContent value="validar" className="space-y-4">
                {codeExamples.validar.map((example, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{example.language}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyCode(example.code, example.language)}
                      >
                        {copiedCode === example.language ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm text-gray-100">
                        <code>{example.code}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="response" className="space-y-4">
                {codeExamples.response.map((example, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{example.language}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyCode(example.code, 'Response')}
                      >
                        {copiedCode === 'Response' ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm text-gray-100">
                        <code>{example.code}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <Card className="p-6 bg-amber-50 border-2 border-amber-200">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Seguridad y Mejores Prácticas</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Nunca expongas tu API Key en el código del cliente (frontend)</li>
                  <li>Utiliza HTTPS para todas las llamadas a la API</li>
                  <li>Implementa rate limiting en tu aplicación</li>
                  <li>Registra webhooks para notificaciones en tiempo real</li>
                  <li>Usa el ambiente sandbox para pruebas antes de producción</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

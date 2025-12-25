/**
 * GRÁFICO DE DISTRIBUCIÓN DEL PTA
 * 
 * Gráfico circular (Pie Chart) mostrando la distribución
 * de horas entre los 5 componentes del PTA
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PTADistribucionChartProps {
  componenteDocencia: { horas: number; porcentaje: number };
  componenteInvestigacion: { horas: number; porcentaje: number };
  componenteExtension: { horas: number; porcentaje: number };
  componenteComplementarias: { horas: number; porcentaje: number };
  componenteAdministrativas: { horas: number; porcentaje: number };
}

export function PTADistribucionChart({
  componenteDocencia,
  componenteInvestigacion,
  componenteExtension,
  componenteComplementarias,
  componenteAdministrativas
}: PTADistribucionChartProps) {
  
  // Preparar datos para el gráfico
  const data = [
    {
      name: 'Docencia',
      value: componenteDocencia.horas,
      porcentaje: componenteDocencia.porcentaje,
      color: '#3b82f6' // blue-500
    },
    {
      name: 'Investigación',
      value: componenteInvestigacion.horas,
      porcentaje: componenteInvestigacion.porcentaje,
      color: '#9333ea' // purple-600
    },
    {
      name: 'Extensión',
      value: componenteExtension.horas,
      porcentaje: componenteExtension.porcentaje,
      color: '#059669' // green-600
    },
    {
      name: 'Complementarias',
      value: componenteComplementarias.horas,
      porcentaje: componenteComplementarias.porcentaje,
      color: '#ea580c' // orange-600
    },
    {
      name: 'Administrativas',
      value: componenteAdministrativas.horas,
      porcentaje: componenteAdministrativas.porcentaje,
      color: '#dc2626' // red-600
    }
  ].filter(item => item.value > 0); // Solo mostrar componentes con horas
  
  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            {payload[0].value}h ({payload[0].payload.porcentaje.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Label personalizado
  const renderCustomLabel = (entry: any) => {
    return `${entry.porcentaje.toFixed(0)}%`;
  };
  
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p>No hay datos para mostrar</p>
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value, entry: any) => {
            const item = data.find(d => d.name === value);
            return `${value} (${item?.value}h)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

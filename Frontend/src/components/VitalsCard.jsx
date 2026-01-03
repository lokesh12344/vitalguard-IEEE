import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Heart, Thermometer, Activity, Wind } from 'lucide-react';

const iconMap = {
  heartRate: Heart,
  temperature: Thermometer,
  spO2: Activity,
  respiratoryRate: Wind,
  bloodPressure: Activity,
};

const colorMap = {
  normal: 'text-green-600',
  warning: 'text-yellow-600',
  critical: 'text-red-600',
};

const bgColorMap = {
  normal: 'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  critical: 'bg-red-50 border-red-200',
};

const VitalsCard = ({ 
  title, 
  value, 
  unit, 
  status = 'normal', 
  icon: iconType = 'heartRate',
  trend,
  subtitle,
  className 
}) => {
  const Icon = iconMap[iconType] || Heart;
  
  return (
    <Card className={cn('transition-all hover:shadow-md', bgColorMap[status], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className={cn('h-5 w-5', colorMap[status])} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2">
          <span className={cn('text-3xl font-bold', colorMap[status])}>
            {value}
          </span>
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <span className={cn(
              'text-xs font-medium',
              trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-blue-500' : 'text-gray-500'
            )}>
              {trend === 'up' ? '↑ Rising' : trend === 'down' ? '↓ Falling' : '→ Stable'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VitalsCard;

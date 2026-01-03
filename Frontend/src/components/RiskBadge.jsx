import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Shield, ShieldCheck } from 'lucide-react';

const variantMap = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

const labelMap = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

const iconMap = {
  low: ShieldCheck,
  medium: Shield,
  high: AlertTriangle,
};

const RiskBadge = ({ 
  level, 
  showIcon = true, 
  showScore = false, 
  score,
  size = 'default',
  className 
}) => {
  const Icon = iconMap[level] || Shield;
  
  return (
    <Badge 
      variant={variantMap[level]} 
      className={cn(
        "gap-1",
        size === 'lg' && "px-3 py-1 text-sm",
        className
      )}
    >
      {showIcon && <Icon className={cn("h-3 w-3", size === 'lg' && "h-4 w-4")} />}
      <span>{labelMap[level]}</span>
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-75">({score})</span>
      )}
    </Badge>
  );
};

// Larger risk indicator card component
export const RiskIndicator = ({ level, score, factors = [], className }) => {
  const Icon = iconMap[level] || Shield;
  
  const bgColorMap = {
    low: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900',
    medium: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900',
    high: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900',
  };
  
  const textColorMap = {
    low: 'text-green-700 dark:text-green-400',
    medium: 'text-yellow-700 dark:text-yellow-400',
    high: 'text-red-700 dark:text-red-400',
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-colors",
      bgColorMap[level],
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-6 w-6", textColorMap[level])} />
          <span className={cn("text-lg font-semibold", textColorMap[level])}>
            {labelMap[level]}
          </span>
        </div>
        {score !== undefined && (
          <span className={cn(
            "text-2xl font-bold",
            textColorMap[level]
          )}>
            {score}
          </span>
        )}
      </div>
      {factors.length > 0 && (
        <div className="space-y-1 mt-3 pt-3 border-t border-current/10">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Risk Factors:</p>
          {factors.map((factor, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{factor.name}</span>
              <span className={cn(
                "font-medium",
                factor.impact === 'high' ? 'text-red-600 dark:text-red-400' : 
                factor.impact === 'moderate' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
              )}>
                {factor.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RiskBadge;

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, CheckCircle, X } from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';

const iconMap = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
  success: CheckCircle,
};

const colorMap = {
  critical: 'bg-red-50 border-red-300 text-red-800',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
  success: 'bg-green-50 border-green-300 text-green-800',
};

const iconColorMap = {
  critical: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
  success: 'text-green-500',
};

const AlertBanner = ({ 
  alerts, 
  title = "Recent Alerts",
  maxDisplay = 5,
  showAcknowledge = false,
  onAcknowledge,
  compact = false
}) => {
  const displayAlerts = alerts.slice(0, maxDisplay);

  if (compact) {
    return (
      <div className="space-y-2">
        {displayAlerts.map((alert) => {
          const Icon = iconMap[alert.type] || Info;
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                colorMap[alert.type]
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", iconColorMap[alert.type])} />
                <span className="text-sm font-medium">{alert.message}</span>
              </div>
              <span className="text-xs opacity-75">
                {formatTimeAgo(alert.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          {title}
        </h3>
        <div className="space-y-3">
          {displayAlerts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No alerts at this time</p>
          ) : (
            displayAlerts.map((alert) => {
              const Icon = iconMap[alert.type] || Info;
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start justify-between p-4 rounded-lg border transition-all",
                    colorMap[alert.type],
                    alert.acknowledged && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5", iconColorMap[alert.type])} />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {formatTimeAgo(alert.timestamp)}
                        {alert.vital && alert.value && (
                          <span className="ml-2">• {alert.vital}: {alert.value}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {showAcknowledge && !alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAcknowledge?.(alert.id)}
                      className="hover:bg-white/50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {alert.acknowledged && (
                    <span className="text-xs bg-white/50 px-2 py-1 rounded">
                      Acknowledged
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
        {alerts.length > maxDisplay && (
          <Button variant="link" className="w-full mt-3">
            View all {alerts.length} alerts
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertBanner;

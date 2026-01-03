import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RiskBadge from '@/components/RiskBadge';
import { formatTimeAgo } from '@/lib/utils';
import { User, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PatientList = ({ 
  patients, 
  onPatientClick, 
  selectedPatientId,
  title = "Patients",
  showAlertCount = true 
}) => {
  const getActiveAlertCount = (patient) => {
    return patient.alerts?.filter(a => a.active).length || 0;
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-500" />
          {title}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({patients.length})
          </span>
        </h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {patients.map((patient) => {
            const alertCount = getActiveAlertCount(patient);
            const isSelected = selectedPatientId === patient.id;
            
            return (
              <div
                key={patient.id}
                onClick={() => onPatientClick?.(patient)}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all",
                  "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 dark:hover:shadow-slate-900/50",
                  isSelected 
                    ? "bg-blue-50 border-blue-400 shadow-md dark:bg-blue-950/50 dark:border-blue-700" 
                    : "bg-white border-gray-200 dark:bg-slate-800/50 dark:border-slate-700"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                      patient.riskLevel === 'high' ? 'bg-red-500' :
                      patient.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    )}>
                      {patient.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">{patient.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {patient.age} yrs • {patient.gender}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {patient.condition}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform",
                    isSelected && "transform rotate-90"
                  )} />
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                  <RiskBadge level={patient.riskLevel} showScore score={patient.riskScore} />
                  
                  <div className="flex items-center gap-3">
                    {showAlertCount && alertCount > 0 && (
                      <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">{alertCount}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">
                        {formatTimeAgo(patient.lastUpdated)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientList;

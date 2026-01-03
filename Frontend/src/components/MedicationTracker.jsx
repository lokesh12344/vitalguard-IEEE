import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';

const MedicationTracker = ({ medications, title = "Today's Medications", showAdherence = false }) => {
  const takenCount = medications.filter(m => m.taken).length;
  const totalCount = medications.length;
  const adherencePercent = Math.round((takenCount / totalCount) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Pill className="h-5 w-5 text-blue-500" />
            {title}
          </CardTitle>
          <Badge variant={adherencePercent >= 80 ? 'success' : adherencePercent >= 50 ? 'warning' : 'danger'}>
            {takenCount}/{totalCount} taken
          </Badge>
        </div>
        {showAdherence && (
          <div className="mt-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Adherence</span>
              <span>{adherencePercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all",
                  adherencePercent >= 80 ? 'bg-green-500' : adherencePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${adherencePercent}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {medications.map((med) => (
          <div
            key={med.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              med.taken 
                ? "bg-green-50 border-green-200" 
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                med.taken ? "bg-green-500" : "bg-gray-300"
              )}>
                {med.taken ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Clock className="h-4 w-4 text-white" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-800">{med.name}</p>
                <p className="text-sm text-gray-500">{med.dosage} • {med.schedule}</p>
                {med.purpose && (
                  <p className="text-xs text-gray-400 mt-0.5">{med.purpose}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              {med.taken ? (
                <div>
                  <Badge variant="success">Taken</Badge>
                  {med.takenAt && (
                    <p className="text-xs text-gray-500 mt-1">{med.takenAt}</p>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  Pending
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MedicationTracker;

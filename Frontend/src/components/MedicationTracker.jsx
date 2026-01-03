import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Pill, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const MedicationTracker = ({ medications: initialMedications, title = "Today's Medications", showAdherence = false, onMedicationToggle }) => {
  const [medications, setMedications] = useState(initialMedications);
  const [showMissedAlert, setShowMissedAlert] = useState(false);
  const [missedMedication, setMissedMedication] = useState(null);

  const takenCount = medications.filter(m => m.taken).length;
  const totalCount = medications.length;
  const adherencePercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const handleToggleMedication = (medId, markAsTaken) => {
    const med = medications.find(m => m.id === medId);
    
    if (!markAsTaken) {
      // Show alert popup when marking as not taken
      setMissedMedication(med);
      setShowMissedAlert(true);
    }
    
    setMedications(prev => prev.map(m => 
      m.id === medId 
        ? { ...m, taken: markAsTaken, takenAt: markAsTaken ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null }
        : m
    ));
    
    // Callback to parent if provided
    if (onMedicationToggle) {
      onMedicationToggle(medId, markAsTaken);
    }
  };

  const closeMissedAlert = () => {
    setShowMissedAlert(false);
    setMissedMedication(null);
  };

  return (
    <>
      {/* Missed Medication Alert Popup */}
      {showMissedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl border border-red-200 dark:border-red-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Medication Reminder</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{missedMedication?.name}</p>
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-300 font-medium mb-2">
                ⚠️ Please don't miss your medication!
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Skipping medications can affect your treatment progress. If you're experiencing side effects or have concerns, please consult your doctor before stopping any medication.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={closeMissedAlert}
              >
                I'll take it later
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  handleToggleMedication(missedMedication.id, true);
                  closeMissedAlert();
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                Mark as Taken
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Pill className="h-5 w-5 text-blue-500" />
              {title}
            </CardTitle>
            <Badge variant={adherencePercent >= 80 ? 'success' : adherencePercent >= 50 ? 'warning' : 'danger'}>
              {takenCount}/{totalCount} taken
            </Badge>
          </div>
          {showAdherence && (
            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>Adherence</span>
                <span>{adherencePercent}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
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
                  ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900" 
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  med.taken ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"
                )}>
                  {med.taken ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <Clock className="h-4 w-4 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{med.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{med.dosage} • {med.schedule}</p>
                  {med.purpose && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{med.purpose}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {med.taken ? (
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <Badge variant="success">Taken</Badge>
                      {med.takenAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{med.takenAt}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => handleToggleMedication(med.id, false)}
                      title="Mark as not taken"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      onClick={() => handleToggleMedication(med.id, false)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleToggleMedication(med.id, true)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Taken
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};

export default MedicationTracker;

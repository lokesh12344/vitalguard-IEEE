import React, { useState } from 'react';
import VitalsCard from '@/components/VitalsCard';
import AlertBanner from '@/components/AlertBanner';
import RiskBadge from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getLinkedPatients } from '@/mock/mockPatients';
import { 
  Heart, 
  Phone, 
  Bell,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Pill,
  MessageCircle
} from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';

const CaretakerDashboard = () => {
  const linkedPatients = getLinkedPatients();
  const [selectedPatient, setSelectedPatient] = useState(linkedPatients[0]);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState(null);

  const handleEmergencyCall = (type) => {
    setCallType(type);
    setCallDialogOpen(true);
  };

  // Calculate daily summary for selected patient
  const getDailySummary = (patient) => {
    const takenMeds = patient.medications.filter(m => m.adherence >= 80).length;
    const totalMeds = patient.medications.length;
    const activeAlerts = patient.alerts.filter(a => a.active).length;
    const resolvedAlerts = patient.alerts.filter(a => !a.active).length;
    
    return {
      medicationsTaken: takenMeds,
      medicationsTotal: totalMeds,
      activeAlerts,
      resolvedAlerts,
      avgAdherence: Math.round(
        patient.medications.reduce((sum, m) => sum + m.adherence, 0) / totalMeds
      )
    };
  };

  const summary = getDailySummary(selectedPatient);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caretaker Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Monitor and care for your linked patients
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Linked Patients Selector */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <User className="h-5 w-5 text-purple-500" />
          Linked Patients
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {linkedPatients.map((patient) => (
            <Card 
              key={patient.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedPatient?.id === patient.id && "ring-2 ring-purple-500 bg-purple-50"
              )}
              onClick={() => setSelectedPatient(patient)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold",
                    patient.riskLevel === 'high' ? 'bg-red-500' :
                    patient.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  )}>
                    {patient.avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{patient.name}</h3>
                    <p className="text-sm text-gray-500">{patient.age} yrs • {patient.condition.split(',')[0]}</p>
                  </div>
                  <RiskBadge level={patient.riskLevel} showIcon={false} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedPatient && (
        <>
          {/* Current Health Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Status Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    {selectedPatient.name}'s Health Status
                  </CardTitle>
                  <Badge variant="outline" className="text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated {formatTimeAgo(selectedPatient.lastUpdated)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <VitalsCard
                    title="Heart Rate"
                    value={selectedPatient.vitals.current.heartRate.value}
                    unit={selectedPatient.vitals.current.heartRate.unit}
                    status={selectedPatient.vitals.current.heartRate.status}
                    icon="heartRate"
                  />
                  <VitalsCard
                    title="Temperature"
                    value={selectedPatient.vitals.current.temperature.value}
                    unit={selectedPatient.vitals.current.temperature.unit}
                    status={selectedPatient.vitals.current.temperature.status}
                    icon="temperature"
                  />
                  <VitalsCard
                    title="SpO₂"
                    value={selectedPatient.vitals.current.spO2.value}
                    unit={selectedPatient.vitals.current.spO2.unit}
                    status={selectedPatient.vitals.current.spO2.status}
                    icon="spO2"
                  />
                  <VitalsCard
                    title="Blood Pressure"
                    value={`${selectedPatient.vitals.current.bloodPressure.systolic}/${selectedPatient.vitals.current.bloodPressure.diastolic}`}
                    unit={selectedPatient.vitals.current.bloodPressure.unit}
                    status="normal"
                    icon="bloodPressure"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5 text-green-500" />
                  Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="danger" 
                  className="w-full gap-2"
                  onClick={() => handleEmergencyCall('emergency')}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Call Emergency (911)
                </Button>
                <Button 
                  variant="default" 
                  className="w-full gap-2"
                  onClick={() => handleEmergencyCall('doctor')}
                >
                  <Phone className="h-4 w-4" />
                  Call Doctor
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => handleEmergencyCall('family')}
                >
                  <MessageCircle className="h-4 w-4" />
                  Contact Family
                </Button>
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">Assigned Doctor:</p>
                  <p className="text-sm font-medium">{selectedPatient.assignedDoctor}</p>
                  <p className="text-xs text-gray-500 mt-2 mb-1">Emergency Contact:</p>
                  <p className="text-sm font-medium">{selectedPatient.emergencyContact}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Summary & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Today's Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Medication Status */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800 flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Medication Adherence
                    </span>
                    <Badge variant={summary.avgAdherence >= 80 ? 'success' : summary.avgAdherence >= 50 ? 'warning' : 'danger'}>
                      {summary.avgAdherence}% avg
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {selectedPatient.medications.map((med, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-blue-700">{med.name}</span>
                        <div className="flex items-center gap-2">
                          {med.adherence >= 80 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className={cn(
                            "text-xs",
                            med.adherence >= 80 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {med.adherence}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alert Summary */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-orange-800 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Alert Summary
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{summary.activeAlerts}</p>
                      <p className="text-xs text-gray-600">Active Alerts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{summary.resolvedAlerts}</p>
                      <p className="text-xs text-gray-600">Resolved Today</p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <Activity className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-700">
                      {selectedPatient.vitals.current.heartRate.value}
                    </p>
                    <p className="text-xs text-green-600">Current HR</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <Activity className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-purple-700">
                      {selectedPatient.vitals.current.spO2.value}%
                    </p>
                    <p className="text-xs text-purple-600">Current SpO₂</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts & Notifications */}
            <AlertBanner 
              alerts={selectedPatient.alerts.map((a, i) => ({
                id: i,
                type: a.type,
                message: a.message,
                timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
                acknowledged: !a.active
              }))}
              title="Alerts & Notifications"
              showAcknowledge
              onAcknowledge={(id) => console.log('Acknowledged:', id)}
            />
          </div>

          {/* Patient Notes */}
          {selectedPatient.notes && (
            <Card>
              <CardContent className="p-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Care Notes</h4>
                  <p className="text-sm text-gray-600">{selectedPatient.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Call Confirmation Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500" />
              {callType === 'emergency' ? 'Call Emergency Services' :
               callType === 'doctor' ? 'Call Doctor' : 'Contact Family'}
            </DialogTitle>
            <DialogDescription>
              {callType === 'emergency' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <p className="text-red-800 font-medium">
                    You are about to call 911 Emergency Services.
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    Only proceed if this is a genuine medical emergency.
                  </p>
                </div>
              ) : callType === 'doctor' ? (
                <div className="mt-4">
                  <p className="text-gray-600">Calling {selectedPatient?.assignedDoctor}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    The doctor will receive patient context before the call connects.
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-gray-600">Contacting family at {selectedPatient?.emergencyContact}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    You can share patient status updates with family members.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={callType === 'emergency' ? 'danger' : 'default'}
              onClick={() => {
                // In real app, this would initiate a call
                alert(`Calling ${callType}... (Demo)`);
                setCallDialogOpen(false);
              }}
            >
              <Phone className="h-4 w-4 mr-2" />
              Confirm Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaretakerDashboard;

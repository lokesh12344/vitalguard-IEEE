import React, { useState, useEffect, useMemo } from 'react';
import VitalsCard from '@/components/VitalsCard';
import VitalsChart from '@/components/VitalsChart';
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
import { usePatients, useAlerts } from '@/hooks/useVitalGuard';
import { api } from '@/services/api';
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
  MessageCircle,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';

// Current caretaker ID - In a real app, this would come from auth context
const CURRENT_CARETAKER_ID = 1;

const CaretakerDashboard = () => {
  const { patients: linkedPatients, loading, error, refetch } = usePatients('caretaker', CURRENT_CARETAKER_ID);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState(null);

  // Set first patient as selected when data loads
  useEffect(() => {
    if (linkedPatients && linkedPatients.length > 0 && !selectedPatient) {
      setSelectedPatient(linkedPatients[0]);
    }
  }, [linkedPatients, selectedPatient]);

  // Fetch patient details when selected
  useEffect(() => {
    if (!selectedPatient) return;

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const [vitals, medications, alerts, history] = await Promise.all([
          api.getCurrentVitals(selectedPatient.id),
          api.getMedications(selectedPatient.id),
          api.getPatientAlerts(selectedPatient.id),
          api.getVitalsHistory(selectedPatient.id, 24)
        ]);
        setPatientDetails({
          vitals,
          medications,
          alerts,
          history
        });
      } catch (err) {
        console.error('Error fetching patient details:', err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedPatient?.id]);

  // Chart data for selected patient
  const chartData = useMemo(() => {
    if (!patientDetails?.history || patientDetails.history.length === 0) {
      return { heartRate: [], spO2: [], temperature: [], bloodPressure: { systolic: [], diastolic: [] } };
    }

    return {
      heartRate: patientDetails.history.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: v.heart_rate
      })),
      spO2: patientDetails.history.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: v.spo2
      })),
      temperature: patientDetails.history.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: v.temperature
      })),
      bloodPressure: {
        systolic: patientDetails.history.map(v => ({
          label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          value: v.blood_pressure_systolic
        })),
        diastolic: patientDetails.history.map(v => ({
          label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          value: v.blood_pressure_diastolic
        }))
      }
    };
  }, [patientDetails?.history]);

  const handleEmergencyCall = (type) => {
    setCallType(type);
    setCallDialogOpen(true);
  };

  // Calculate daily summary for selected patient
  const summary = useMemo(() => {
    if (!patientDetails) {
      return {
        medicationsTaken: 0,
        medicationsTotal: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        avgAdherence: 0
      };
    }

    const { medications, alerts } = patientDetails;
    const takenMeds = medications.filter(m => m.adherence >= 80).length;
    const totalMeds = medications.length;
    const activeAlerts = alerts.filter(a => a.active).length;
    const resolvedAlerts = alerts.filter(a => !a.active).length;
    
    return {
      medicationsTaken: takenMeds,
      medicationsTotal: totalMeds,
      activeAlerts,
      resolvedAlerts,
      avgAdherence: totalMeds > 0 
        ? Math.round(medications.reduce((sum, m) => sum + m.adherence, 0) / totalMeds)
        : 0
    };
  }, [patientDetails]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Failed to load patient data</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Caretaker Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor and care for your linked patients
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-green-600 dark:text-green-400">Live monitoring active</span>
        <span className="text-gray-400">• Real-time updates enabled</span>
      </div>

      {/* Linked Patients Selector */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
          <User className="h-5 w-5 text-purple-500" />
          Linked Patients ({linkedPatients?.length || 0})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {linkedPatients?.map((patient) => (
            <Card 
              key={patient.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md dark:bg-slate-800/50 dark:border-slate-700",
                selectedPatient?.id === patient.id && "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/30"
              )}
              onClick={() => setSelectedPatient(patient)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold",
                    patient.risk_level === 'high' || patient.risk_level === 'critical' ? 'bg-red-500' :
                    patient.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  )}>
                    {patient.avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{patient.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{patient.age} yrs • {patient.condition?.split(',')[0] || 'N/A'}</p>
                  </div>
                  <RiskBadge level={patient.risk_level} showIcon={false} />
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
            <Card className="lg:col-span-2 dark:bg-slate-800/50 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Heart className="h-5 w-5 text-red-500" />
                    {selectedPatient.name}'s Health Status
                  </CardTitle>
                  <Badge variant="outline" className="text-gray-500 dark:text-gray-400 dark:border-slate-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated {selectedPatient.last_updated ? formatTimeAgo(selectedPatient.last_updated) : 'recently'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : patientDetails?.vitals ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <VitalsCard
                      title="Heart Rate"
                      value={patientDetails.vitals.heart_rate?.value || '--'}
                      unit="bpm"
                      status={patientDetails.vitals.heart_rate?.status || 'normal'}
                      icon="heartRate"
                    />
                    <VitalsCard
                      title="Temperature"
                      value={patientDetails.vitals.temperature?.value || '--'}
                      unit="°C"
                      status={patientDetails.vitals.temperature?.status || 'normal'}
                      icon="temperature"
                    />
                    <VitalsCard
                      title="SpO₂"
                      value={patientDetails.vitals.spo2?.value || '--'}
                      unit="%"
                      status={patientDetails.vitals.spo2?.status || 'normal'}
                      icon="spO2"
                    />
                    <VitalsCard
                      title="Blood Pressure"
                      value={patientDetails.vitals.blood_pressure?.systolic && patientDetails.vitals.blood_pressure?.diastolic
                        ? `${patientDetails.vitals.blood_pressure.systolic}/${patientDetails.vitals.blood_pressure.diastolic}`
                        : '--'}
                      unit="mmHg"
                      status={patientDetails.vitals.blood_pressure?.status || 'normal'}
                      icon="bloodPressure"
                    />
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No vitals data available</p>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact Buttons */}
            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
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
                <div className="pt-2 border-t dark:border-slate-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned Doctor:</p>
                  <p className="text-sm font-medium dark:text-gray-100">{selectedPatient.doctor_name || 'Not assigned'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Emergency Contact:</p>
                  <p className="text-sm font-medium dark:text-gray-100">{selectedPatient.emergency_contact || 'Not set'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Summary & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Summary */}
            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Today's Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Medication Status */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Medication Adherence
                    </span>
                    <Badge variant={summary.avgAdherence >= 80 ? 'success' : summary.avgAdherence >= 50 ? 'warning' : 'danger'}>
                      {summary.avgAdherence}% avg
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {patientDetails?.medications?.map((med, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-blue-700 dark:text-blue-200">{med.name}</span>
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
                    )) || <p className="text-sm text-gray-500">No medications found</p>}
                  </div>
                </div>

                {/* Alert Summary */}
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Alert Summary
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.activeAlerts}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Active Alerts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.resolvedAlerts}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Resolved Today</p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <Activity className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">
                      {patientDetails?.vitals?.heart_rate?.value || '--'}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300">Current HR</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <Activity className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                      {patientDetails?.vitals?.spo2?.value || '--'}%
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-300">Current SpO₂</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts & Notifications */}
            {patientDetails?.alerts && patientDetails.alerts.length > 0 ? (
              <AlertBanner 
                alerts={patientDetails.alerts.map((a) => ({
                  id: a.id,
                  type: a.severity,
                  message: a.message,
                  timestamp: a.timestamp,
                  acknowledged: !a.active
                }))}
                title="Alerts & Notifications"
                showAcknowledge
                onAcknowledge={(id) => console.log('Acknowledged:', id)}
              />
            ) : (
              <Card className="dark:bg-slate-800/50 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
                    <Bell className="h-5 w-5 text-orange-500" />
                    Alerts & Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No active alerts</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Vitals Trend Charts */}
          {chartData.heartRate.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Activity className="h-5 w-5 text-red-500" />
                Vitals Trends (24h)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <VitalsChart
                  title="Heart Rate"
                  data={chartData.heartRate}
                  dataLabel="BPM"
                  color="#ef4444"
                  height={200}
                />
                <VitalsChart
                  title="Blood Oxygen (SpO₂)"
                  data={chartData.spO2}
                  dataLabel="%"
                  color="#3b82f6"
                  height={200}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <VitalsChart
                  title="Temperature"
                  data={chartData.temperature}
                  dataLabel="°C"
                  color="#f59e0b"
                  height={200}
                />
                <VitalsChart
                  title="Blood Pressure"
                  data={chartData.bloodPressure.systolic}
                  dataLabel="Systolic"
                  color="#8b5cf6"
                  height={200}
                  showLegend={true}
                  secondaryData={chartData.bloodPressure.diastolic}
                  secondaryLabel="Diastolic"
                  secondaryColor="#06b6d4"
                />
              </div>
            </div>
          )}

          {/* Patient Notes */}
          {selectedPatient.condition && (
            <Card className="dark:bg-slate-800/50 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Care Notes</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Patient condition: {selectedPatient.condition}. Regular monitoring and medication adherence required.
                  </p>
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
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                  <p className="text-red-800 dark:text-red-300 font-medium">
                    You are about to call 911 Emergency Services.
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                    Only proceed if this is a genuine medical emergency.
                  </p>
                </div>
              ) : callType === 'doctor' ? (
                <div className="mt-4">
                  <p className="text-gray-600 dark:text-gray-300">Calling {selectedPatient?.doctor_name || 'Doctor'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    The doctor will receive patient context before the call connects.
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-gray-600 dark:text-gray-300">Contacting family at {selectedPatient?.emergency_contact || 'Emergency contact'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
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

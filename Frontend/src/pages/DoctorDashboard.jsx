import React, { useState, useEffect, useMemo } from 'react';
import PatientList from '@/components/PatientList';
import VitalsCard from '@/components/VitalsCard';
import VitalsChart from '@/components/VitalsChart';
import AlertBanner from '@/components/AlertBanner';
import RiskBadge from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePatients, useAlerts, useVitalsHistory } from '@/hooks/useVitalGuard';
import { api } from '@/services/api';
import { 
  Users, 
  AlertTriangle, 
  Activity,
  Calendar,
  Clock,
  FileText,
  Phone,
  Mail,
  MapPin,
  X,
  Pill,
  TrendingUp,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';

// Current doctor ID - In a real app, this would come from auth context
const CURRENT_DOCTOR_ID = 1;

const DoctorDashboard = () => {
  const { patients, loading: patientsLoading, error: patientsError, refetch: refetchPatients } = usePatients('doctor', CURRENT_DOCTOR_ID);
  const { alerts, loading: alertsLoading, acknowledgeAlert, refetch: refetchAlerts } = useAlerts(24);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientVitals, setPatientVitals] = useState(null);
  const [patientMedications, setPatientMedications] = useState([]);
  const [patientAlerts, setPatientAlerts] = useState([]);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [loadingPatientData, setLoadingPatientData] = useState(false);

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    if (!patients || patients.length === 0) {
      return {
        totalPatients: 0,
        highRiskCount: 0,
        activeAlerts: 0,
        averageAdherence: 0
      };
    }

    return {
      totalPatients: patients.length,
      highRiskCount: patients.filter(p => p.risk_level === 'high' || p.risk_level === 'critical').length,
      activeAlerts: alerts?.filter(a => a.active)?.length || 0,
      averageAdherence: 85 // Would be calculated from medications data
    };
  }, [patients, alerts]);

  // Transform patients for PatientList component
  const patientsByRisk = useMemo(() => {
    if (!patients) return [];
    
    return patients.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      avatar: p.avatar,
      condition: p.condition,
      riskLevel: p.risk_level,
      riskScore: p.risk_level === 'critical' ? 90 : p.risk_level === 'high' ? 75 : p.risk_level === 'medium' ? 50 : 25,
      lastUpdated: p.last_updated,
      gender: 'Unknown',
      emergencyContact: p.emergency_contact,
      assignedDoctor: p.doctor_name,
      caretaker: p.caretaker_name,
    }));
  }, [patients]);

  // Fetch patient details when selected
  useEffect(() => {
    if (!selectedPatient) return;

    const fetchPatientData = async () => {
      setLoadingPatientData(true);
      try {
        const [vitals, meds, patientAlertsData, history] = await Promise.all([
          api.getCurrentVitals(selectedPatient.id),
          api.getMedications(selectedPatient.id),
          api.getPatientAlerts(selectedPatient.id),
          api.getVitalsHistory(selectedPatient.id, 24)
        ]);
        
        setPatientVitals(vitals);
        setPatientMedications(meds);
        setPatientAlerts(patientAlertsData);
        setVitalsHistory(history);
      } catch (err) {
        console.error('Error fetching patient data:', err);
      } finally {
        setLoadingPatientData(false);
      }
    };

    fetchPatientData();
  }, [selectedPatient?.id]);

  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
  };

  const closePatientDetail = () => {
    setSelectedPatient(null);
    setPatientVitals(null);
    setPatientMedications([]);
    setPatientAlerts([]);
    setVitalsHistory([]);
  };

  const handleRefresh = () => {
    refetchPatients();
    refetchAlerts();
  };

  // Chart data from history
  const chartData = useMemo(() => {
    if (!vitalsHistory || vitalsHistory.length === 0) {
      return { heartRate: [], spO2: [] };
    }

    return {
      heartRate: vitalsHistory.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: v.heart_rate
      })),
      spO2: vitalsHistory.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: v.spo2
      })),
      temperature: vitalsHistory.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: v.temperature
      })),
      bloodPressure: {
        systolic: vitalsHistory.map(v => ({
          label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          value: v.blood_pressure_systolic
        })),
        diastolic: vitalsHistory.map(v => ({
          label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          value: v.blood_pressure_diastolic
        }))
      }
    };
  }, [vitalsHistory]);

  // Loading state
  if (patientsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (patientsError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Failed to load patient data</p>
          <Button onClick={refetchPatients} variant="outline">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Doctor Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome, Dr. Priya Sharma. You have {dashboardStats.totalPatients} patients under your care.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalPatients}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/50 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">High Risk</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{dashboardStats.highRiskCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.activeAlerts}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/50 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Adherence</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.averageAdherence}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950/50 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="lg:col-span-1">
          <PatientList
            patients={patientsByRisk}
            onPatientClick={handlePatientClick}
            selectedPatientId={selectedPatient?.id}
            title="Patients by Risk"
          />
        </div>

        {/* Patient Detail View */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <Card className="h-full dark:bg-slate-800/50 dark:border-slate-700">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg",
                      selectedPatient.riskLevel === 'high' || selectedPatient.riskLevel === 'critical' ? 'bg-red-500' :
                      selectedPatient.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    )}>
                      {selectedPatient.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-xl dark:text-white">{selectedPatient.name}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedPatient.age} years old • ID: {selectedPatient.id}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <RiskBadge 
                          level={selectedPatient.riskLevel} 
                          showScore 
                          score={selectedPatient.riskScore}
                          size="lg"
                        />
                        <Badge variant="outline" className="text-gray-500 dark:text-gray-400 dark:border-slate-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Updated {selectedPatient.lastUpdated ? formatTimeAgo(selectedPatient.lastUpdated) : 'recently'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={closePatientDetail}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 overflow-auto max-h-[calc(100vh-300px)]">
                {loadingPatientData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <>
                    {/* Patient Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Activity className="h-4 w-4 text-gray-400" />
                          <span className="font-medium dark:text-gray-400">Condition:</span>
                          <span className="dark:text-gray-200">{selectedPatient.condition}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium dark:text-gray-400">Caretaker:</span>
                          <span className="dark:text-gray-200">{selectedPatient.caretaker || 'Not assigned'}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="font-medium dark:text-gray-400">Emergency:</span>
                          <span className="dark:text-gray-200">{selectedPatient.emergencyContact || 'Not set'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium dark:text-gray-400">Location:</span>
                          <span className="dark:text-gray-200">Home</span>
                        </div>
                      </div>
                    </div>

                    {/* Current Vitals */}
                    {patientVitals && (
                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-500" />
                          Current Vitals
                        </h4>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <VitalsCard
                            title="Heart Rate"
                            value={patientVitals.heart_rate?.value || '--'}
                            unit="bpm"
                            status={patientVitals.heart_rate?.status || 'normal'}
                            icon="heartRate"
                            compact
                          />
                          <VitalsCard
                            title="SpO₂"
                            value={patientVitals.spo2?.value || '--'}
                            unit="%"
                            status={patientVitals.spo2?.status || 'normal'}
                            icon="spO2"
                            compact
                          />
                          <VitalsCard
                            title="Temperature"
                            value={patientVitals.temperature?.value || '--'}
                            unit="°C"
                            status={patientVitals.temperature?.status || 'normal'}
                            icon="temperature"
                            compact
                          />
                          <VitalsCard
                            title="Blood Pressure"
                            value={patientVitals.blood_pressure?.systolic && patientVitals.blood_pressure?.diastolic
                              ? `${patientVitals.blood_pressure.systolic}/${patientVitals.blood_pressure.diastolic}`
                              : '--'}
                            unit="mmHg"
                            status={patientVitals.blood_pressure?.status || 'normal'}
                            icon="bloodPressure"
                            compact
                          />
                        </div>
                      </div>
                    )}

                    {/* Vitals Trend Charts */}
                    {chartData.heartRate.length > 0 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <VitalsChart
                            title="Heart Rate (24h)"
                            data={chartData.heartRate}
                            dataLabel="BPM"
                            color="#ef4444"
                            height={180}
                          />
                          <VitalsChart
                            title="Blood Oxygen SpO₂ (24h)"
                            data={chartData.spO2}
                            dataLabel="%"
                            color="#3b82f6"
                            height={180}
                          />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <VitalsChart
                            title="Temperature (24h)"
                            data={chartData.temperature}
                            dataLabel="°C"
                            color="#f59e0b"
                            height={180}
                          />
                          <VitalsChart
                            title="Blood Pressure (24h)"
                            data={chartData.bloodPressure.systolic}
                            dataLabel="Systolic"
                            color="#8b5cf6"
                            height={180}
                            showLegend={true}
                            secondaryData={chartData.bloodPressure.diastolic}
                            secondaryLabel="Diastolic"
                            secondaryColor="#06b6d4"
                          />
                        </div>
                      </div>
                    )}

                    {/* Medications */}
                    {patientMedications.length > 0 && (
                      <div className="bg-gray-50 dark:bg-slate-800/50 border dark:border-slate-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <Pill className="h-4 w-4 text-purple-500" />
                          Medication Adherence
                        </h4>
                        <div className="space-y-2">
                          {patientMedications.map((med, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-300">{med.name} ({med.dosage})</span>
                              <Badge variant={med.adherence >= 80 ? 'success' : med.adherence >= 50 ? 'warning' : 'danger'}>
                                {med.adherence}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alerts */}
                    {patientAlerts.length > 0 && (
                      <AlertBanner
                        alerts={patientAlerts.map(a => ({
                          id: a.id,
                          type: a.severity,
                          message: a.message,
                          timestamp: a.timestamp,
                          acknowledged: !a.active
                        }))}
                        compact
                      />
                    )}

                    {/* Notes */}
                    {selectedPatient.condition && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          Clinical Notes
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-200">
                          Patient condition: {selectedPatient.condition}. Regular monitoring required.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center dark:bg-slate-800/50 dark:border-slate-700">
              <CardContent className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Select a Patient</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Click on a patient from the list to view their detailed health information
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;

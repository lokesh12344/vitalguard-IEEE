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
import { api, alertNotifications, websocket } from '@/services/api';
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
  AlertCircle,
  Bell,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';

// Current doctor ID - In a real app, this would come from auth context
const CURRENT_DOCTOR_ID = 1;

// Auto-refresh interval in milliseconds (10 seconds)
const AUTO_REFRESH_INTERVAL = 10000;

const DoctorDashboard = () => {
  const { patients, loading: patientsLoading, error: patientsError, refetch: refetchPatients } = usePatients('doctor', CURRENT_DOCTOR_ID);
  const { alerts, loading: alertsLoading, acknowledgeAlert, refetch: refetchAlerts } = useAlerts(24);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientVitals, setPatientVitals] = useState(null);
  const [patientMedications, setPatientMedications] = useState([]);
  const [patientAlerts, setPatientAlerts] = useState([]);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [loadingPatientData, setLoadingPatientData] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Real-time alert notifications state
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [latestAlert, setLatestAlert] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [triggeringSOS, setTriggeringSOS] = useState(false);
  const [sosSuccess, setSosSuccess] = useState(false);

  // Subscribe to real-time high risk alerts and vital updates via WebSocket
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        await websocket.connect();
        websocket.subscribeToAlerts();
        console.log('✅ WebSocket connected and subscribed to alerts');

        // Listen for regular alerts from WebSocket (warnings, etc.)
        const handleWebSocketAlert = (alert) => {
          if (alert.severity === 'critical') {
            const formattedAlert = {
              ...alert,
              id: alert.id || `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: alert.created_at || new Date().toISOString(),
              type: 'high_risk',
              acknowledged: alert.is_acknowledged || false
            };
            setRealtimeAlerts(prev => [formattedAlert, ...prev].slice(0, 20));
          }
        };

        // Listen for HIGH RISK alerts specifically
        const handleHighRiskAlert = (alert) => {
          console.log('🚨🚨🚨 HIGH RISK ALERT:', alert);
          const formattedAlert = {
            ...alert,
            id: alert.id || `hr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            patientId: alert.patient_id,
            patientName: alert.patient_name,
            timestamp: alert.created_at || new Date().toISOString(),
            type: 'high_risk',
            acknowledged: false
          };
          setRealtimeAlerts(prev => [formattedAlert, ...prev].slice(0, 20));
          setLatestAlert(formattedAlert);
          setShowAlertPopup(true);
          if (soundEnabled) {
            alertNotifications.playAlertSound();
          }
          refetchPatients();
          refetchAlerts();
          setTimeout(() => {
            setShowAlertPopup(false);
          }, 15000);
        };

        // Listen for vital updates and refresh patient list
        const handleVitalUpdate = (data) => {
          // Any vital update should trigger a patient list refresh
          refetchPatients();
        };

        websocket.on('alert:new', handleWebSocketAlert);
        websocket.on('alert:high_risk', handleHighRiskAlert);
        websocket.on('vital:update', handleVitalUpdate);

        return () => {
          websocket.off('alert:new', handleWebSocketAlert);
          websocket.off('alert:high_risk', handleHighRiskAlert);
          websocket.off('vital:update', handleVitalUpdate);
        };
      } catch (err) {
        console.log('WebSocket connection failed, using fallback:', err);
      }
    };

    setupWebSocket();

    // Also keep in-memory alerts as fallback
    const unsubscribe = alertNotifications.onHighRiskAlert((alert) => {
      console.log('🚨 In-Memory Alert Received:', alert);
      const formattedAlert = {
        ...alert,
        id: alert.id || `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        patientId: alert.patientId || alert.patient_id,
        patientName: alert.patientName || alert.patient_name
      };
      setRealtimeAlerts(prev => [formattedAlert, ...prev].slice(0, 20));
      setLatestAlert(formattedAlert);
      setShowAlertPopup(true);
      setTimeout(() => {
        setShowAlertPopup(false);
      }, 10000);
    });

    // Also subscribe to general alerts
    const unsubscribeGeneral = alertNotifications.onAlert((alert) => {
      if (alert.type === 'high_risk') {
        const formattedAlert = {
          ...alert,
          id: alert.id || `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        setRealtimeAlerts(prev => [formattedAlert, ...prev].slice(0, 20));
      }
    });

    return () => {
      unsubscribe();
      unsubscribeGeneral();
    };
  }, []);

  // Auto-refresh patients list to show newly registered patients
  useEffect(() => {
    // Removed auto-refresh interval to prevent UI refresh issues
    // If you want to manually refresh, use the Refresh button in the UI
    // Data will still update on real-time events and manual refresh
    // No interval set here
  }, [refetchPatients, refetchAlerts]);

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
  // Only show high/critical risk if vitals are abnormal, else show medium/low
  const patientsByRisk = useMemo(() => {
    if (!patients) return [];
    return patients.map(p => {
      // If backend says low/medium, always show as such
      let riskLevel = p.risk_level;
      // If backend says high/critical, but all vitals are normal, downgrade to medium
      if ((p.risk_level === 'high' || p.risk_level === 'critical') && p.vitals && p.vitals.current) {
        const v = p.vitals.current;
        const allNormal = [v.heartRate, v.temperature, v.spO2, v.bloodPressure].every(
          vital => vital && (vital.status === 'normal' || vital.status === undefined)
        );
        if (allNormal) riskLevel = 'medium';
      }
      return {
        id: p.id,
        name: p.name,
        age: p.age,
        avatar: p.avatar,
        condition: p.condition,
        riskLevel,
        riskScore: riskLevel === 'critical' ? 90 : riskLevel === 'high' ? 75 : riskLevel === 'medium' ? 50 : 25,
        lastUpdated: p.last_updated,
        gender: 'Unknown',
        emergencyContact: p.emergency_contact,
        assignedDoctor: p.doctor_name,
        caretaker: p.caretaker_name,
      };
    });
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
      {/* Real-time Alert Popup */}
      {showAlertPopup && latestAlert && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <Card className="w-96 border-red-500 bg-red-50 dark:bg-red-950 shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-red-700 dark:text-red-300 text-lg">
                      🚨 High Risk Alert
                    </CardTitle>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {new Date(latestAlert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                  onClick={() => setShowAlertPopup(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="danger" className="text-sm">
                    Patient: {latestAlert.patientName}
                  </Badge>
                  <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400">
                    Risk Score: {latestAlert.riskScore}
                  </Badge>
                </div>
                
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  {latestAlert.message}
                </p>
                
                {latestAlert.vitals && (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-red-100 dark:bg-red-900/50 rounded-lg p-2">
                    <div className="flex justify-between">
                      <span className="text-red-600 dark:text-red-400">Heart Rate:</span>
                      <span className="font-bold text-red-700 dark:text-red-300">{latestAlert.vitals.heartRate} bpm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600 dark:text-red-400">SpO₂:</span>
                      <span className="font-bold text-red-700 dark:text-red-300">{latestAlert.vitals.spO2}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600 dark:text-red-400">Temp:</span>
                      <span className="font-bold text-red-700 dark:text-red-300">{latestAlert.vitals.temperature}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600 dark:text-red-400">BP:</span>
                      <span className="font-bold text-red-700 dark:text-red-300">{latestAlert.vitals.bloodPressure}</span>
                    </div>
                  </div>
                )}

                {latestAlert.factors && latestAlert.factors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">Risk Factors:</p>
                    <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                      {latestAlert.factors.map((factor, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={async () => {
                      // Acknowledge the alert
                      try {
                        if (latestAlert.id) {
                          await api.acknowledgeAlert(latestAlert.id);
                        }
                        alertNotifications.acknowledgeAlert(latestAlert.id);
                      } catch (err) {
                        console.log('Error acknowledging alert:', err);
                      }
                      setShowAlertPopup(false);
                      refetchAlerts();
                    }}
                  >
                    ✓ Acknowledge
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={triggeringSOS || sosSuccess}
                    onClick={async () => {
                      // Trigger Emergency SOS for this patient
                      setTriggeringSOS(true);
                      try {
                        await api.triggerSOS(
                          latestAlert.patientId,
                          null,
                          `Emergency SOS triggered by doctor for patient ${latestAlert.patientName}. Critical vitals detected.`
                        );
                        setSosSuccess(true);
                        // Reset after 3 seconds
                        setTimeout(() => {
                          setSosSuccess(false);
                          setShowAlertPopup(false);
                        }, 3000);
                      } catch (err) {
                        console.error('SOS Error:', err);
                        alert('Failed to send SOS: ' + err.message);
                      } finally {
                        setTriggeringSOS(false);
                      }
                    }}
                  >
                    {triggeringSOS ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Sending...
                      </>
                    ) : sosSuccess ? (
                      '✓ SOS Sent!'
                    ) : (
                      <>
                        <Phone className="h-4 w-4 mr-1" />
                        Emergency SOS
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Doctor Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome, Dr. Priya Sharma. You have {dashboardStats.totalPatients} patients under your care.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Real-time alerts indicator */}
          {realtimeAlerts.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="relative border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => {
                if (realtimeAlerts.length > 0) {
                  setLatestAlert(realtimeAlerts[0]);
                  setShowAlertPopup(true);
                }
              }}
            >
              <Bell className="h-4 w-4 mr-2" />
              Alerts
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                {realtimeAlerts.filter(a => !a.acknowledged).length}
              </span>
            </Button>
          )}
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
        <span className="text-gray-400">• Real-time alerts enabled</span>
        {realtimeAlerts.length > 0 && (
          <Badge variant="outline" className="ml-2 border-orange-500 text-orange-600 dark:text-orange-400">
            {realtimeAlerts.length} recent alert{realtimeAlerts.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Recent Alerts Banner (if any) */}
      {realtimeAlerts.length > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Real-time Alerts
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
                onClick={() => setRealtimeAlerts([])}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {realtimeAlerts.slice(0, 5).map((alert, index) => (
                <div 
                  key={`${alert.id}-${index}`} 
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer hover:shadow-md",
                    alert.type === 'high_risk' 
                      ? "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700" 
                      : "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700"
                  )}
                  onClick={() => {
                    setLatestAlert(alert);
                    setShowAlertPopup(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn(
                      "h-4 w-4",
                      alert.type === 'high_risk' ? "text-red-500" : "text-yellow-500"
                    )} />
                    <div>
                      <p className={cn(
                        "text-sm font-medium",
                        alert.type === 'high_risk' ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"
                      )}>
                        {alert.patientName} - {alert.type === 'high_risk' ? 'High Risk' : 'Warning'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={alert.type === 'high_risk' ? 'danger' : 'warning'}>
                    Score: {alert.riskScore}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

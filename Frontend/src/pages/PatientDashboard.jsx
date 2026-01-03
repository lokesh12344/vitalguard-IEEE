import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import VitalsCard from '@/components/VitalsCard';
import VitalsChart from '@/components/VitalsChart';
import MedicationTracker from '@/components/MedicationTracker';
import AlertBanner from '@/components/AlertBanner';
import { RiskIndicator } from '@/components/RiskBadge';
import SOSButton from '@/components/SOSButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePatientData, useVitalsHistory } from '@/hooks/useVitalGuard';
import { api, alertNotifications } from '@/services/api';
import { 
  Activity, 
  Calendar,
  Footprints,
  Moon,
  Droplets,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Save,
  CheckCircle,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Current patient ID - In a real app, this would come from auth context
const CURRENT_PATIENT_ID = 1;

const PatientDashboard = () => {
  const { patient, rawVitals, medications, alerts, loading, error, refetch } = usePatientData(CURRENT_PATIENT_ID);
  const { history: vitalsHistory, loading: historyLoading } = useVitalsHistory(CURRENT_PATIENT_ID, 24);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Simulation state
  const [simulationMode, setSimulationMode] = useState(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [simulatedVitals, setSimulatedVitals] = useState({
    heartRate: 75,
    temperature: 36.8,
    spO2: 98,
    systolic: 120,
    diastolic: 80
  });
  const [simulatedHistory, setSimulatedHistory] = useState([]);
  
  // Track previous risk level to detect changes
  const previousRiskLevel = useRef('low');

  // Initialize simulated history when entering simulation mode
  useEffect(() => {
    if (simulationMode && simulatedHistory.length === 0) {
      const initialHistory = [];
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        initialHistory.push({
          timestamp: time.toISOString(),
          heartRate: 70 + Math.random() * 20,
          spO2: 95 + Math.random() * 5,
          temperature: 36.5 + Math.random() * 1,
          bloodPressureSystolic: 115 + Math.random() * 15,
          bloodPressureDiastolic: 75 + Math.random() * 10
        });
      }
      setSimulatedHistory(initialHistory);
    }
  }, [simulationMode, simulatedHistory.length]);

  // Auto-simulation interval
  useEffect(() => {
    if (!isAutoSimulating) return;

    const interval = setInterval(() => {
      setSimulatedVitals(prev => {
        const newVitals = {
          heartRate: Math.max(40, Math.min(180, prev.heartRate + (Math.random() - 0.5) * 10)),
          temperature: Math.max(35, Math.min(42, prev.temperature + (Math.random() - 0.5) * 0.3)),
          spO2: Math.max(80, Math.min(100, prev.spO2 + (Math.random() - 0.5) * 3)),
          systolic: Math.max(80, Math.min(200, prev.systolic + (Math.random() - 0.5) * 8)),
          diastolic: Math.max(50, Math.min(120, prev.diastolic + (Math.random() - 0.5) * 5))
        };
        
        // Add to history
        const now = new Date();
        setSimulatedHistory(hist => [
          ...hist.slice(-47),
          {
            timestamp: now.toISOString(),
            heartRate: newVitals.heartRate,
            spO2: newVitals.spO2,
            temperature: newVitals.temperature,
            bloodPressureSystolic: newVitals.systolic,
            bloodPressureDiastolic: newVitals.diastolic
          }
        ]);
        
        return newVitals;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isAutoSimulating]);

  // Helper function to determine vital status
  const getVitalStatus = useCallback((type, value) => {
    switch (type) {
      case 'heartRate':
        if (value < 50 || value > 120) return 'critical';
        if (value < 60 || value > 100) return 'warning';
        return 'normal';
      case 'temperature':
        if (value < 35 || value > 39) return 'critical';
        if (value < 36.1 || value > 37.5) return 'warning';
        return 'normal';
      case 'spO2':
        if (value < 90) return 'critical';
        if (value < 95) return 'warning';
        return 'normal';
      case 'systolic':
        if (value < 90 || value > 180) return 'critical';
        if (value < 100 || value > 140) return 'warning';
        return 'normal';
      case 'diastolic':
        if (value < 60 || value > 110) return 'critical';
        if (value < 65 || value > 90) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  }, []);

  // Get current vitals (either from API or simulation)
  const currentVitals = useMemo(() => {
    if (simulationMode) {
      return {
        heart_rate: {
          value: Math.round(simulatedVitals.heartRate),
          unit: 'bpm',
          status: getVitalStatus('heartRate', simulatedVitals.heartRate)
        },
        temperature: {
          value: simulatedVitals.temperature.toFixed(1),
          unit: '°C',
          status: getVitalStatus('temperature', simulatedVitals.temperature)
        },
        spo2: {
          value: Math.round(simulatedVitals.spO2),
          unit: '%',
          status: getVitalStatus('spO2', simulatedVitals.spO2)
        },
        blood_pressure: {
          systolic: Math.round(simulatedVitals.systolic),
          diastolic: Math.round(simulatedVitals.diastolic),
          unit: 'mmHg',
          status: getVitalStatus('systolic', simulatedVitals.systolic) === 'critical' || 
                  getVitalStatus('diastolic', simulatedVitals.diastolic) === 'critical' 
                    ? 'critical' 
                    : getVitalStatus('systolic', simulatedVitals.systolic) === 'warning' || 
                      getVitalStatus('diastolic', simulatedVitals.diastolic) === 'warning'
                        ? 'warning' 
                        : 'normal'
        },
        last_updated: new Date().toISOString()
      };
    }
    return rawVitals;
  }, [simulationMode, simulatedVitals, rawVitals, getVitalStatus]);

  // Get current history (either from API or simulation)
  const currentHistory = useMemo(() => {
    if (simulationMode) {
      return simulatedHistory;
    }
    return vitalsHistory;
  }, [simulationMode, simulatedHistory, vitalsHistory]);

  // Process vitals history for charts
  const chartData = useMemo(() => {
    if (!currentHistory || currentHistory.length === 0) {
      return {
        heartRate: [],
        spO2: [],
        bloodPressure: { systolic: [], diastolic: [] }
      };
    }

    return {
      heartRate: currentHistory.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: Math.round(v.heartRate)
      })),
      spO2: currentHistory.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: Math.round(v.spO2)
      })),
      bloodPressure: {
        systolic: currentHistory.map(v => ({
          label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          value: Math.round(v.bloodPressureSystolic)
        })),
        diastolic: currentHistory.map(v => ({
          label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          value: Math.round(v.bloodPressureDiastolic)
        }))
      }
    };
  }, [currentHistory]);

  // Calculate daily summary from history
  const dailySummary = useMemo(() => {
    if (!currentHistory || currentHistory.length === 0) {
      return {
        averageHeartRate: '--',
        averageSpO2: '--',
        stepsCount: 0,
        sleepHours: 0,
        hydrationGlasses: 0,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      };
    }

    const avgHr = Math.round(currentHistory.reduce((sum, v) => sum + (v.heartRate || 0), 0) / currentHistory.length);
    const avgSpO2 = Math.round(currentHistory.reduce((sum, v) => sum + (v.spO2 || 0), 0) / currentHistory.length);

    return {
      averageHeartRate: avgHr,
      averageSpO2: avgSpO2,
      stepsCount: Math.floor(Math.random() * 8000) + 2000, // Simulated
      sleepHours: 7.5, // Simulated
      hydrationGlasses: 6, // Simulated
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    };
  }, [currentHistory]);

  // Risk assessment based on current vitals
  const riskAssessment = useMemo(() => {
    if (!currentVitals) {
      return { level: 'low', score: 0, factors: [] };
    }

    const factors = [];
    let score = 0;

    if (currentVitals.heart_rate?.status === 'critical') {
      factors.push('Heart rate is critical');
      score += 40;
    } else if (currentVitals.heart_rate?.status === 'warning') {
      factors.push('Heart rate slightly elevated');
      score += 20;
    }

    if (currentVitals.spo2?.status === 'critical') {
      factors.push('Blood oxygen is critically low');
      score += 50;
    } else if (currentVitals.spo2?.status === 'warning') {
      factors.push('Blood oxygen below normal');
      score += 25;
    }

    if (currentVitals.temperature?.status === 'critical') {
      factors.push('Temperature is abnormal');
      score += 30;
    } else if (currentVitals.temperature?.status === 'warning') {
      factors.push('Slight fever detected');
      score += 15;
    }

    if (currentVitals.blood_pressure?.status === 'critical') {
      factors.push('Blood pressure is critical');
      score += 35;
    } else if (currentVitals.blood_pressure?.status === 'warning') {
      factors.push('Blood pressure elevated');
      score += 18;
    }

    let level = 'low';
    if (score >= 60) level = 'high';
    else if (score >= 30) level = 'medium';

    return { level, score: Math.min(score, 100), factors };
  }, [currentVitals]);

  // Emit alert when risk level changes to high (only in simulation mode)
  useEffect(() => {
    if (!simulationMode) return;
    
    const currentLevel = riskAssessment.level;
    const prevLevel = previousRiskLevel.current;
    
    // Emit high risk alert when transitioning to high risk
    if (currentLevel === 'high' && prevLevel !== 'high') {
      alertNotifications.emitHighRiskAlert({
        patientId: CURRENT_PATIENT_ID,
        patientName: patient?.name || 'Patient',
        severity: 'critical',
        riskScore: riskAssessment.score,
        factors: riskAssessment.factors,
        vitals: {
          heartRate: currentVitals?.heart_rate?.value,
          spO2: currentVitals?.spo2?.value,
          temperature: currentVitals?.temperature?.value,
          bloodPressure: `${currentVitals?.blood_pressure?.systolic}/${currentVitals?.blood_pressure?.diastolic}`
        },
        message: `⚠️ HIGH RISK ALERT: ${patient?.name || 'Patient'} - ${riskAssessment.factors.join(', ')}`
      });
    }
    // Emit medium risk alert when transitioning to medium
    else if (currentLevel === 'medium' && prevLevel === 'low') {
      alertNotifications.emitAlert({
        patientId: CURRENT_PATIENT_ID,
        patientName: patient?.name || 'Patient',
        severity: 'warning',
        type: 'risk_change',
        riskScore: riskAssessment.score,
        factors: riskAssessment.factors,
        message: `⚡ Risk level increased: ${patient?.name || 'Patient'} - ${riskAssessment.factors.join(', ')}`
      });
    }
    
    previousRiskLevel.current = currentLevel;
  }, [riskAssessment, simulationMode, patient?.name, currentVitals]);

  // Handle vital input changes
  const handleVitalChange = (vital, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setSimulatedVitals(prev => ({
      ...prev,
      [vital]: numValue
    }));
    
    // Add to history with new value
    const now = new Date();
    setSimulatedHistory(hist => [
      ...hist.slice(-47),
      {
        timestamp: now.toISOString(),
        heartRate: vital === 'heartRate' ? numValue : simulatedVitals.heartRate,
        spO2: vital === 'spO2' ? numValue : simulatedVitals.spO2,
        temperature: vital === 'temperature' ? numValue : simulatedVitals.temperature,
        bloodPressureSystolic: vital === 'systolic' ? numValue : simulatedVitals.systolic,
        bloodPressureDiastolic: vital === 'diastolic' ? numValue : simulatedVitals.diastolic
      }
    ]);
  };

  // State for saving vitals
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Save simulated vitals to database (makes them permanent)
  const handleSaveVitalsToDatabase = async () => {
    setIsSavingVitals(true);
    setSaveResult(null);
    
    try {
      const response = await api.submitVitals(CURRENT_PATIENT_ID, {
        heartRate: simulatedVitals.heartRate,
        spO2: simulatedVitals.spO2,
        temperature: simulatedVitals.temperature,
        systolic: simulatedVitals.systolic,
        diastolic: simulatedVitals.diastolic,
        respiratoryRate: 16
      });
      
      console.log('Vitals saved to database:', response);
      
      setSaveResult({
        success: true,
        message: response.message,
        alertsCreated: response.alerts_created,
        riskLevel: response.risk_level
      });

      // Emit alert notification for other dashboards if alerts were created
      if (response.alerts_created > 0 || response.risk_level === 'high') {
        alertNotifications.emitHighRiskAlert({
          patientId: CURRENT_PATIENT_ID,
          patientName: patient?.name || 'Patient',
          severity: 'critical',
          riskScore: riskAssessment.score,
          factors: riskAssessment.factors,
          vitals: {
            heartRate: Math.round(simulatedVitals.heartRate),
            spO2: Math.round(simulatedVitals.spO2),
            temperature: simulatedVitals.temperature.toFixed(1),
            bloodPressure: `${Math.round(simulatedVitals.systolic)}/${Math.round(simulatedVitals.diastolic)}`
          },
          message: `⚠️ ALERT: ${patient?.name || 'Patient'} vitals updated - ${response.alerts_created} alert(s) generated`,
          savedToDatabase: true
        });
      }

      // Clear result after 5 seconds
      setTimeout(() => setSaveResult(null), 5000);
      
    } catch (err) {
      console.error('Error saving vitals:', err);
      setSaveResult({
        success: false,
        message: `Failed to save vitals: ${err.message}`
      });
    } finally {
      setIsSavingVitals(false);
    }
  };

  // Reset simulation to default values
  const resetSimulation = () => {
    setSimulatedVitals({
      heartRate: 75,
      temperature: 36.8,
      spO2: 98,
      systolic: 120,
      diastolic: 80
    });
    setSimulatedHistory([]);
    setIsAutoSimulating(false);
    setSaveResult(null);
  };

  const handleSOSTriggered = () => {
    console.log('SOS Alert triggered!');
    // In real app, this would call an API
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      refetch();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading your health data...</p>
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
          <p className="text-red-500 mb-4">Failed to load health data</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Format medications for the tracker
  const formattedMedications = medications.map((med, index) => ({
    id: med.id || index,
    name: med.name,
    dosage: med.dosage,
    time: med.next_dose || 'As scheduled',
    taken: med.adherence >= 80,
    adherence: med.adherence
  }));

  // Format alerts for the banner
  const formattedAlerts = alerts.map(alert => ({
    id: alert.id,
    type: alert.severity,
    message: alert.message,
    timestamp: alert.timestamp,
    acknowledged: !alert.active
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Health Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {patient?.name || 'Patient'}. Here's your health overview for today.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant={simulationMode ? "default" : "outline"} 
            size="sm" 
            onClick={() => setSimulationMode(!simulationMode)}
            className={simulationMode ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            <Sliders className="h-4 w-4 mr-2" />
            {simulationMode ? "Exit Simulation" : "Simulate Vitals"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            {dailySummary.date}
          </div>
        </div>
      </div>

      {/* Simulation Controls Panel */}
      {simulationMode && (
        <Card className="border-purple-500 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <Sliders className="h-5 w-5" />
                Vitals Simulator
                <Badge variant="outline" className="ml-2 border-purple-500 text-purple-600 dark:text-purple-400">
                  Demo Mode
                </Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={isAutoSimulating ? "destructive" : "default"}
                  onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                  className={!isAutoSimulating ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {isAutoSimulating ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {isAutoSimulating ? "Stop Auto" : "Auto Simulate"}
                </Button>
                <Button size="sm" variant="outline" onClick={resetSimulation}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              Adjust vital signs below to see real-time dashboard updates. Use Auto Simulate for continuous random changes.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heartRate" className="text-sm font-medium flex items-center justify-between">
                  Heart Rate
                  <Badge variant={getVitalStatus('heartRate', simulatedVitals.heartRate) === 'normal' ? 'success' : getVitalStatus('heartRate', simulatedVitals.heartRate) === 'warning' ? 'warning' : 'danger'} className="text-xs">
                    {getVitalStatus('heartRate', simulatedVitals.heartRate)}
                  </Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="heartRate"
                    type="number"
                    min="40"
                    max="180"
                    value={Math.round(simulatedVitals.heartRate)}
                    onChange={(e) => handleVitalChange('heartRate', e.target.value)}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">bpm</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="180"
                  value={simulatedVitals.heartRate}
                  onChange={(e) => handleVitalChange('heartRate', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-red-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-sm font-medium flex items-center justify-between">
                  Temperature
                  <Badge variant={getVitalStatus('temperature', simulatedVitals.temperature) === 'normal' ? 'success' : getVitalStatus('temperature', simulatedVitals.temperature) === 'warning' ? 'warning' : 'danger'} className="text-xs">
                    {getVitalStatus('temperature', simulatedVitals.temperature)}
                  </Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="temperature"
                    type="number"
                    min="35"
                    max="42"
                    step="0.1"
                    value={simulatedVitals.temperature.toFixed(1)}
                    onChange={(e) => handleVitalChange('temperature', e.target.value)}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">°C</span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="42"
                  step="0.1"
                  value={simulatedVitals.temperature}
                  onChange={(e) => handleVitalChange('temperature', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spO2" className="text-sm font-medium flex items-center justify-between">
                  SpO₂
                  <Badge variant={getVitalStatus('spO2', simulatedVitals.spO2) === 'normal' ? 'success' : getVitalStatus('spO2', simulatedVitals.spO2) === 'warning' ? 'warning' : 'danger'} className="text-xs">
                    {getVitalStatus('spO2', simulatedVitals.spO2)}
                  </Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="spO2"
                    type="number"
                    min="80"
                    max="100"
                    value={Math.round(simulatedVitals.spO2)}
                    onChange={(e) => handleVitalChange('spO2', e.target.value)}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="100"
                  value={simulatedVitals.spO2}
                  onChange={(e) => handleVitalChange('spO2', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systolic" className="text-sm font-medium flex items-center justify-between">
                  Systolic BP
                  <Badge variant={getVitalStatus('systolic', simulatedVitals.systolic) === 'normal' ? 'success' : getVitalStatus('systolic', simulatedVitals.systolic) === 'warning' ? 'warning' : 'danger'} className="text-xs">
                    {getVitalStatus('systolic', simulatedVitals.systolic)}
                  </Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="systolic"
                    type="number"
                    min="80"
                    max="200"
                    value={Math.round(simulatedVitals.systolic)}
                    onChange={(e) => handleVitalChange('systolic', e.target.value)}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">mmHg</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="200"
                  value={simulatedVitals.systolic}
                  onChange={(e) => handleVitalChange('systolic', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diastolic" className="text-sm font-medium flex items-center justify-between">
                  Diastolic BP
                  <Badge variant={getVitalStatus('diastolic', simulatedVitals.diastolic) === 'normal' ? 'success' : getVitalStatus('diastolic', simulatedVitals.diastolic) === 'warning' ? 'warning' : 'danger'} className="text-xs">
                    {getVitalStatus('diastolic', simulatedVitals.diastolic)}
                  </Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="diastolic"
                    type="number"
                    min="50"
                    max="120"
                    value={Math.round(simulatedVitals.diastolic)}
                    onChange={(e) => handleVitalChange('diastolic', e.target.value)}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">mmHg</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="120"
                  value={simulatedVitals.diastolic}
                  onChange={(e) => handleVitalChange('diastolic', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-cyan-500"
                />
              </div>
            </div>

            {/* Save to Database Section */}
            <div className="mt-4 pt-4 border-t border-purple-300 dark:border-purple-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Save Vitals to Database
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      Permanently save these vitals and trigger real alerts to Doctor/Caretaker dashboards
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleSaveVitalsToDatabase}
                  disabled={isSavingVitals}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSavingVitals ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Save & Alert
                    </>
                  )}
                </Button>
              </div>
              
              {/* Save Result Message */}
              {saveResult && (
                <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  saveResult.success 
                    ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' 
                    : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                }`}>
                  {saveResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      saveResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                      {saveResult.message}
                    </p>
                    {saveResult.success && saveResult.alertsCreated > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        🚨 {saveResult.alertsCreated} alert(s) sent to Doctor & Caretaker dashboards
                      </p>
                    )}
                    {saveResult.success && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Risk Level: <span className="font-bold uppercase">{saveResult.riskLevel}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${simulationMode ? 'bg-purple-400' : 'bg-green-400'} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-3 w-3 ${simulationMode ? 'bg-purple-500' : 'bg-green-500'}`}></span>
        </span>
        <span className={simulationMode ? "text-purple-600 dark:text-purple-400" : "text-green-600 dark:text-green-400"}>
          {simulationMode ? "Simulation mode active" : "Live monitoring active"}
        </span>
        <span className="text-gray-400">• Last updated: {currentVitals?.last_updated ? new Date(currentVitals.last_updated).toLocaleTimeString() : 'N/A'}</span>
        {isAutoSimulating && (
          <Badge variant="outline" className="ml-2 animate-pulse border-green-500 text-green-600">
            Auto-updating every 2s
          </Badge>
        )}
      </div>

      {/* Risk Assessment & SOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RiskIndicator 
            level={riskAssessment.level}
            score={riskAssessment.score}
            factors={riskAssessment.factors}
          />
        </div>
        <div>
          <SOSButton 
            patientId={CURRENT_PATIENT_ID}
            patientName={patient?.name || 'Patient'}
            emergencyContact={patient?.emergencyContact || 'Emergency Services'}
            onSOS={handleSOSTriggered}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Press only in case of emergency
          </p>
        </div>
      </div>

      {/* Current Vitals */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Current Vitals
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <VitalsCard
            title="Heart Rate"
            value={currentVitals?.heart_rate?.value || '--'}
            unit={currentVitals?.heart_rate?.unit || 'bpm'}
            status={currentVitals?.heart_rate?.status || 'normal'}
            icon="heartRate"
            subtitle="Normal: 60-100 bpm"
          />
          <VitalsCard
            title="Temperature"
            value={currentVitals?.temperature?.value || '--'}
            unit={currentVitals?.temperature?.unit || '°C'}
            status={currentVitals?.temperature?.status || 'normal'}
            icon="temperature"
            subtitle="Normal: 36.1-37.2°C"
          />
          <VitalsCard
            title="Blood Oxygen (SpO₂)"
            value={currentVitals?.spo2?.value || '--'}
            unit={currentVitals?.spo2?.unit || '%'}
            status={currentVitals?.spo2?.status || 'normal'}
            icon="spO2"
            subtitle="Normal: 95-100%"
          />
          <VitalsCard
            title="Blood Pressure"
            value={currentVitals?.blood_pressure?.systolic && currentVitals?.blood_pressure?.diastolic 
              ? `${currentVitals.blood_pressure.systolic}/${currentVitals.blood_pressure.diastolic}` 
              : '--'}
            unit={currentVitals?.blood_pressure?.unit || 'mmHg'}
            status={currentVitals?.blood_pressure?.status || 'normal'}
            icon="bloodPressure"
            subtitle="Normal: 120/80 mmHg"
          />
        </div>
      </div>

      {/* Charts and Medication */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 24-Hour Vitals Trend */}
        <VitalsChart
          title="Heart Rate - 24 Hour Trend"
          data={chartData.heartRate}
          dataLabel="BPM"
          color="#ef4444"
          height={250}
        />
        <VitalsChart
          title="Blood Oxygen (SpO₂) - 24 Hour Trend"
          data={chartData.spO2}
          dataLabel="SpO₂ %"
          color="#3b82f6"
          height={250}
        />
      </div>

      {/* Blood Pressure Chart */}
      <VitalsChart
        title="Blood Pressure - 24 Hour Trend"
        data={chartData.bloodPressure.systolic}
        dataLabel="Systolic"
        color="#8b5cf6"
        height={250}
        showLegend={true}
        secondaryData={chartData.bloodPressure.diastolic}
        secondaryLabel="Diastolic"
        secondaryColor="#06b6d4"
      />

      {/* Medication & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MedicationTracker 
          medications={formattedMedications}
          showAdherence={true}
        />
        <AlertBanner 
          alerts={formattedAlerts}
          showAcknowledge={true}
          onAcknowledge={handleAcknowledgeAlert}
        />
      </div>

      {/* Daily Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Today's Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 text-center">
              <Activity className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{dailySummary.averageHeartRate}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500">Avg Heart Rate</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/50 rounded-lg p-4 text-center">
              <Footprints className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{dailySummary.stepsCount.toLocaleString()}</p>
              <p className="text-xs text-green-600 dark:text-green-500">Steps Today</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/50 rounded-lg p-4 text-center">
              <Moon className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{dailySummary.sleepHours}h</p>
              <p className="text-xs text-purple-600 dark:text-purple-500">Sleep Last Night</p>
            </div>
            <div className="bg-cyan-50 dark:bg-cyan-950/50 rounded-lg p-4 text-center">
              <Droplets className="h-6 w-6 text-cyan-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">{dailySummary.hydrationGlasses}</p>
              <p className="text-xs text-cyan-600 dark:text-cyan-500">Glasses of Water</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/50 rounded-lg p-4 text-center">
              <Activity className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{dailySummary.averageSpO2}%</p>
              <p className="text-xs text-orange-600 dark:text-orange-500">Avg SpO₂</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientDashboard;

import React, { useState, useEffect, useMemo } from 'react';
import VitalsCard from '@/components/VitalsCard';
import VitalsChart from '@/components/VitalsChart';
import MedicationTracker from '@/components/MedicationTracker';
import AlertBanner from '@/components/AlertBanner';
import { RiskIndicator } from '@/components/RiskBadge';
import SOSButton from '@/components/SOSButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePatientData, useVitalsHistory } from '@/hooks/useVitalGuard';
import { api } from '@/services/api';
import { 
  Activity, 
  Calendar,
  Footprints,
  Moon,
  Droplets,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Current patient ID - In a real app, this would come from auth context
const CURRENT_PATIENT_ID = 1;

const PatientDashboard = () => {
  const { patient, rawVitals, medications, alerts, loading, error, refetch } = usePatientData(CURRENT_PATIENT_ID);
  const { history: vitalsHistory, loading: historyLoading } = useVitalsHistory(CURRENT_PATIENT_ID, 24);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Process vitals history for charts
  const chartData = useMemo(() => {
    if (!vitalsHistory || vitalsHistory.length === 0) {
      return {
        heartRate: [],
        spO2: [],
        bloodPressure: { systolic: [], diastolic: [] }
      };
    }

    return {
      heartRate: vitalsHistory.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: v.heartRate
      })),
      spO2: vitalsHistory.map(v => ({
        label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: v.spO2
      })),
      bloodPressure: {
        systolic: vitalsHistory.map(v => ({
          label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          value: v.bloodPressureSystolic
        })),
        diastolic: vitalsHistory.map(v => ({
          label: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          value: v.bloodPressureDiastolic
        }))
      }
    };
  }, [vitalsHistory]);

  // Calculate daily summary from history
  const dailySummary = useMemo(() => {
    if (!vitalsHistory || vitalsHistory.length === 0) {
      return {
        averageHeartRate: '--',
        averageSpO2: '--',
        stepsCount: 0,
        sleepHours: 0,
        hydrationGlasses: 0,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      };
    }

    const avgHr = Math.round(vitalsHistory.reduce((sum, v) => sum + (v.heartRate || 0), 0) / vitalsHistory.length);
    const avgSpO2 = Math.round(vitalsHistory.reduce((sum, v) => sum + (v.spO2 || 0), 0) / vitalsHistory.length);

    return {
      averageHeartRate: avgHr,
      averageSpO2: avgSpO2,
      stepsCount: Math.floor(Math.random() * 8000) + 2000, // Simulated
      sleepHours: 7.5, // Simulated
      hydrationGlasses: 6, // Simulated
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    };
  }, [vitalsHistory]);

  // Risk assessment based on current vitals
  const riskAssessment = useMemo(() => {
    if (!rawVitals) {
      return { level: 'low', score: 0, factors: [] };
    }

    const factors = [];
    let score = 0;

    if (rawVitals.heart_rate?.status === 'critical') {
      factors.push('Heart rate is critical');
      score += 40;
    } else if (rawVitals.heart_rate?.status === 'warning') {
      factors.push('Heart rate slightly elevated');
      score += 20;
    }

    if (rawVitals.spo2?.status === 'critical') {
      factors.push('Blood oxygen is critically low');
      score += 50;
    } else if (rawVitals.spo2?.status === 'warning') {
      factors.push('Blood oxygen below normal');
      score += 25;
    }

    if (rawVitals.temperature?.status === 'critical') {
      factors.push('Temperature is abnormal');
      score += 30;
    } else if (rawVitals.temperature?.status === 'warning') {
      factors.push('Slight fever detected');
      score += 15;
    }

    let level = 'low';
    if (score >= 60) level = 'high';
    else if (score >= 30) level = 'medium';

    return { level, score: Math.min(score, 100), factors };
  }, [rawVitals]);

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
  const formattedMedications = medications.map(med => ({
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

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-green-600 dark:text-green-400">Live monitoring active</span>
        <span className="text-gray-400">• Last updated: {rawVitals?.last_updated ? new Date(rawVitals.last_updated).toLocaleTimeString() : 'N/A'}</span>
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
            value={rawVitals?.heart_rate?.value || '--'}
            unit={rawVitals?.heart_rate?.unit || 'bpm'}
            status={rawVitals?.heart_rate?.status || 'normal'}
            icon="heartRate"
            subtitle="Normal: 60-100 bpm"
          />
          <VitalsCard
            title="Temperature"
            value={rawVitals?.temperature?.value || '--'}
            unit={rawVitals?.temperature?.unit || '°C'}
            status={rawVitals?.temperature?.status || 'normal'}
            icon="temperature"
            subtitle="Normal: 36.1-37.2°C"
          />
          <VitalsCard
            title="Blood Oxygen (SpO₂)"
            value={rawVitals?.spo2?.value || '--'}
            unit={rawVitals?.spo2?.unit || '%'}
            status={rawVitals?.spo2?.status || 'normal'}
            icon="spO2"
            subtitle="Normal: 95-100%"
          />
          <VitalsCard
            title="Blood Pressure"
            value={rawVitals?.blood_pressure?.systolic && rawVitals?.blood_pressure?.diastolic 
              ? `${rawVitals.blood_pressure.systolic}/${rawVitals.blood_pressure.diastolic}` 
              : '--'}
            unit={rawVitals?.blood_pressure?.unit || 'mmHg'}
            status={rawVitals?.blood_pressure?.status || 'normal'}
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

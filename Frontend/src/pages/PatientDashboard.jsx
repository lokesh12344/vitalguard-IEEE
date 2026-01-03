import React from 'react';
import VitalsCard from '@/components/VitalsCard';
import VitalsChart from '@/components/VitalsChart';
import MedicationTracker from '@/components/MedicationTracker';
import AlertBanner from '@/components/AlertBanner';
import { RiskIndicator } from '@/components/RiskBadge';
import SOSButton from '@/components/SOSButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  currentVitals, 
  vitalsHistory, 
  medications, 
  alerts, 
  riskAssessment,
  dailySummary 
} from '@/mock/mockVitals';
import { 
  Activity, 
  Calendar,
  Footprints,
  Moon,
  Droplets
} from 'lucide-react';

const PatientDashboard = () => {
  const handleSOSTriggered = () => {
    console.log('SOS Alert triggered!');
    // In real app, this would call an API
  };

  const handleAcknowledgeAlert = (alertId) => {
    console.log('Acknowledged alert:', alertId);
    // In real app, this would update the alert status
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Health Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, John. Here's your health overview for today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          {dailySummary.date}
        </div>
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
            patientName="John Smith"
            emergencyContact="+1 (555) 123-4567"
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
            value={currentVitals.heartRate.value}
            unit={currentVitals.heartRate.unit}
            status={currentVitals.heartRate.status}
            icon="heartRate"
            trend={currentVitals.heartRate.trend}
            subtitle={`Normal: ${currentVitals.heartRate.min}-${currentVitals.heartRate.max} bpm`}
          />
          <VitalsCard
            title="Temperature"
            value={currentVitals.temperature.value}
            unit={currentVitals.temperature.unit}
            status={currentVitals.temperature.status}
            icon="temperature"
            trend={currentVitals.temperature.trend}
            subtitle={`Normal: ${currentVitals.temperature.min}-${currentVitals.temperature.max}°F`}
          />
          <VitalsCard
            title="Blood Oxygen (SpO₂)"
            value={currentVitals.spO2.value}
            unit={currentVitals.spO2.unit}
            status={currentVitals.spO2.status}
            icon="spO2"
            trend={currentVitals.spO2.trend}
            subtitle={`Normal: ${currentVitals.spO2.min}-${currentVitals.spO2.max}%`}
          />
          <VitalsCard
            title="Blood Pressure"
            value={`${currentVitals.bloodPressure.systolic}/${currentVitals.bloodPressure.diastolic}`}
            unit={currentVitals.bloodPressure.unit}
            status={currentVitals.bloodPressure.status}
            icon="bloodPressure"
            trend={currentVitals.bloodPressure.trend}
            subtitle="Normal: 120/80 mmHg"
          />
        </div>
      </div>

      {/* Charts and Medication */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 24-Hour Vitals Trend */}
        <VitalsChart
          title="Heart Rate - 24 Hour Trend"
          data={vitalsHistory.heartRate}
          dataLabel="BPM"
          color="#ef4444"
          height={250}
        />
        <VitalsChart
          title="Blood Oxygen (SpO₂) - 24 Hour Trend"
          data={vitalsHistory.spO2}
          dataLabel="SpO₂ %"
          color="#3b82f6"
          height={250}
        />
      </div>

      {/* Blood Pressure Chart */}
      <VitalsChart
        title="Blood Pressure - 24 Hour Trend"
        data={vitalsHistory.bloodPressure.systolic}
        dataLabel="Systolic"
        color="#8b5cf6"
        height={250}
        showLegend={true}
        secondaryData={vitalsHistory.bloodPressure.diastolic}
        secondaryLabel="Diastolic"
        secondaryColor="#06b6d4"
      />

      {/* Medication & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MedicationTracker 
          medications={medications}
          showAdherence={true}
        />
        <AlertBanner 
          alerts={alerts}
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

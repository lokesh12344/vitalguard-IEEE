import React, { useState } from 'react';
import PatientList from '@/components/PatientList';
import VitalsCard from '@/components/VitalsCard';
import VitalsChart from '@/components/VitalsChart';
import AlertBanner from '@/components/AlertBanner';
import RiskBadge from '@/components/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { patientsByRisk, dashboardStats } from '@/mock/mockPatients';
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
  TrendingUp
} from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';

const DoctorDashboard = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);

  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
  };

  const closePatientDetail = () => {
    setSelectedPatient(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Doctor Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome, Dr. Sarah Chen. You have {dashboardStats.totalPatients} patients under your care.
          </p>
        </div>
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
            <Card className="h-full">
              <CardHeader className="border-b dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg",
                      selectedPatient.riskLevel === 'high' ? 'bg-red-500' :
                      selectedPatient.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    )}>
                      {selectedPatient.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{selectedPatient.name}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedPatient.age} years old • {selectedPatient.gender} • ID: {selectedPatient.id}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <RiskBadge 
                          level={selectedPatient.riskLevel} 
                          showScore 
                          score={selectedPatient.riskScore}
                          size="lg"
                        />
                        <Badge variant="outline" className="text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Updated {formatTimeAgo(selectedPatient.lastUpdated)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={closePatientDetail}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Patient Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Condition</p>
                    <p className="text-gray-900 dark:text-white">{selectedPatient.condition}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Caretaker</p>
                    <p className="text-gray-900 dark:text-white">{selectedPatient.caretaker}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Emergency Contact
                    </p>
                    <p className="text-gray-900 dark:text-white">{selectedPatient.emergencyContact}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Address
                    </p>
                    <p className="text-gray-900 dark:text-white">{selectedPatient.address}</p>
                  </div>
                </div>

                {/* Current Vitals */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Current Vitals
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <VitalsCard
                      title="Heart Rate"
                      value={selectedPatient.vitals.current.heartRate.value}
                      unit={selectedPatient.vitals.current.heartRate.unit}
                      status={selectedPatient.vitals.current.heartRate.status}
                      icon="heartRate"
                      className="p-3"
                    />
                    <VitalsCard
                      title="Temperature"
                      value={selectedPatient.vitals.current.temperature.value}
                      unit={selectedPatient.vitals.current.temperature.unit}
                      status={selectedPatient.vitals.current.temperature.status}
                      icon="temperature"
                      className="p-3"
                    />
                    <VitalsCard
                      title="SpO₂"
                      value={selectedPatient.vitals.current.spO2.value}
                      unit={selectedPatient.vitals.current.spO2.unit}
                      status={selectedPatient.vitals.current.spO2.status}
                      icon="spO2"
                      className="p-3"
                    />
                    <VitalsCard
                      title="Blood Pressure"
                      value={`${selectedPatient.vitals.current.bloodPressure.systolic}/${selectedPatient.vitals.current.bloodPressure.diastolic}`}
                      unit={selectedPatient.vitals.current.bloodPressure.unit}
                      status="normal"
                      icon="bloodPressure"
                      className="p-3"
                    />
                  </div>
                </div>

                {/* Vitals Chart */}
                <VitalsChart
                  title="Heart Rate - 24 Hour Trend"
                  data={selectedPatient.vitals.history.heartRate}
                  dataLabel="BPM"
                  color="#ef4444"
                  height={200}
                />

                {/* Medications */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <Pill className="h-5 w-5 text-blue-500" />
                    Medication Adherence
                  </h3>
                  <div className="space-y-2">
                    {selectedPatient.medications.map((med, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700"
                      >
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{med.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{med.dosage} • {med.schedule}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div 
                              className={cn(
                                "h-2 rounded-full",
                                med.adherence >= 80 ? 'bg-green-500' : 
                                med.adherence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              )}
                              style={{ width: `${med.adherence}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-12">
                            {med.adherence}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Alerts */}
                {selectedPatient.alerts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Alerts
                    </h3>
                    <AlertBanner 
                      alerts={selectedPatient.alerts.map((a, i) => ({
                        id: i,
                        type: a.type,
                        message: a.message,
                        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
                        acknowledged: !a.active
                      }))}
                      compact
                    />
                  </div>
                )}

                {/* Notes */}
                {selectedPatient.notes && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      Clinical Notes
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">{selectedPatient.notes}</p>
                  </div>
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

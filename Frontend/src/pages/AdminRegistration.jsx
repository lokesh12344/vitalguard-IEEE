import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectOption } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import {
  User,
  Heart,
  Thermometer,
  Activity,
  Droplets,
  Stethoscope,
  Phone,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  UserPlus,
  RefreshCw,
  Clock
} from 'lucide-react';

// Risk calculation thresholds
const VITAL_THRESHOLDS = {
  heart_rate: {
    critical_low: 50,
    warning_low: 60,
    warning_high: 100,
    critical_high: 120,
    unit: 'bpm',
    label: 'Heart Rate'
  },
  spo2: {
    critical_low: 90,
    warning_low: 94,
    warning_high: 100,
    critical_high: 100,
    unit: '%',
    label: 'Oxygen Saturation (SpO₂)'
  },
  temperature: {
    critical_low: 35,
    warning_low: 36,
    warning_high: 37.5,
    critical_high: 39,
    unit: '°C',
    label: 'Body Temperature'
  },
  blood_sugar: {
    critical_low: 70,
    warning_low: 80,
    warning_high: 140,
    critical_high: 200,
    unit: 'mg/dL',
    label: 'Blood Sugar'
  },
  bp_systolic: {
    critical_low: 90,
    warning_low: 100,
    warning_high: 140,
    critical_high: 180,
    unit: 'mmHg',
    label: 'Systolic BP'
  },
  bp_diastolic: {
    critical_low: 60,
    warning_low: 65,
    warning_high: 90,
    critical_high: 120,
    unit: 'mmHg',
    label: 'Diastolic BP'
  }
};

// Get risk color and level for a vital value
const getVitalRisk = (value, vitalType) => {
  if (!value || !VITAL_THRESHOLDS[vitalType]) return { color: 'gray', level: 'unknown' };
  
  const threshold = VITAL_THRESHOLDS[vitalType];
  const numValue = parseFloat(value);
  
  if (numValue <= threshold.critical_low || numValue >= threshold.critical_high) {
    return { color: 'red', level: 'critical', bgClass: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800', textClass: 'text-red-600 dark:text-red-400' };
  }
  if (numValue < threshold.warning_low || numValue > threshold.warning_high) {
    return { color: 'yellow', level: 'warning', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-800', textClass: 'text-yellow-600 dark:text-yellow-400' };
  }
  return { color: 'green', level: 'normal', bgClass: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800', textClass: 'text-green-600 dark:text-green-400' };
};

// Vital Input Component with real-time risk indicator
const VitalInput = ({ label, name, value, onChange, unit, icon: Icon, threshold, required = true }) => {
  const risk = getVitalRisk(value, name);
  
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center gap-2">
        {Icon && <Icon className={cn("h-4 w-4", risk.textClass || 'text-gray-500')} />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type="number"
          step="0.1"
          value={value}
          onChange={onChange}
          required={required}
          className={cn(
            "pr-16 transition-all duration-200",
            value && risk.bgClass
          )}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        <div className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2",
          risk.textClass || 'text-gray-500'
        )}>
          <span className="text-sm font-medium">{unit}</span>
          {value && (
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              risk.color === 'red' ? 'bg-red-500' :
              risk.color === 'yellow' ? 'bg-yellow-500' :
              risk.color === 'green' ? 'bg-green-500' : 'bg-gray-400'
            )} />
          )}
        </div>
      </div>
      {value && (
        <p className={cn("text-xs", risk.textClass)}>
          {risk.level === 'critical' && '⚠️ Critical - Immediate attention required'}
          {risk.level === 'warning' && '⚡ Warning - Monitor closely'}
          {risk.level === 'normal' && '✓ Normal range'}
        </p>
      )}
    </div>
  );
};

// Recent Registration Card
const RecentRegistrationCard = ({ patient }) => {
  const riskColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
          patient.risk_level === 'high' ? 'bg-red-500' :
          patient.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
        )}>
          {patient.name?.charAt(0) || 'P'}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{patient.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {patient.age} yrs • {patient.gender} • {patient.condition || 'Under observation'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={riskColors[patient.risk_level] || riskColors.low}>
          {patient.risk_level?.toUpperCase() || 'LOW'}
        </Badge>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          <Clock className="h-3 w-3 inline mr-1" />
          {new Date(patient.registered_at).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

const AdminRegistration = () => {
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: 'male',
    contact_number: '',
    medical_condition: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    doctor_id: 1
  });

  // Vitals state
  const [vitals, setVitals] = useState({
    heart_rate: '',
    spo2: '',
    temperature: '',
    blood_sugar: '',
    bp_systolic: '',
    bp_diastolic: ''
  });

  // UI state
  const [doctors, setDoctors] = useState([]);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Calculate overall risk level
  const overallRisk = useMemo(() => {
    const vitalValues = {
      heart_rate: vitals.heart_rate,
      spo2: vitals.spo2,
      temperature: vitals.temperature,
      blood_sugar: vitals.blood_sugar,
      bp_systolic: vitals.bp_systolic,
      bp_diastolic: vitals.bp_diastolic
    };

    let criticalCount = 0;
    let warningCount = 0;
    let normalCount = 0;

    Object.entries(vitalValues).forEach(([key, value]) => {
      if (value) {
        const risk = getVitalRisk(value, key);
        if (risk.level === 'critical') criticalCount++;
        else if (risk.level === 'warning') warningCount++;
        else if (risk.level === 'normal') normalCount++;
      }
    });

    if (criticalCount >= 2) return { level: 'HIGH', color: 'red', description: 'Critical - Multiple vitals require immediate attention' };
    if (criticalCount >= 1 || warningCount >= 3) return { level: 'MEDIUM', color: 'yellow', description: 'Warning - Close monitoring required' };
    if (normalCount >= 4) return { level: 'LOW', color: 'green', description: 'Stable - All vitals within normal range' };
    return { level: 'UNKNOWN', color: 'gray', description: 'Enter vitals to calculate risk' };
  }, [vitals]);

  // Fetch doctors and recent registrations
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingDoctors(true);
        const [doctorsData, registrationsData] = await Promise.all([
          api.getAdminDoctors(),
          api.getRecentRegistrations()
        ]);
        setDoctors(doctorsData);
        setRecentRegistrations(registrationsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Set default doctor
        setDoctors([{ id: 1, name: 'Dr. Priya Sharma' }]);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchData();
  }, []);

  // Handle form input changes
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle vital input changes
  const handleVitalChange = useCallback((e) => {
    const { name, value } = e.target;
    setVitals(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitResult(null);

    try {
      const registrationData = {
        full_name: formData.full_name,
        age: parseInt(formData.age),
        gender: formData.gender,
        contact_number: formData.contact_number,
        medical_condition: formData.medical_condition || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        doctor_id: parseInt(formData.doctor_id),
        vitals: {
          heart_rate: parseFloat(vitals.heart_rate),
          spo2: parseFloat(vitals.spo2),
          temperature: parseFloat(vitals.temperature),
          blood_sugar: vitals.blood_sugar ? parseFloat(vitals.blood_sugar) : null,
          blood_pressure_systolic: parseInt(vitals.bp_systolic),
          blood_pressure_diastolic: parseInt(vitals.bp_diastolic)
        }
      };

      const result = await api.registerPatient(registrationData);
      setSubmitResult({ success: true, data: result });

      // Reset form
      setFormData({
        full_name: '',
        age: '',
        gender: 'male',
        contact_number: '',
        medical_condition: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        doctor_id: 1
      });
      setVitals({
        heart_rate: '',
        spo2: '',
        temperature: '',
        blood_sugar: '',
        bp_systolic: '',
        bp_diastolic: ''
      });

      // Refresh recent registrations
      const updatedRegistrations = await api.getRecentRegistrations();
      setRecentRegistrations(updatedRegistrations);

    } catch (error) {
      setSubmitResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      full_name: '',
      age: '',
      gender: 'male',
      contact_number: '',
      medical_condition: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      doctor_id: 1
    });
    setVitals({
      heart_rate: '',
      spo2: '',
      temperature: '',
      blood_sugar: '',
      bp_systolic: '',
      bp_diastolic: ''
    });
    setSubmitResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Patient Registration
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Admin / Receptionist Portal • VitalGuard Healthcare System
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Registration Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Patient Details Section */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5 text-blue-500" />
                      Patient Details
                    </CardTitle>
                    <CardDescription>
                      Enter the patient's personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          placeholder="Enter patient's full name"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="age">Age <span className="text-red-500">*</span></Label>
                          <Input
                            id="age"
                            name="age"
                            type="number"
                            min="0"
                            max="150"
                            value={formData.age}
                            onChange={handleInputChange}
                            placeholder="Age"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                          <Select
                            id="gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            required
                          >
                            <SelectOption value="male">Male</SelectOption>
                            <SelectOption value="female">Female</SelectOption>
                            <SelectOption value="other">Other</SelectOption>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact_number" className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          Contact Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="contact_number"
                          name="contact_number"
                          type="tel"
                          value={formData.contact_number}
                          onChange={handleInputChange}
                          placeholder="+91 XXXXX XXXXX"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="medical_condition" className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-gray-500" />
                          Medical Condition
                        </Label>
                        <Input
                          id="medical_condition"
                          name="medical_condition"
                          value={formData.medical_condition}
                          onChange={handleInputChange}
                          placeholder="E.g., Diabetes, Hypertension"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Initial Vitals Section */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Activity className="h-5 w-5 text-red-500" />
                      Initial Vitals
                      {overallRisk.level !== 'UNKNOWN' && (
                        <Badge className={cn(
                          "ml-auto",
                          overallRisk.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          overallRisk.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        )}>
                          {overallRisk.level} RISK
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Record patient's current vital signs. Colors indicate risk level.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <VitalInput
                        label="Heart Rate"
                        name="heart_rate"
                        value={vitals.heart_rate}
                        onChange={handleVitalChange}
                        unit="bpm"
                        icon={Heart}
                      />
                      <VitalInput
                        label="SpO₂"
                        name="spo2"
                        value={vitals.spo2}
                        onChange={handleVitalChange}
                        unit="%"
                        icon={Droplets}
                      />
                      <VitalInput
                        label="Temperature"
                        name="temperature"
                        value={vitals.temperature}
                        onChange={handleVitalChange}
                        unit="°C"
                        icon={Thermometer}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <VitalInput
                        label="Blood Sugar"
                        name="blood_sugar"
                        value={vitals.blood_sugar}
                        onChange={handleVitalChange}
                        unit="mg/dL"
                        icon={Droplets}
                        required={false}
                      />
                      <VitalInput
                        label="Systolic BP"
                        name="bp_systolic"
                        value={vitals.bp_systolic}
                        onChange={handleVitalChange}
                        unit="mmHg"
                        icon={Activity}
                      />
                      <VitalInput
                        label="Diastolic BP"
                        name="bp_diastolic"
                        value={vitals.bp_diastolic}
                        onChange={handleVitalChange}
                        unit="mmHg"
                        icon={Activity}
                      />
                    </div>
                    
                    {/* Risk Summary */}
                    {overallRisk.level !== 'UNKNOWN' && (
                      <div className={cn(
                        "p-4 rounded-lg border-2 transition-all duration-300",
                        overallRisk.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800' :
                        overallRisk.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800' :
                        'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800'
                      )}>
                        <div className="flex items-center gap-3">
                          {overallRisk.color === 'red' && <AlertCircle className="h-6 w-6 text-red-500" />}
                          {overallRisk.color === 'yellow' && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
                          {overallRisk.color === 'green' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                          <div>
                            <p className={cn(
                              "font-semibold",
                              overallRisk.color === 'red' ? 'text-red-700 dark:text-red-400' :
                              overallRisk.color === 'yellow' ? 'text-yellow-700 dark:text-yellow-400' :
                              'text-green-700 dark:text-green-400'
                            )}>
                              Calculated Risk: {overallRisk.level}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{overallRisk.description}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Doctor Assignment & Emergency Contact */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Stethoscope className="h-5 w-5 text-green-500" />
                      Doctor Assignment & Emergency Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="doctor_id">Assigned Doctor <span className="text-red-500">*</span></Label>
                        <Select
                          id="doctor_id"
                          name="doctor_id"
                          value={formData.doctor_id}
                          onChange={handleInputChange}
                          disabled={loadingDoctors}
                          required
                        >
                          {loadingDoctors ? (
                            <SelectOption value="">Loading doctors...</SelectOption>
                          ) : (
                            doctors.map(doc => (
                              <SelectOption key={doc.id} value={doc.id}>
                                {doc.name}
                              </SelectOption>
                            ))
                          )}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                        <Input
                          id="emergency_contact_name"
                          name="emergency_contact_name"
                          value={formData.emergency_contact_name}
                          onChange={handleInputChange}
                          placeholder="Contact person name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                      <Input
                        id="emergency_contact_phone"
                        name="emergency_contact_phone"
                        type="tel"
                        value={formData.emergency_contact_phone}
                        onChange={handleInputChange}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3 pt-4 border-t dark:border-slate-800">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Register Patient
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      disabled={loading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </CardFooter>
                </Card>

                {/* Submit Result */}
                {submitResult && (
                  <Card className={cn(
                    "border-2",
                    submitResult.success ? "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20" :
                    "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                  )}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        {submitResult.success ? (
                          <CheckCircle2 className="h-8 w-8 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <h3 className={cn(
                            "font-semibold text-lg",
                            submitResult.success ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                          )}>
                            {submitResult.success ? 'Patient Registered Successfully!' : 'Registration Failed'}
                          </h3>
                          {submitResult.success ? (
                            <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <p><strong>Patient:</strong> {submitResult.data.patient_name}</p>
                              <p><strong>Patient ID:</strong> #{submitResult.data.patient_id}</p>
                              <p><strong>Risk Level:</strong> <span className={cn(
                                "font-semibold",
                                submitResult.data.risk_color === 'red' ? 'text-red-600' :
                                submitResult.data.risk_color === 'yellow' ? 'text-yellow-600' : 'text-green-600'
                              )}>{submitResult.data.risk_level}</span></p>
                              <p><strong>Assigned Doctor:</strong> {submitResult.data.assigned_doctor}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                ✓ Patient will appear on Doctor Dashboard immediately
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                              {submitResult.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </form>
          </div>

          {/* Sidebar - Recent Registrations */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-purple-500" />
                  Recent Registrations
                </CardTitle>
                <CardDescription>
                  Today's newly registered patients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentRegistrations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No recent registrations</p>
                  </div>
                ) : (
                  recentRegistrations.map((patient, index) => (
                    <RecentRegistrationCard key={patient.id || index} patient={patient} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistration;

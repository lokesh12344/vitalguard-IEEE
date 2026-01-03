// Mock vitals data for patient monitoring
// Simulates 24-hour vitals data with timestamps

const generateTimeSeriesData = (baseValue, variance, hours = 24) => {
  const data = [];
  const now = new Date();
  
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const value = baseValue + (Math.random() - 0.5) * variance * 2;
    data.push({
      time: time.toISOString(),
      value: Math.round(value * 10) / 10,
      label: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });
  }
  return data;
};

export const currentVitals = {
  heartRate: {
    value: 78,
    unit: 'bpm',
    status: 'normal',
    min: 60,
    max: 100,
    trend: 'stable'
  },
  temperature: {
    value: 98.6,
    unit: '°F',
    status: 'normal',
    min: 97.0,
    max: 99.5,
    trend: 'stable'
  },
  spO2: {
    value: 97,
    unit: '%',
    status: 'normal',
    min: 95,
    max: 100,
    trend: 'stable'
  },
  bloodPressure: {
    systolic: 120,
    diastolic: 80,
    unit: 'mmHg',
    status: 'normal',
    trend: 'stable'
  },
  respiratoryRate: {
    value: 16,
    unit: 'breaths/min',
    status: 'normal',
    min: 12,
    max: 20,
    trend: 'stable'
  }
};

export const vitalsHistory = {
  heartRate: generateTimeSeriesData(75, 10),
  temperature: generateTimeSeriesData(98.4, 0.5),
  spO2: generateTimeSeriesData(97, 2),
  bloodPressure: {
    systolic: generateTimeSeriesData(118, 8),
    diastolic: generateTimeSeriesData(78, 5)
  }
};

export const medications = [
  {
    id: 1,
    name: 'Metformin',
    dosage: '500mg',
    schedule: '8:00 AM',
    taken: true,
    takenAt: '8:05 AM',
    purpose: 'Diabetes management'
  },
  {
    id: 2,
    name: 'Lisinopril',
    dosage: '10mg',
    schedule: '9:00 AM',
    taken: true,
    takenAt: '9:12 AM',
    purpose: 'Blood pressure control'
  },
  {
    id: 3,
    name: 'Aspirin',
    dosage: '81mg',
    schedule: '12:00 PM',
    taken: true,
    takenAt: '12:30 PM',
    purpose: 'Heart health'
  },
  {
    id: 4,
    name: 'Atorvastatin',
    dosage: '20mg',
    schedule: '8:00 PM',
    taken: false,
    takenAt: null,
    purpose: 'Cholesterol management'
  },
  {
    id: 5,
    name: 'Metoprolol',
    dosage: '25mg',
    schedule: '9:00 PM',
    taken: false,
    takenAt: null,
    purpose: 'Heart rate control'
  }
];

export const alerts = [
  {
    id: 1,
    type: 'warning',
    message: 'Heart rate elevated above normal range',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    vital: 'heartRate',
    value: 105,
    acknowledged: true
  },
  {
    id: 2,
    type: 'info',
    message: 'Medication reminder: Atorvastatin due at 8:00 PM',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    vital: null,
    value: null,
    acknowledged: false
  },
  {
    id: 3,
    type: 'success',
    message: 'Daily health check completed successfully',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    vital: null,
    value: null,
    acknowledged: true
  },
  {
    id: 4,
    type: 'critical',
    message: 'SpO₂ dropped below 92% - immediate attention required',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    vital: 'spO2',
    value: 91,
    acknowledged: true
  }
];

export const riskAssessment = {
  level: 'medium', // 'low', 'medium', 'high'
  score: 45,
  factors: [
    { name: 'Age', impact: 'moderate', value: '68 years' },
    { name: 'Blood Pressure', impact: 'low', value: 'Controlled' },
    { name: 'Diabetes', impact: 'moderate', value: 'Type 2, managed' },
    { name: 'Medication Adherence', impact: 'low', value: '85%' }
  ],
  lastUpdated: new Date().toISOString()
};

export const dailySummary = {
  date: new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }),
  medicationsTaken: 3,
  medicationsTotal: 5,
  alertsTriggered: 2,
  alertsResolved: 1,
  averageHeartRate: 76,
  averageSpO2: 97,
  stepsCount: 3420,
  sleepHours: 7.5,
  hydrationGlasses: 6
};

export default {
  currentVitals,
  vitalsHistory,
  medications,
  alerts,
  riskAssessment,
  dailySummary
};

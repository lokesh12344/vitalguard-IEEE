// Mock patients data for doctor and caretaker dashboards
// Includes patient profiles, vitals summaries, and care relationships

const generatePatientVitals = (heartRateBase, tempBase, spo2Base, riskLevel) => {
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

  return {
    current: {
      heartRate: { value: heartRateBase, unit: 'bpm', status: riskLevel === 'high' ? 'warning' : 'normal' },
      temperature: { value: tempBase, unit: '°F', status: tempBase > 99.5 ? 'warning' : 'normal' },
      spO2: { value: spo2Base, unit: '%', status: spo2Base < 95 ? 'critical' : 'normal' },
      bloodPressure: { systolic: 120 + Math.floor(Math.random() * 20), diastolic: 75 + Math.floor(Math.random() * 10), unit: 'mmHg' }
    },
    history: {
      heartRate: generateTimeSeriesData(heartRateBase, 12),
      temperature: generateTimeSeriesData(tempBase, 0.6),
      spO2: generateTimeSeriesData(spo2Base, 3)
    }
  };
};

export const patients = [
  {
    id: 'P001',
    name: 'Martha Johnson',
    age: 72,
    gender: 'Female',
    avatar: 'MJ',
    condition: 'Hypertension, Type 2 Diabetes',
    riskLevel: 'high',
    riskScore: 78,
    lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    assignedDoctor: 'Dr. Sarah Chen',
    caretaker: 'Robert Johnson (Son)',
    emergencyContact: '+1 (555) 123-4567',
    address: '123 Oak Street, Springfield, IL',
    vitals: generatePatientVitals(92, 99.2, 93, 'high'),
    medications: [
      { name: 'Metformin', dosage: '1000mg', schedule: 'Twice daily', adherence: 72 },
      { name: 'Lisinopril', dosage: '20mg', schedule: 'Once daily', adherence: 85 },
      { name: 'Aspirin', dosage: '81mg', schedule: 'Once daily', adherence: 90 }
    ],
    alerts: [
      { type: 'critical', message: 'SpO₂ below threshold (93%)', time: '2 hours ago', active: true },
      { type: 'warning', message: 'Missed medication: Metformin', time: '6 hours ago', active: true },
      { type: 'warning', message: 'Elevated heart rate detected', time: '1 day ago', active: false }
    ],
    notes: 'Patient requires close monitoring due to recent hospitalization for diabetic complications.'
  },
  {
    id: 'P002',
    name: 'Robert Williams',
    age: 65,
    gender: 'Male',
    avatar: 'RW',
    condition: 'Coronary Artery Disease',
    riskLevel: 'high',
    riskScore: 72,
    lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    assignedDoctor: 'Dr. Sarah Chen',
    caretaker: 'Emily Williams (Daughter)',
    emergencyContact: '+1 (555) 234-5678',
    address: '456 Maple Avenue, Springfield, IL',
    vitals: generatePatientVitals(88, 98.8, 94, 'high'),
    medications: [
      { name: 'Clopidogrel', dosage: '75mg', schedule: 'Once daily', adherence: 95 },
      { name: 'Metoprolol', dosage: '50mg', schedule: 'Twice daily', adherence: 88 },
      { name: 'Atorvastatin', dosage: '40mg', schedule: 'Once daily', adherence: 92 }
    ],
    alerts: [
      { type: 'warning', message: 'Heart rate variability abnormal', time: '4 hours ago', active: true },
      { type: 'info', message: 'Scheduled check-up tomorrow', time: '1 day ago', active: true }
    ],
    notes: 'Post-stent placement patient. Regular cardiac monitoring required.'
  },
  {
    id: 'P003',
    name: 'Eleanor Davis',
    age: 78,
    gender: 'Female',
    avatar: 'ED',
    condition: 'COPD, Arthritis',
    riskLevel: 'medium',
    riskScore: 55,
    lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    assignedDoctor: 'Dr. Michael Brown',
    caretaker: 'Home Care Services',
    emergencyContact: '+1 (555) 345-6789',
    address: '789 Pine Road, Springfield, IL',
    vitals: generatePatientVitals(76, 98.4, 96, 'medium'),
    medications: [
      { name: 'Albuterol Inhaler', dosage: '2 puffs', schedule: 'As needed', adherence: 80 },
      { name: 'Tiotropium', dosage: '18mcg', schedule: 'Once daily', adherence: 85 },
      { name: 'Ibuprofen', dosage: '400mg', schedule: 'As needed', adherence: 75 }
    ],
    alerts: [
      { type: 'info', message: 'Respiratory rate slightly elevated', time: '3 hours ago', active: false }
    ],
    notes: 'Patient manages well with current treatment. Monitor for respiratory decline.'
  },
  {
    id: 'P004',
    name: 'James Thompson',
    age: 58,
    gender: 'Male',
    avatar: 'JT',
    condition: 'Post-stroke recovery',
    riskLevel: 'medium',
    riskScore: 48,
    lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    assignedDoctor: 'Dr. Sarah Chen',
    caretaker: 'Linda Thompson (Wife)',
    emergencyContact: '+1 (555) 456-7890',
    address: '321 Elm Street, Springfield, IL',
    vitals: generatePatientVitals(72, 98.6, 98, 'medium'),
    medications: [
      { name: 'Warfarin', dosage: '5mg', schedule: 'Once daily', adherence: 98 },
      { name: 'Amlodipine', dosage: '5mg', schedule: 'Once daily', adherence: 95 },
      { name: 'Gabapentin', dosage: '300mg', schedule: 'Three times daily', adherence: 88 }
    ],
    alerts: [],
    notes: 'Good recovery progress. Continue physical therapy regimen.'
  },
  {
    id: 'P005',
    name: 'Patricia Anderson',
    age: 68,
    gender: 'Female',
    avatar: 'PA',
    condition: 'Heart Failure (Stage B)',
    riskLevel: 'medium',
    riskScore: 52,
    lastUpdated: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    assignedDoctor: 'Dr. Michael Brown',
    caretaker: 'David Anderson (Husband)',
    emergencyContact: '+1 (555) 567-8901',
    address: '654 Cedar Lane, Springfield, IL',
    vitals: generatePatientVitals(74, 98.2, 97, 'medium'),
    medications: [
      { name: 'Furosemide', dosage: '40mg', schedule: 'Once daily', adherence: 90 },
      { name: 'Carvedilol', dosage: '12.5mg', schedule: 'Twice daily', adherence: 92 },
      { name: 'Lisinopril', dosage: '10mg', schedule: 'Once daily', adherence: 88 }
    ],
    alerts: [
      { type: 'info', message: 'Weight increase of 2 lbs in 3 days', time: '12 hours ago', active: true }
    ],
    notes: 'Monitor for fluid retention. Adjust diuretics if needed.'
  },
  {
    id: 'P006',
    name: 'George Martinez',
    age: 75,
    gender: 'Male',
    avatar: 'GM',
    condition: 'Type 2 Diabetes',
    riskLevel: 'low',
    riskScore: 28,
    lastUpdated: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    assignedDoctor: 'Dr. Sarah Chen',
    caretaker: 'Maria Martinez (Wife)',
    emergencyContact: '+1 (555) 678-9012',
    address: '987 Birch Drive, Springfield, IL',
    vitals: generatePatientVitals(70, 98.4, 98, 'low'),
    medications: [
      { name: 'Metformin', dosage: '500mg', schedule: 'Twice daily', adherence: 96 },
      { name: 'Glipizide', dosage: '5mg', schedule: 'Once daily', adherence: 94 }
    ],
    alerts: [],
    notes: 'Well-controlled diabetes. Continue current management plan.'
  },
  {
    id: 'P007',
    name: 'Helen Clark',
    age: 82,
    gender: 'Female',
    avatar: 'HC',
    condition: 'Atrial Fibrillation',
    riskLevel: 'low',
    riskScore: 32,
    lastUpdated: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    assignedDoctor: 'Dr. Michael Brown',
    caretaker: 'Sunrise Senior Living',
    emergencyContact: '+1 (555) 789-0123',
    address: '246 Willow Way, Springfield, IL',
    vitals: generatePatientVitals(68, 98.0, 99, 'low'),
    medications: [
      { name: 'Apixaban', dosage: '5mg', schedule: 'Twice daily', adherence: 98 },
      { name: 'Diltiazem', dosage: '120mg', schedule: 'Once daily', adherence: 95 }
    ],
    alerts: [],
    notes: 'Stable condition. Annual echo scheduled for next month.'
  },
  {
    id: 'P008',
    name: 'Thomas Lee',
    age: 61,
    gender: 'Male',
    avatar: 'TL',
    condition: 'Chronic Kidney Disease (Stage 3)',
    riskLevel: 'low',
    riskScore: 35,
    lastUpdated: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    assignedDoctor: 'Dr. Sarah Chen',
    caretaker: 'Self-managed',
    emergencyContact: '+1 (555) 890-1234',
    address: '135 Spruce Court, Springfield, IL',
    vitals: generatePatientVitals(72, 98.6, 98, 'low'),
    medications: [
      { name: 'Losartan', dosage: '50mg', schedule: 'Once daily', adherence: 92 },
      { name: 'Sodium Bicarbonate', dosage: '650mg', schedule: 'Three times daily', adherence: 85 }
    ],
    alerts: [],
    notes: 'Renal function stable. Continue dietary restrictions.'
  }
];

// Sorted by risk level for doctor dashboard
export const patientsByRisk = [...patients].sort((a, b) => {
  const riskOrder = { high: 0, medium: 1, low: 2 };
  return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
});

// Get patients for a specific caretaker view (linked patients)
export const getLinkedPatients = (caretakerId = 'default') => {
  // For demo, return first 3 patients as linked
  return patients.slice(0, 3);
};

// Get patient by ID
export const getPatientById = (id) => {
  return patients.find(p => p.id === id);
};

// Statistics for dashboards
export const dashboardStats = {
  totalPatients: patients.length,
  highRiskCount: patients.filter(p => p.riskLevel === 'high').length,
  mediumRiskCount: patients.filter(p => p.riskLevel === 'medium').length,
  lowRiskCount: patients.filter(p => p.riskLevel === 'low').length,
  activeAlerts: patients.reduce((sum, p) => sum + p.alerts.filter(a => a.active).length, 0),
  averageAdherence: Math.round(
    patients.reduce((sum, p) => {
      const patientAvg = p.medications.reduce((s, m) => s + m.adherence, 0) / p.medications.length;
      return sum + patientAvg;
    }, 0) / patients.length
  )
};

export default {
  patients,
  patientsByRisk,
  getLinkedPatients,
  getPatientById,
  dashboardStats
};

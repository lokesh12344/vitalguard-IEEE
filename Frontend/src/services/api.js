/**
 * VitalGuard API Service
 * 
 * Handles all API communication with the backend.
 * Replaces mock data with real database-driven data.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

class ApiService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/public`;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Patient endpoints
  async getPatients(riskLevel = null) {
    const params = riskLevel ? `?risk_level=${riskLevel}` : '';
    return this.request(`/patients${params}`);
  }

  async getPatient(patientId) {
    return this.request(`/patients/${patientId}`);
  }

  async getPatientDashboard(patientId) {
    return this.request(`/patients/${patientId}/dashboard`);
  }

  // Vitals endpoints
  async getCurrentVitals(patientId) {
    return this.request(`/patients/${patientId}/vitals/current`);
  }

  async getVitalsHistory(patientId, hours = 24, sampleInterval = 120) {
    // sampleInterval in minutes: 120 = every 2 hours for realistic display
    return this.request(`/patients/${patientId}/vitals/history?hours=${hours}&sample_interval=${sampleInterval}`);
  }

  // Medications endpoints
  async getMedications(patientId) {
    return this.request(`/patients/${patientId}/medications`);
  }

  async markMedicationTaken(patientId, medicationId) {
    return this.request(`/patients/${patientId}/medications/${medicationId}/take`, {
      method: 'POST',
    });
  }

  // Alerts endpoints
  async getPatientAlerts(patientId, hours = 24) {
    return this.request(`/patients/${patientId}/alerts?hours=${hours}`);
  }

  async getAllAlerts(hours = 24, severity = null, acknowledged = null) {
    let params = `?hours=${hours}`;
    if (severity) params += `&severity=${severity}`;
    if (acknowledged !== null) params += `&acknowledged=${acknowledged}`;
    return this.request(`/alerts${params}`);
  }

  async acknowledgeAlert(alertId) {
    return this.request(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  // Doctor/Caretaker endpoints
  async getDoctors() {
    return this.request('/doctors');
  }

  async getCaretakers() {
    return this.request('/caretakers');
  }

  async getDoctorPatients(doctorId) {
    return this.request(`/doctors/${doctorId}/patients`);
  }

  async getCaretakerPatients(caretakerId) {
    return this.request(`/caretakers/${caretakerId}/patients`);
  }

  // SOS Emergency endpoint
  async triggerSOS(patientId, location = null, message = null) {
    console.log('🆘 API triggerSOS called:', { patientId, location, message });
    console.log('🔗 Full URL:', `${this.baseUrl}/patients/${patientId}/sos`);
    return this.request(`/patients/${patientId}/sos`, {
      method: 'POST',
      body: JSON.stringify({
        location,
        message
      }),
    });
  }
}

// Socket.IO connection for real-time updates
class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    if (this.socket && this.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Dynamic import of socket.io-client
      import('socket.io-client').then(({ io }) => {
        this.socket = io(API_BASE_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          this.connected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(error);
          }
        });

        // Register event listeners
        this.socket.on('vital:update', (data) => {
          this.emit('vital:update', data);
        });

        this.socket.on('alert:new', (data) => {
          this.emit('alert:new', data);
        });

        this.socket.on('alert:acknowledged', (data) => {
          this.emit('alert:acknowledged', data);
        });

        this.socket.on('medication:reminder', (data) => {
          this.emit('medication:reminder', data);
        });
      }).catch(reject);
    });
  }

  subscribeToPatient(patientId) {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe:patient', { patient_id: patientId });
    }
  }

  unsubscribeFromPatient(patientId) {
    if (this.socket && this.connected) {
      this.socket.emit('unsubscribe:patient', { patient_id: patientId });
    }
  }

  subscribeToAlerts() {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe:alerts');
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

// Export singleton instances
export const api = new ApiService();
export const websocket = new WebSocketService();

// Helper to transform API data to match existing frontend format
export const transformPatientData = (apiPatient, vitals, medications, alerts) => {
  return {
    id: apiPatient.id,
    name: apiPatient.name,
    age: apiPatient.age,
    avatar: apiPatient.avatar,
    condition: apiPatient.condition,
    riskLevel: apiPatient.risk_level,
    lastUpdated: apiPatient.last_updated,
    assignedDoctor: apiPatient.doctor_name || 'Dr. Unknown',
    caretaker: apiPatient.caretaker_name || 'Not assigned',
    emergencyContact: apiPatient.emergency_contact || 'Not set',
    
    vitals: vitals ? {
      current: {
        heartRate: {
          value: vitals.heart_rate?.value,
          unit: vitals.heart_rate?.unit || 'bpm',
          status: vitals.heart_rate?.status || 'normal',
        },
        temperature: {
          value: vitals.temperature?.value,
          unit: vitals.temperature?.unit || '°C',
          status: vitals.temperature?.status || 'normal',
        },
        spO2: {
          value: vitals.spo2?.value,
          unit: vitals.spo2?.unit || '%',
          status: vitals.spo2?.status || 'normal',
        },
        bloodPressure: {
          systolic: vitals.blood_pressure?.systolic,
          diastolic: vitals.blood_pressure?.diastolic,
          unit: vitals.blood_pressure?.unit || 'mmHg',
          status: vitals.blood_pressure?.status || 'normal',
        },
      },
      history: [],
    } : null,
    
    medications: medications?.map(med => ({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      adherence: med.adherence,
      nextDose: med.next_dose,
    })) || [],
    
    alerts: alerts?.map(alert => ({
      type: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      active: alert.active,
    })) || [],
  };
};

// Transform vitals history for charts
export const transformVitalsHistory = (history) => {
  return history.map(reading => ({
    timestamp: reading.timestamp,
    heartRate: reading.heart_rate,
    temperature: reading.temperature,
    spO2: reading.spo2,
    bloodPressureSystolic: reading.blood_pressure_systolic,
    bloodPressureDiastolic: reading.blood_pressure_diastolic,
    respiratoryRate: reading.respiratory_rate,
  }));
};

export default api;

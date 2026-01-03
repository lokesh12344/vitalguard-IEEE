/**
 * Custom hooks for VitalGuard data fetching and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, websocket, transformPatientData, transformVitalsHistory } from '../services/api';

/**
 * Hook for fetching patient data with real-time updates
 */
export function usePatientData(patientId) {
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [medications, setMedications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      const [patientData, vitalsData, medsData, alertsData] = await Promise.all([
        api.getPatient(patientId),
        api.getCurrentVitals(patientId),
        api.getMedications(patientId),
        api.getPatientAlerts(patientId),
      ]);
      
      setPatient(patientData);
      setVitals(vitalsData);
      setMedications(medsData);
      setAlerts(alertsData);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching patient data:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up real-time updates
  useEffect(() => {
    if (!patientId) return;

    const handleVitalUpdate = (data) => {
      if (data.patient_id === patientId) {
        setVitals(prev => ({
          ...prev,
          heart_rate: { ...prev?.heart_rate, value: data.heart_rate },
          temperature: { ...prev?.temperature, value: data.temperature },
          spo2: { ...prev?.spo2, value: data.spo2 },
          blood_pressure: {
            ...prev?.blood_pressure,
            systolic: data.blood_pressure_systolic,
            diastolic: data.blood_pressure_diastolic,
          },
          last_updated: data.timestamp,
        }));
      }
    };

    const handleNewAlert = (data) => {
      if (data.patient_id === patientId) {
        setAlerts(prev => [
          {
            id: data.id,
            type: data.alert_type,
            message: data.message,
            severity: data.severity,
            timestamp: data.created_at,
            active: !data.is_acknowledged,
          },
          ...prev,
        ]);
      }
    };

    // Connect to WebSocket and subscribe
    websocket.connect().then(() => {
      websocket.subscribeToPatient(patientId);
      websocket.on('vital:update', handleVitalUpdate);
      websocket.on('alert:new', handleNewAlert);
    }).catch(err => {
      console.error('WebSocket connection failed:', err);
    });

    return () => {
      websocket.off('vital:update', handleVitalUpdate);
      websocket.off('alert:new', handleNewAlert);
      websocket.unsubscribeFromPatient(patientId);
    };
  }, [patientId]);

  const transformedData = patient ? transformPatientData(patient, vitals, medications, alerts) : null;

  return {
    patient: transformedData,
    rawPatient: patient,
    rawVitals: vitals,
    medications,
    alerts,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for fetching vitals history
 */
export function useVitalsHistory(patientId, hours = 24) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      const data = await api.getVitalsHistory(patientId, hours);
      setHistory(transformVitalsHistory(data));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [patientId, hours]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Update history with real-time data
  useEffect(() => {
    if (!patientId) return;

    const handleVitalUpdate = (data) => {
      if (data.patient_id === patientId) {
        setHistory(prev => [
          ...prev,
          {
            timestamp: data.timestamp,
            heartRate: data.heart_rate,
            temperature: data.temperature,
            spO2: data.spo2,
            bloodPressureSystolic: data.blood_pressure_systolic,
            bloodPressureDiastolic: data.blood_pressure_diastolic,
            respiratoryRate: data.respiratory_rate,
          },
        ]);
      }
    };

    websocket.on('vital:update', handleVitalUpdate);
    return () => websocket.off('vital:update', handleVitalUpdate);
  }, [patientId]);

  return { history, loading, error, refetch: fetchHistory };
}

/**
 * Hook for fetching all patients (for doctor/caretaker dashboards)
 */
export function usePatients(role = null, userId = null) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      
      if (role === 'doctor' && userId) {
        data = await api.getDoctorPatients(userId);
      } else if (role === 'caretaker' && userId) {
        data = await api.getCaretakerPatients(userId);
      } else {
        data = await api.getPatients();
      }
      
      setPatients(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Listen for real-time alert updates
  useEffect(() => {
    const handleNewAlert = (data) => {
      // Update the patient's risk level if needed
      setPatients(prev => prev.map(p => {
        if (p.id === data.patient_id) {
          return {
            ...p,
            // Risk level will be updated on next fetch
          };
        }
        return p;
      }));
    };

    websocket.connect().then(() => {
      websocket.subscribeToAlerts();
      websocket.on('alert:new', handleNewAlert);
    }).catch(console.error);

    return () => {
      websocket.off('alert:new', handleNewAlert);
    };
  }, []);

  return { patients, loading, error, refetch: fetchPatients };
}

/**
 * Hook for fetching all alerts
 */
export function useAlerts(hours = 24, severity = null) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAllAlerts(hours, severity, false);
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hours, severity]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Listen for real-time alerts
  useEffect(() => {
    const handleNewAlert = (data) => {
      setAlerts(prev => [
        {
          id: data.id,
          type: data.alert_type,
          message: data.message,
          severity: data.severity,
          timestamp: data.created_at,
          active: !data.is_acknowledged,
          patient_id: data.patient_id,
        },
        ...prev,
      ]);
    };

    const handleAlertAcknowledged = (data) => {
      setAlerts(prev => prev.filter(a => a.id !== data.alert_id));
    };

    websocket.connect().then(() => {
      websocket.subscribeToAlerts();
      websocket.on('alert:new', handleNewAlert);
      websocket.on('alert:acknowledged', handleAlertAcknowledged);
    }).catch(console.error);

    return () => {
      websocket.off('alert:new', handleNewAlert);
      websocket.off('alert:acknowledged', handleAlertAcknowledged);
    };
  }, []);

  const acknowledgeAlert = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  return { alerts, loading, error, refetch: fetchAlerts, acknowledgeAlert };
}

/**
 * Hook for polling data (fallback when WebSocket is not available)
 */
export function usePolling(fetchFn, interval = 10000, enabled = true) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchFn();

    // Set up polling
    intervalRef.current = setInterval(fetchFn, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchFn, interval, enabled]);
}

export default {
  usePatientData,
  useVitalsHistory,
  usePatients,
  useAlerts,
  usePolling,
};

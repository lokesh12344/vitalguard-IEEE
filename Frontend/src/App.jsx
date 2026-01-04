import React, { useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import PatientDashboard from '@/pages/PatientDashboard';
import DoctorDashboard from '@/pages/DoctorDashboard';
import CaretakerDashboard from '@/pages/CaretakerDashboard';
import AdminRegistration from '@/pages/AdminRegistration';
import AIChat from '@/components/AIChat';

// Current patient ID - In a real app, this would come from auth context
const CURRENT_PATIENT_ID = 1;

function App() {
  const [currentRole, setCurrentRole] = useState('patient');

  const handleRoleChange = (role) => {
    setCurrentRole(role);
  };

  const renderDashboard = () => {
    switch (currentRole) {
      case 'patient':
        return <PatientDashboard />;
      case 'doctor':
        return <DoctorDashboard />;
      case 'caretaker':
        return <CaretakerDashboard />;
      case 'admin':
        return <AdminRegistration />;
      default:
        return <PatientDashboard />;
    }
  };

  // Only pass patientId when in patient role
  const getPatientIdForChat = () => {
    return currentRole === 'patient' ? CURRENT_PATIENT_ID : null;
  };

  return (
    <ThemeProvider>
      <DashboardLayout currentRole={currentRole} onRoleChange={handleRoleChange}>
        {renderDashboard()}
      </DashboardLayout>
      {/* AI Health Assistant - Available on all pages */}
      <AIChat patientId={getPatientIdForChat()} />
    </ThemeProvider>
  );
}

export default App;

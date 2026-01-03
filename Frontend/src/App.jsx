import React, { useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import PatientDashboard from '@/pages/PatientDashboard';
import DoctorDashboard from '@/pages/DoctorDashboard';
import CaretakerDashboard from '@/pages/CaretakerDashboard';

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
      default:
        return <PatientDashboard />;
    }
  };

  return (
    <ThemeProvider>
      <DashboardLayout currentRole={currentRole} onRoleChange={handleRoleChange}>
        {renderDashboard()}
      </DashboardLayout>
    </ThemeProvider>
  );
}

export default App;

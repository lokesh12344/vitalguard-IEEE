import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  User, 
  Stethoscope, 
  Heart,
  Bell,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const roleConfig = {
  patient: {
    label: 'Patient',
    icon: User,
    color: 'bg-blue-500',
    description: 'View your health dashboard'
  },
  doctor: {
    label: 'Doctor',
    icon: Stethoscope,
    color: 'bg-green-500',
    description: 'Manage your patients'
  },
  caretaker: {
    label: 'Caretaker',
    icon: Heart,
    color: 'bg-purple-500',
    description: 'Monitor linked patients'
  }
};

const DashboardLayout = ({ children, currentRole, onRoleChange }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const RoleIcon = roleConfig[currentRole]?.icon || User;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-gray-900">VitalGuard</h1>
                  <p className="text-xs text-gray-500">Smart Remote Monitoring</p>
                </div>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 hidden sm:inline">Demo Mode:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {Object.entries(roleConfig).map(([role, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={role}
                      onClick={() => onRoleChange(role)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                        currentRole === role
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </Button>
              <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-gray-200">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white", roleConfig[currentRole].color)}>
                  <RoleIcon className="h-4 w-4" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {currentRole === 'patient' ? 'John Smith' : 
                     currentRole === 'doctor' ? 'Dr. Sarah Chen' : 'Care Assistant'}
                  </p>
                  <p className="text-xs text-gray-500">{roleConfig[currentRole].label} View</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">VitalGuard</h1>
                  <p className="text-xs text-gray-500">Remote Monitoring</p>
                </div>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              {Object.entries(roleConfig).map(([role, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={role}
                    onClick={() => {
                      onRoleChange(role);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-all",
                      currentRole === role
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-xs opacity-75">{config.description}</p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-500">
              © 2026 VitalGuard – Smart Remote Monitoring for Home-Based Patient Care
            </p>
            <p className="text-xs text-gray-400">
              Demo Version • Data shown is simulated for demonstration purposes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;

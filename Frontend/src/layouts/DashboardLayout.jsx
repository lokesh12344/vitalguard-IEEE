import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeContext';
import Chat, { ChatButton } from '@/components/Chat';
import api from '@/services/api';
import { 
  Activity, 
  User, 
  Stethoscope, 
  Heart,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  UserPlus
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
  },
  admin: {
    label: 'Admin',
    icon: UserPlus,
    color: 'bg-orange-500',
    description: 'Register new patients'
  }
};

const DashboardLayout = ({ children, currentRole, onRoleChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isDark, toggleTheme } = useTheme();

  // Get current user based on role
  const getCurrentUser = () => {
    switch (currentRole) {
      case 'patient':
        return { id: 7, name: 'Ramesh Gupta', role: 'patient' };
      case 'doctor':
        return { id: 1, name: 'Dr. Priya Sharma', role: 'doctor' };
      case 'caretaker':
        return { id: 27, name: 'Advait Daware', role: 'caretaker' };
      default:
        return null;
    }
  };

  const currentUser = getCurrentUser();

  // Load unread message count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (currentUser && currentRole !== 'admin') {
        try {
          const data = await api.getUnreadMessageCount(currentUser.id);
          setUnreadCount(data?.unread_count || 0);
        } catch (error) {
          console.error('Failed to load unread count:', error);
        }
      }
    };

    loadUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id, currentRole]);

  const RoleIcon = roleConfig[currentRole]?.icon || User;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">VitalGuard</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Smart Remote Monitoring</p>
                </div>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Demo Mode:</span>
              <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 transition-colors">
                {Object.entries(roleConfig).map(([role, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={role}
                      onClick={() => onRoleChange(role)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                        currentRole === role
                          ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
              {/* Theme Toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme}
                className="relative group"
              >
                <div className="relative w-5 h-5">
                  <Sun className={cn(
                    "h-5 w-5 absolute inset-0 text-amber-500 transition-all duration-300",
                    isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                  )} />
                  <Moon className={cn(
                    "h-5 w-5 absolute inset-0 text-blue-400 transition-all duration-300",
                    isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                  )} />
                </div>
              </Button>
              
              {/* Chat Button - show for patient, doctor, caretaker */}
              {currentRole !== 'admin' && currentUser && (
                <ChatButton 
                  onClick={() => setChatOpen(true)} 
                  unreadCount={unreadCount} 
                />
              )}
              
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse">
                  3
                </span>
              </Button>
              <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-slate-700">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white", roleConfig[currentRole].color)}>
                  <RoleIcon className="h-4 w-4" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {currentRole === 'patient' ? 'Ramesh Gupta' : 
                     currentRole === 'doctor' ? 'Dr. Priya Sharma' : 
                     currentRole === 'admin' ? 'Receptionist' : 'Care Assistant'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{roleConfig[currentRole].label} View</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 shadow-xl transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">VitalGuard</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Remote Monitoring</p>
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
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
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
              
              {/* Mobile Theme Toggle */}
              <div className="pt-4 border-t border-gray-200 dark:border-slate-800 mt-4">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  {isDark ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-blue-500" />}
                  <div>
                    <p className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</p>
                    <p className="text-xs opacity-75">Switch appearance</p>
                  </div>
                </button>
              </div>
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
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2026 VitalGuard – Smart Remote Monitoring for Home-Based Patient Care
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Demo Version • Data shown is simulated for demonstration purposes
            </p>
          </div>
        </div>
      </footer>

      {/* Chat Modal */}
      {currentUser && (
        <Chat 
          isOpen={chatOpen} 
          onClose={() => {
            setChatOpen(false);
            // Refresh unread count when closing
            if (currentUser) {
              api.getUnreadMessageCount(currentUser.id)
                .then(data => setUnreadCount(data?.unread_count || 0))
                .catch(console.error);
            }
          }} 
          currentUser={currentUser} 
        />
      )}
    </div>
  );
};

export default DashboardLayout;

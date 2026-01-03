import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, Phone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import api from '@/services/api';

const SOSButton = ({ 
  patientId,
  patientName = "Patient",
  emergencyContact = "Emergency Services",
  onSOS 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [sosResult, setSosResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSOS = async () => {
    console.log('🚨 SOS Button clicked! Patient ID:', patientId);
    
    if (!patientId) {
      console.error('❌ No patient ID provided');
      setError("Patient ID not available");
      return;
    }

    setIsTriggering(true);
    setError(null);
    
    try {
      console.log('📡 Calling API triggerSOS...');
      // Call the actual SOS API
      const result = await api.triggerSOS(
        patientId,
        null, // location - could be enhanced with geolocation
        "Emergency assistance requested via VitalGuard SOS button"
      );
      console.log('✅ SOS API response:', result);
      
      setSosResult(result);
      setTriggered(true);
      onSOS?.(result);
      
      // Reset after showing success
      setTimeout(() => {
        setTriggered(false);
        setSosResult(null);
        setIsOpen(false);
      }, 5000);
    } catch (err) {
      console.error('SOS Error:', err);
      setError(err.message || 'Failed to send SOS alert');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="danger" 
          size="xl"
          className="w-full gap-3 animate-pulse hover:animate-none shadow-lg shadow-red-200 dark:shadow-red-900/50"
        >
          <AlertTriangle className="h-6 w-6" />
          Emergency SOS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            Emergency SOS Alert
          </DialogTitle>
          <DialogDescription className="pt-2">
            {triggered ? (
              <span className="text-green-600 font-medium">
                ✓ Emergency alert has been sent successfully!
              </span>
            ) : (
              <>
                This will immediately alert your emergency contacts and healthcare providers.
                <br /><br />
                <strong>Are you sure you want to send an emergency alert?</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {!triggered && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-2">
            <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-2">
              This alert will notify:
            </p>
            <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Contact: {emergencyContact}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Assigned Healthcare Provider
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Local Emergency Services (if critical)
              </li>
            </ul>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-2">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </div>
        )}

        {triggered && sosResult ? (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Emergency Alert Recorded!</span>
              </div>
              <p className="text-green-700 dark:text-green-300 text-sm">
                Your SOS has been logged. Healthcare team has been notified.
              </p>
            </div>
            
            {sosResult.notifications_sent?.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  SMS sent to:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {sosResult.notifications_sent.map((notif, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {notif.recipient} ({notif.role})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {sosResult.notifications_failed?.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mt-2">
                <p className="text-sm font-medium mb-2 text-yellow-700 dark:text-yellow-300">
                  ⚠️ Some SMS notifications pending:
                </p>
                <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                  {sosResult.notifications_failed.map((notif, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {notif.recipient} ({notif.role})
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  Alert is recorded. Manual contact may be required.
                </p>
              </div>
            )}
          </div>
        ) : !triggered && (
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isTriggering}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleSOS}
              disabled={isTriggering}
              className="gap-2"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Alert...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Confirm SOS
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SOSButton;

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
import { AlertTriangle, Phone, Loader2 } from 'lucide-react';

const SOSButton = ({ 
  patientName = "Patient",
  emergencyContact = "Emergency Services",
  onSOS 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const handleSOS = async () => {
    setIsTriggering(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTriggering(false);
    setTriggered(true);
    onSOS?.();
    
    // Reset after showing success
    setTimeout(() => {
      setTriggered(false);
      setIsOpen(false);
    }, 3000);
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

        {triggered ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-700 dark:text-green-300 text-sm">
              Help is on the way. Please stay calm and wait for assistance.
              Your location and vital signs have been shared with emergency responders.
            </p>
          </div>
        ) : (
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

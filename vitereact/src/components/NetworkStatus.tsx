import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-hide offline alert after 10 seconds
    let timeoutId: NodeJS.Timeout;
    if (!isOnline) {
      timeoutId = setTimeout(() => {
        setShowOfflineAlert(false);
      }, 10000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOnline]);

  if (!showOfflineAlert) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert variant="destructive" className="bg-red-50 border-red-200">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="text-red-800">
          You're currently offline. Some features may not work properly.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NetworkStatus;
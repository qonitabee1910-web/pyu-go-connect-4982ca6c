import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast.success('Notifications enabled!');
      await subscribeToPush();
    } else {
      toast.error('Notification permission denied.');
    }
  };

  const subscribeToPush = async () => {
    if (!user || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if we already have a subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // In a real app, you'd get the public VAPID key from your backend/env
        // For this demo, we'll just log the registration
        console.log('Push subscription registration ready');
        
        // Example of what we'd do if we had a VAPID key:
        /*
        const response = await fetch('/api/vapid-public-key');
        const vapidPublicKey = await response.text();
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
        });
        */
      }

      if (subscription && user) {
        // Store subscription in Supabase for this user
        await supabase
          .from('profiles')
          .update({ 
            // Assuming there's a push_subscription column or similar
            // In a real implementation, you'd have a separate table for devices/tokens
            // metadata: { push_subscription: subscription } 
          } as any)
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  };

  useEffect(() => {
    if (user && permission === 'granted') {
      subscribeToPush();
    }
  }, [user, permission]);

  return { permission, requestPermission };
}

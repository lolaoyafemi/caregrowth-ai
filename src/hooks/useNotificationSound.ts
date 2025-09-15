import { useRef, useCallback } from 'react';

export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio with a simple notification sound (using data URI for a beep sound)
  const initAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      // Simple notification beep sound (data URI)
      audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaATyK0fPIgTMGJXzN8t1/PwkTYrjn77JdGAg+ltryxnkpBSl+zPDaijEIDFmw6+OsWhELTKXh8bllHgg2jdXzzn02Byh+0vDajzIHc2O77eg="
      audioRef.current.volume = 0.5;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    initAudio();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.warn('Could not play notification sound:', err);
      });
    }
  }, [initAudio]);

  return { playNotificationSound };
};

import { useState, useEffect } from 'react';

interface UseFeelingStuckPopupProps {
  delayMs?: number;
  enabled?: boolean;
}

export const useFeelingStuckPopup = ({ 
  delayMs = 180000, // 3 minutes in milliseconds
  enabled = true 
}: UseFeelingStuckPopupProps = {}) => {
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (!enabled || hasShown) return;

    const timer = setTimeout(() => {
      setShowPopup(true);
      setHasShown(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, enabled, hasShown]);

  const closePopup = () => {
    setShowPopup(false);
  };

  const resetPopup = () => {
    setHasShown(false);
    setShowPopup(false);
  };

  return {
    showPopup,
    closePopup,
    resetPopup,
    hasShown
  };
};

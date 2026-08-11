import { useEffect, useRef, useState } from "react";

/**
 * Tracks a long-press-active visual state for touch/mouse interactions.
 * The actual long-press action is handled by the browser's native context
 * menu gesture — this only drives the `long-press-active` styling class.
 */
export function useLongPress() {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      // Long press detected - context menu will handle it
    }, 750);
  };

  const handleTouchEnd = () => {
    setIsLongPressing(false);
    clearTimeout(longPressTimer.current ?? undefined);
  };

  useEffect(() => {
    return () => clearTimeout(longPressTimer.current ?? undefined);
  }, []);

  return { isLongPressing, handleTouchStart, handleTouchEnd };
}

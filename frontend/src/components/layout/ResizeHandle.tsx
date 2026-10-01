import React, { useCallback, useEffect, useRef, useState } from 'react';

type Orientation = 'vertical' | 'horizontal';

interface ResizeHandleProps {
  orientation: Orientation;
  /** Receives the new absolute size in pixels, already clamped to min/max. */
  onResize: (nextSize: number) => void;
  /** Re-reads the current value when the drag starts, to avoid stale state. */
  getCurrentSize?: () => number;
  min?: number;
  max?: number;
  /**
   * How pointer/key movement maps to size. Use -1 when the handle is on the
   * leading edge of the panel, so dragging toward the start makes it wider.
   */
  direction?: 1 | -1;
  /** Reported to assistive tech and used to clamp keyboard resizing. */
  currentSize?: number;
  onDoubleClick?: () => void;
  ariaLabel: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * A 1px divider with a wider invisible hit area, matching how editors handle
 * panel dragging. The value is captured on pointer down and the absolute next
 * size is reported from there, so a drag never fights the state it updates.
 */
export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  orientation,
  onResize,
  getCurrentSize,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  direction = 1,
  currentSize,
  onDoubleClick,
  ariaLabel,
}) => {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ pointer: 0, size: 0 });

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      startRef.current = {
        pointer: orientation === 'vertical' ? event.clientX : event.clientY,
        size: getCurrentSize?.() ?? currentSize ?? 0,
      };
      setDragging(true);
    },
    [orientation, getCurrentSize, currentSize]
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: PointerEvent) => {
      const pointer = orientation === 'vertical' ? event.clientX : event.clientY;
      onResize(clamp(startRef.current.size + direction * (pointer - startRef.current.pointer), min, max));
    };

    const onUp = () => setDragging(false);

    // Cursor and selection lock prevent text selection while dragging.
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [dragging, orientation, onResize, min, max, direction]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 8;
    const decrease = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp';
    const increase = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown';
    if (event.key !== decrease && event.key !== increase) return;
    event.preventDefault();
    const base = getCurrentSize?.() ?? currentSize ?? 0;
    // With direction -1 the leading arrow shrinks the panel instead.
    const grow = direction === 1 ? increase : decrease;
    onResize(clamp(base + (event.key === grow ? step : -step), min, max));
  };

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
      aria-valuenow={currentSize}
      aria-valuemin={min}
      aria-valuemax={Number.isFinite(max) ? max : undefined}
      tabIndex={0}
      data-dragging={dragging}
      className={`resize-handle resize-handle--${orientation}`}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    />
  );
};

export default ResizeHandle;

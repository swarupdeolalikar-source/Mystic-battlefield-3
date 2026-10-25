import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onStop: () => void;
  faction?: 'DEVAS' | 'ASURAS';
  scale?: number;
  opacity?: number;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onStop,
  faction = 'DEVAS',
  scale = 1.0,
  opacity = 1.0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stickPos, setStickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState<boolean>(false);
  const activeTouchIdRef = useRef<number | null>(null);

  const radius = 48; // Max thumb displacement

  const handlePointerStart = useCallback((clientX: number, clientY: number, id: number | null) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(radius, dist);
    const angle = Math.atan2(dy, dx);

    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;

    activeTouchIdRef.current = id;
    setIsActive(true);
    setStickPos({ x: nx, y: ny });
    onMove({ x: nx / radius, y: ny / radius });
  }, [onMove, radius]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || !isActive) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(radius, dist);
    const angle = Math.atan2(dy, dx);

    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;

    setStickPos({ x: nx, y: ny });
    onMove({ x: nx / radius, y: ny / radius });
  }, [isActive, onMove, radius]);

  const handlePointerEnd = useCallback(() => {
    setIsActive(false);
    activeTouchIdRef.current = null;
    setStickPos({ x: 0, y: 0 });
    onStop();
  }, [onStop]);

  // Touch Handlers
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handlePointerStart(touch.clientX, touch.clientY, touch.identifier);
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isActive) return;
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (activeTouchIdRef.current === null || touch.identifier === activeTouchIdRef.current) {
        handlePointerMove(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const onTouchEnd = () => {
    handlePointerEnd();
  };

  // Mouse Handlers for Desktop Testing
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      handlePointerStart(e.clientX, e.clientY, null);
    }
  };

  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (isActive && activeTouchIdRef.current === null) {
        handlePointerMove(e.clientX, e.clientY);
      }
    };
    const onWindowMouseUp = () => {
      if (isActive && activeTouchIdRef.current === null) {
        handlePointerEnd();
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isActive, handlePointerMove, handlePointerEnd]);

  const isDeva = faction === 'DEVAS';

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onMouseDown}
      aria-label="Movement Virtual Joystick"
      style={{
        transform: `scale(${scale})`,
        opacity,
        transformOrigin: 'bottom left',
      }}
      className="pointer-events-auto relative w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing touch-none backdrop-blur-none"
    >
      {/* Outer Glow Ring Base */}
      <div
        className={`absolute inset-0 rounded-full border transition-all duration-150 ${
          isActive
            ? isDeva
              ? 'bg-sky-950/70 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
              : 'bg-rose-950/70 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
            : 'bg-slate-950/65 border-slate-700/80 shadow-lg'
        }`}
      />

      {/* Crosshair Cardinal Direction Notches */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 font-cinzel">▲</div>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 font-cinzel">▼</div>
      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 font-cinzel">◀</div>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 font-cinzel">▶</div>

      {/* Inner Deadzone Ring */}
      <div className="absolute w-12 h-12 rounded-full border border-dashed border-slate-700/50 pointer-events-none" />

      {/* Draggable Analog Stick Nub */}
      <div
        className={`absolute w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center shadow-md transition-transform duration-75 ${
          isDeva
            ? 'bg-gradient-to-br from-sky-400 to-amber-500 border-amber-300 text-slate-950 shadow-sky-500/30'
            : 'bg-gradient-to-br from-rose-500 to-orange-600 border-rose-300 text-white shadow-rose-600/30'
        }`}
        style={{
          transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
        }}
      >
        <div className="w-4 h-4 rounded-full bg-white/40 border border-white/60" />
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  HUDControlConfig,
  DEFAULT_HUD_CONFIG,
  HUD_PRESETS,
  saveHUDConfig,
} from '../game/hudConfig';
import {
  Sliders,
  Move,
  RotateCcw,
  Check,
  X,
  Compass,
  Zap,
  Sparkles,
  LayoutGrid,
  Eye,
  Maximize2,
  Smartphone,
} from 'lucide-react';

interface ControlSettingsModalProps {
  currentConfig: HUDControlConfig;
  onUpdateConfig: (config: HUDControlConfig) => void;
  onClose: () => void;
}

type DraggableKey = 'joystick' | 'abilityDock' | 'dodgeButton' | 'directives' | 'minimap';

export const ControlSettingsModal: React.FC<ControlSettingsModalProps> = ({
  currentConfig,
  onUpdateConfig,
  onClose,
}) => {
  const [config, setConfig] = useState<HUDControlConfig>({ ...currentConfig });
  const [activeTab, setActiveTab] = useState<'VISUAL_DRAG' | 'PRECISION_SLIDERS'>('VISUAL_DRAG');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<DraggableKey>('abilityDock');
  const [testFeedback, setTestFeedback] = useState<string>('Ready to test controls');

  const dragAreaRef = useRef<HTMLDivElement | null>(null);
  const draggingItemRef = useRef<{
    key: DraggableKey;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Sync back to parent in real-time so live preview updates underneath
  const handleConfigChange = (newConfig: HUDControlConfig) => {
    setConfig(newConfig);
    onUpdateConfig(newConfig);
  };

  const handlePresetSelect = (presetKey: string) => {
    const preset = HUD_PRESETS[presetKey];
    if (preset) {
      setActivePreset(presetKey);
      const updated = JSON.parse(JSON.stringify(preset.config));
      handleConfigChange(updated);
      setTestFeedback(`Loaded preset: ${preset.name}`);
    }
  };

  const handleResetDefaults = () => {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_HUD_CONFIG));
    setActivePreset('default');
    handleConfigChange(fresh);
    setTestFeedback('Reset all controls to standard layout');
  };

  const handleSaveAndClose = () => {
    saveHUDConfig(config);
    onClose();
  };

  // Drag-and-drop mechanics in the Visual Drag viewport
  const startDrag = (key: DraggableKey, clientX: number, clientY: number) => {
    setSelectedElement(key);
    let origX = 0;
    let origY = 0;

    if (key === 'joystick') {
      origX = config.joystick.x;
      origY = config.joystick.y;
    } else if (key === 'abilityDock') {
      origX = config.abilityDock.x;
      origY = config.abilityDock.y;
    } else if (key === 'dodgeButton') {
      origX = config.dodgeButton.x;
      origY = config.dodgeButton.y;
    } else if (key === 'directives') {
      origX = config.directives.x;
      origY = config.directives.y;
    } else if (key === 'minimap') {
      origX = config.minimap.x;
      origY = config.minimap.y;
    }

    draggingItemRef.current = {
      key,
      startX: clientX,
      startY: clientY,
      origX,
      origY,
    };
  };

  const onPointerDownElement = (key: DraggableKey, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startDrag(key, e.clientX, e.clientY);
  };

  const onPointerMoveContainer = useCallback((e: React.PointerEvent) => {
    if (!draggingItemRef.current || !dragAreaRef.current) return;
    const rect = dragAreaRef.current.getBoundingClientRect();
    const item = draggingItemRef.current;

    const dx = e.clientX - item.startX;
    const dy = e.clientY - item.startY;

    const dxPct = (dx / rect.width) * 100;
    const dyPct = (dy / rect.height) * 100;

    const nextConfig = { ...config };

    if (item.key === 'joystick') {
      // x from left, y from bottom
      const newX = Math.max(1, Math.min(88, item.origX + dxPct));
      const newY = Math.max(1, Math.min(85, item.origY - dyPct));
      nextConfig.joystick = { ...nextConfig.joystick, x: Math.round(newX), y: Math.round(newY) };
    } else if (item.key === 'abilityDock') {
      // x from left, y from bottom
      const newX = Math.max(10, Math.min(90, item.origX + dxPct));
      const newY = Math.max(1, Math.min(80, item.origY - dyPct));
      nextConfig.abilityDock = { ...nextConfig.abilityDock, x: Math.round(newX), y: Math.round(newY) };
    } else if (item.key === 'dodgeButton') {
      // x from right, y from bottom
      const newX = Math.max(2, Math.min(90, item.origX - dxPct));
      const newY = Math.max(1, Math.min(85, item.origY - dyPct));
      nextConfig.dodgeButton = { ...nextConfig.dodgeButton, x: Math.round(newX), y: Math.round(newY) };
    } else if (item.key === 'directives') {
      const newX = Math.max(1, Math.min(85, item.origX - dxPct));
      const newY = Math.max(5, Math.min(85, item.origY - dyPct));
      nextConfig.directives = { ...nextConfig.directives, x: Math.round(newX), y: Math.round(newY) };
    } else if (item.key === 'minimap') {
      const newX = Math.max(1, Math.min(85, item.origX - dxPct));
      const newY = Math.max(1, Math.min(80, item.origY - dyPct));
      nextConfig.minimap = { ...nextConfig.minimap, x: Math.round(newX), y: Math.round(newY) };
    }

    handleConfigChange(nextConfig);
  }, [config]);

  const onPointerUpContainer = () => {
    draggingItemRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-sm select-none font-rajdhani animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[820px] bg-[#090d16] border border-amber-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-lg text-slate-100 flex items-center gap-2">
                BATTLEFIELD CONTROL HUD CUSTOMIZER
              </h2>
              <p className="text-xs text-slate-400">
                Position, size, and layout settings for on-screen joystick, skills, and battle widgets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-cinzel text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              title="Reset all positions and sizes to standard"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-cinzel font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              <Check className="w-4 h-4" />
              Save & Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] text-amber-400 font-cinzel font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5" /> Presets:
          </span>
          {Object.entries(HUD_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetSelect(key)}
              className={`px-3 py-1 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                activePreset === key
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60'
              }`}
            >
              {preset.name}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('VISUAL_DRAG')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'VISUAL_DRAG'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Move className="w-3.5 h-3.5" /> Drag & Place
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PRECISION_SLIDERS')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'PRECISION_SLIDERS'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Size & Dynamics
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {activeTab === 'VISUAL_DRAG' ? (
            /* TAB 1: VISUAL DRAG-AND-DROP CANVAS OVERLAY */
            <div className="flex-1 relative flex flex-col p-4 bg-slate-950/70 overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1 text-sky-400 font-semibold">
                  <Move className="w-3.5 h-3.5" /> Click and drag any module on the simulated screen to reposition:
                </span>
                <span className="text-[11px] text-amber-400 font-mono">
                  Active: <strong className="uppercase">{selectedElement}</strong>
                </span>
              </div>

              {/* Simulated Screen Viewport Area */}
              <div
                ref={dragAreaRef}
                onPointerMove={onPointerMoveContainer}
                onPointerUp={onPointerUpContainer}
                className="relative flex-1 bg-[#050811] border-2 border-dashed border-slate-700 rounded-xl overflow-hidden touch-none"
              >
                {/* Center Grid Reference Lines */}
                <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-sky-400" />
                  <div className="absolute h-full w-[1px] bg-sky-400" />
                </div>

                {/* 1. Draggable Joystick Box */}
                <div
                  onPointerDown={(e) => onPointerDownElement('joystick', e)}
                  style={{
                    left: `${config.joystick.x}%`,
                    bottom: `${config.joystick.y}%`,
                    transform: `scale(${config.joystick.scale})`,
                    opacity: config.joystick.opacity,
                  }}
                  className={`absolute p-2 rounded-2xl cursor-grab active:cursor-grabbing transition-shadow flex flex-col items-center justify-center ${
                    selectedElement === 'joystick'
                      ? 'border-2 border-sky-400 bg-sky-950/70 shadow-[0_0_20px_rgba(56,189,248,0.5)] z-30'
                      : 'border border-slate-600 bg-slate-900/60 z-20 hover:border-slate-400'
                  }`}
                >
                  <div className="w-20 h-20 rounded-full border-2 border-sky-400/60 bg-sky-950/40 flex items-center justify-center relative">
                    <div className="w-8 h-8 rounded-full bg-sky-400/80 shadow-md flex items-center justify-center text-slate-950 font-bold text-xs">
                      <Compass className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-sky-300 font-cinzel mt-1 uppercase">
                    Joystick ({config.joystick.scale}x)
                  </span>
                </div>

                {/* 2. Draggable Ability Dock */}
                <div
                  onPointerDown={(e) => onPointerDownElement('abilityDock', e)}
                  style={{
                    left: `${config.abilityDock.x}%`,
                    bottom: `${config.abilityDock.y}%`,
                    transform: `translateX(-50%) scale(${config.abilityDock.scale})`,
                    opacity: config.abilityDock.opacity,
                  }}
                  className={`absolute p-2.5 rounded-2xl cursor-grab active:cursor-grabbing transition-shadow flex items-center gap-2 ${
                    selectedElement === 'abilityDock'
                      ? 'border-2 border-amber-400 bg-amber-950/60 shadow-[0_0_20px_rgba(245,158,11,0.5)] z-30'
                      : 'border border-slate-600 bg-slate-900/70 z-20 hover:border-slate-400'
                  }`}
                >
                  {!config.dodgeButton.separate && (
                    <div className="w-11 h-11 rounded-lg bg-sky-950 border border-sky-400 flex flex-col items-center justify-center text-[9px] font-bold text-sky-300">
                      <Zap className="w-4 h-4" />
                      DODGE
                    </div>
                  )}

                  {[1, 2, 3, 4, 5].map((slot) => (
                    <div
                      key={slot}
                      className="w-12 h-12 rounded-lg bg-slate-900 border border-amber-500/70 flex flex-col items-center justify-center text-[10px] font-bold text-amber-300 font-cinzel"
                    >
                      <span>[{slot}]</span>
                      <span className="text-[8px] text-slate-400">Skill</span>
                    </div>
                  ))}
                  <div className="text-[9px] font-bold text-amber-400 uppercase font-cinzel ml-1 writing-mode-vertical">
                    Abilities
                  </div>
                </div>

                {/* 3. Draggable Dodge Button (if separated) */}
                {config.dodgeButton.separate && (
                  <div
                    onPointerDown={(e) => onPointerDownElement('dodgeButton', e)}
                    style={{
                      right: `${config.dodgeButton.x}%`,
                      bottom: `${config.dodgeButton.y}%`,
                      transform: `scale(${config.dodgeButton.scale})`,
                      opacity: config.dodgeButton.opacity,
                    }}
                    className={`absolute p-2 rounded-2xl cursor-grab active:cursor-grabbing transition-shadow flex flex-col items-center ${
                      selectedElement === 'dodgeButton'
                        ? 'border-2 border-sky-400 bg-sky-950/80 shadow-[0_0_20px_rgba(56,189,248,0.5)] z-30'
                        : 'border border-slate-600 bg-slate-900/70 z-20'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-sky-600/70 border-2 border-sky-300 flex flex-col items-center justify-center text-white">
                      <Zap className="w-5 h-5" />
                      <span className="text-[8px] font-bold uppercase">DODGE</span>
                    </div>
                  </div>
                )}

                {/* 4. Draggable Directives Widget */}
                <div
                  onPointerDown={(e) => onPointerDownElement('directives', e)}
                  style={{
                    right: `${config.directives.x}%`,
                    bottom: `${config.directives.y}%`,
                    transform: `scale(${config.directives.scale})`,
                    opacity: config.directives.opacity,
                  }}
                  className={`absolute p-2 rounded-xl cursor-grab active:cursor-grabbing transition-shadow w-44 ${
                    selectedElement === 'directives'
                      ? 'border-2 border-amber-400 bg-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] z-30'
                      : 'border border-slate-700 bg-slate-950/85 z-20'
                  }`}
                >
                  <div className="text-[10px] font-bold text-amber-400 uppercase font-cinzel flex items-center justify-between pb-1 border-b border-slate-800">
                    <span>Directives Tracker</span>
                    <span className="text-[8px] text-slate-400">Q</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">Defeat enemy commanders</div>
                  <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div className="w-3/4 h-full bg-amber-400" />
                  </div>
                </div>

                {/* 5. Draggable Minimap Widget */}
                <div
                  onPointerDown={(e) => onPointerDownElement('minimap', e)}
                  style={{
                    right: `${config.minimap.x}%`,
                    bottom: `${config.minimap.y}%`,
                    transform: `scale(${config.minimap.scale})`,
                    opacity: config.minimap.opacity,
                  }}
                  className={`absolute p-2 rounded-xl cursor-grab active:cursor-grabbing transition-shadow w-44 ${
                    selectedElement === 'minimap'
                      ? 'border-2 border-amber-400 bg-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] z-30'
                      : 'border border-slate-700 bg-slate-950/85 z-20'
                  }`}
                >
                  <div className="text-[10px] font-bold text-amber-400 uppercase font-cinzel flex items-center justify-between pb-1">
                    <span>War Minimap</span>
                    <span className="text-[8px] text-slate-400">2600×1800</span>
                  </div>
                  <div className="w-full h-16 bg-[#070b14] border border-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500">
                    Map Viewport
                  </div>
                </div>
              </div>

              {/* Bottom Quick-Adjust Strip for Selected Element */}
              <div className="mt-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Selected:</span>
                  <div className="flex gap-1">
                    {(['abilityDock', 'joystick', 'dodgeButton', 'directives', 'minimap'] as DraggableKey[]).map(
                      (key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedElement(key)}
                          className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition-all cursor-pointer ${
                            selectedElement === key
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {key === 'abilityDock'
                            ? 'Abilities'
                            : key === 'dodgeButton'
                            ? 'Dodge'
                            : key}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  {selectedElement === 'abilityDock' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-slate-400">Layout:</span>
                      <select
                        value={config.abilityDock.layout}
                        onChange={(e) =>
                          handleConfigChange({
                            ...config,
                            abilityDock: {
                              ...config.abilityDock,
                              layout: e.target.value as 'ROW' | 'ARC',
                            },
                          })
                        }
                        className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5"
                      >
                        <option value="ROW">Linear Row</option>
                        <option value="ARC">Thumb Arc</option>
                      </select>
                    </label>
                  )}

                  {selectedElement === 'dodgeButton' && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.dodgeButton.separate}
                        onChange={(e) =>
                          handleConfigChange({
                            ...config,
                            dodgeButton: {
                              ...config.dodgeButton,
                              separate: e.target.checked,
                            },
                          })
                        }
                        className="rounded accent-amber-500"
                      />
                      <span>Separate from Dock</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: DETAILED PRECISION SLIDERS & DYNAMICS */
            <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-slate-950/60">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Ability Buttons Dock Panel */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-amber-400 font-cinzel">
                    <span className="flex items-center gap-1.5">
                      <LayoutGrid className="w-4 h-4" /> Ability Action Bar
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {Math.round(config.abilityDock.scale * 100)}% scale
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>Button Scale / Size</span>
                      <span className="text-amber-400 font-mono">
                        {config.abilityDock.scale.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.45"
                      step="0.05"
                      value={config.abilityDock.scale}
                      onChange={(e) =>
                        handleConfigChange({
                          ...config,
                          abilityDock: {
                            ...config.abilityDock,
                            scale: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>Transparency / Opacity</span>
                      <span className="text-amber-400 font-mono">
                        {Math.round(config.abilityDock.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="1.0"
                      step="0.05"
                      value={config.abilityDock.opacity}
                      onChange={(e) =>
                        handleConfigChange({
                          ...config,
                          abilityDock: {
                            ...config.abilityDock,
                            opacity: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>Button Spacing (Gap)</span>
                      <span className="text-amber-400 font-mono">
                        {config.abilityDock.spacing || 10}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="24"
                      step="2"
                      value={config.abilityDock.spacing || 10}
                      onChange={(e) =>
                        handleConfigChange({
                          ...config,
                          abilityDock: {
                            ...config.abilityDock,
                            spacing: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Layout Arrangement:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleConfigChange({
                            ...config,
                            abilityDock: { ...config.abilityDock, layout: 'ROW' },
                          })
                        }
                        className={`px-3 py-1 rounded cursor-pointer ${
                          config.abilityDock.layout === 'ROW'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        Linear Row
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleConfigChange({
                            ...config,
                            abilityDock: { ...config.abilityDock, layout: 'ARC' },
                          })
                        }
                        className={`px-3 py-1 rounded cursor-pointer ${
                          config.abilityDock.layout === 'ARC'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        Thumb Arc
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Virtual Analog Joystick Panel */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-sky-400 font-cinzel">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-4 h-4" /> Virtual Joystick
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {Math.round(config.joystick.scale * 100)}% scale
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>Joystick Scale / Size</span>
                      <span className="text-sky-400 font-mono">
                        {config.joystick.scale.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.5"
                      step="0.05"
                      value={config.joystick.scale}
                      onChange={(e) =>
                        handleConfigChange({
                          ...config,
                          joystick: {
                            ...config.joystick,
                            scale: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>Joystick Opacity</span>
                      <span className="text-sky-400 font-mono">
                        {Math.round(config.joystick.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="1.0"
                      step="0.05"
                      value={config.joystick.opacity}
                      onChange={(e) =>
                        handleConfigChange({
                          ...config,
                          joystick: {
                            ...config.joystick,
                            opacity: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Enable On-Screen Joystick</span>
                    <input
                      type="checkbox"
                      checked={config.joystick.enabled}
                      onChange={(e) =>
                        handleConfigChange({
                          ...config,
                          joystick: { ...config.joystick, enabled: e.target.checked },
                        })
                      }
                      className="rounded accent-sky-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. Dodge & Dash Button Panel */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-emerald-400 font-cinzel">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4" /> Dodge / Dash Trigger
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {Math.round(config.dodgeButton.scale * 100)}% scale
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>Dodge Button Size</span>
                      <span className="text-emerald-400 font-mono">
                        {config.dodgeButton.scale.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.05"
                      value={config.dodgeButton.scale}
                      onChange={(e) =>
                        handleConfigChange({
                          ...config,
                          dodgeButton: {
                            ...config.dodgeButton,
                            scale: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Separate from Ability Dock</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.dodgeButton.separate}
                        onChange={(e) =>
                          handleConfigChange({
                            ...config,
                            dodgeButton: {
                              ...config.dodgeButton,
                              separate: e.target.checked,
                            },
                          })
                        }
                        className="rounded accent-emerald-400"
                      />
                      <span className="text-slate-400 text-[11px]">Free placement</span>
                    </label>
                  </div>
                </div>

                {/* 4. Tactical Minimap & Directives Panel */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-indigo-400 font-cinzel">
                    <span className="flex items-center gap-1.5">
                      <Maximize2 className="w-4 h-4" /> Minimap & Widgets Scale
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {Math.round(config.minimap.scale * 100)}% scale
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>Minimap Scale</span>
                      <span className="text-indigo-400 font-mono">
                        {config.minimap.scale.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.3"
                      step="0.05"
                      value={config.minimap.scale}
                      onChange={(e) =>
                        handleConfigChange({
                          ...config,
                          minimap: {
                            ...config.minimap,
                            scale: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>Directives Tracker Scale</span>
                      <span className="text-indigo-400 font-mono">
                        {config.directives.scale.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.3"
                      step="0.05"
                      value={config.directives.scale}
                      onChange={(e) =>
                        handleConfigChange({
                          ...config,
                          directives: {
                            ...config.directives,
                            scale: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Tactile Test Area */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300 font-medium">Quick Test:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTestFeedback('⚡ Triggered Dodge Dash!')}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold border border-slate-700 cursor-pointer"
              >
                Test Dodge
              </button>
              {[1, 2, 3, 4, 5].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTestFeedback(`⚔️ Cast Ability [${slot}]!`)}
                  className="w-7 h-7 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer transition-colors"
                >
                  {slot}
                </button>
              ))}
            </div>
            <span className="text-xs text-amber-400 font-mono ml-2 italic">
              {testFeedback}
            </span>
          </div>

          <div className="text-xs text-slate-400">
            Changes apply instantly in battle
          </div>
        </div>
      </div>
    </div>
  );
};

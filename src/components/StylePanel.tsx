import React from 'react';
import {
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react';
import { CaptionStyle, FontFamily, FontWeight, BackgroundType, TextEffect, CaptionPosition, TextAlign } from '../types';
import { CAPTION_PRESETS } from '../utils/presets';

interface StylePanelProps {
  style: CaptionStyle;
  onChangeStyle: (newStyle: CaptionStyle) => void;
}

export const StylePanel: React.FC<StylePanelProps> = ({ style, onChangeStyle }) => {
  const applyPreset = (presetKey: string) => {
    const preset = CAPTION_PRESETS[presetKey];
    if (preset) {
      onChangeStyle({ ...preset });
    }
  };

  const updateProp = <K extends keyof CaptionStyle>(prop: K, value: CaptionStyle[K]) => {
    onChangeStyle({
      ...style,
      [prop]: value,
      presetName: undefined, // customize mode
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border-l border-slate-800 text-slate-200 select-none overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" />
          <span>Subtitle Design & Styling</span>
        </h3>
        <p className="text-[11px] text-slate-400 mt-1">
          Customize live overlay appearance, position, and dynamic animations.
        </p>
      </div>

      {/* 1. Presets Selector (Spec Section 17) */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300">Style Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CAPTION_PRESETS).map(([key, preset]) => {
            const isSelected = style.presetName === preset.presetName;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold">{preset.presetName}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {preset.fontFamily.split(' ')[0]} · {preset.fontSize}px
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Word-by-Word Animation (Spec Section 18) */}
      <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white">Word-by-Word Highlight</span>
          </div>
          <input
            type="checkbox"
            checked={style.wordHighlight}
            onChange={(e) => updateProp('wordHighlight', e.target.checked)}
            className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
          />
        </div>
        <p className="text-[11px] text-slate-400">
          Animates and highlights individual words dynamically as they are spoken.
        </p>

        {style.wordHighlight && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-slate-300">Highlight Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.highlightColor}
                onChange={(e) => updateProp('highlightColor', e.target.value)}
                className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
              />
              <span className="text-xs font-mono uppercase text-slate-400">
                {style.highlightColor}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Typography (Spec Section 16) */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-indigo-400" />
          <span>Typography</span>
        </label>

        {/* Font Family */}
        <div>
          <span className="text-[11px] text-slate-400 block mb-1">Font Family</span>
          <select
            value={style.fontFamily}
            onChange={(e) => updateProp('fontFamily', e.target.value as FontFamily)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean)</option>
            <option value="Inter">Inter (Classic Neutral)</option>
            <option value="Impact">Impact / Bold Display (Social Punchy)</option>
            <option value="JetBrains Mono">JetBrains Mono (Technical)</option>
            <option value="Georgia">Georgia (Cinematic Serif)</option>
          </select>
        </div>

        {/* Font Size */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Font Size</span>
            <span className="font-mono text-indigo-400">{style.fontSize}px</span>
          </div>
          <input
            type="range"
            min="16"
            max="48"
            step="1"
            value={style.fontSize}
            onChange={(e) => updateProp('fontSize', parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Weight & Casing */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Weight</span>
            <select
              value={style.fontWeight}
              onChange={(e) => updateProp('fontWeight', e.target.value as FontWeight)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="normal">Regular</option>
              <option value="medium">Medium</option>
              <option value="semibold">Semi-Bold</option>
              <option value="bold">Bold</option>
              <option value="extrabold">Extra Bold</option>
            </select>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Transform</span>
            <button
              onClick={() =>
                updateProp('textTransform', style.textTransform === 'uppercase' ? 'none' : 'uppercase')
              }
              className={`w-full py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                style.textTransform === 'uppercase'
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              UPPERCASE
            </button>
          </div>
        </div>

        {/* Text Color */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-300">Text Color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={style.textColor}
              onChange={(e) => updateProp('textColor', e.target.value)}
              className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
            />
            <span className="text-xs font-mono uppercase text-slate-400">{style.textColor}</span>
          </div>
        </div>
      </div>

      {/* 4. Background Box & Effects */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <label className="text-xs font-bold text-slate-300">Background & Effects</label>

        {/* Background Style */}
        <div>
          <span className="text-[11px] text-slate-400 block mb-1">Background Style</span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'none', label: 'None' },
              { id: 'box', label: 'Solid Box' },
              { id: 'rounded', label: 'Rounded Pill' },
              { id: 'semi-transparent', label: 'Translucent' },
            ].map((bg) => (
              <button
                key={bg.id}
                onClick={() => updateProp('backgroundType', bg.id as BackgroundType)}
                className={`py-1.5 px-2 text-xs rounded-lg border transition-colors cursor-pointer ${
                  style.backgroundType === bg.id
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {bg.label}
              </button>
            ))}
          </div>
        </div>

        {style.backgroundType !== 'none' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Background Color</span>
              <input
                type="color"
                value={style.backgroundColor}
                onChange={(e) => updateProp('backgroundColor', e.target.value)}
                className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Opacity</span>
                <span className="font-mono">{Math.round(style.backgroundOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={style.backgroundOpacity}
                onChange={(e) => updateProp('backgroundOpacity', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Text Effect */}
        <div className="pt-2">
          <span className="text-[11px] text-slate-400 block mb-1">Text Effect</span>
          <div className="grid grid-cols-4 gap-1">
            {(['none', 'outline', 'shadow', 'glow'] as TextEffect[]).map((ef) => (
              <button
                key={ef}
                onClick={() => updateProp('effect', ef)}
                className={`py-1 text-xs capitalize rounded border transition-colors cursor-pointer ${
                  style.effect === ef
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {ef}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Position & Alignment */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <label className="text-xs font-bold text-slate-300">Position & Alignment</label>

        {/* Preset Positions */}
        <div className="grid grid-cols-3 gap-1.5">
          {(['top', 'center', 'bottom'] as CaptionPosition[]).map((pos) => (
            <button
              key={pos}
              onClick={() => updateProp('position', pos)}
              className={`py-1.5 text-xs capitalize rounded-lg border transition-colors cursor-pointer ${
                style.position === pos
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Vertical Fine Tune */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Vertical Placement</span>
            <span className="font-mono">{style.verticalPercent}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="95"
            step="1"
            value={style.verticalPercent}
            onChange={(e) => {
              updateProp('verticalPercent', parseInt(e.target.value, 10));
              updateProp('position', 'custom');
            }}
            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Alignment */}
        <div>
          <span className="text-[11px] text-slate-400 block mb-1">Text Alignment</span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'left', icon: AlignLeft },
              { id: 'center', icon: AlignCenter },
              { id: 'right', icon: AlignRight },
            ].map((al) => {
              const Icon = al.icon;
              return (
                <button
                  key={al.id}
                  onClick={() => updateProp('align', al.id as TextAlign)}
                  className={`py-1.5 flex items-center justify-center rounded border transition-colors cursor-pointer ${
                    style.align === al.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

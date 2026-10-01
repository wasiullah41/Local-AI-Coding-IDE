import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { themeLabels, type ThemeName } from '../../themes/theme';
import type { WorkspaceSettings } from '@local-ide/shared';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="px-3 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
    <h3 className="ide-title mb-2">{title}</h3>
    <div className="flex flex-col gap-2.5">{children}</div>
  </section>
);

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 min-w-0">
      <div className="text-[12px]" style={{ color: 'var(--color-text)' }}>
        {label}
      </div>
      {hint && (
        <div className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
          {hint}
        </div>
      )}
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="relative w-8 h-[18px] rounded-full shrink-0 transition-colors"
    style={{
      background: checked ? 'var(--color-accent)' : 'var(--color-elevated)',
      border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
    }}
  >
    <span
      className="absolute top-[2px] w-3 h-3 rounded-full transition-all"
      style={{
        left: checked ? 16 : 2,
        background: checked ? '#fff' : 'var(--color-text-muted)',
      }}
    />
  </button>
);

const NumberField: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}> = ({ value, onChange, min, max, label }) => (
  <input
    type="number"
    aria-label={label}
    className="ide-input"
    style={{ width: 72 }}
    value={value}
    min={min}
    max={max}
    onChange={(e) => {
      const next = Number(e.target.value);
      if (Number.isFinite(next)) onChange(next);
    }}
  />
);

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();

  const patchEditor = <K extends keyof WorkspaceSettings['editor']>(
    key: K,
    value: WorkspaceSettings['editor'][K]
  ) => updateSettings({ editor: { ...settings.editor, [key]: value } });

  const patchAppearance = <K extends keyof WorkspaceSettings['appearance']>(
    key: K,
    value: WorkspaceSettings['appearance'][K]
  ) => updateSettings({ appearance: { ...settings.appearance, [key]: value } });

  return (
    <div className="h-full overflow-y-auto ide-scroll">
      <Section title="Appearance">
        <Row label="Color theme">
          <select
            className="ide-input"
            style={{ width: 140 }}
            value={settings.appearance.theme}
            onChange={(e) => patchAppearance('theme', e.target.value as ThemeName)}
          >
            {(Object.keys(themeLabels) as ThemeName[]).map((key) => (
              <option key={key} value={key}>
                {themeLabels[key]}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Activity bar" hint="The icon strip on the left">
          <Toggle
            label="Activity bar"
            checked={settings.appearance.activityBarVisible}
            onChange={(v) => patchAppearance('activityBarVisible', v)}
          />
        </Row>
        <Row label="Status bar">
          <Toggle
            label="Status bar"
            checked={settings.appearance.statusBarVisible}
            onChange={(v) => patchAppearance('statusBarVisible', v)}
          />
        </Row>
        <Row label="Panel" hint="Terminal, problems and output">
          <Toggle
            label="Panel"
            checked={settings.appearance.panelVisible}
            onChange={(v) => patchAppearance('panelVisible', v)}
          />
        </Row>
      </Section>

      <Section title="Editor">
        <Row label="Font size">
          <NumberField
            label="Font size"
            value={settings.editor.fontSize}
            min={8}
            max={32}
            onChange={(v) => patchEditor('fontSize', v)}
          />
        </Row>
        <Row label="Font family">
          <input
            aria-label="Font family"
            className="ide-input"
            style={{ width: 140 }}
            value={settings.editor.fontFamily}
            onChange={(e) => patchEditor('fontFamily', e.target.value)}
          />
        </Row>
        <Row label="Tab size">
          <NumberField
            label="Tab size"
            value={settings.editor.tabSize}
            min={1}
            max={8}
            onChange={(v) => patchEditor('tabSize', v)}
          />
        </Row>
        <Row label="Insert spaces" hint="Use spaces instead of tab characters">
          <Toggle
            label="Insert spaces"
            checked={settings.editor.insertSpaces}
            onChange={(v) => patchEditor('insertSpaces', v)}
          />
        </Row>
        <Row label="Word wrap">
          <select
            aria-label="Word wrap"
            className="ide-input"
            style={{ width: 110 }}
            value={settings.editor.wordWrap}
            onChange={(e) =>
              patchEditor(
                'wordWrap',
                e.target.value as WorkspaceSettings['editor']['wordWrap']
              )
            }
          >
            <option value="off">off</option>
            <option value="on">on</option>
            <option value="wordWrapColumn">column</option>
          </select>
        </Row>
        <Row label="Line numbers">
          <select
            aria-label="Line numbers"
            className="ide-input"
            style={{ width: 110 }}
            value={settings.editor.lineNumbers}
            onChange={(e) =>
              patchEditor(
                'lineNumbers',
                e.target.value as WorkspaceSettings['editor']['lineNumbers']
              )
            }
          >
            <option value="on">on</option>
            <option value="off">off</option>
            <option value="relative">relative</option>
          </select>
        </Row>
        <Row label="Minimap">
          <Toggle
            label="Minimap"
            checked={settings.editor.minimap}
            onChange={(v) => patchEditor('minimap', v)}
          />
        </Row>
        <Row label="Render whitespace">
          <select
            aria-label="Render whitespace"
            className="ide-input"
            style={{ width: 110 }}
            value={settings.editor.renderWhitespace}
            onChange={(e) =>
              patchEditor(
                'renderWhitespace',
                e.target.value as WorkspaceSettings['editor']['renderWhitespace']
              )
            }
          >
            <option value="none">none</option>
            <option value="boundary">boundary</option>
            <option value="selection">selection</option>
            <option value="all">all</option>
          </select>
        </Row>
      </Section>

      <Section title="Files">
        <Row label="Auto save" hint="Not wired to the editor yet">
          <Toggle
            label="Auto save"
            checked={settings.files.autoSave}
            onChange={(v) => updateSettings({ files: { ...settings.files, autoSave: v } })}
          />
        </Row>
      </Section>

      <Section title="Terminal">
        <Row label="Font size">
          <NumberField
            label="Terminal font size"
            value={settings.terminal.fontSize}
            min={8}
            max={24}
            onChange={(v) => updateSettings({ terminal: { ...settings.terminal, fontSize: v } })}
          />
        </Row>
      </Section>

      <Section title="Extensions">
        <Row label="Auto activate" hint="Activate extensions on startup">
          <Toggle
            label="Auto activate"
            checked={settings.extensions.autoActivate}
            onChange={(v) =>
              updateSettings({ extensions: { ...settings.extensions, autoActivate: v } })
            }
          />
        </Row>
      </Section>

      <div className="p-3">
        <button type="button" className="ide-button ide-button--secondary" onClick={resetSettings}>
          Reset all settings
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;

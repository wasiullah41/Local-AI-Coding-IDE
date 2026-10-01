import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

/**
 * Points Monaco at bundled language workers.
 *
 * Without this, Monaco logs "You must define a function
 * MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker" and silently
 * runs every language service on the UI thread, which makes the editor stutter
 * on large files.
 *
 * `?worker` (rather than `?url`) is required: a `?url` import makes Vite emit
 * these ESM entries as `data:` URLs, which the renderer's
 * `worker-src 'self' blob:` policy refuses, and whose relative imports cannot
 * resolve anyway. With `?worker` each worker is a real same-origin chunk, so it
 * stays lazy and stays inside the existing CSP.
 */
(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    switch (label) {
      case 'json':
        return new JsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker();
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  },
};

/**
 * Loads Monaco from the app bundle instead of a CDN.
 *
 * `@monaco-editor/react` fetches the editor from jsdelivr by default. That would
 * make the IDE unusable offline and would execute remote code inside a renderer
 * that holds an Electron preload bridge, so the local copy is registered here,
 * before any editor mounts.
 */
loader.config({ monaco });

export const MONACO_THEME_DARK = 'local-ide-dark';
export const MONACO_THEME_LIGHT = 'local-ide-light';

const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

/** Turns an opaque `--color-accent` into a translucent selection layer. */
const translucent = (color: string, alpha: number): string => {
  const hex = color.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const expanded =
    hex.length === 4
      ? match[1]
          .split('')
          .map((c) => c + c)
          .join('')
      : match[1];
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Builds one Monaco theme from the app's current CSS variables. */
function defineTheme(name: string, isDark: boolean): void {
  // Monaco's built-in light theme is named `vs`.
  monaco.editor.defineTheme(name, {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': cssVar('--color-editor-background', isDark ? '#1f1f1f' : '#ffffff'),
      'editor.foreground': cssVar('--color-text', isDark ? '#cccccc' : '#333333'),
      'editorLineNumber.foreground': cssVar('--color-text-subtle', '#6e6e6e'),
      'editorLineNumber.activeForeground': cssVar('--color-text', isDark ? '#cccccc' : '#333333'),
      'editor.selectionBackground': translucent(cssVar('--color-accent', '#3794ff'), 0.28),
      'editor.lineHighlightBackground': cssVar('--color-hover', 'rgba(255,255,255,0.055)'),
      'editorIndentGuide.background1': cssVar('--color-border', '#2b2b2b'),
      'editorIndentGuide.activeBackground1': cssVar('--color-text-subtle', '#6e6e6e'),
      'editorWidget.background': cssVar('--color-elevated', isDark ? '#202020' : '#f8f8f8'),
      'editorWidget.border': cssVar('--color-border-strong', '#383838'),
      'editorGutter.background': cssVar('--color-editor-background', isDark ? '#1f1f1f' : '#ffffff'),
      'scrollbarSlider.background': cssVar('--color-border-strong', '#383838'),
      'scrollbarSlider.hoverBackground': cssVar('--color-text-subtle', '#6e6e6e'),
    },
  });
}

const prefersLight = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.theme === 'light';
};

// Both themes are defined up front so the editor never mounts against a name
// Monaco has not seen, which it reports as an unknown-theme error.
defineTheme(MONACO_THEME_DARK, true);
defineTheme(MONACO_THEME_LIGHT, false);
monaco.editor.setTheme(prefersLight() ? MONACO_THEME_LIGHT : MONACO_THEME_DARK);

/**
 * Re-reads the CSS variables and switches themes, for when the user changes
 * appearance settings while an editor is open.
 */
export function applyMonacoTheme(isDark: boolean): void {
  const name = isDark ? MONACO_THEME_DARK : MONACO_THEME_LIGHT;
  defineTheme(name, isDark);
  monaco.editor.setTheme(name);
}

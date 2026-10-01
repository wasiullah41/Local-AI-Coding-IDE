import React from 'react';
import { Search, X, CaseSensitive, WholeWord, Regex } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';

const TOGGLES = [
  { key: 'caseSensitive' as const, label: 'Match case', icon: CaseSensitive },
  { key: 'wholeWord' as const, label: 'Match whole word', icon: WholeWord },
  { key: 'useRegex' as const, label: 'Use regular expression', icon: Regex },
];

export const SearchInput: React.FC = () => {
  const { query, setQuery, options, setOptions, results, isSearching } = useSearchStore();

  const resultLabel = isSearching
    ? 'Searching…'
    : results
      ? `${results.totalMatches} result${results.totalMatches === 1 ? '' : 's'} in ${results.files.length} file${
          results.files.length === 1 ? '' : 's'
        }${results.limitReached ? ' (limit reached)' : ''}`
      : null;

  return (
    <div className="p-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div className="relative mb-1.5">
        <Search
          size={13}
          className="absolute left-2 top-2.5 pointer-events-none"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search query"
          className="ide-input"
          style={{ paddingLeft: 24, paddingRight: query ? 24 : 6 }}
        />
        {query && (
          <button
            type="button"
            className="absolute right-1 top-1.5 ide-icon-button"
            style={{ width: 20, height: 20 }}
            aria-label="Clear search"
            onClick={() => setQuery('')}
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {TOGGLES.map(({ key, label, icon: Icon }) => {
          const active = options[key] ?? false;
          return (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={active}
              onClick={() => setOptions({ [key]: !active })}
              className="ide-icon-button"
              data-active={active}
              style={{
                background: active ? 'var(--color-active)' : 'transparent',
                color: active ? 'var(--color-text-strong)' : 'var(--color-text-muted)',
                width: 22,
                height: 22,
              }}
            >
              <Icon size={13} />
            </button>
          );
        })}
        <div className="flex-1" />
        {resultLabel && (
          <span className="text-[10px] truncate" style={{ color: 'var(--color-text-subtle)' }} title={resultLabel}>
            {resultLabel}
          </span>
        )}
      </div>

      <input
        type="text"
        value={options.excludePattern ?? ''}
        onChange={(e) => setOptions({ excludePattern: e.target.value })}
        placeholder="Exclude pattern (e.g. dist, *.test.ts)"
        aria-label="Exclude pattern"
        className="ide-input mt-1.5"
        style={{ fontSize: 11 }}
      />
    </div>
  );
};

export default SearchInput;

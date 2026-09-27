import React from 'react';
import { Search } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';

export const SearchInput: React.FC = () => {
  const { query, setQuery, options, setOptions } = useSearchStore();

  return (
    <div className="p-3 border-b border-gray-700">
      <div className="relative mb-2">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex items-center gap-4 text-xs">
        <label className="flex items-center gap-1 cursor-pointer text-gray-400 hover:text-white">
          <input
            type="checkbox"
            checked={options.caseSensitive ?? false}
            onChange={(e) => setOptions({ caseSensitive: e.target.checked })}
            className="rounded"
          />
          <span>Aa</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer text-gray-400 hover:text-white">
          <input
            type="checkbox"
            checked={options.wholeWord ?? false}
            onChange={(e) => setOptions({ wholeWord: e.target.checked })}
            className="rounded"
          />
          <span>Whole Word</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer text-gray-400 hover:text-white">
          <input
            type="checkbox"
            checked={options.useRegex ?? false}
            onChange={(e) => setOptions({ useRegex: e.target.checked })}
            className="rounded"
          />
          <span>.*</span>
        </label>
      </div>

      <div className="mt-2">
        <input
          type="text"
          value={options.excludePattern ?? ''}
          onChange={(e) => setOptions({ excludePattern: e.target.value })}
          placeholder="Exclude pattern (e.g., *.test.ts, dist/**)"
          className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
};

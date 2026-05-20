interface ColumnPillsProps {
  headers: string[];
  selectedColumns: Set<string>;
  onToggleColumn: (col: string) => void;
}

export function ColumnPills({ headers, selectedColumns, onToggleColumn }: ColumnPillsProps) {
  const allSelected = headers.every(h => selectedColumns.has(h));

  const toggleAll = () => {
    if (allSelected) {
      headers.forEach(h => selectedColumns.has(h) && onToggleColumn(h));
    } else {
      headers.forEach(h => !selectedColumns.has(h) && onToggleColumn(h));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 font-semibold">
          {selectedColumns.size} / {headers.length} selected
        </p>
        <button
          onClick={toggleAll}
          className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors underline underline-offset-2"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {headers.map(col => {
          const on = selectedColumns.has(col);
          return (
            <button
              key={col}
              onClick={() => onToggleColumn(col)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                on
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {col}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';

interface ColumnPillsProps {
  headers: string[];
  selectedColumns: Set<string>;
  onToggleColumn: (col: string) => void;
}

export function ColumnPills({ headers, selectedColumns, onToggleColumn }: ColumnPillsProps) {
  return (
    <div className="p-6 border-b border-slate-100">
      <div className="flex flex-wrap gap-2">
        {headers.map(col => {
          const isSelected = selectedColumns.has(col);
          return (
            <button
              key={col}
              onClick={() => onToggleColumn(col)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border shadow-sm
                ${isSelected 
                  ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'
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

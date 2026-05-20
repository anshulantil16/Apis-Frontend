interface PreviewTableProps {
  data: unknown[];
  selectedColumns: Set<string>;
  totalRows: number;
}

export function PreviewTable({ data, selectedColumns, totalRows }: PreviewTableProps) {
  const cols = Array.from(selectedColumns);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">#</th>
            {cols.map(col => (
              <th key={col} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-amber-50/30 transition-colors">
              <td className="px-4 py-2.5 text-slate-300 font-bold text-center tabular-nums">{i + 1}</td>
              {cols.map(col => (
                <td key={col} className="px-4 py-2.5 text-slate-600 font-medium whitespace-nowrap max-w-[200px] truncate">
                  {((row as Record<string, unknown>)[col])?.toString() || <span className="text-slate-300">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalRows > data.length && (
        <div className="px-4 py-3 text-center text-xs text-slate-400 font-semibold bg-slate-50/50 border-t border-slate-100">
          Showing {data.length} of <span className="font-black text-slate-600">{totalRows}</span> rows
        </div>
      )}
    </div>
  );
}

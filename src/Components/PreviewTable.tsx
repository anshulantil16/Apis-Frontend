

interface PreviewTableProps {
  data: unknown[];
  selectedColumns: Set<string>;
  totalRows: number;
}

export function PreviewTable({ data, selectedColumns, totalRows }: PreviewTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {Array.from(selectedColumns).map(col => (
              <th key={col} className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {Array.from(selectedColumns).map(col => (
                <td key={col} className="p-4 text-sm text-slate-700 whitespace-nowrap truncate max-w-xs">
                  {((row as Record<string, unknown>)[col])?.toString() || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalRows > data.length && (
        <div className="p-4 text-center text-sm text-slate-500 bg-slate-50/50 border-t border-slate-100">
          ... and {totalRows - data.length} more rows
        </div>
      )}
    </div>
  );
}

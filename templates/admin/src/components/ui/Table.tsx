import React from "react";

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
export const Table: React.FC<TableProps> = ({ children, className = "", ...props }) => (
  <div className="border border-white/5 rounded-xl bg-zinc-900/20 overflow-hidden">
    <div className="overflow-x-auto">
      <table className={`w-full text-left border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  </div>
);

type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>;
export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = "", ...props }) => (
  <thead className={`border-b border-white/5 bg-zinc-900/60 text-xs font-semibold tracking-wide text-zinc-300 ${className}`} {...props}>
    {children}
  </thead>
);

type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;
export const TableBody: React.FC<TableBodyProps> = ({ children, className = "", ...props }) => (
  <tbody className={`divide-y divide-white/5 ${className}`} {...props}>
    {children}
  </tbody>
);

type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
export const TableRow: React.FC<TableRowProps> = ({ children, className = "", ...props }) => (
  <tr className={`hover:bg-zinc-800/40 transition duration-150 ${className}`} {...props}>
    {children}
  </tr>
);

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  isHeader?: boolean;
}
export const TableCell: React.FC<TableCellProps> = ({ children, className = "", isHeader = false, ...props }) => {
  const baseClass = "px-6 py-4 text-sm";
  if (isHeader) {
    return (
      <th className={`${baseClass} font-semibold ${className}`} {...props}>
        {children}
      </th>
    );
  }
  return (
    <td className={`${baseClass} ${className}`} {...props}>
      {children}
    </td>
  );
};

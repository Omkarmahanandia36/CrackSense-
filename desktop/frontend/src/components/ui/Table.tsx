import React from 'react';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className="w-full overflow-x-auto"
      style={{
        background: 'var(--glass-sunken-bg)',
        border: '1px solid var(--glass-sunken-border)',
        borderRadius: 'var(--r-panel)',
      }}
    >
      <table className={`w-full text-left text-xs ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <thead
      className={`border-b ${className}`}
      style={{
        borderColor: 'var(--glass-sunken-border)',
        color: 'var(--text-3)',
      }}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <tbody
      className={`divide-y ${className}`}
      style={{
        borderColor: 'var(--glass-sunken-border)',
        color: 'var(--text-2)',
      }}
      {...props}
    >
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <tr
      className={`transition-colors duration-150 hover:bg-[--hover-bg] cursor-default ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <th className={`py-3 px-4 font-medium ${className}`} {...props}>
      {children}
    </th>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <td className={`py-3 px-4 ${className}`} {...props}>
      {children}
    </td>
  );
};

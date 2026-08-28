import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

type BadgeProps = {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
};

type CardProps = {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
};

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

type TextFieldProps = ComponentPropsWithoutRef<'input'> & {
  label: string;
  hint?: string;
};

type TextAreaFieldProps = ComponentPropsWithoutRef<'textarea'> & {
  label: string;
  hint?: string;
};

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

type DataTableProps = {
  caption: string;
  columns: string[];
  rows: Array<Array<ReactNode>>;
};

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} ${className}`.trim()} {...props} />;
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Card({ action, children, eyebrow, title }: CardProps) {
  return (
    <section className="card">
      {(eyebrow || title || action) && (
        <div className="card-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="page-container">{children}</div>;
}

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function TextField({ hint, id, label, ...props }: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function TextAreaField({ hint, id, label, ...props }: TextAreaFieldProps) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="field" htmlFor={textareaId}>
      <span>{label}</span>
      <textarea id={textareaId} {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function FileField({
  hint,
  id,
  label,
  ...props
}: Omit<ComponentPropsWithoutRef<'input'>, 'type'> & { label: string; hint?: string }) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} type="file" {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function SelectField({
  children,
  id,
  label,
  ...props
}: ComponentPropsWithoutRef<'select'> & { label: string }) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="field" htmlFor={selectId}>
      <span>{label}</span>
      <select id={selectId} {...props}>
        {children}
      </select>
    </label>
  );
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

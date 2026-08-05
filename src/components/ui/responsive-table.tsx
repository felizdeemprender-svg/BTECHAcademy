'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface ResponsiveColumn<T> {
  key: string;
  header?: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  /** Oculta esta columna en la vista de cards móvil */
  hideOnMobile?: boolean;
  /** Etiqueta para la card móvil; por defecto usa header (si es string) */
  cardLabel?: string;
  className?: string;
}

export interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  className?: string;
  tableClassName?: string;
  headerRowClassName?: string;
  headerCellClassName?: string;
  cellClassName?: string;
  rowClassName?: (row: T, index: number) => string;
  /** Bloque superior de la card móvil (avatar + título, badge, etc.) */
  mobileCardHeader?: (row: T) => React.ReactNode;
  /** Bloque inferior de la card móvil (acciones full-width) */
  mobileCardFooter?: (row: T) => React.ReactNode;
  mobileCardClassName?: (row: T, index: number) => string;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  loadingState?: React.ReactNode;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  tableClassName,
  headerRowClassName,
  headerCellClassName,
  cellClassName,
  rowClassName,
  mobileCardHeader,
  mobileCardFooter,
  mobileCardClassName,
  emptyState,
  isLoading,
  loadingState,
}: ResponsiveTableProps<T>) {
  const alignClass = (align?: 'left' | 'center' | 'right') =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : undefined;

  if (isLoading) return <>{loadingState}</>;
  if (data.length === 0) return <>{emptyState}</>;

  return (
    <div className="w-full overflow-hidden">
      <div className={cn('hidden md:block overflow-x-auto', className)}>
        <Table className={tableClassName}>
          <TableHeader className="bg-secondary/50 border-b">
            <TableRow className={cn('border-none hover:bg-transparent', headerRowClassName)}>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'font-bold py-4 px-6 text-foreground text-[11px] uppercase tracking-wider',
                    alignClass(col.align),
                    headerCellClassName,
                    col.className,
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={keyExtractor(row, index)}
                className={cn(
                  'hover:bg-secondary/20 border-b transition-colors',
                  rowClassName?.(row, index),
                )}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn('px-6 py-4', alignClass(col.align), cellClassName, col.className)}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden divide-y">
        {data.map((row, index) => {
          const visibleCols = columns.filter((col) => !col.hideOnMobile);
          return (
            <div
              key={keyExtractor(row, index)}
              className={cn('p-4 space-y-4', mobileCardClassName?.(row, index))}
            >
              {mobileCardHeader?.(row)}
              {visibleCols.length > 0 && (
                <div className="grid grid-cols-2 gap-4 py-2 border-y border-dashed">
                  {visibleCols.map((col) => (
                    <div key={col.key} className="flex flex-col gap-1">
                      <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">
                        {col.cardLabel ?? (typeof col.header === 'string' ? col.header : '')}
                      </span>
                      <span className="text-xs font-bold">{col.cell(row)}</span>
                    </div>
                  ))}
                </div>
              )}
              {mobileCardFooter?.(row)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

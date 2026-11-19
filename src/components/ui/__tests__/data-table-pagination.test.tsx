import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTablePagination } from '../data-table-pagination';

describe('DataTablePagination Component', () => {
  it('debe renderizar el rango de registros y número de página', () => {
    const html = renderToStaticMarkup(
      <DataTablePagination
        currentPage={2}
        totalPages={5}
        totalItems={100}
        pageSize={20}
        onPageChange={() => {}}
      />
    );

    expect(html).toContain('Mostrando');
    expect(html).toContain('21');
    expect(html).toContain('40');
    expect(html).toContain('100');
    expect(html).toContain('Página 2 de 5');
  });

  it('debe manejar lista vacía (0 registros) mostrando rango 0 a 0', () => {
    const html = renderToStaticMarkup(
      <DataTablePagination
        currentPage={1}
        totalPages={1}
        totalItems={0}
        pageSize={10}
        onPageChange={() => {}}
      />
    );

    expect(html).toContain('0</span> a <span class="font-bold text-foreground">0</span> de <span class="font-bold text-foreground">0</span>');
    expect(html).toContain('Página 1 de 1');
  });

  it('debe deshabilitar botones de navegación en límites', () => {
    const htmlFirst = renderToStaticMarkup(
      <DataTablePagination
        currentPage={1}
        totalPages={3}
        totalItems={30}
        pageSize={10}
        onPageChange={() => {}}
      />
    );

    // En primera página, los primeros botones deben tener disabled
    expect(htmlFirst).toContain('disabled=""');

    const htmlLast = renderToStaticMarkup(
      <DataTablePagination
        currentPage={3}
        totalPages={3}
        totalItems={30}
        pageSize={10}
        onPageChange={() => {}}
      />
    );

    expect(htmlLast).toContain('disabled=""');
  });
});

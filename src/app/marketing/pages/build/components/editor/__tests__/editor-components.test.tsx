import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  DialogDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
}));

import { OptimizedValidationReport } from '../OptimizedValidationReport';
import { LandingSelectorDialog } from '../LandingSelectorDialog';

describe('Componentes Modulares del Editor de Campaña (src/app/marketing/pages/build/components/editor/)', () => {
  describe('OptimizedValidationReport', () => {
    it('debe renderizar estado exitoso "Todo compatible con APIs" cuando no hay errores ni advertencias', () => {
      const html = renderToStaticMarkup(
        <OptimizedValidationReport generatedAssets={{ socials: [], emails: [], ads: [] }} />
      );

      expect(html).toContain('Todo compatible con APIs');
      expect(html).toContain('detalles');
    });

    it('debe renderizar errores críticos cuando existan en los canales', () => {
      const generatedAssets = {
        socials: [
          {
            validationResults: {
              errors: ['Texto excede límite de caracteres'],
              warnings: []
            }
          }
        ]
      };

      const html = renderToStaticMarkup(
        <OptimizedValidationReport generatedAssets={generatedAssets} />
      );

      expect(html).toContain('1 errores criticos no corregibles');
      expect(html).toContain('Estos errores deben ser corregidos manualmente');
      expect(html).toContain('reporte completo');
    });

    it('debe renderizar advertencias automáticas cuando solo hay warnings', () => {
      const generatedAssets = {
        emails: [
          {
            validationResults: {
              errors: [],
              warnings: ['Asunto truncado para clientes móviles', 'Enlace adaptado']
            }
          }
        ]
      };

      const html = renderToStaticMarkup(
        <OptimizedValidationReport generatedAssets={generatedAssets} />
      );

      expect(html).toContain('2 advertencias (corregidas automaticamente)');
      expect(html).toContain('El sistema aplico las adaptaciones necesarias');
      expect(html).toContain('detalles de adaptacion');
    });

    it('debe cumplir con la política estricta de CERO EMOJIS en los textos renderizados', () => {
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      const htmlSuccess = renderToStaticMarkup(
        <OptimizedValidationReport generatedAssets={{}} />
      );
      expect(emojiRegex.test(htmlSuccess)).toBe(false);

      const htmlErrors = renderToStaticMarkup(
        <OptimizedValidationReport
          generatedAssets={{ ads: [{ validationResults: { errors: ['Error 1'] } }] }}
        />
      );
      expect(emojiRegex.test(htmlErrors)).toBe(false);
    });
  });

  describe('LandingSelectorDialog', () => {
    it('debe renderizar la lista de landings y sus titulares cuando el diálogo está activo', () => {
      const landings = [
        { marketingName: 'Landing Principal', headline: 'Aprende Marketing Digital en 30 Días' },
        { marketingName: 'Variante Flash', headline: 'Oferta Especial de Lanzamiento' }
      ];

      const html = renderToStaticMarkup(
        <LandingSelectorDialog
          state={{ variant: {}, index: 0, channel: 'emails' }}
          landings={landings}
          onClose={() => {}}
          onSelect={() => {}}
        />
      );

      expect(html).toContain('Elegir Base de Venta');
      expect(html).toContain('Landing Principal');
      expect(html).toContain('Aprende Marketing Digital en 30 Días');
      expect(html).toContain('Variante Flash');
      expect(html).toContain('Oferta Especial de Lanzamiento');
    });

    it('no debe renderizar contenido cuando el estado es nulo', () => {
      const html = renderToStaticMarkup(
        <LandingSelectorDialog
          state={null}
          landings={[{ marketingName: 'Landing A', headline: 'Test' }]}
          onClose={() => {}}
          onSelect={() => {}}
        />
      );

      expect(html).toBe('');
    });

    it('no debe contener emojis en títulos ni descripciones', () => {
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      const html = renderToStaticMarkup(
        <LandingSelectorDialog
          state={{ variant: {}, index: 0, channel: 'ads' }}
          landings={[{ marketingName: 'Landing A', headline: 'Sin emojis' }]}
          onClose={() => {}}
          onSelect={() => {}}
        />
      );

      expect(emojiRegex.test(html)).toBe(false);
    });
  });
});

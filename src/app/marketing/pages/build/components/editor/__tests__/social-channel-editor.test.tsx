import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <footer>{children}</footer>,
  DialogClose: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-value={value}>{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-content={value}>{children}</div>,
}));

import { SocialChannelEditor } from '../SocialChannelEditor';

describe('SocialChannelEditor (src/app/marketing/pages/build/components/editor/SocialChannelEditor.tsx)', () => {
  const baseProps: any = {
    generatedAssets: { socials: [] },
    updateAsset: vi.fn(),
    onSave: vi.fn(),
    dynamicAdns: {},
    newPieceConfig: { name: '', platform: 'instagram', type: 'story', adnId: '01_CINEMA', videoEngine: 'ffmpeg' },
    setNewPieceConfig: vi.fn(),
    showSocialConfigurator: false,
    setShowSocialConfigurator: vi.fn(),
    handleDownloadVideo: vi.fn(),
    isRenderingVideo: null,
    renderedVideos: {},
    jobProgress: {},
    isGeneratingBreakdown: null,
    handleGenerateBreakdown: vi.fn(),
    handleGenerateVideo: vi.fn(),
    handleGenerateVideoIA: vi.fn(),
    handleGenerateLongVideo: vi.fn(),
    handleGeneratePrompt: vi.fn(),
    handleDeleteVideo: vi.fn(),
    handleGeneratePdf: vi.fn(),
    handleDeletePdf: vi.fn(),
    isGeneratingPdf: null,
    selectedCourseId: 'course-1',
    courses: [],
    allTags: [],
    coordinationPlan: {},
    blueprintData: {},
    googleToken: null,
    ensureGoogleToken: vi.fn().mockResolvedValue('token-123'),
    normalizedLandingsList: [],
    profile: { uid: 'user-1' }
  };

  it('debe renderizar mensaje de vacío cuando no hay videos generados', () => {
    const html = renderToStaticMarkup(
      <SocialChannelEditor {...baseProps} />
    );

    expect(html).toContain('No hay videos generados todavía.');
    expect(html).toContain('Nueva Pieza ADN');
  });

  it('debe renderizar las pestañas de plataforma cuando existen piezas sociales', () => {
    const propsWithSocials = {
      ...baseProps,
      generatedAssets: {
        socials: [
          { platform: 'instagram', type: 'story', marketingName: 'Reel 1' },
          { platform: 'tiktok', type: 'story', marketingName: 'TikTok 1' }
        ]
      }
    };

    const html = renderToStaticMarkup(
      <SocialChannelEditor {...propsWithSocials} />
    );

    expect(html).toContain('instagram');
    expect(html).toContain('tiktok');
  });

  it('debe renderizar una tarjeta sellada cuando isLocked es true', () => {
    const propsWithLocked = {
      ...baseProps,
      generatedAssets: {
        socials: [
          {
            platform: 'instagram',
            type: 'story',
            marketingName: 'Reel Sellado',
            production_notes: { isLocked: true, video_url: 'https://drive.google.com/test' }
          }
        ]
      }
    };

    const html = renderToStaticMarkup(
      <SocialChannelEditor {...propsWithLocked} />
    );

    expect(html).toContain('Pieza Sellada');
    expect(html).toContain('Reel Sellado');
  });

  it('debe cumplir con la política estricta de CERO EMOJIS en todos los textos renderizados', () => {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    const htmlEmpty = renderToStaticMarkup(<SocialChannelEditor {...baseProps} />);
    expect(emojiRegex.test(htmlEmpty)).toBe(false);

    const propsWithSocials = {
      ...baseProps,
      generatedAssets: {
        socials: [
          { platform: 'instagram', type: 'story', marketingName: 'Reel Test' }
        ]
      }
    };
    const htmlContent = renderToStaticMarkup(<SocialChannelEditor {...propsWithSocials} />);
    expect(emojiRegex.test(htmlContent)).toBe(false);
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { slides, marketingName, designTokens, hook, caption } = await req.json();

    if (!slides || !slides.length) {
      return NextResponse.json({ success: false, error: 'No slides provided' }, { status: 400 });
    }

    const sanitizeText = (t: string) => {
      return (t || '')
        .replace(/[\u201C\u201D]/g, '"') 
        .replace(/[\u2018\u2019]/g, "'") 
        .replace(/\u2013/g, "-")
        .replace(/\u2014/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/\u00A0/g, " ")
        .replace(/[^\x00-\xFF]/g, ""); // Elimina cualquier cosa fuera de Latin-1 (mantiene acentos y ñ)
    };

    const pdfDoc = await PDFDocument.create();
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    
    let fontBold, fontRegular;
    try {
      const boldBytes = await fs.readFile(path.join(fontsDir, 'arialbd.ttf'));
      const regBytes = await fs.readFile(path.join(fontsDir, 'calibri.ttf'));
      fontBold = await pdfDoc.embedFont(boldBytes);
      fontRegular = await pdfDoc.embedFont(regBytes);
    } catch (e) {
      console.warn('[PDF:Fonts] Error cargando TTF, usando Helvetica fallback.');
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const primaryHex = designTokens?.primary || '#8B5CF6';
    const secondaryHex = designTokens?.secondary || '#0F172A';
    
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return rgb(r, g, b);
    };

    const primaryColor = hexToRgb(primaryHex);
    const bgColor = hexToRgb(secondaryHex);

    // FUNCIÓN: Dibujar página con texto envuelto
    const drawWrappedText = (page: any, text: string, x: number, y: number, maxWidth: number, fontSize: number, font: any, color: any) => {
      const words = text.split(/\s+/);
      let line = '';
      let currentY = y;
      for (const word of words) {
        const testLine = line + word + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth) {
          page.drawText(line.trim(), { x, y: currentY, size: fontSize, font, color });
          line = word + ' ';
          currentY -= (fontSize + 10);
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        page.drawText(line.trim(), { x, y: currentY, size: fontSize, font, color });
      }
      return currentY;
    };

    // 1. PÁGINA DE PORTADA (HOOK)
    if (hook) {
      const cover = pdfDoc.addPage([1080, 1350]);
      const { width, height } = cover.getSize();
      cover.drawRectangle({ x: 0, y: 0, width, height, color: bgColor });
      
      // Acento lateral
      cover.drawRectangle({ x: 0, y: 0, width: 30, height, color: primaryColor });

      // Título Hook Gigante (Sanitizado)
      const hookFontSize = 72;
      drawWrappedText(cover, sanitizeText(hook).toUpperCase(), 100, height - 300, width - 200, hookFontSize, fontBold, rgb(1,1,1));

      // Subtítulo / Marketing Name
      cover.drawText(sanitizeText(marketingName || 'GUIA ESTRATEGICA').toUpperCase(), {
        x: 100,
        y: 200,
        size: 24,
        font: fontBold,
        color: primaryColor
      });

      cover.drawText(sanitizeText('DESLIZA PARA APRENDER >'), {
        x: 100,
        y: 130,
        size: 18,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5)
      });
    }

    // 2. PÁGINA DE INTRODUCCIÓN (CAPTION)
    if (caption) {
      const intro = pdfDoc.addPage([1080, 1350]);
      const { width, height } = intro.getSize();
      intro.drawRectangle({ x: 0, y: 0, width, height, color: bgColor });
      
      intro.drawText(sanitizeText('CONTEXTO ESTRATEGICO'), {
        x: 80,
        y: height - 120,
        size: 16,
        font: fontBold,
        color: primaryColor
      });

      drawWrappedText(intro, sanitizeText(caption), 80, height - 220, width - 160, 26, fontRegular, rgb(0.9, 0.9, 0.9));
    }

    // 3. PÁGINAS DE CONTENIDO (SLIDES)
    for (const [i, slide] of slides.entries()) {
      const page = pdfDoc.addPage([1080, 1350]);
      const { width, height } = page.getSize();

      page.drawRectangle({ x: 0, y: 0, width, height, color: bgColor });
      
      // Header sutil
      page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.05, 0.08, 0.15) });
      page.drawText(sanitizeText(marketingName || 'DOCUMENTO').toUpperCase(), {
        x: 60,
        y: height - 50,
        size: 14,
        font: fontBold,
        color: rgb(0.4, 0.4, 0.4)
      });

      // Imagen
      if (slide.imageUrl) {
        try {
          const imgBytes = await fetch(slide.imageUrl).then(res => res.arrayBuffer());
          const isPng = slide.imageUrl.toLowerCase().endsWith('.png') || slide.imageUrl.includes('image/png');
          const image = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
          const imgDims = image.scale(1);
          const maxImgW = width - 120;
          const maxImgH = height * 0.35;
          const scale = Math.min(maxImgW / imgDims.width, maxImgH / imgDims.height);
          const finalW = imgDims.width * scale;
          const finalH = imgDims.height * scale;
          page.drawImage(image, { x: (width - finalW) / 2, y: height - finalH - 120, width: finalW, height: finalH });
        } catch (e) {}
      }

      // Título y Texto Educativo
      const contentY = height * 0.45;
      const title = sanitizeText(slide.title || slide.segment || slide.segment_label || 'CONTENIDO');
      const bodyText = sanitizeText(slide.text || '(Sin texto educativo)');

      page.drawText(title.toUpperCase(), {
        x: 80,
        y: contentY,
        size: 44,
        font: fontBold,
        color: rgb(1, 1, 1)
      });

      page.drawLine({
        start: { x: 80, y: contentY - 20 },
        end: { x: 200, y: contentY - 20 },
        thickness: 4,
        color: primaryColor
      });

      drawWrappedText(page, bodyText, 80, contentY - 80, width - 160, 32, fontRegular, rgb(0.95, 0.95, 0.95));

      // Footer
      page.drawText(sanitizeText(`PAGINA ${i + 1} de ${slides.length} - ${marketingName || 'EVO'}`).toUpperCase(), {
        x: 80,
        y: 60,
        size: 12,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3)
      });
    }


    // Guardar y Retornar
    const pdfBytes = await pdfDoc.save();
    const { getAdminStorage } = await import('@/firebase/admin');
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const fileName = `campaigns/exports/pdf/${Date.now()}_document.pdf`;
    const file = bucket.file(fileName);

    await file.save(Buffer.from(pdfBytes), { metadata: { contentType: 'application/pdf' } });
    const [pdfUrl] = await file.getSignedUrl({ action: 'read', expires: '01-01-2050' });

    return NextResponse.json({ success: true, pdfUrl, filename: `${marketingName || 'Documento'}.pdf` });

  } catch (error: any) {
    console.error('[API:PDF:Carousel] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

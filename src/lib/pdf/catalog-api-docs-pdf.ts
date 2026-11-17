import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getAppBaseUrl } from '@/lib/app-url';

export interface CatalogApiDocOptions {
  baseUrl?: string;
  tutorName?: string;
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = (text || '').split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export async function generateCatalogApiDocsPdf(options: CatalogApiDocOptions = {}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCode = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontCodeBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const primaryColor = rgb(0.08, 0.35, 0.75); // Blue corporate
  const darkTextColor = rgb(0.1, 0.12, 0.15);
  const mutedTextColor = rgb(0.38, 0.42, 0.48);
  const codeBgColor = rgb(0.96, 0.97, 0.99);
  const borderColor = rgb(0.85, 0.88, 0.92);
  const accentGreen = rgb(0.05, 0.58, 0.32);

  const pageWidth = 595.28; // A4 width in pt
  const pageHeight = 841.89; // A4 height in pt
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  let pageIndex = 1;
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawFooter = (page: typeof currentPage, pNum: number) => {
    page.drawLine({
      start: { x: margin, y: margin + 15 },
      end: { x: pageWidth - margin, y: margin + 15 },
      thickness: 0.5,
      color: borderColor,
    });
    page.drawText('Feliz de Emprender - Documentacion Oficial de API de Catalogo', {
      x: margin,
      y: margin,
      size: 8,
      font: fontRegular,
      color: mutedTextColor,
    });
    page.drawText(`Pagina ${pNum}`, {
      x: pageWidth - margin - 50,
      y: margin,
      size: 8,
      font: fontRegular,
      color: mutedTextColor,
    });
  };

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < margin + 35) {
      drawFooter(currentPage, pageIndex);
      pageIndex++;
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  // 1. HEADER & COVER BANNER
  currentPage.drawRectangle({
    x: margin,
    y: y - 56,
    width: contentWidth,
    height: 60,
    color: rgb(0.96, 0.98, 1.0),
    borderColor: borderColor,
    borderWidth: 1,
  });

  currentPage.drawText('FELIZ DE EMPRENDER - GUIA TECNICA DE INTEGRACION', {
    x: margin + 16,
    y: y - 20,
    size: 9,
    font: fontBold,
    color: primaryColor,
  });

  currentPage.drawText('API de Catalogo de Ofertas (Vigentes)', {
    x: margin + 16,
    y: y - 42,
    size: 17,
    font: fontBold,
    color: darkTextColor,
  });

  y -= 76;

  // Metadata Bar
  const dateStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const baseUrl = (options.baseUrl || getAppBaseUrl()).replace(/\/$/, '');

  currentPage.drawText(`Version: v1.0 (REST)    |    Generado: ${dateStr}    |    Protocolo: HTTPS / JSON`, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: mutedTextColor,
  });

  y -= 18;
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: borderColor,
  });
  y -= 22;

  // Helper to draw section header
  const drawSectionHeader = (num: string, title: string) => {
    ensureSpace(40);
    currentPage.drawText(`${num}. ${title.toUpperCase()}`, {
      x: margin,
      y,
      size: 11.5,
      font: fontBold,
      color: primaryColor,
    });
    y -= 16;
  };

  // 1. DESCRIPCIÓN Y PROPÓSITO
  drawSectionHeader('1', 'Proposito de la API');
  const introText =
    'Esta API permite a los tutores y academias incrustar y sincronizar de forma autonoma su catalogo de ofertas ' +
    '(cursos, programas y mentorias) en cualquier sitio web externo, landing propia o portal corporativo. ' +
    'El acceso esta estrictamente aislado por tutor mediante una clave secreta unica (x-api-key). Cada oferta ' +
    'devuelve la informacion completa, incluyendo los medios de pago configurados, sus valores respectivos y monedas.';

  const introLines = wrapText(introText, contentWidth, fontRegular, 9.5);
  for (const line of introLines) {
    currentPage.drawText(line, {
      x: margin,
      y,
      size: 9.5,
      font: fontRegular,
      color: darkTextColor,
    });
    y -= 14;
  }
  y -= 12;

  // 2. ENDPOINT Y ESPECIFICACIÓN
  drawSectionHeader('2', 'Especificacion del Endpoint');
  ensureSpace(65);

  currentPage.drawRectangle({
    x: margin,
    y: y - 50,
    width: contentWidth,
    height: 52,
    color: codeBgColor,
    borderColor: borderColor,
    borderWidth: 1,
  });

  currentPage.drawText('METODO HTTP:', {
    x: margin + 12,
    y: y - 18,
    size: 9,
    font: fontBold,
    color: mutedTextColor,
  });

  currentPage.drawText('GET', {
    x: margin + 95,
    y: y - 18,
    size: 10,
    font: fontBold,
    color: accentGreen,
  });

  currentPage.drawText('URL DEL ENDPOINT:', {
    x: margin + 12,
    y: y - 38,
    size: 9,
    font: fontBold,
    color: mutedTextColor,
  });

  currentPage.drawText(`${baseUrl}/api/v1/tutor/catalog`, {
    x: margin + 120,
    y: y - 38,
    size: 9,
    font: fontCodeBold,
    color: darkTextColor,
  });

  y -= 68;

  // 3. MÉTODOS DE AUTENTICACIÓN
  drawSectionHeader('3', 'Autenticacion (x-api-key)');
  ensureSpace(80);

  const authDesc = 'Cada consulta debe autenticarse utilizando tu clave secreta de API enviada por uno de los siguientes metodos:';
  currentPage.drawText(authDesc, {
    x: margin,
    y,
    size: 9.5,
    font: fontRegular,
    color: darkTextColor,
  });
  y -= 18;

  const authMethods = [
    { label: 'Cabecera HTTP (Recomendado):', code: 'x-api-key: fde_live_tu_clave_secreta' },
    { label: 'Cabecera Authorization:', code: 'Authorization: Bearer fde_live_tu_clave_secreta' },
    { label: 'Parametro de URL (Query):', code: `${baseUrl}/api/v1/tutor/catalog?api_key=fde_live_...` },
  ];

  for (const m of authMethods) {
    ensureSpace(20);
    currentPage.drawText(`- ${m.label}`, {
      x: margin + 8,
      y,
      size: 9,
      font: fontBold,
      color: darkTextColor,
    });
    currentPage.drawText(m.code, {
      x: margin + 195,
      y,
      size: 8.5,
      font: fontCode,
      color: primaryColor,
    });
    y -= 18;
  }
  y -= 10;

  // 4. PARÁMETROS DE CONSULTA (FILTROS)
  drawSectionHeader('4', 'Filtros y Parametros Disponibles');

  const filters = [
    {
      param: '?type=<valores>',
      desc: 'Filtra por tipo de oferta. Valores admitidos: curso, programa, mentoria. Permite combinacion separada por comas (ej: ?type=curso,programa).',
    },
    {
      param: '?ids=<id1,id2>',
      desc: 'Consulta uno o varios identificadores especificos de ofertas separados por comas.',
    },
    {
      param: '?limit=<numero>',
      desc: 'Cantidad maxima de ofertas a retornar (por defecto 50, maximo 100).',
    },
  ];

  for (const f of filters) {
    const descLines = wrapText(f.desc, contentWidth - 145, fontRegular, 8.5);
    const boxHeight = Math.max(30, descLines.length * 12 + 12);
    ensureSpace(boxHeight + 6);

    currentPage.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: contentWidth,
      height: boxHeight,
      color: codeBgColor,
      borderColor: borderColor,
      borderWidth: 0.5,
    });

    currentPage.drawText(f.param, {
      x: margin + 10,
      y: y - 18,
      size: 8.5,
      font: fontCodeBold,
      color: primaryColor,
    });

    let lineY = y - 16;
    for (const dLine of descLines) {
      currentPage.drawText(dLine, {
        x: margin + 135,
        y: lineY,
        size: 8.5,
        font: fontRegular,
        color: darkTextColor,
      });
      lineY -= 12;
    }
    y -= boxHeight + 8;
  }
  y -= 8;

  // 5. MEDIOS DE PAGO Y MONEDA
  drawSectionHeader('5', 'Medios de Pago, Valores y Monedas');
  ensureSpace(70);

  const paymentDesc =
    'Cada oferta en el catalogo incluye el desglose de sus medios de pago configurados (paymentMethods), ' +
    'con el valor exacto fijado para cada medio y su moneda (ARS o USD). Esto permite a tu sitio web externo ' +
    'exhibir con precision las alternativas de compra disponibles:';

  const paymentDescLines = wrapText(paymentDesc, contentWidth, fontRegular, 9);
  for (const line of paymentDescLines) {
    currentPage.drawText(line, {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: darkTextColor,
    });
    y -= 13;
  }
  y -= 8;

  const sampleMethods = [
    { id: 'mercadopago', label: 'Mercado Pago', amount: '$15.000 ARS', desc: 'Tarjetas locales, saldo y cuotas en pesos argentinos.' },
    { id: 'transfer', label: 'Transferencia Bancaria', amount: '$13.500 ARS', desc: 'Pago directo mediante CBU / CVU / Alias.' },
    { id: 'stripe', label: 'Stripe (Internacional)', amount: '$50 USD', desc: 'Tarjetas de credito y debito internacionales en dolares.' },
    { id: 'getnet', label: 'Getnet', amount: '$15.000 ARS', desc: 'Procesamiento de pagos Santander y tarjetas de credito.' },
  ];

  for (const sm of sampleMethods) {
    ensureSpace(22);
    currentPage.drawRectangle({
      x: margin,
      y: y - 18,
      width: contentWidth,
      height: 20,
      color: rgb(0.98, 0.99, 1.0),
      borderColor: borderColor,
      borderWidth: 0.5,
    });

    currentPage.drawText(sm.label, {
      x: margin + 8,
      y: y - 13,
      size: 8.5,
      font: fontBold,
      color: darkTextColor,
    });

    currentPage.drawText(sm.amount, {
      x: margin + 160,
      y: y - 13,
      size: 8.5,
      font: fontCodeBold,
      color: accentGreen,
    });

    currentPage.drawText(sm.desc, {
      x: margin + 250,
      y: y - 13,
      size: 8,
      font: fontRegular,
      color: mutedTextColor,
    });

    y -= 24;
  }
  y -= 10;

  // 6. GARANTÍAS Y REGLAS DE NEGOCIO
  drawSectionHeader('6', 'Garantias de Negocio y Seguridad');

  const guarantees = [
    {
      title: 'Solo Ofertas Vigentes y Activas:',
      desc: 'El motor filtra automaticamente cualquier oferta con fecha de expiracion cumplida (activeUntil) o no publicada. Tu web siempre exhibira ofertas vigentes sin intervencion manual.',
    },
    {
      title: 'Exclusion Absoluta de Embajadores:',
      desc: 'Las paginas de venta correspondientes a afiliados o embajadores estan excluidas del catalogo general.',
    },
    {
      title: 'Soporte CORS Universal:',
      desc: 'El endpoint responde con cabeceras CORS dinamicas permitiendo consultas directas desde navegadores web (fetch/AJAX) sin bloqueos de origen cruzado.',
    },
    {
      title: 'Proteccion Anti-Ataque (Circuit Breaker):',
      desc: 'Para proteger el catalogo ante scraping abusivo o trafico anomalo, si una clave supera 180 req/minuto se bloquea preventivamente. Puedes regenerarla al instante desde el panel de Motores de Publicacion.',
    },
  ];

  for (const g of guarantees) {
    const gLines = wrapText(g.desc, contentWidth - 25, fontRegular, 8.5);
    const itemHeight = 16 + gLines.length * 12 + 6;
    ensureSpace(itemHeight);

    currentPage.drawText(`[OK]  ${g.title}`, {
      x: margin + 4,
      y,
      size: 9,
      font: fontBold,
      color: darkTextColor,
    });
    y -= 13;

    for (const gLine of gLines) {
      currentPage.drawText(gLine, {
        x: margin + 18,
        y,
        size: 8.5,
        font: fontRegular,
        color: mutedTextColor,
      });
      y -= 12;
    }
    y -= 6;
  }
  y -= 10;

  // 7. ESTRUCTURA DE LA RESPUESTA JSON
  drawSectionHeader('7', 'Estructura Completa de la Respuesta JSON');

  const jsonFields = [
    { field: 'tutor.id / name', type: 'string', desc: 'Identificador y nombre oficial del tutor titular.' },
    { field: 'offers[].id', type: 'string', desc: 'Identificador unico y estable de la oferta.' },
    { field: 'offers[].type', type: 'string', desc: 'Tipo: "curso", "programa" o "mentoria".' },
    { field: 'offers[].title', type: 'string', desc: 'Titulo principal de la oferta.' },
    { field: 'offers[].description', type: 'string | null', desc: 'Descripcion breve para mostrar en tarjeta.' },
    { field: 'offers[].imageUrl', type: 'string | null', desc: 'URL de portada de alta calidad.' },
    { field: 'offers[].price', type: 'object', desc: 'Precio base { amount, currency, isFree, formatted }.' },
    { field: 'offers[].paymentMethods', type: 'array', desc: 'Lista de medios de pago con valor y moneda especifica.' },
    { field: '  [].id', type: 'string', desc: 'ID del medio: "mercadopago", "transfer", "stripe", "getnet".' },
    { field: '  [].label', type: 'string', desc: 'Nombre: "Mercado Pago", "Transferencia Bancaria", "Stripe".' },
    { field: '  [].amount', type: 'number', desc: 'Monto fijado para este medio de pago.' },
    { field: '  [].currency', type: 'string', desc: 'Moneda especifica: "ARS" o "USD".' },
    { field: '  [].formatted', type: 'string', desc: 'Monto con simbolo y formato legible (ej: "$15.000 ARS").' },
    { field: 'offers[].duration', type: 'object | null', desc: 'Duracion { value, unit, label } (ej: "8 semanas").' },
    { field: 'offers[].url', type: 'string', desc: 'URL directa a la landing para el boton "Ver mas" o "Conocer".' },
    { field: 'offers[].status', type: 'string', desc: 'Estado ("published" o "active").' },
    { field: 'offers[].activeUntil', type: 'string | null', desc: 'Fecha limite de vigencia en formato ISO 8601.' },
  ];

  for (const item of jsonFields) {
    const descLines = wrapText(item.desc, contentWidth - 250, fontRegular, 8);
    const rowHeight = Math.max(16, descLines.length * 11 + 4);
    ensureSpace(rowHeight + 4);

    currentPage.drawText(item.field, {
      x: margin + 6,
      y: y - 10,
      size: 8,
      font: fontCodeBold,
      color: primaryColor,
    });

    currentPage.drawText(item.type, {
      x: margin + 175,
      y: y - 10,
      size: 7.5,
      font: fontCode,
      color: accentGreen,
    });

    let dY = y - 10;
    for (const dLine of descLines) {
      currentPage.drawText(dLine, {
        x: margin + 245,
        y: dY,
        size: 8,
        font: fontRegular,
        color: darkTextColor,
      });
      dY -= 11;
    }

    currentPage.drawLine({
      start: { x: margin, y: y - rowHeight },
      end: { x: pageWidth - margin, y: y - rowHeight },
      thickness: 0.3,
      color: borderColor,
    });

    y -= rowHeight + 4;
  }
  y -= 12;

  // 8. EJEMPLOS DE INTEGRACIÓN
  drawSectionHeader('8', 'Ejemplos de Integracion');
  ensureSpace(120);

  currentPage.drawText('Ejemplo en JavaScript (Frontend / Fetch):', {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: darkTextColor,
  });
  y -= 14;

  const jsSnippet = [
    `const res = await fetch('${baseUrl}/api/v1/tutor/catalog?type=programa', {`,
    `  headers: { 'x-api-key': 'fde_live_tu_clave_secreta' }`,
    `});`,
    `const { offers } = await res.json();`,
    `offers.forEach(o => {`,
    `  console.log(o.title, o.price.formatted);`,
    `  o.paymentMethods.forEach(pm => console.log(' ->', pm.label, pm.formatted));`,
    `});`,
  ];

  currentPage.drawRectangle({
    x: margin,
    y: y - 95,
    width: contentWidth,
    height: 98,
    color: rgb(0.12, 0.14, 0.18),
    borderColor: borderColor,
    borderWidth: 0.5,
  });

  let codeY = y - 14;
  for (const line of jsSnippet) {
    currentPage.drawText(line, {
      x: margin + 12,
      y: codeY,
      size: 7.8,
      font: fontCode,
      color: rgb(0.9, 0.94, 0.98),
    });
    codeY -= 11;
  }
  y -= 110;

  // Final footer on last page
  drawFooter(currentPage, pageIndex);

  return pdfDoc.save();
}

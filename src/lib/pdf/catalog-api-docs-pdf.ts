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

  // Helvetica fonts render reliably and crisply across all PDF engines without kerning glitches
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primaryColor = rgb(0.08, 0.35, 0.75); // Professional corporate blue
  const primaryLight = rgb(0.94, 0.96, 1.0);
  const darkTextColor = rgb(0.12, 0.14, 0.18);
  const mutedTextColor = rgb(0.4, 0.44, 0.5);
  const lightBgColor = rgb(0.97, 0.98, 0.99);
  const borderColor = rgb(0.84, 0.87, 0.91);
  const accentGreen = rgb(0.05, 0.55, 0.3);
  const accentGreenBg = rgb(0.93, 0.98, 0.95);
  const codeBoxBg = rgb(0.12, 0.14, 0.18);

  const pageWidth = 595.28; // A4 pt
  const pageHeight = 841.89; // A4 pt
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;

  const dateStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const baseUrl = (options.baseUrl || getAppBaseUrl()).replace(/\/$/, '');

  // Helper to draw clean sub-page header
  const drawPageSubHeader = (page: any, pageTitle: string) => {
    page.drawRectangle({
      x: margin,
      y: pageHeight - margin - 24,
      width: contentWidth,
      height: 24,
      color: primaryLight,
      borderColor: borderColor,
      borderWidth: 0.5,
    });
    page.drawText('FELIZ DE EMPRENDER  |  DOCUMENTACION TECNICA', {
      x: margin + 10,
      y: pageHeight - margin - 16,
      size: 7.5,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(pageTitle, {
      x: pageWidth - margin - fontBold.widthOfTextAtSize(pageTitle, 7.5) - 10,
      y: pageHeight - margin - 16,
      size: 7.5,
      font: fontBold,
      color: darkTextColor,
    });
  };

  // ==========================================
  // PAGINA 1: INTRODUCCION, ENDPOINT Y FILTROS
  // ==========================================
  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // 1. Cover Banner
  page1.drawRectangle({
    x: margin,
    y: y - 56,
    width: contentWidth,
    height: 56,
    color: primaryLight,
    borderColor: borderColor,
    borderWidth: 1,
  });

  page1.drawText('FELIZ DE EMPRENDER  -  GUIA TECNICA DE INTEGRACION', {
    x: margin + 14,
    y: y - 18,
    size: 8.5,
    font: fontBold,
    color: primaryColor,
  });

  page1.drawText('API de Catalogo de Ofertas (Vigentes)', {
    x: margin + 14,
    y: y - 42,
    size: 16.5,
    font: fontBold,
    color: darkTextColor,
  });

  y -= 70;

  // Metadata Bar
  page1.drawText(`Version: v1.0 (REST)    |    Generado: ${dateStr}    |    Protocolo: HTTPS / JSON    |    Formato: UTF-8`, {
    x: margin,
    y,
    size: 8.5,
    font: fontRegular,
    color: mutedTextColor,
  });

  y -= 14;
  page1.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.8,
    color: borderColor,
  });
  y -= 22;

  // Seccion 1: Proposito
  page1.drawText('1. PROPOSITO DE LA API', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 15;

  const introText =
    'Esta API REST permite a los tutores y academias incrustar y sincronizar de forma automatica y en tiempo real ' +
    'su catalogo de ofertas (cursos, programas y mentorias) en cualquier sitio web externo, landing page propia o ' +
    'portal corporativo. El acceso esta protegido por tutor mediante una clave secreta unica (x-api-key). Cada ' +
    'oferta expone su informacion publica completa, incluyendo los medios de pago admitidos, valores fijados y moneda.';
  const introLines = wrapText(introText, contentWidth, fontRegular, 8.5);
  for (const line of introLines) {
    page1.drawText(line, { x: margin, y, size: 8.5, font: fontRegular, color: darkTextColor });
    y -= 12;
  }
  y -= 12;

  // Seccion 2: Endpoint
  page1.drawText('2. ESPECIFICACION DEL ENDPOINT', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 15;

  const endpointBoxHeight = 44;
  page1.drawRectangle({
    x: margin,
    y: y - endpointBoxHeight,
    width: contentWidth,
    height: endpointBoxHeight,
    color: lightBgColor,
    borderColor: borderColor,
    borderWidth: 0.8,
  });

  // GET badge
  page1.drawRectangle({
    x: margin + 10,
    y: y - 30,
    width: 36,
    height: 18,
    color: accentGreenBg,
    borderColor: accentGreen,
    borderWidth: 0.5,
  });
  page1.drawText('GET', {
    x: margin + 18,
    y: y - 24,
    size: 9,
    font: fontBold,
    color: accentGreen,
  });

  page1.drawText(`${baseUrl}/api/v1/tutor/catalog`, {
    x: margin + 56,
    y: y - 24,
    size: 9.5,
    font: fontBold,
    color: darkTextColor,
  });

  page1.drawText('Respuesta: application/json  |  CORS: Habilitado (sin bloqueo de origen cruzado)', {
    x: margin + 56,
    y: y - 38,
    size: 7.5,
    font: fontRegular,
    color: mutedTextColor,
  });

  y -= endpointBoxHeight + 18;

  // Seccion 3: Autenticacion
  page1.drawText('3. AUTENTICACION (x-api-key)', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 14;

  page1.drawText(
    'Cada consulta debe autenticarse utilizando tu clave secreta de API enviada por uno de los siguientes metodos:',
    { x: margin, y, size: 8.5, font: fontRegular, color: darkTextColor }
  );
  y -= 14;

  const authOptions = [
    {
      title: 'Cabecera HTTP Personalizada (Recomendado)',
      code: 'x-api-key: fde_live_tu_clave_secreta',
      note: 'Metodo estandar y mas seguro para peticiones frontend y backend.',
    },
    {
      title: 'Cabecera de Autorizacion Estandar',
      code: 'Authorization: Bearer fde_live_tu_clave_secreta',
      note: 'Compatible con clientes HTTP estandar y librerias tipo Axios o Fetch.',
    },
    {
      title: 'Parametro de URL (Query String)',
      code: `${baseUrl}/api/v1/tutor/catalog?api_key=fde_live_tu_clave_secreta`,
      note: 'Util para llamadas directas, webhooks o herramientas rapidas de testeo.',
    },
  ];

  for (const aOpt of authOptions) {
    const cardHeight = 36;
    page1.drawRectangle({
      x: margin,
      y: y - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: lightBgColor,
      borderColor: borderColor,
      borderWidth: 0.5,
    });

    page1.drawText(aOpt.title, {
      x: margin + 10,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });

    page1.drawText(aOpt.code, {
      x: margin + 10,
      y: y - 24,
      size: 8,
      font: fontBold,
      color: darkTextColor,
    });

    page1.drawText(aOpt.note, {
      x: margin + 10,
      y: y - 33,
      size: 7,
      font: fontOblique,
      color: mutedTextColor,
    });

    y -= cardHeight + 6;
  }
  y -= 10;

  // Seccion 4: Filtros
  page1.drawText('4. FILTROS Y PARAMETROS DE CONSULTA', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 14;

  const filters = [
    {
      param: '?type=<valores>',
      example: 'Ej: ?type=curso,programa',
      desc: 'Filtra por tipo de formacion. Valores aceptados: "curso", "programa", "mentoria". Admite combinacion separada por comas.',
    },
    {
      param: '?ids=<id1,id2>',
      example: 'Ej: ?ids=sp_123,sp_456',
      desc: 'Consulta uno o varios identificadores especificos de ofertas separados por comas. Util para mostrar ofertas puntuales.',
    },
    {
      param: '?limit=<numero>',
      example: 'Ej: ?limit=20',
      desc: 'Cantidad maxima de ofertas a devolver. Por defecto retorna hasta 50 ofertas activas (limite maximo permitido: 100).',
    },
  ];

  for (const f of filters) {
    const fCardHeight = 34;
    page1.drawRectangle({
      x: margin,
      y: y - fCardHeight,
      width: contentWidth,
      height: fCardHeight,
      color: lightBgColor,
      borderColor: borderColor,
      borderWidth: 0.5,
    });

    page1.drawText(f.param, {
      x: margin + 10,
      y: y - 13,
      size: 8.5,
      font: fontBold,
      color: primaryColor,
    });

    page1.drawText(f.example, {
      x: margin + 10,
      y: y - 25,
      size: 7.5,
      font: fontOblique,
      color: mutedTextColor,
    });

    const descLines = wrapText(f.desc, contentWidth - 140, fontRegular, 8);
    let dLineY = y - 13;
    for (const dLine of descLines) {
      page1.drawText(dLine, {
        x: margin + 130,
        y: dLineY,
        size: 8,
        font: fontRegular,
        color: darkTextColor,
      });
      dLineY -= 11;
    }

    y -= fCardHeight + 6;
  }

  // ==========================================
  // PAGINA 2: MEDIOS DE PAGO Y GARANTIAS
  // ==========================================
  const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
  drawPageSubHeader(page2, 'MEDIOS DE PAGO Y GARANTIAS DE NEGOCIO');
  y = pageHeight - margin - 42;

  // Seccion 5: Medios de Pago
  page2.drawText('5. MEDIOS DE PAGO, VALORES Y MONEDAS', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 15;

  const paymentDesc =
    'Cada oferta del catalogo incluye el arreglo paymentMethods con el detalle exacto de cada pasarela configurada ' +
    'por el tutor. Cada entrada expone su identificador canonico, nombre publico, valor numerico fijado, moneda ' +
    'asociada (ARS o USD) y el monto formateado listo para exhibir en tu sitio web:';
  const payLines = wrapText(paymentDesc, contentWidth, fontRegular, 8.5);
  for (const line of payLines) {
    page2.drawText(line, { x: margin, y, size: 8.5, font: fontRegular, color: darkTextColor });
    y -= 12;
  }
  y -= 10;

  // Tabla de Medios de Pago - Header
  page2.drawRectangle({
    x: margin,
    y: y - 22,
    width: contentWidth,
    height: 22,
    color: primaryLight,
    borderColor: borderColor,
    borderWidth: 0.8,
  });

  page2.drawText('MEDIO DE PAGO', { x: margin + 10, y: y - 15, size: 8, font: fontBold, color: primaryColor });
  page2.drawText('ID PASARELA', { x: margin + 140, y: y - 15, size: 8, font: fontBold, color: primaryColor });
  page2.drawText('VALOR EJEMPLO', { x: margin + 230, y: y - 15, size: 8, font: fontBold, color: primaryColor });
  page2.drawText('MONEDA', { x: margin + 330, y: y - 15, size: 8, font: fontBold, color: primaryColor });
  page2.drawText('COBERTURA / ALCANCE', { x: margin + 390, y: y - 15, size: 8, font: fontBold, color: primaryColor });
  y -= 22;

  const paymentTableRows = [
    {
      label: 'Mercado Pago',
      id: 'mercadopago',
      amount: '$15.000 ARS',
      currency: 'ARS',
      desc: 'Tarjetas locales, saldo en cuenta y cuotas en pesos.',
    },
    {
      label: 'Transferencia Bancaria',
      id: 'transfer',
      amount: '$13.500 ARS',
      currency: 'ARS',
      desc: 'Pago directo mediante CBU / CVU / Alias en pesos.',
    },
    {
      label: 'Stripe Internacional',
      id: 'stripe',
      amount: '$50 USD',
      currency: 'USD',
      desc: 'Tarjetas de credito/debito globales en dolares.',
    },
    {
      label: 'Getnet (Santander)',
      id: 'getnet',
      amount: '$15.000 ARS',
      currency: 'ARS',
      desc: 'Tarjetas de credito y debito procesadas por Getnet.',
    },
  ];

  for (let idx = 0; idx < paymentTableRows.length; idx++) {
    const row = paymentTableRows[idx];
    const rowBg = idx % 2 === 0 ? lightBgColor : rgb(1, 1, 1);
    page2.drawRectangle({
      x: margin,
      y: y - 22,
      width: contentWidth,
      height: 22,
      color: rowBg,
      borderColor: borderColor,
      borderWidth: 0.5,
    });

    page2.drawText(row.label, { x: margin + 10, y: y - 15, size: 8, font: fontBold, color: darkTextColor });
    page2.drawText(row.id, { x: margin + 140, y: y - 15, size: 8, font: fontRegular, color: primaryColor });
    page2.drawText(row.amount, { x: margin + 230, y: y - 15, size: 8, font: fontBold, color: accentGreen });
    page2.drawText(row.currency, { x: margin + 330, y: y - 15, size: 8, font: fontRegular, color: darkTextColor });
    page2.drawText(row.desc, { x: margin + 390, y: y - 15, size: 7.5, font: fontRegular, color: mutedTextColor });

    y -= 22;
  }
  y -= 10;

  // Nota de ofertas gratuitas
  page2.drawRectangle({
    x: margin,
    y: y - 28,
    width: contentWidth,
    height: 28,
    color: rgb(0.96, 0.98, 0.96),
    borderColor: rgb(0.8, 0.9, 0.8),
    borderWidth: 0.5,
  });
  page2.drawText(
    'Nota sobre ofertas gratuitas: Si la formacion tiene costo $0, el campo price.isFree sera true y ' +
    'paymentMethods incluira una entrada indicando Gratuito con monto 0.',
    { x: margin + 10, y: y - 18, size: 7.5, font: fontOblique, color: rgb(0.1, 0.45, 0.2) }
  );
  y -= 46;

  // Seccion 6: Garantias
  page2.drawText('6. GARANTIAS DE NEGOCIO Y SEGURIDAD', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 16;

  const guarantees = [
    {
      title: 'Solo Ofertas Vigentes y Activas',
      desc: 'El motor filtra automaticamente cualquier oferta expirada por fecha (activeUntil) o que este en estado borrador. Tu sitio web siempre exhibira ofertas vigentes sin necesidad de intervencion manual.',
    },
    {
      title: 'Exclusion Absoluta de Embajadores o Afiliados',
      desc: 'Las ofertas derivadas o landings creadas por embajadores y referidos quedan 100% excluidas. La API solo retorna la oferta oficial del tutor titular.',
    },
    {
      title: 'Soporte CORS Universal (Frontend Directo)',
      desc: 'El endpoint responde con cabeceras Access-Control-Allow-Origin dinamicas. Puedes consumir la API directamente desde JavaScript en el navegador de tu pagina sin necesidad de un backend intermediario ni proxies.',
    },
    {
      title: 'Proteccion Anti-Ataque (Circuit Breaker Inteligente)',
      desc: 'Para salvaguardar tu catalogo ante scraping malicioso, ataques DDoS o bucles infinitos, si una clave supera las 180 req/minuto se bloquea preventivamente. Puedes regenerarla en un clic desde Motores de Publicacion.',
    },
  ];

  for (const g of guarantees) {
    const gLines = wrapText(g.desc, contentWidth - 40, fontRegular, 8);
    const cardHeight = 20 + gLines.length * 12 + 8;

    page2.drawRectangle({
      x: margin,
      y: y - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: lightBgColor,
      borderColor: borderColor,
      borderWidth: 0.5,
    });

    // Green check badge
    page2.drawRectangle({
      x: margin + 10,
      y: y - 17,
      width: 16,
      height: 13,
      color: accentGreenBg,
      borderColor: accentGreen,
      borderWidth: 0.5,
    });
    page2.drawText('OK', { x: margin + 12, y: y - 15, size: 7, font: fontBold, color: accentGreen });

    page2.drawText(g.title, {
      x: margin + 34,
      y: y - 15,
      size: 8.5,
      font: fontBold,
      color: darkTextColor,
    });

    let gLineY = y - 29;
    for (const gLine of gLines) {
      page2.drawText(gLine, {
        x: margin + 34,
        y: gLineY,
        size: 8,
        font: fontRegular,
        color: mutedTextColor,
      });
      gLineY -= 12;
    }

    y -= cardHeight + 10;
  }

  // ==========================================
  // PAGINA 3: DICCIONARIO JSON Y EJEMPLOS
  // ==========================================
  const page3 = pdfDoc.addPage([pageWidth, pageHeight]);
  drawPageSubHeader(page3, 'DICCIONARIO DE DATOS JSON Y EJEMPLOS DE CODIGO');
  y = pageHeight - margin - 42;

  // Seccion 7: Estructura JSON
  page3.drawText('7. ESTRUCTURA COMPLETA DE LA RESPUESTA JSON', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 14;

  // Tabla Diccionario - Header
  page3.drawRectangle({
    x: margin,
    y: y - 20,
    width: contentWidth,
    height: 20,
    color: primaryLight,
    borderColor: borderColor,
    borderWidth: 0.8,
  });

  page3.drawText('CAMPO / PROPIEDAD', { x: margin + 8, y: y - 14, size: 7.5, font: fontBold, color: primaryColor });
  page3.drawText('TIPO DE DATO', { x: margin + 170, y: y - 14, size: 7.5, font: fontBold, color: primaryColor });
  page3.drawText('DESCRIPCION Y FORMATO', { x: margin + 260, y: y - 14, size: 7.5, font: fontBold, color: primaryColor });
  y -= 20;

  const jsonFields = [
    { field: 'tutor.id / name', type: 'object / string', desc: 'Identificador unico y nombre oficial del tutor titular.' },
    { field: 'offers[].id', type: 'string', desc: 'Identificador unico y permanente de la oferta formativa.' },
    { field: 'offers[].type', type: 'string', desc: 'Tipo: "curso", "programa" o "mentoria".' },
    { field: 'offers[].title', type: 'string', desc: 'Titulo principal de la oferta.' },
    { field: 'offers[].description', type: 'string | null', desc: 'Descripcion breve de la oferta para tarjetas visuales.' },
    { field: 'offers[].imageUrl', type: 'string | null', desc: 'URL publica optimizada de la imagen de portada.' },
    { field: 'offers[].price', type: 'object', desc: 'Precio base: { amount, currency, isFree, formatted }.' },
    { field: 'offers[].paymentMethods', type: 'array', desc: 'Arreglo con desglose de medios de pago disponibles.' },
    { field: '  [].id / label', type: 'string', desc: 'ID pasarela (mercadopago, transfer, stripe, getnet) y etiqueta.' },
    { field: '  [].amount / currency', type: 'number / string', desc: 'Monto exacto fijado y codigo ISO de moneda (ARS / USD).' },
    { field: '  [].formatted', type: 'string', desc: 'Monto formateado con simbolo (ej: "$15.000 ARS", "$50 USD").' },
    { field: 'offers[].duration', type: 'object | null', desc: 'Duracion estimada: { value, unit, label } (ej: "8 semanas").' },
    { field: 'offers[].url', type: 'string', desc: 'URL directa a la landing para el boton "Ver mas" o "Inscribirme".' },
    { field: 'offers[].status', type: 'string', desc: 'Estado oficial de la oferta ("published" o "active").' },
    { field: 'offers[].activeUntil', type: 'string | null', desc: 'Fecha limite de vigencia en formato ISO 8601 (o null si permanente).' },
  ];

  for (let idx = 0; idx < jsonFields.length; idx++) {
    const item = jsonFields[idx];
    const rowBg = idx % 2 === 0 ? lightBgColor : rgb(1, 1, 1);
    const rowHeight = 17.5;

    page3.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: rowBg,
      borderColor: borderColor,
      borderWidth: 0.3,
    });

    page3.drawText(item.field, {
      x: margin + 8,
      y: y - 12,
      size: 7.5,
      font: fontBold,
      color: primaryColor,
    });

    page3.drawText(item.type, {
      x: margin + 170,
      y: y - 12,
      size: 7.5,
      font: fontRegular,
      color: accentGreen,
    });

    page3.drawText(item.desc, {
      x: margin + 260,
      y: y - 12,
      size: 7.5,
      font: fontRegular,
      color: darkTextColor,
    });

    y -= rowHeight;
  }
  y -= 14;

  // Seccion 8: Ejemplos de Integracion
  page3.drawText('8. EJEMPLOS DE INTEGRACION', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  y -= 14;

  // Subtítulo cURL
  page3.drawText('A) Peticion via cURL (Terminal / Backend)', {
    x: margin,
    y,
    size: 8.5,
    font: fontBold,
    color: darkTextColor,
  });
  y -= 10;

  const curlLines = [
    `curl -X GET "${baseUrl}/api/v1/tutor/catalog?type=curso" \\`,
    `  -H "x-api-key: fde_live_tu_clave_secreta"`,
  ];
  const curlBoxHeight = 36;
  page3.drawRectangle({
    x: margin,
    y: y - curlBoxHeight,
    width: contentWidth,
    height: curlBoxHeight,
    color: codeBoxBg,
    borderColor: borderColor,
    borderWidth: 0.5,
  });

  let curlY = y - 14;
  for (const cLine of curlLines) {
    page3.drawText(cLine, {
      x: margin + 12,
      y: curlY,
      size: 8,
      font: fontRegular,
      color: rgb(0.9, 0.94, 0.98),
    });
    curlY -= 12;
  }
  y -= curlBoxHeight + 14;

  // Subtítulo JS
  page3.drawText('B) Consumo en JavaScript / Frontend (Fetch moderno con soporte CORS)', {
    x: margin,
    y,
    size: 8.5,
    font: fontBold,
    color: darkTextColor,
  });
  y -= 10;

  const jsSnippet = [
    `// Llamada directa desde el navegador (sin proxies ni intermediarios)`,
    `const response = await fetch('${baseUrl}/api/v1/tutor/catalog?type=programa', {`,
    `  headers: { 'x-api-key': 'fde_live_tu_clave_secreta' }`,
    `});`,
    `const { offers } = await response.json();`,
    ``,
    `// Renderizar ofertas con sus medios de pago`,
    `offers.forEach(offer => {`,
    `  console.log(offer.title, 'Precio base:', offer.price.formatted);`,
    `  offer.paymentMethods.forEach(pm => console.log(' ->', pm.label, pm.formatted));`,
    `});`,
  ];

  const jsBoxHeight = 138;
  page3.drawRectangle({
    x: margin,
    y: y - jsBoxHeight,
    width: contentWidth,
    height: jsBoxHeight,
    color: codeBoxBg,
    borderColor: borderColor,
    borderWidth: 0.5,
  });

  let jsY = y - 14;
  for (const jLine of jsSnippet) {
    const isComment = jLine.startsWith('//');
    page3.drawText(jLine, {
      x: margin + 12,
      y: jsY,
      size: 7.8,
      font: isComment ? fontOblique : fontRegular,
      color: isComment ? rgb(0.55, 0.65, 0.75) : rgb(0.92, 0.95, 0.99),
    });
    jsY -= 11.5;
  }

  // ==========================================
  // FOOTER GLOBAL EN TODAS LAS PAGINAS (X de Y)
  // ==========================================
  const totalPages = pdfDoc.getPageCount();
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const p = pdfDoc.getPage(pIdx);
    p.drawLine({
      start: { x: margin, y: margin + 15 },
      end: { x: pageWidth - margin, y: margin + 15 },
      thickness: 0.5,
      color: borderColor,
    });
    p.drawText('Feliz de Emprender  -  Documentacion Oficial de API de Catalogo Publico', {
      x: margin,
      y: margin + 4,
      size: 7.5,
      font: fontRegular,
      color: mutedTextColor,
    });
    const pageNumText = `Pagina ${pIdx + 1} de ${totalPages}`;
    p.drawText(pageNumText, {
      x: pageWidth - margin - fontRegular.widthOfTextAtSize(pageNumText, 7.5),
      y: margin + 4,
      size: 7.5,
      font: fontRegular,
      color: mutedTextColor,
    });
  }

  return pdfDoc.save();
}

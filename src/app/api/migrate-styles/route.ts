import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { StyleTokens } from '@/lib/landing-styles';

function migrateTokens(oldDoc: Record<string, any>): StyleTokens | null {
  if (oldDoc.tokens) return null;

  const cs = oldDoc.componentStyle || 'borders';
  const sp = oldDoc.spacing || 'balanced';
  const an = oldDoc.animations || 'minimal';

  const tokenMap: Record<string, Partial<StyleTokens>> = {
    borders:   { componentRadius: '6px',  componentBorder: '1px solid var(--border)',  componentShadow: 'none',         componentBg: 'var(--surface)', themeMode: 'light' },
    shadows:   { componentRadius: '8px',  componentBorder: 'none',                     componentShadow: '0 4px 16px rgba(0,0,0,0.06)', componentBg: 'var(--surface)', themeMode: 'light' },
    minimal:   { componentRadius: '0px',  componentBorder: 'none',                     componentShadow: 'none',         componentBg: 'transparent',  themeMode: 'glass' },
    defined:   { componentRadius: '4px',  componentBorder: '1px solid var(--border)',  componentShadow: '0 1px 3px rgba(0,0,0,0.04)', componentBg: 'var(--surface)', themeMode: 'light' },
    creative:  { componentRadius: '0px',  componentBorder: 'none',                     componentShadow: '0 20px 60px rgba(0,0,0,0.14)', componentBg: 'transparent',  themeMode: 'dark' },
  };

  const spacingMap: Record<string, { sectionPadding: string; contentGap: string }> = {
    compact:  { sectionPadding: '64px',  contentGap: '12px' },
    balanced: { sectionPadding: '96px',  contentGap: '16px' },
    generous: { sectionPadding: '120px', contentGap: '20px' },
    airy:     { sectionPadding: '128px', contentGap: '24px' },
  };

  const animMap: Record<string, { transitionDuration: string }> = {
    none:    { transitionDuration: '0ms' },
    minimal: { transitionDuration: '150ms' },
    hover:   { transitionDuration: '200ms' },
    micro:   { transitionDuration: '300ms' },
  };

  return {
    ...tokenMap[cs] || tokenMap.borders,
    ...spacingMap[sp] || spacingMap.balanced,
    ...animMap[an] || animMap.minimal,
  } as StyleTokens;
}

export async function GET() {
  try {
    const snap = await adminDb.collection('landingStyles').get();
    const batch = adminDb.batch();
    let updated = 0;
    let skipped = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const tokens = migrateTokens(data);
      if (!tokens) { skipped++; continue; }

      const deleteFields = ['componentStyle', 'spacing', 'animations'];
      const updateData: Record<string, any> = {
        tokens,
        updatedAt: new Date().toISOString(),
      };

      batch.update(doc.ref, updateData);
      batch.update(doc.ref, deleteFields.reduce((acc, f) => ({ ...acc, [f]: FieldValue.delete() }), {}));
      updated++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Migrados ${updated} estilos (${skipped} ya tenían tokens).`,
      updated,
      skipped,
    });
  } catch (error: any) {
    console.error('Error migrating styles:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

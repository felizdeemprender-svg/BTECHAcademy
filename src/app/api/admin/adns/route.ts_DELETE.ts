import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(req: Request) {
  try {
    const { adnId } = await req.json();
    if (!adnId) return NextResponse.json({ success: false, error: "Falta ID del ADN" }, { status: 400 });

    const adnsDir = path.join(process.cwd(), 'public', 'adns', adnId);
    
    try {
      // Borrado recursivo de la carpeta
      await fs.rm(adnsDir, { recursive: true, force: true });
      return NextResponse.json({ success: true, message: "ADN eliminado correctamente" });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `Error al eliminar: ${e.message}` }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

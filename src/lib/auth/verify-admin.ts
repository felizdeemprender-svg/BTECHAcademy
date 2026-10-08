import { getAdminAuth } from '@/firebase/admin';

/**
 * Verifica que el request tenga un token de Firebase Admin válido con claim admin: true.
 * @param req - Request de Next.js
 * @returns El uid del admin si es válido, null si no lo es
 */
export async function verifyAdmin(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return null;
    }

    const decoded = await getAdminAuth().verifyIdToken(token);

    const SUPER_ADMIN_EMAILS = [
      'felizdeemprender@gmail.com'
    ];

    const isSuperAdmin = decoded.email && SUPER_ADMIN_EMAILS.includes(decoded.email);

    if (!decoded.admin && !isSuperAdmin && process.env.NODE_ENV !== 'development') {
      return null;
    }

    return decoded.uid;
  } catch {
    return null;
  }
}

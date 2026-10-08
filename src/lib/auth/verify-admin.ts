import { getAdminAuth } from '@/firebase/admin';

/**
 * Verifica que el request tenga un token de Firebase Admin válido con claim admin: true.
 * @param req - Request de Next.js
 * @returns El uid del admin si es válido, null si no lo es
 */
export async function verifyAdmin(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('[verifyAdmin] No Bearer token found in Authorization header');
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      console.warn('[verifyAdmin] Bearer token is empty');
      return null;
    }

    const decoded = await getAdminAuth().verifyIdToken(token);

    const SUPER_ADMIN_EMAILS = [
      'felizdeemprender@gmail.com',
      'supervisor.felizdeemprender@gmail.com'
    ];

    const isSuperAdmin = decoded.email && SUPER_ADMIN_EMAILS.includes(decoded.email);

    if (!decoded.admin && !isSuperAdmin && process.env.NODE_ENV !== 'development') {
      console.warn(`[verifyAdmin] User ${decoded.email} blocked: admin=${decoded.admin}, isSuperAdmin=${isSuperAdmin}`);
      return null;
    }

    return decoded.uid;
  } catch (err: any) {
    console.warn(`[verifyAdmin] VerifyAdmin failed: ${err.message}`);
    return null;
  }
}

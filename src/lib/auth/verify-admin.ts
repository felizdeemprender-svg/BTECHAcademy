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
      throw new Error('No Bearer token found in Authorization header');
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      throw new Error('Bearer token is empty');
    }

    const decoded = await getAdminAuth().verifyIdToken(token);

    const SUPER_ADMIN_EMAILS = [
      'felizdeemprender@gmail.com',
      'supervisor.felizdeemprender@gmail.com'
    ];

    const isSuperAdmin = decoded.email && SUPER_ADMIN_EMAILS.includes(decoded.email);

    if (!decoded.admin && !isSuperAdmin && process.env.NODE_ENV !== 'development') {
      throw new Error(`User ${decoded.email} blocked: admin=${decoded.admin}, isSuperAdmin=${isSuperAdmin}`);
    }

    return decoded.uid;
  } catch (err: any) {
    console.error('[verifyAdmin] Error:', err);
    throw new Error(`VerifyAdmin failed: ${err.message}`);
  }
}

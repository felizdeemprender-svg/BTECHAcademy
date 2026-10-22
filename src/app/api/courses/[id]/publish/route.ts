import { NextRequest } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { handlePublishCourse } from '@/lib/api/catalog-handlers';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { adminDb } from '@/firebase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}));
  const caller = await authenticateCaller(request);
  let effectiveMentorId = body.mentorId;
  let callerRole = body.callerRole;
  let companyId = body.companyId;

  if (caller) {
    effectiveMentorId = caller.uid;
    const userDoc = await adminDb.collection('users').doc(caller.uid).get();
    const userData = userDoc.data() || {};
    const roles: string[] = userData.roles || [];
    if (caller.isAdmin || roles.includes('admin')) {
      callerRole = 'admin';
    } else if (roles.includes('empresa') || userData.companyRole === 'owner') {
      callerRole = 'empresa';
      companyId = userData.companyId;
    }
  }

  return handlePublishCourse(await resolveGateway(), params.id, {
    ...body,
    mentorId: effectiveMentorId,
    callerRole,
    companyId,
  });
}

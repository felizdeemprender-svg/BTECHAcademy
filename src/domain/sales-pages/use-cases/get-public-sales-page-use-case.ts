import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';
// import { adminDb } from '@/firebase/admin';

export class GetPublicSalesPageUseCase {
  private salesPageRepo: AdminSalesPageRepository;

  constructor() {
    this.salesPageRepo = new AdminSalesPageRepository();
  }

  async execute(id: string, isPreview: boolean = false) {
    let page: any = null;
    const { adminDb } = await import('@/firebase/admin');

    if (isPreview) {
      const templateDoc = await adminDb.collection('templateCollections').doc(id).get();
      if (templateDoc.exists) {
        const raw = templateDoc.data();
        page = { 
          id: templateDoc.id, 
          ...raw,
          isActive: true, // Forzar activo
          aiContent: raw?.assets, // Mapear assets a aiContent
          price: 0, // Precio falso
          mentorId: raw?.ownerId || "W7oR0f2q39bU0Ff10w4yv9FmZ6D3", // Default a Felipe si falta
          courseId: null,
        };
      } else {
        page = await this.salesPageRepo.getById(id);
      }
    } else {
      page = await this.salesPageRepo.getById(id);
    }

    if (!page) {
      return null;
    }

    let course = null;
    let modules: any[] = [];

    // Si tiene un curso asociado, traemos la info del curso/followup y sus módulos
    if (page.courseId) {
      if (page.productType === 'followup') {
        const followupDoc = await adminDb.collection('followups').doc(page.courseId).get();
        if (followupDoc.exists) {
          course = { id: followupDoc.id, ...followupDoc.data(), productType: 'followup' };
          // Mentorías no tienen módulos por defecto de la misma forma, así que modules queda vacío
        }
      } else {
        const courseDoc = await adminDb.collection('courses').doc(page.courseId).get();
        if (courseDoc.exists) {
          course = { id: courseDoc.id, ...courseDoc.data(), productType: 'course' };
          
          const modulesSnap = await adminDb
            .collection('courses')
            .doc(page.courseId)
            .collection('modules')
            .orderBy('order', 'asc')
            .get();

          modules = modulesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        }
      }
    }

    return {
      page,
      course,
      modules
    };
  }
}

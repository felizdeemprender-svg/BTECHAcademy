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

    // SI es un pack de campaña, buscar el contenido de IA real alojado en su orquestador (colección campaigns)
    if (page.type === 'campaign_videos' || page.type === 'multimedia_pack') {
      const campSnap = await adminDb.collection('campaigns')
        .where('salesPageId', '==', page.id)
        .limit(1)
        .get();
      if (!campSnap.empty) {
        const campData = campSnap.docs[0].data();
        if (campData.aiContent?.socials) {
          page.aiContent = { ...page.aiContent, socials: campData.aiContent.socials };
        }
      }
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

    let bundleProducts: any[] = [];
    if (page.bundleItems && page.bundleItems.length > 0) {
      for (const item of page.bundleItems) {
        let p: any = { id: item.productId, productType: item.productType, salesPageId: item.salesPageId };
        
        let courseData = null;
        if (item.productType === 'followup' || item.productType === 'mentoria_individual') {
          const docRef = await adminDb.collection('followups').doc(item.productId).get();
          if (docRef.exists) courseData = docRef.data();
        } else {
          const docRef = await adminDb.collection('courses').doc(item.productId).get();
          if (docRef.exists) courseData = docRef.data();
        }
        
        // Use catalog image as priority for combo thumbnails
        if (courseData) {
          p.imageUrl = courseData.thumbnail || courseData.coverUrl || courseData.imageUrl || null;
          if (!p.title) p.title = courseData.title || courseData.goal;
          if (!p.description) p.description = courseData.description;
        }

        // Priorizar datos de la Landing (salesPageId) si existe y si faltaba la imagen o texto
        if (item.salesPageId) {
          const spSnap = await adminDb.collection('salesPages').doc(item.salesPageId).get();
          if (spSnap.exists) {
            const spData = spSnap.data();
            const heroSection = spData?.content?.sections?.find((s: any) => s.id.startsWith('heroVideo'));
            if (!p.title) p.title = heroSection?.title || spData?.title;
            if (!p.description) p.description = heroSection?.subtitle || spData?.description;
            if (!p.imageUrl) p.imageUrl = heroSection?.imageUrl || spData?.imageUrl;
          }
        }
        
        // Priorizar customTitle y customDescription si están definidos en el combo
        if (item.customTitle) p.title = item.customTitle;
        if (item.customDescription) p.description = item.customDescription;
        
        bundleProducts.push(p);
      }
    }

    return {
      page,
      course,
      modules,
      bundleProducts
    };
  }
}

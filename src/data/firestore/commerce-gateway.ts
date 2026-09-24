import type { CommerceGateway, SalesPageInfo, StudentInfo, ProductInfo, MentorInfo } from '@/domain/commerce/use-cases/process-enrollment';
import type { FirestoreGateway } from '@/data/firestore/gateway';

export class FirestoreCommerceGateway implements CommerceGateway {
  constructor(private readonly gateway: FirestoreGateway) {}

  async getSalesPage(pageId: string): Promise<SalesPageInfo | null> {
    const doc = await this.gateway.getDoc('salesPages', pageId);
    if (!doc) return null;
    const data = doc.data() || {};
    return {
      id: doc.id,
      productId: data.productId as string | undefined,
      courseId: data.courseId as string | undefined,
      productType: data.productType as string | undefined
    };
  }
  
  async checkEnrollmentExists(enrollmentId: string): Promise<boolean> {
    const doc = await this.gateway.getDoc('enrollments', enrollmentId);
    return !!doc;
  }

  async findOrCreateStudent(email: string, fallbackName: string): Promise<StudentInfo> {
    const snap = await this.gateway.queryByField('users', 'email', email, 1);
    if (snap.docs.length > 0) {
      const doc = snap.docs[0];
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: (data.displayName as string) || fallbackName
      };
    }
    const tempId = email.replace(/[^a-zA-Z0-9]/g, '_');
    await this.gateway.createDoc('users', tempId, {
      email,
      displayName: fallbackName,
      roles: ['alumno'],
      isActive: true,
      createdAt: this.gateway.serverTimestamp(),
      createdVia: 'auto_enrollment'
    });
    return { id: tempId, name: fallbackName };
  }

  async createEnrollment(data: Record<string, unknown>): Promise<void> {
    if (!data.id) throw new Error('Missing enrollment id');
    
    const finalData = {
      ...data,
      enrolledAt: this.gateway.serverTimestamp()
    };
    
    // Si mergeDoc existe lo usamos por seguridad para mantener el comportamiento idempotente en firestore
    if (this.gateway.mergeDoc) {
      await this.gateway.mergeDoc('enrollments', data.id as string, finalData);
    } else {
      await this.gateway.createDoc('enrollments', data.id as string, finalData);
    }
  }

  async getProductInfo(productId: string, productType: string): Promise<ProductInfo | null> {
    if (productType === 'followup') {
      const snap = await this.gateway.getDoc('followups', productId);
      if (snap) {
        const data = snap.data() || {};
        return {
          title: (data.title as string) || 'tu mentoría',
          price: (data.price as number) || 0
        };
      }
    } else {
      const snap = await this.gateway.getDoc('courses', productId);
      if (snap) {
        const data = snap.data() || {};
        return {
          title: (data.title as string) || 'tu curso',
          price: (data.price as number) || 0
        };
      }
    }
    return null;
  }

  async getMentorInfo(mentorId: string): Promise<MentorInfo | null> {
    const snap = await this.gateway.getDoc('users', mentorId);
    if (snap) {
      const data = snap.data() || {};
      return {
        name: data.displayName as string | undefined,
        email: data.email as string | undefined
      };
    }
    return null;
  }

  async incrementMentorSales(mentorId: string, amount: number): Promise<void> {
    if (this.gateway.updateDoc && this.gateway.increment) {
       await this.gateway.updateDoc('users', mentorId, {
         'billingCycle.monthlySalesAmount': this.gateway.increment(amount)
       });
    }
  }

  async incrementPageConversions(pageId: string): Promise<void> {
    if (this.gateway.updateDoc && this.gateway.increment && this.gateway.serverTimestamp) {
      await this.gateway.updateDoc('salesPages', pageId, {
        'stats.conversions': this.gateway.increment(1),
        'stats.lastSaleAt': this.gateway.serverTimestamp()
      });
    }
  }

  async convertLead(email: string, productId: string, paymentId: string): Promise<void> {
    if (!this.gateway.queryByTwoFields) return;

    const snap = await this.gateway.queryByTwoFields(
      'leads',
      'studentEmail', email,
      'courseId', productId,
      1
    );

    if (snap.docs.length > 0) {
      const doc = snap.docs[0];
      if (this.gateway.updateDoc && this.gateway.serverTimestamp) {
         await this.gateway.updateDoc('leads', doc.id, {
           status: 'converted',
           paymentId: paymentId,
           updatedAt: this.gateway.serverTimestamp()
         });
      }
    }
  }
}

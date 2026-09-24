import { SalesPageSchema, parseSalesPage } from '../sales-page';

describe('SalesPageSchema', () => {
  it('should accept valid basic payload', () => {
    const payload = {
      id: 'page1',
      mentorId: 'mentor1',
      title: 'Mi Landing'
    };
    const result = parseSalesPage(payload);
    expect(result.id).toBe('page1');
    expect(result.type).toBe('campaign_pack');
    expect(result.aiContent).toBeDefined();
  });

  it('should accept null values for optional fields and convert them to nullish/undefined safely', () => {
    const payloadWithNulls = {
      id: 'page2',
      mentorId: 'mentor2',
      title: 'Landing con Nulls',
      templateCollectionId: null,
      courseId: null,
      productId: null,
      productType: null,
      targetAudience: null,
      referidoId: null
    };

    // Esto arrojaba error "Expected string, received null" antes del arreglo (.nullish())
    expect(() => parseSalesPage(payloadWithNulls)).not.toThrow();

    const result = parseSalesPage(payloadWithNulls);
    expect(result.templateCollectionId).toBeNull();
    expect(result.courseId).toBeNull();
    expect(result.referidoId).toBeNull();
  });
});

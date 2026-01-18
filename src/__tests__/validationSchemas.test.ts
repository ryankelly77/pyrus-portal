import { clientCreateSchema, clientUpdateSchema, productCreateSchema, subscriptionCreateSchema } from '../lib/validation/schemas';

describe('Validation Schemas', () => {
  describe('clientCreateSchema', () => {
    it('should validate a valid client creation payload', () => {
      const validPayload = {
        name: 'Test Client',
        contactName: 'John Doe',
        contactEmail: 'john.doe@example.com',
        growthStage: 'seedling',
        status: 'active',
        notes: 'Test notes',
        basecampProjectId: '12345',
        dashboardToken: 'token123',
        stripeCustomerId: 'cus_12345',
      };

      const result = clientCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should fail validation for an invalid email', () => {
      const invalidPayload = {
        name: 'Test Client',
        contactEmail: 'invalid-email',
      };

      const result = clientCreateSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Invalid email address');
    });
  });

  describe('clientUpdateSchema', () => {
    it('should validate a partial client update payload', () => {
      const validPayload = {
        contactName: 'Jane Doe',
        status: 'paused',
      };

      const result = clientUpdateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should fail validation for an invalid status', () => {
      const invalidPayload = {
        status: 'unknown-status',
      };

      const result = clientUpdateSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('productCreateSchema', () => {
    it('should validate a valid product creation payload', () => {
      const validPayload = {
        name: 'Test Product',
        category: 'Software',
        monthlyPrice: 10,
        onetimePrice: 50,
      };

      const result = productCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should fail validation for missing required fields', () => {
      const invalidPayload = {
        shortDesc: 'Short description',
      };

      const result = productCreateSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('subscriptionCreateSchema', () => {
    it('should validate a valid subscription creation payload', () => {
      const validPayload = {
        clientId: 'client_123',
        items: [
          {
            id: 'item_1',
            name: 'Subscription Item',
            quantity: 1,
            monthlyPrice: 20,
            onetimePrice: 100,
          },
        ],
        tier: 'premium',
      };

      const result = subscriptionCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should fail validation for missing required fields', () => {
      const invalidPayload = {
        items: [],
      };

      const result = subscriptionCreateSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
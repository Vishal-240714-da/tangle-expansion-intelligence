import { QlooService, QlooEntity } from '../../services/qloo/qlooService';

describe('QlooService', () => {
  let qlooService: QlooService;

  beforeEach(() => {
    qlooService = new QlooService();
  });

  it('reads Qloo credentials when availability is checked, not when the service is constructed', () => {
    const originalApiKey = process.env.QLOO_API_KEY;
    const service = new QlooService();
    try {
      process.env.QLOO_API_KEY = 'test-only-key';
      expect(service.isAvailable()).toBe(true);
    } finally {
      if (originalApiKey === undefined) delete process.env.QLOO_API_KEY;
      else process.env.QLOO_API_KEY = originalApiKey;
    }
  });

  describe('validateGeographicMatch', () => {
    it('should return verified-city for exact city match', () => {
      const entityMetadata = {
        city: 'Coimbatore',
        country: 'India',
        countryCode: 'IN',
      };

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);

      expect(result).toBe('verified-city');
    });

    it('should return verified-city for case-insensitive match', () => {
      const entityMetadata = {
        city: 'coimbatore',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('COIMBATORE', entityMetadata);

      expect(result).toBe('verified-city');
    });

    it('should return verified-city for match with whitespace', () => {
      const entityMetadata = {
        city: 'Coimbatore',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('  Coimbatore  ', entityMetadata);

      expect(result).toBe('verified-city');
    });

    it('should return verified-city when locality includes city name', () => {
      const entityMetadata = {
        locality: 'Singanallur, Coimbatore',
        city: 'Coimbatore',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);

      // When locality includes the city name and city matches, it's verified
      expect(result).toBe('verified-city');
    });

    it('should return verified-city when city matches regardless of locality', () => {
      const entityMetadata = {
        locality: 'Singanallur',  // Nearby locality without city name
        city: 'Coimbatore',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);

      // City match takes priority - this is correct behavior
      expect(result).toBe('verified-city');
    });

    it('should return partial-match for metro area match', () => {
      const entityMetadata = {
        metro: 'Coimbatore Metro',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);

      expect(result).toBe('partial-match');
    });

    it('does not verify exact city from a locality mention alone', () => {
      const result = qlooService.validateGeographicMatch('Coimbatore', {
        locality: 'Coimbatore',
        district: 'Coimbatore District',
        country: 'India',
      });
      expect(result).toBe('partial-match');
    });

    it('should return no-match for different city', () => {
      const entityMetadata = {
        city: 'Chennai',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);

      expect(result).toBe('no-match');
    });

    it('should return no-match for different country city', () => {
      const entityMetadata = {
        city: 'Dubai',
        country: 'United Arab Emirates',
        countryCode: 'AE',
      };

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);

      expect(result).toBe('no-match');
    });

    it('should return unknown-geography when no geographic metadata provided', () => {
      const result = qlooService.validateGeographicMatch('Coimbatore', undefined);

      expect(result).toBe('unknown-geography');
    });

    it('should return global when only country information', () => {
      const entityMetadata = {
        country: 'India',
        countryCode: 'IN',
      };

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);

      expect(result).toBe('global');
    });

    it('should return unknown-geography for empty metadata', () => {
      const entityMetadata = {};

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);

      expect(result).toBe('unknown-geography');
    });

    it('should treat locality within requested city as verified-city', () => {
      const entityMetadata = {
        locality: 'Irugur',  // Locality within Coimbatore
        city: 'Coimbatore',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);

      // If the city matches exactly, locality within the city is still verified
      expect(result).toBe('verified-city');
    });

    it('should return partial-match for suburb in requested metro area (e.g., Egattur in Chennai metro)', () => {
      const entityMetadata = {
        city: 'Egattur',
        metro: 'Chennai Metropolitan Region',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Chennai', entityMetadata);
      expect(result).toBe('partial-match');
    });

    it('should never treat district match alone as proof of an exact city match', () => {
      const entityMetadata = {
        city: 'Tiruppur',
        district: 'Coimbatore District',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Coimbatore', entityMetadata);
      // District alone must NOT produce verified-city
      expect(result).not.toBe('verified-city');
      expect(result).toBe('no-match');
    });

    it('should not mark an entity as verified-city merely because its name contains the city', () => {
      // Like THE MARINA MALL CHENNAI, located in Egattur without matching city/metro
      const entityMetadata = {
        city: 'Egattur',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Chennai', entityMetadata);
      expect(result).toBe('no-match');
    });

    it('should verify Edward Elliots Beach when city matches Chennai', () => {
      const entityMetadata = {
        city: 'Chennai',
        locality: 'Besant Nagar',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Chennai', entityMetadata);
      expect(result).toBe('verified-city');
    });

    it('should classify Mayajaal as no-match when city is Kanathur outside Chennai metro', () => {
      const entityMetadata = {
        city: 'Kanathur',
        district: 'Chengalpattu',
        country: 'India',
      };

      const result = qlooService.validateGeographicMatch('Chennai', entityMetadata);
      expect(result).toBe('no-match');
    });
  });

  describe('toEvidence (v2 API structure)', () => {
    it('should create evidence with correct provenance from v2 structure', () => {
      const qlooEntity: QlooEntity = {
        entity_id: 'entity-123',
        name: 'Coffee Culture',
        type: 'urn:entity',
        subtype: 'urn:entity:place',
        properties: {
          geocode: {
            city: 'Coimbatore',
            name: 'Ward 25',
            country: 'India',
            country_code: 'IN',
            admin1_region: 'Tamil Nadu',
          },
          primary_genre: {
            id: 'urn:tag:genre:place:cafe',
            name: 'Cafe',
          },
        },
        tags: [
          { id: 'urn:tag:ambience:qloo:casual', name: 'Casual', type: 'urn:tag:ambience:qloo' },
        ],
        popularity: 0.85,
      };

      const evidence = qlooService.toEvidence(qlooEntity, 'Coimbatore', false);

      expect(evidence.entityName).toBe('Coffee Culture');
      expect(evidence.entityCategory).toBe('Cafe');
      expect(evidence.source).toBe('live-qloo');
      expect(evidence.geographicMatchStatus).toBe('verified-city');
      expect(evidence.cacheStatus).toBe('miss');
      expect(evidence.geographicMetadata?.city).toBe('Coimbatore');
      expect(evidence.geographicMetadata?.region).toBe('Tamil Nadu');
      expect(evidence.explainabilityData?.entity_id).toBe('entity-123');
      expect(evidence.explainabilityData?.popularity).toBe(0.85);
      expect(evidence.popularityScore).toBe(0.85);
      expect(evidence.affinityScore).toBeUndefined();
      expect(evidence.explainabilityData?.tags).toEqual(['Casual']);
      expect(evidence.limitations).toContain('City-level verification achieved; neighborhood-level data not available');
    });

    it('should mark cached evidence correctly', () => {
      const qlooEntity: QlooEntity = {
        entity_id: 'entity-123',
        name: 'Coffee Culture',
        type: 'urn:entity',
        popularity: 0.85,
      };

      const evidence = qlooService.toEvidence(qlooEntity, 'Coimbatore', true);

      expect(evidence.source).toBe('cached-qloo');
      expect(evidence.cacheStatus).toBe('hit');
    });

    it('should add limitations for non-matching geography', () => {
      const qlooEntity: QlooEntity = {
        entity_id: 'entity-123',
        name: 'Coffee Culture',
        type: 'urn:entity',
        properties: {
          geocode: {
            city: 'Dubai',
            country: 'United Arab Emirates',
            country_code: 'AE',
          },
        },
        popularity: 0.85,
      };

      const evidence = qlooService.toEvidence(qlooEntity, 'Coimbatore', false);

      expect(evidence.geographicMatchStatus).toBe('no-match');
      expect(evidence.limitations).toContain('Geographic location does not match requested city');
      expect(evidence.limitations).toContain('Actual location: Dubai');
      expect(evidence.scope).toBe('non-local');
    });

    it('should add limitations for global-only evidence', () => {
      const qlooEntity: QlooEntity = {
        entity_id: 'entity-123',
        name: 'Coffee Culture',
        type: 'urn:entity',
        properties: {
          geocode: {
            country: 'India',
          },
        },
        popularity: 0.85,
      };

      const evidence = qlooService.toEvidence(qlooEntity, 'Coimbatore', false);

      expect(evidence.geographicMatchStatus).toBe('global');
      expect(evidence.limitations).toContain('No geographic metadata available; results represent global patterns, not local evidence');
    });

    it('should add affinity limitation when affinity score is available', () => {
      const qlooEntity: QlooEntity = {
        entity_id: 'entity-123',
        name: 'Coffee Culture',
        type: 'urn:entity',
        properties: {
          geocode: {
            city: 'Coimbatore',
            country: 'India',
          },
        },
        affinity_score: 0.85,
        popularity: 0.85,
      };

      const evidence = qlooService.toEvidence(qlooEntity, 'Coimbatore', false);

      expect(evidence.affinityScore).toBe(0.85);
      expect(evidence.limitations).toContain('Affinity scores indicate relative association, not demand or commercial success probability');
    });

    it('should add popularity limitation when affinity score is not available', () => {
      const qlooEntity: QlooEntity = {
        entity_id: 'entity-123',
        name: 'Coffee Culture',
        type: 'urn:entity',
        properties: {
          geocode: {
            city: 'Coimbatore',
            country: 'India',
          },
        },
        popularity: 0.85,
      };

      const evidence = qlooService.toEvidence(qlooEntity, 'Coimbatore', false);

      expect(evidence.affinityScore).toBeUndefined();
      expect(evidence.limitations).toContain('Affinity scores not available for this query type; popularity indicates general relevance but not target audience affinity');
    });

    it('should extract category from subtype when primary_genre not available', () => {
      const qlooEntity: QlooEntity = {
        entity_id: 'entity-123',
        name: 'Coffee Culture',
        type: 'urn:entity',
        subtype: 'urn:entity:place',
        popularity: 0.85,
      };

      const evidence = qlooService.toEvidence(qlooEntity, 'Coimbatore', false);

      expect(evidence.entityCategory).toBe('urn:entity:place');
    });

    it('should extract tags array into explainabilityData', () => {
      const qlooEntity: QlooEntity = {
        entity_id: 'entity-123',
        name: 'Coffee Culture',
        type: 'urn:entity',
        tags: [
          { id: 'tag1', name: 'Casual', type: 'type1' },
          { id: 'tag2', name: 'Modern', type: 'type2' },
          { id: 'tag3', name: 'Wifi', type: 'type3' },
        ],
        popularity: 0.85,
      };

      const evidence = qlooService.toEvidence(qlooEntity, 'Coimbatore', false);

      expect(evidence.explainabilityData?.tags).toEqual(['Casual', 'Modern', 'Wifi']);
    });
  });

  describe('isAvailable', () => {
    it('should return false when API key is not configured', () => {
      // Clear the environment variable
      const originalKey = process.env.QLOO_API_KEY;
      process.env.QLOO_API_KEY = '';

      const service = new QlooService();
      expect(service.isAvailable()).toBe(false);

      // Restore
      process.env.QLOO_API_KEY = originalKey;
    });

    it('should return true when API key is configured', () => {
      const originalKey = process.env.QLOO_API_KEY;
      process.env.QLOO_API_KEY = 'test-key';

      const service = new QlooService();
      expect(service.isAvailable()).toBe(true);

      // Restore
      process.env.QLOO_API_KEY = originalKey;
    });
  });
});

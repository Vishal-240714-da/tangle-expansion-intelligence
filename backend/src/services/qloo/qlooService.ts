import axios from 'axios';
import NodeCache from 'node-cache';
import { GeographicMetadata, GeographicMatchStatus, Evidence } from '../../types';


const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '3600');

const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 120 });

/**
 * Qloo v2 API Entity structure
 * Based on actual /v2/insights response
 */
export interface QlooEntity {
  entity_id: string;  // Note: v2 uses entity_id, not id
  name: string;
  type: string;
  subtype?: string;
  properties?: {
    geocode?: {
      city?: string;
      name?: string;  // Often contains neighborhood/ward info
      metro?: string;
      country?: string;
      country_code?: string;
      admin1_region?: string;  // State/region
      admin2_region?: string;  // District/county
    };
    primary_genre?: {
      id: string;
      name: string;
    };
    business_rating?: number;
  };
  tags?: Array<{
    id: string;
    name: string;
    type: string;
    weight?: number | null;
  }>;
  popularity?: number;  // v2 provides popularity, not affinity for location-only queries
  location?: {
    lat: number;
    lon: number;
    geohash: string;
  };
  // Optional: affinity_score only returned with signal-based queries
  affinity_score?: number;
}

export interface QlooV2Response {
  success: boolean;
  results?: {
    entities?: QlooEntity[];
  };
  query?: {
    localities?: Array<{
      entity_id: string;
      name: string;
      popularity: number;
    }>;
  };
  error?: string;
}

interface QlooTag {
  id?: string;
  tag_id?: string;
  name?: string;
}

interface QlooTagsResponse {
  success?: boolean;
  results?: { tags?: QlooTag[] };
}

export class QlooService {
  private get apiKey(): string {
    return process.env.QLOO_API_KEY || '';
  }

  private get baseUrl(): string {
    return process.env.QLOO_BASE_URL || 'https://api.qloo.com';
  }

  private isConfigured(): boolean {
    return Boolean(this.apiKey.trim());
  }

  /**
   * Resolve an entity by name to get its canonical ID and metadata
   * NOTE: v2 API does not have a separate resolve endpoint.
   * This method now uses v2 insights with location filter to find entities.
   */
  async resolveEntity(entityName: string): Promise<QlooEntity | null> {
    if (!this.isConfigured()) {
      throw new Error('Qloo API is not configured. Please set QLOO_API_KEY environment variable.');
    }

    const cacheKey = `resolve:${entityName}`;
    const cached = cache.get<QlooEntity>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Use v2 insights to search for the entity by name
      const response = await axios.get<QlooV2Response>(
        `${this.baseUrl}/v2/insights`,
        {
          params: {
            'filter.type': 'urn:entity:place',
            'filter.location.query': entityName,
            'take': '1',
          },
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data.success && response.data.results?.entities && response.data.results.entities.length > 0) {
        const entity = response.data.results.entities[0];
        cache.set(cacheKey, entity);
        return entity;
      }

      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Qloo resolve error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
          throw new Error('Invalid Qloo API credentials');
        }
        if (error.response?.status === 429) {
          throw new Error('Qloo API rate limit exceeded');
        }
      }
      throw error;
    }
  }

  /**
   * Retrieve insights for a location using v2 API
   * NOTE: v2 insights uses location-based filtering, not entity-based
   * Returns place entities for the specified location
   */
  async getInsights(
    location: string,
    take: number = 15,
    bypassCache: boolean = false,
    businessCategory?: string
  ): Promise<{ entities: QlooEntity[]; fromCache: boolean; dataTimestamp: string; categoryTagIds: string[] }> {
    if (!this.isConfigured()) {
      throw new Error('Qloo API is not configured. Please set QLOO_API_KEY environment variable.');
    }

    const categoryTagIds = await this.resolveCategoryTagIds(businessCategory);
    const cacheKey = this.getInsightsCacheKey(location, take, categoryTagIds);

    if (!bypassCache) {
      const cached = cache.get<{ entities: QlooEntity[]; timestamp: number }>(cacheKey);
      if (cached && cached.entities && cached.entities.length > 0) {
        return { entities: cached.entities, fromCache: true, dataTimestamp: new Date(cached.timestamp).toISOString(), categoryTagIds };
      }
    }

    try {
      const response = await axios.get<QlooV2Response>(
        `${this.baseUrl}/v2/insights`,
        {
          params: {
            'filter.type': 'urn:entity:place',
            'filter.location.query': location,
            'take': take.toString(),
            ...(categoryTagIds.length > 0 ? { 'filter.tags': categoryTagIds.join(',') } : {}),
          },
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (!response.data.success || !response.data.results?.entities?.length) {
        throw new Error(
          `Qloo returned no usable entities for location: ${location}`
        );
      }

      const entities = response.data.results.entities;

      cache.set(cacheKey, { entities, timestamp: Date.now() });

      return { entities, fromCache: false, dataTimestamp: new Date().toISOString(), categoryTagIds };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Qloo insights error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
          throw new Error('Invalid Qloo API credentials');
        }
        if (error.response?.status === 429) {
          throw new Error('Qloo API rate limit exceeded');
        }
      }
      throw error;
    }
  }

  /**
   * Invalidate cached insights for a specific location
   */
  clearLocationCache(location: string, take: number = 15): boolean {
    const prefix = `insights:${location.toLowerCase().trim()}:${take}:`;
    const keys = cache.keys().filter(key => key.startsWith(prefix));
    return cache.del(keys) > 0;
  }

  private getInsightsCacheKey(location: string, take: number, tagIds: string[]): string {
    const tags = [...tagIds].sort().join(',') || 'unfiltered';
    return `insights:${location.toLowerCase().trim()}:${take}:tags:${tags}`;
  }

  private async resolveCategoryTagIds(category?: string): Promise<string[]> {
    if (!category?.trim() || !this.isConfigured()) return [];
    const ignored = new Set(['specialty', 'artisan', 'hybrid', 'conscious', 'all', 'day', 'cafe', 'café', 'bar', 'lounge']);
    const terms = [...new Set(category.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/)
      .filter(term => term.length > 2 && !ignored.has(term)))];
    const ids: string[] = [];

    for (const term of terms) {
      const cacheKey = `tags:exact:${term}`;
      let match = cache.get<string>(cacheKey);
      if (match === undefined) {
        try {
          const response = await axios.get<QlooTagsResponse>(`${this.baseUrl}/v2/tags`, {
            params: { 'filter.query': term, take: '20' },
            headers: { 'X-Api-Key': this.apiKey, 'Content-Type': 'application/json' },
            timeout: 10000,
          });
          const exact = response.data.results?.tags?.find(tag => {
            const normalizedName = tag.name?.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            return normalizedName === term;
          });
          const id = exact?.id || exact?.tag_id;
          match = id?.startsWith('urn:tag:') ? id : undefined;
          cache.set(cacheKey, match || '');
        } catch {
          // Tag lookup is optional. Keep the location request unfiltered and report that fact.
          cache.set(cacheKey, '');
          match = '';
        }
      }
      if (match) ids.push(match);
    }

    return [...new Set(ids)].sort();
  }

  /**
   * Flush all cached Qloo entries (test / administrative use only)
   */
  clearAllCache(): void {
    cache.flushAll();
  }

  /**
   * Validate geographic match between requested location and returned entity
   * Conservative rules:
   * 1. Exact city name match -> verified-city
   * 2. Locality or Metro containing requested city -> partial-match (not verified)
   * 3. Suburb/satellite town within requested metro -> partial-match
   * 4. State/district match alone does NOT verify a city
   * 5. City mismatch outside metro -> no-match
   * 6. No local fields, country only -> global
   * 7. Empty metadata -> unknown-geography
   */
  validateGeographicMatch(
    requestedCity: string,
    entityMetadata?: GeographicMetadata
  ): GeographicMatchStatus {
    if (!entityMetadata || Object.keys(entityMetadata).length === 0) {
      return 'unknown-geography';
    }

    const normalizedRequested = requestedCity.toLowerCase().trim();
    const entityCity = entityMetadata.city?.toLowerCase().trim();
    const entityLocality = entityMetadata.locality?.toLowerCase().trim();
    const entityMetro = entityMetadata.metro?.toLowerCase().trim();

    // 1. Exact city match - highest priority
    if (entityCity && entityCity === normalizedRequested) {
      return 'verified-city';
    }

    // A metro/locality mention is useful context, but never proves an exact city match.
    if (entityMetro && entityMetro.includes(normalizedRequested)) {
      return 'partial-match';
    }

    // 3. If no city field but locality mentions the city name, treat as partial
    if (!entityCity && entityLocality && entityLocality.includes(normalizedRequested)) {
      return 'partial-match';
    }

    // 4. Entity has an explicit city that does not match and is not in the metro
    if (entityCity) {
      return 'no-match';
    }

    // 5. Global/country level info only (no local city or metro)
    if (entityMetadata.country || entityMetadata.countryCode || entityMetadata.region) {
      return 'global';
    }

    return 'unknown-geography';
  }

  /**
   * Convert Qloo v2 entity to internal Evidence format with full provenance
   * Extracts data from correct v2 response structure
   */
  toEvidence(
    entity: QlooEntity,
    requestedCity: string,
    fromCache: boolean,
    dataTimestamp?: string
  ): Evidence {
    // Extract geographic metadata from properties.geocode
    const geographicMetadata: GeographicMetadata | undefined = entity.properties?.geocode
      ? {
          city: entity.properties.geocode.city,
          locality: entity.properties.geocode.name,
          metro: entity.properties.geocode.metro,
          region: entity.properties.geocode.admin1_region,
          district: entity.properties.geocode.admin2_region,
          country: entity.properties.geocode.country,
          countryCode: entity.properties.geocode.country_code,
        }
      : undefined;

    const geographicMatchStatus = this.validateGeographicMatch(requestedCity, geographicMetadata);

    // Extract category from primary_genre or type
    const entityCategory = entity.properties?.primary_genre?.name
      || entity.subtype
      || entity.type;

    // Extract tags for explainability
    const tagNames = entity.tags?.map(tag => tag.name) || [];

    const evidence: Evidence = {
      id: `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityName: entity.name,
      entityCategory,
      source: fromCache ? 'cached-qloo' : 'live-qloo',
      retrievalTimestamp: dataTimestamp || new Date().toISOString(),
      cacheStatus: fromCache ? 'hit' : 'miss',
      ...(fromCache && dataTimestamp ? { cacheAge: Math.max(0, Date.now() - Date.parse(dataTimestamp)) } : {}),
      // Note: affinity_score is only returned with signal-based queries
      // For location-only queries, we use popularity as a relevance indicator
      affinityScore: entity.affinity_score,
      geographicMetadata,
      geographicMatchStatus,
      scope: this.getScope(geographicMatchStatus),
      popularityScore: entity.popularity,
      limitations: this.generateLimitations(geographicMatchStatus, geographicMetadata, entity.affinity_score !== undefined),
      explainabilityData: {
        entity_id: entity.entity_id,
        popularity: entity.popularity,
        tags: tagNames,
        business_rating: entity.properties?.business_rating,
      },
    };

    return evidence;
  }

  private getScope(status: GeographicMatchStatus): Evidence['scope'] {
    switch (status) {
      case 'verified-city': return 'city-level';
      case 'partial-match': return 'partial';
      case 'no-match': return 'non-local';
      case 'global': return 'global';
      case 'unknown-geography': return 'unknown';
    }
  }

  /**
   * Generate appropriate limitations based on geographic match status and data availability
   */
  private generateLimitations(
    matchStatus: GeographicMatchStatus,
    metadata?: GeographicMetadata,
    hasAffinityScore?: boolean
  ): string[] {
    const limitations: string[] = [];

    switch (matchStatus) {
      case 'verified-city':
        limitations.push('City-level verification achieved; neighborhood-level data not available');
        break;
      case 'partial-match':
        limitations.push('Geographic match is partial; location may be nearby but not within city proper');
        if (metadata?.locality) {
          limitations.push(`Specific locality: ${metadata.locality}`);
        }
        break;
      case 'no-match':
        limitations.push('Geographic location does not match requested city');
        if (metadata?.city) {
          limitations.push(`Actual location: ${metadata.city}`);
        }
        break;
      case 'global':
        limitations.push('No geographic metadata available; results represent global patterns, not local evidence');
        break;
      case 'unknown-geography':
        limitations.push('Geographic metadata unavailable; cannot verify local relevance');
        break;
    }

    // Add affinity limitation if not available
    if (!hasAffinityScore) {
      limitations.push('Affinity scores not available for this query type; popularity indicates general relevance but not target audience affinity');
    } else {
      limitations.push('Affinity scores indicate relative association, not demand or commercial success probability');
    }

    return limitations;
  }

  /**
   * Check if service is available for live requests
   */
  isAvailable(): boolean {
    return this.isConfigured();
  }
}

export const qlooService = new QlooService();

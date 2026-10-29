import { Evidence, Risk, RiskSeverity, RiskStatus, BusinessInput } from '../types';

/**
 * Risk Service assesses expansion risks based on evidence gaps and missing information
 */
export class RiskService {
  /**
   * Generate risk assessment based on evidence and business inputs
   */
  assessRisks(
    evidence: Evidence[],
    businessInput: BusinessInput
  ): Risk[] {
    const risks: Risk[] = [];

    // Assess demand validation risk
    risks.push(this.assessDemandValidationRisk(evidence, businessInput));

    // Assess geographic evidence coverage risk
    risks.push(this.assessGeographicCoverageRisk(evidence, businessInput));

    // Assess competitive context risk
    risks.push(this.assessCompetitiveContextRisk(evidence, businessInput));

    // Assess operating economics risk
    risks.push(this.assessOperatingEconomicsRisk(businessInput));

    // Assess menu fit risk
    risks.push(this.assessMenuFitRisk(evidence, businessInput));

    // Assess customer acquisition risk
    risks.push(this.assessCustomerAcquisitionRisk(evidence, businessInput));

    // Assess operational feasibility risk
    risks.push(this.assessOperationalFeasibilityRisk(businessInput));

    // Assess data quality risk
    risks.push(this.assessDataQualityRisk(evidence, businessInput));

    return risks.filter(r => r !== null) as Risk[];
  }

  private assessDemandValidationRisk(evidence: Evidence[], input: BusinessInput): Risk {
    const verifiedLocalRelevant = evidence.filter(e => e.geographicMatchStatus === 'verified-city' &&
      (e.categoryRelevance?.status === 'direct' || e.categoryRelevance?.status === 'related')).length;
    const total = evidence.length;

    let severity: RiskSeverity = 'high';
    let status: RiskStatus = 'requires-validation';
    let missingInfo: string[] = [];

    if (total === 0) {
      severity = 'critical';
      status = 'unknown';
      missingInfo = ['Any local market evidence', 'Customer demand indicators', 'Cultural preference data'];
    } else if (verifiedLocalRelevant === 0) {
      severity = 'high';
      status = 'known';
      missingInfo = [`Exact-city evidence relevant to ${input.businessCategory || 'the requested business category'}`, 'Observed customer demand and price acceptance'];
    } else {
      severity = 'medium';
      status = 'requires-validation';
      missingInfo = ['Observed customer demand and price acceptance; Qloo place records do not establish either'];
    }

    return {
      id: 'risk-demand-validation',
      title: 'Demand Validation',
      category: 'Demand Validation',
      severity,
      status,
      whyItMatters: 'Without validated demand evidence, expansion assumes customer interest without proof',
      supportingEvidence: [],
      missingInformation: missingInfo,
      recommendedAction: `In ${input.targetCity}, present the ${input.businessCategory || 'proposed business'} concept to prospective customers and record choices, objections, and acceptable prices; do not infer demand from place popularity.`,
    };
  }

  private assessGeographicCoverageRisk(evidence: Evidence[], input: BusinessInput): Risk {
    const verifiedLocal = evidence.filter(e => e.geographicMatchStatus === 'verified-city').length;
    const partialMatch = evidence.filter(e => e.geographicMatchStatus === 'partial-match').length;
    const globalOnly = evidence.filter(e => e.geographicMatchStatus === 'global').length;
    const noMatch = evidence.filter(e => e.geographicMatchStatus === 'no-match').length;

    let severity: RiskSeverity = 'medium';
    let status: RiskStatus = 'known';
    let missingInfo: string[] = [];

    if (evidence.length > 0 && noMatch / evidence.length >= 0.5) {
      severity = 'high';
      status = 'requires-validation';
      missingInfo = [`Most returned records do not verify to ${input.targetCity}; exclude mismatches from local-fit reasoning`];
    } else if (noMatch > 0) {
      severity = 'medium';
      status = 'requires-validation';
      missingInfo = [`${noMatch} explicit geographic mismatch(es); retain only exact-city rows for local-fit reasoning`];
    } else if (globalOnly === evidence.length && evidence.length > 0) {
      severity = 'high';
      status = 'known';
      missingInfo = ['City-specific evidence', 'Local cultural signals', 'Neighborhood-level data'];
    } else if (verifiedLocal === 0) {
      severity = 'high';
      status = 'requires-validation';
      missingInfo = ['Verified city-level evidence', 'Local geographic validation'];
    } else if (partialMatch > verifiedLocal) {
      severity = 'medium';
      status = 'requires-validation';
      missingInfo = ['Precise city-level verification', 'Neighborhood-specific data'];
    } else {
      severity = 'low';
      status = 'known';
      missingInfo = ['Neighborhood-level granularity if targeting specific areas'];
    }

    return {
      id: 'risk-geographic-coverage',
      title: 'Geographic Evidence Coverage',
      category: 'Geographic Evidence Coverage',
      severity,
      status,
      whyItMatters: 'Global or non-local evidence may not reflect actual local market conditions',
      supportingEvidence: [],
      missingInformation: missingInfo,
      recommendedAction: 'Verify geographic relevance of all evidence and conduct local market research',
    };
  }

  private assessCompetitiveContextRisk(evidence: Evidence[], input: BusinessInput): Risk {
    const competitorEvidence = evidence.filter(e => e.source !== 'demo-fixture' && e.geographicMatchStatus === 'verified-city' &&
      (e.categoryRelevance?.status === 'direct' || e.categoryRelevance?.status === 'related') &&
      /cafe|café|coffee|tea|bakery|restaurant|food|dessert/i.test(`${e.entityName} ${e.entityCategory}`));
    const hasCompetitorData = competitorEvidence.length > 0;

    let severity: RiskSeverity = 'high';
    const status: RiskStatus = 'requires-validation';
    let missingInfo: string[] = [];

    if (!hasCompetitorData) {
      missingInfo = [
        'Existing café density in target area',
        'Competitor pricing and offerings',
        'Market saturation analysis',
        'Competitive differentiation opportunities',
      ];
    } else {
      severity = 'medium';
      missingInfo = [
        'Detailed competitor analysis',
        'Competitive positioning strategy',
        'Market share estimates',
      ];
    }

    return {
      id: 'risk-competitive-context',
      title: 'Competitive Context',
      category: 'Competitive Context',
      severity,
      status,
      whyItMatters: hasCompetitorData
        ? `Qloo returned ${competitorEvidence.length} exact-city place record(s) that passed the ${input.businessCategory || 'business category'} lexical screen. These are not a complete competitor census.`
        : `No exact-city place records passed the ${input.businessCategory || 'business category'} screen as likely direct competitors.`,
      supportingEvidence: hasCompetitorData ? competitorEvidence.slice(0, 3).map(e => e.id) : [],
      missingInformation: missingInfo,
      recommendedAction: `In ${input.targetCity}, map businesses matching ${input.businessCategory || 'the requested category'} within the intended catchment, then verify offerings, prices, and traffic on site`,
    };
  }

  private assessOperatingEconomicsRisk(input: BusinessInput): Risk {
    const financials = input.budgetAssumptions;
    let severity: RiskSeverity = 'high';
    const status: RiskStatus = 'requires-validation';
    let missingInfo: string[] = [];

    if (!financials) {
      missingInfo = [
        'Commercial rental rates in target area',
        'Labor costs and availability',
        'Utility and operational expenses',
        'Ingredient and supply costs',
        'Expected revenue assumptions',
      ];
    } else {
      const hasBasicFinancials =
        financials.monthlyRent &&
        financials.staffingCosts &&
        (financials.menuPrices || financials.averageTransactionValue);

      if (hasBasicFinancials) {
        severity = 'medium';
        missingInfo = [
          'Detailed cost breakdown validation',
          'Seasonal expense variations',
          'Contingency for unexpected costs',
        ];
      } else {
        missingInfo = [];
        if (!financials.monthlyRent) missingInfo.push('Commercial rental rates');
        if (!financials.staffingCosts) missingInfo.push('Labor costs');
        if (!financials.menuPrices) missingInfo.push('Menu pricing strategy');
        if (!financials.budget) missingInfo.push('Total budget allocation');
      }
    }

    return {
      id: 'risk-operating-economics',
      title: 'Operating Economics',
      category: 'Operating Economics',
      severity,
      status,
      whyItMatters: 'Without verified cost and revenue assumptions, financial projections are unreliable',
      supportingEvidence: [],
      missingInformation: missingInfo,
      recommendedAction: `Collect current rent quotes, staffing rates, and supplier prices in ${input.targetCity} before using the entered ${input.businessCategory || 'business'} assumptions as a forecast.`,
    };
  }

  private assessMenuFitRisk(evidence: Evidence[], input: BusinessInput): Risk {
    const menuEvidence = evidence.filter(e => e.source !== 'demo-fixture' && e.geographicMatchStatus === 'verified-city' &&
      (e.categoryRelevance?.status === 'direct' || e.categoryRelevance?.status === 'related') &&
      /food|beverage|dining|restaurant|coffee|tea|bakery|dessert/i.test(e.entityCategory));
    const hasMenuEvidence = menuEvidence.length > 0;

    const severity: RiskSeverity = hasMenuEvidence ? 'medium' : 'high';
    const status: RiskStatus = 'requires-validation';
    const missingInfo: string[] = [];

    if (!input.menuDirection) {
      missingInfo.push('Menu direction definition');
    }

    missingInfo.push('Observed local menu preference and willingness-to-pay data; place records do not measure preference');

    return {
      id: 'risk-menu-fit',
      title: 'Menu and Product Fit',
      category: 'Menu and Product Fit',
      severity,
      status,
      whyItMatters: hasMenuEvidence
        ? `Some exact-city places passed the ${input.businessCategory || 'business category'} screen, but this does not establish menu preference or price acceptance.`
        : `No exact-city category-relevant evidence was found for ${input.businessCategory || 'the requested category'}; menu fit remains unassessed.`,
      supportingEvidence: hasMenuEvidence ? menuEvidence.slice(0, 3).map(e => e.id) : [],
      missingInformation: missingInfo,
      recommendedAction: `In ${input.targetCity}, test the proposed ${input.businessCategory || 'business'} menu with prospective customers and record item choices and price acceptance.`,
    };
  }

  private assessCustomerAcquisitionRisk(_evidence: Evidence[], input: BusinessInput): Risk {
    const severity: RiskSeverity = 'medium';
    const status: RiskStatus = 'requires-validation';
    const missingInfo: string[] = [
      'Customer acquisition channels',
      'Marketing effectiveness estimates',
      'Customer lifetime value projections',
      'Retention strategy',
    ];

    return {
      id: 'risk-customer-acquisition',
      title: 'Customer Acquisition',
      category: 'Customer Acquisition',
      severity,
      status,
      whyItMatters: 'Acquiring customers profitably is critical for sustainable operations',
      supportingEvidence: [],
      missingInformation: missingInfo,
      recommendedAction: `In ${input.targetCity}, test candidate acquisition channels for the proposed ${input.businessCategory || 'business'} with a small measurable pilot before launch.`,
    };
  }

  private assessOperationalFeasibilityRisk(input: BusinessInput): Risk {
    const severity: RiskSeverity = 'medium';
    const status: RiskStatus = 'requires-validation';
    const missingInfo: string[] = [
      'Site availability and suitability',
      'Permit and licensing requirements',
      'Staff availability and training',
      'Supply chain reliability',
    ];

    if (input.geographicScope === 'neighborhood') {
      missingInfo.push('Neighborhood-specific site constraints');
    }

    return {
      id: 'risk-operational-feasibility',
      title: 'Operational Feasibility',
      category: 'Operational Feasibility',
      severity,
      status,
      whyItMatters: 'Even with good market fit, operational challenges can prevent success',
      supportingEvidence: [],
      missingInformation: missingInfo,
      recommendedAction: `In ${input.targetCity}, inspect candidate sites and verify permits, staffing availability, and supply routes for the proposed operation before commitment.`,
    };
  }

  private assessDataQualityRisk(evidence: Evidence[], input: BusinessInput): Risk {
    const dataSource = input.dataMode;
    let severity: RiskSeverity = 'low';
    let status: RiskStatus = 'known';
    let missingInfo: string[] = [];

    if (dataSource === 'demo') {
      severity = 'critical';
      status = 'known';
      missingInfo = [
        'Live market data',
        'Real-time evidence',
        'Actual customer insights',
      ];
    } else if (dataSource === 'live') {
      const hasStaleData = evidence.some(e => {
        const age = Date.now() - new Date(e.retrievalTimestamp).getTime();
        return age > 7 * 24 * 60 * 60 * 1000; // 7 days
      });

      if (hasStaleData) {
        severity = 'medium';
        missingInfo = ['Fresh data refresh', 'Current market conditions'];
      }
    }

    return {
      id: 'risk-data-quality',
      title: 'Data Quality and Source Reliability',
      category: 'Data Quality and Source Reliability',
      severity,
      status,
      whyItMatters: 'Data quality directly impacts confidence in analysis and recommendations',
      supportingEvidence: [],
      missingInformation: missingInfo,
      recommendedAction: dataSource === 'demo'
        ? 'Configure live data integration for actual business decisions'
        : 'Refresh data regularly and validate source reliability',
    };
  }
}

export const riskService = new RiskService();

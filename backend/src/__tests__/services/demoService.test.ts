import { demoService } from '../../services/demoService';


describe('DemoService', () => {
  describe('generateDemoEvidence', () => {
    it('should generate evidence with demo-fixture source', () => {
      const evidence = demoService.generateDemoEvidence('Coimbatore');

      expect(evidence.length).toBeGreaterThan(0);
      evidence.forEach(e => {
        expect(e.source).toBe('demo-fixture');
      });
    });

    it('should NOT label demo data as live-qloo', () => {
      const evidence = demoService.generateDemoEvidence('Coimbatore');

      evidence.forEach(e => {
        expect(e.source).not.toBe('live-qloo');
        expect(e.source).not.toBe('cached-qloo');
      });
    });

    it('should include clear limitations indicating demo data', () => {
      const evidence = demoService.generateDemoEvidence('Coimbatore');

      evidence.forEach(e => {
        expect(e.limitations).toContain('This is synthetic demo data for demonstration purposes only');
        expect(e.limitations).toContain('Not based on actual market research or real-time data');
        expect(e.limitations).toContain('Do not use for business decisions');
      });
    });

    it('should generate evidence for the requested city', () => {
      const evidence = demoService.generateDemoEvidence('Coimbatore');

      const verifiedCityEvidence = evidence.filter(e => e.geographicMatchStatus === 'verified-city');
      expect(verifiedCityEvidence.length).toBeGreaterThan(0);

      verifiedCityEvidence.forEach(e => {
        expect(e.geographicMetadata?.city).toBe('Coimbatore');
      });
    });
  });

  describe('generateDemoCulturalSignals', () => {
    it('should generate cultural signals', () => {
      const signals = demoService.generateDemoCulturalSignals('Coimbatore');

      expect(signals.length).toBeGreaterThan(0);
      signals.forEach(s => {
        expect(s.id).toBeDefined();
        expect(s.name).toBeDefined();
        expect(s.type).toBeDefined();
      });
    });

    it('should include geographic metadata for signals', () => {
      const signals = demoService.generateDemoCulturalSignals('Coimbatore');

      signals.forEach(s => {
        expect(s.geographicMetadata).toBeDefined();
        expect(s.geographicMetadata?.city).toBe('Coimbatore');
      });
    });
  });

  describe('generateDemoConcepts', () => {
    it('should generate concept hypotheses', () => {
      const concepts = demoService.generateDemoConcepts();

      expect(concepts.length).toBeGreaterThan(0);
      concepts.forEach(c => {
        expect(c.id).toBeDefined();
        expect(c.name).toBeDefined();
        expect(c.targetAudienceHypothesis).toBeDefined();
        expect(c.menuDirection).toBeDefined();
        expect(c.experienceStrategy).toBeDefined();
        expect(c.validationExperiment).toBeDefined();
      });
    });

    it('should include evidence gaps in concepts', () => {
      const concepts = demoService.generateDemoConcepts();

      concepts.forEach(c => {
        expect(c.evidenceGaps).toBeDefined();
        expect(c.evidenceGaps.length).toBeGreaterThan(0);
      });
    });

    it('should include assumptions in concepts', () => {
      const concepts = demoService.generateDemoConcepts();

      concepts.forEach(c => {
        expect(c.assumptions).toBeDefined();
        expect(c.assumptions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateDemoRisks', () => {
    it('should generate risk assessment', () => {
      const risks = demoService.generateDemoRisks('Coimbatore');

      expect(risks.length).toBeGreaterThan(0);
      risks.forEach(r => {
        expect(r.id).toBeDefined();
        expect(r.title).toBeDefined();
        expect(r.category).toBeDefined();
        expect(r.severity).toBeDefined();
        expect(r.status).toBeDefined();
        expect(r.whyItMatters).toBeDefined();
        expect(r.recommendedAction).toBeDefined();
      });
    });

    it('should include missing information in risks', () => {
      const risks = demoService.generateDemoRisks('Coimbatore');

      risks.forEach(r => {
        expect(r.missingInformation).toBeDefined();
        expect(r.missingInformation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateDemoKeyFindings', () => {
    it('should generate key findings', () => {
      const findings = demoService.generateDemoKeyFindings('Coimbatore');

      expect(findings.length).toBeGreaterThan(0);
    });

    it('should include disclaimer that this is demo data', () => {
      const findings = demoService.generateDemoKeyFindings('Coimbatore');

      const hasDemoDisclaimer = findings.some(f =>
        f.toLowerCase().includes('demo') || f.toLowerCase().includes('synthetic')
      );
      expect(hasDemoDisclaimer).toBe(true);
    });

    it('should include warning not to use for business decisions', () => {
      const findings = demoService.generateDemoKeyFindings('Coimbatore');

      const hasWarning = findings.some(f =>
        f.toLowerCase().includes('do not use') || f.toLowerCase().includes('business decisions')
      );
      expect(hasWarning).toBe(true);
    });
  });
});

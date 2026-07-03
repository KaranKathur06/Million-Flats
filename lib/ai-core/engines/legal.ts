import type {
  EntityType,
  LegalDocumentIntelligenceReport,
  LegalRiskLevel,
} from "../types";

const ENGINE_VERSION = "2.0.0";

interface EngineOptions {
  forceRefresh?: boolean;
  requestedBy?: string;
}

export async function runLegalEngine(
  entityId: string,
  entityType: EntityType,
  documentUrl: string,
  documentType: string,
  _options: EngineOptions = {},
): Promise<LegalDocumentIntelligenceReport | null> {
  if (!documentUrl || !documentType) return null;

  const startTime = Date.now();
  const normalizedType = normalizeDocumentType(documentType);
  const riskClassification = classifyRisk(normalizedType);
  const documentCompletenessScore = completenessForDocument(normalizedType);
  const legalHealthScore = Math.min(
    100,
    Math.max(0, documentCompletenessScore - riskPenalty(riskClassification)),
  );

  return {
    entityId,
    entityType,
    documentsAnalyzed: 1,
    documentTypes: [normalizedType],
    missingDocuments: missingDocumentsFor(normalizedType),
    ownershipChain: [],
    legalHealthScore,
    documentCompletenessScore,
    riskClassification,
    timelineConsistency: "CONSISTENT",
    redFlags: redFlagsFor(normalizedType, riskClassification),
    litigationRecords: [],
    extractedData: {
      documentUrl,
      documentType: normalizedType,
      analysisMode: "heuristic",
    },
    recommendations: recommendationsFor(normalizedType),
    ocrEngine: "heuristic",
    ocrConfidence: 0,
    modelVersion: ENGINE_VERSION,
    analyzedAt: new Date().toISOString(),
    processingMs: Date.now() - startTime,
  };
}

function normalizeDocumentType(documentType: string): string {
  return documentType.trim().toUpperCase().replace(/\s+/g, "_");
}

function classifyRisk(documentType: string): LegalRiskLevel {
  if (documentType.includes("TITLE") || documentType.includes("DEED")) {
    return "CLEAR";
  }
  if (documentType.includes("RERA") || documentType.includes("OQOOD")) {
    return "MINOR_ISSUES";
  }
  if (documentType.includes("NOC") || documentType.includes("CONTRACT")) {
    return "CAUTION";
  }
  return "CAUTION";
}

function completenessForDocument(documentType: string): number {
  if (documentType.includes("TITLE") || documentType.includes("DEED")) return 85;
  if (documentType.includes("RERA") || documentType.includes("OQOOD")) return 70;
  if (documentType.includes("NOC") || documentType.includes("CONTRACT")) return 60;
  return 50;
}

function riskPenalty(risk: LegalRiskLevel): number {
  const penalties: Record<LegalRiskLevel, number> = {
    CLEAR: 0,
    MINOR_ISSUES: 8,
    CAUTION: 18,
    HIGH_RISK: 35,
    BLOCKED: 60,
  };
  return penalties[risk];
}

function missingDocumentsFor(documentType: string): string[] {
  const required = ["TITLE_DEED", "RERA_CERTIFICATE", "NOC"];
  return required.filter((item) => item !== documentType);
}

function redFlagsFor(
  documentType: string,
  riskClassification: LegalRiskLevel,
): LegalDocumentIntelligenceReport["redFlags"] {
  if (riskClassification === "CLEAR") return [];

  return [
    {
      flag: "DOCUMENT_REVIEW_REQUIRED",
      severity: riskClassification === "CAUTION" ? "MEDIUM" : "LOW",
      description: `${documentType} was recorded with heuristic analysis only. Manual verification is required before relying on this legal score.`,
      documentRef: documentType,
    },
  ];
}

function recommendationsFor(documentType: string): string[] {
  const recommendations = [
    "Verify document authenticity with the issuing authority.",
    "Cross-check ownership details against the latest registry record.",
  ];

  if (!documentType.includes("TITLE") && !documentType.includes("DEED")) {
    recommendations.push("Obtain and verify the title deed before final approval.");
  }

  return recommendations;
}

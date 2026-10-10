export interface DisagreementRecord {
  eventId: string;
  occurredAt: string;
  networkStateId: string;
  predictionId: string;
  aiLabel: string;
  aiConfidence: number;
  aiThreshold: number;
  ruleId: string;
  ruleOutput: string;
  ruleSeverity: string;
  disagreementType: string;
  severity: string;
  evidenceHash: string;
  evidenceHashAlgorithm: string;
  evidenceCanonicalizationVersion: string;
  status: 'PENDING_REVIEW' | 'RESOLVED';
  analystDecision?: 'TRUE_POSITIVE' | 'FALSE_POSITIVE';
  analystId?: string;
  resolutionReason?: string;
  resolvedAt?: string;
}

export interface ResolveDisagreementInput {
  eventId: string;
  analystDecision: 'TRUE_POSITIVE' | 'FALSE_POSITIVE';
  analystId: string;
  resolutionReason: string;
}

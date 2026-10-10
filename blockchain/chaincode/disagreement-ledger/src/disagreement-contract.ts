import { Context, Contract } from 'fabric-contract-api';
import { DisagreementRecord, ResolveDisagreementInput } from './models';

const PENDING_REVIEW = 'PENDING_REVIEW';
const RESOLVED = 'RESOLVED';

export class DisagreementContract extends Contract {
  constructor() {
    super('DisagreementContract');
  }

  async createDisagreement(ctx: Context, record: DisagreementRecord | string): Promise<void> {
    const parsed = typeof record === 'string' ? JSON.parse(record) as DisagreementRecord : record;
    this.assertValidCreate(parsed);
    const existing = await ctx.stub.getState(parsed.eventId);
    if (existing.length > 0) throw new Error(`Duplicate disagreement record for eventId ${parsed.eventId}`);
    await ctx.stub.putState(parsed.eventId, Buffer.from(JSON.stringify(parsed)));
    await ctx.stub.setEvent('DisagreementCreated', Buffer.from(JSON.stringify(parsed)));
  }

  async getDisagreement(ctx: Context, eventId: string): Promise<DisagreementRecord> {
    if (!eventId?.trim()) throw new Error('eventId is required');
    const data = await ctx.stub.getState(eventId);
    if (!data.length) throw new Error(`Disagreement ${eventId} not found`);
    return JSON.parse(data.toString()) as DisagreementRecord;
  }

  async listDisagreements(ctx: Context): Promise<DisagreementRecord[]> {
    const iterator = await ctx.stub.getStateByRange('', '');
    const records: DisagreementRecord[] = [];
    let result = await iterator.next();
    while (!result.done) {
      records.push(JSON.parse(result.value.value.toString()) as DisagreementRecord);
      result = await iterator.next();
    }
    await iterator.close();
    return records;
  }

  async resolveDisagreement(ctx: Context, input: ResolveDisagreementInput | string): Promise<DisagreementRecord> {
    const parsed = typeof input === 'string' ? JSON.parse(input) as ResolveDisagreementInput : input;
    const record = await this.getDisagreement(ctx, parsed.eventId);
    if (record.status === RESOLVED) throw new Error(`Disagreement ${parsed.eventId} is already resolved`);
    if (!['TRUE_POSITIVE', 'FALSE_POSITIVE'].includes(parsed.analystDecision)) throw new Error('analystDecision must be TRUE_POSITIVE or FALSE_POSITIVE');
    if (!parsed.analystId?.trim() || !parsed.resolutionReason?.trim()) throw new Error('analystId and resolutionReason are required');
    record.status = RESOLVED;
    record.analystDecision = parsed.analystDecision;
    record.analystId = parsed.analystId;
    record.resolutionReason = parsed.resolutionReason;
    record.resolvedAt = ctx.stub.getDateTimestamp().toISOString();
    await ctx.stub.putState(parsed.eventId, Buffer.from(JSON.stringify(record)));
    await ctx.stub.setEvent('DisagreementResolved', Buffer.from(JSON.stringify(record)));
    return record;
  }

  async getDisagreementHistory(ctx: Context, eventId: string): Promise<string[]> {
    if (!eventId?.trim()) throw new Error('eventId is required');
    const history = await ctx.stub.getHistoryForKey(eventId);
    const ids: string[] = [];
    let result = await history.next();
    while (!result.done) {
      ids.push(result.value.txId ?? 'unknown-tx');
      result = await history.next();
    }
    await history.close();
    return ids;
  }

  private assertValidCreate(record: DisagreementRecord): void {
    const required = ['eventId', 'occurredAt', 'networkStateId', 'predictionId', 'aiLabel', 'ruleId', 'ruleOutput', 'ruleSeverity', 'disagreementType', 'severity'];
    for (const field of required) if (!String(record[field as keyof DisagreementRecord] ?? '').trim()) throw new Error(`${field} is required`);
    if (!/^0{64}$|^[a-fA-F0-9]{64}$/.test(record.evidenceHash)) throw new Error('evidenceHash must be a SHA-256 hex digest');
    if (record.evidenceHashAlgorithm !== 'SHA-256') throw new Error('evidenceHashAlgorithm must be SHA-256');
    if (record.evidenceCanonicalizationVersion !== 'v1') throw new Error('evidenceCanonicalizationVersion must be v1');
    if (record.aiConfidence < 0 || record.aiConfidence > 1 || record.aiThreshold < 0 || record.aiThreshold > 1) throw new Error('AI confidence and threshold must be between 0 and 1');
    if (record.status !== PENDING_REVIEW) throw new Error('Initial status must be PENDING_REVIEW');
  }
}

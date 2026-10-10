import { Context } from 'fabric-contract-api';
import { DisagreementContract } from './disagreement-contract';

export { DisagreementContract };

export async function InitLedger(_ctx: Context): Promise<void> {
  // No seed records: the ledger is populated from verified ThreatCast events.
}

export const contracts = [DisagreementContract];
export default DisagreementContract;

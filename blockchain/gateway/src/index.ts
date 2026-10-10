import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as grpc from '@grpc/grpc-js';
import { connect, hash, Gateway, signers } from '@hyperledger/fabric-gateway';

export interface GatewayOptions {
  url?: string;
  channelName?: string;
  chaincodeName?: string;
  workspaceRoot?: string;
}

export class FabricGatewayClient {
  private gateway?: Gateway;
  private readonly options: Required<GatewayOptions>;

  constructor(options: GatewayOptions = {}) {
    this.options = {
      url: options.url ?? 'localhost:7051',
      channelName: options.channelName ?? 'threatcast',
      chaincodeName: options.chaincodeName ?? 'disagreement-ledger',
      workspaceRoot: options.workspaceRoot ?? path.resolve(process.cwd(), '..'),
    };
  }

  private paths() {
    const network = path.join(this.options.workspaceRoot, 'fabric-samples', 'test-network');
    const user = path.join(network, 'organizations', 'peerOrganizations', 'org1.example.com', 'users', 'Admin@org1.example.com', 'msp');
    const keystore = path.join(user, 'keystore');
    const key = fs.readdirSync(keystore).find((name) => name.endsWith('_sk'));
    if (!key) throw new Error(`Fabric private key not found in ${keystore}`);
    return {
      network,
      identity: path.join(user, 'signcerts', 'cert.pem'),
      privateKey: path.join(keystore, key),
      tlsRoot: path.join(network, 'organizations', 'peerOrganizations', 'org1.example.com', 'tlsca', 'tlsca.org1.example.com-cert.pem'),
    };
  }

  private async getGateway(): Promise<Gateway> {
    if (this.gateway) return this.gateway;
    const files = this.paths();
    const tls = fs.readFileSync(files.tlsRoot);
    const identity = fs.readFileSync(files.identity);
    const key = crypto.createPrivateKey(fs.readFileSync(files.privateKey));
    this.gateway = connect({
      client: new grpc.Client(this.options.url, grpc.credentials.createSsl(tls)),
      identity: { mspId: 'Org1MSP', credentials: identity },
      signer: signers.newPrivateKeySigner(key),
      hash: hash.sha256,
    });
    return this.gateway;
  }

  async invoke(operation: 'evaluate' | 'submit', fn: string, args: string[]): Promise<unknown> {
    const gateway = await this.getGateway();
    const contract = gateway.getNetwork(this.options.channelName).getContract(this.options.chaincodeName);
    const bytes = operation === 'evaluate'
      ? await contract.evaluateTransaction(fn, ...args)
      : await contract.submitTransaction(fn, ...args);
    const text = Buffer.from(bytes).toString('utf8');
    return text ? JSON.parse(text) : null;
  }

  async close() {
    this.gateway?.close();
    this.gateway = undefined;
  }
}

import readline from 'node:readline';
import { FabricGatewayClient } from './index';

interface Request {
  operation: 'evaluate' | 'submit';
  function: string;
  args?: string[];
  workspaceRoot?: string;
  url?: string;
  channelName?: string;
  chaincodeName?: string;
}

async function main() {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    let client: FabricGatewayClient | undefined;
    try {
      const request = JSON.parse(line) as Request;
      client = new FabricGatewayClient(request);
      const result = await client.invoke(request.operation, request.function, request.args ?? []);
      process.stdout.write(`${JSON.stringify({ ok: true, result })}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stdout.write(`${JSON.stringify({ ok: false, error: message })}\n`);
    } finally {
      await client?.close();
    }
  }
}

void main();

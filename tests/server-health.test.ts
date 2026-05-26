import { describe, it, expect, beforeAll } from 'vitest';
import request from 'node:http';
import type { AddressInfo } from 'node:net';
import { buildServer } from '../src/server.js';

describe('Express server', () => {
  let baseUrl: string;
  let close: () => void;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const app = buildServer();
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
    close = () => server.close();
    return close;
  });

  it('GET /health returns 200 with integrations reachable', async () => {
    const body = await new Promise<{ status: number; data: string }>((resolve, reject) => {
      const req = request.get(`${baseUrl}/health`, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, data }));
      });
      req.on('error', reject);
    });

    expect(body.status).toBe(200);
    const parsed = JSON.parse(body.data) as {
      ok: boolean;
      integrations: Record<string, { ok: boolean; provider: string }>;
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.integrations.crm.provider).toBe('mock');
    expect(parsed.integrations.whatsapp.provider).toBe('mock');
    expect(parsed.integrations.gmail.provider).toBe('mock');
    expect(parsed.integrations.calendar.provider).toBe('mock');
    expect(parsed.integrations.drive.provider).toBe('mock');
  });

  it('GET /unknown returns 404', async () => {
    const status = await new Promise<number>((resolve, reject) => {
      const req = request.get(`${baseUrl}/unknown-route`, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on('error', reject);
    });
    expect(status).toBe(404);
  });
});

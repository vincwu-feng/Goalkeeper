/**
 * Client-side mock data layer.
 *
 * App.tsx talks to REST endpoints for session list, artifact read, version list,
 * and rollback. In this build there is no backend, so we intercept those routes
 * and answer from local sample data.
 */
import { DEMO_ARTIFACT, DEMO_VERSION_1, DEMO_SESSION, DEMO_VERSIONS } from '../fixture';

const LATENCY_MS = 260;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

let workingVersion = DEMO_ARTIFACT.version_no;

function artifactPayload(versionNo: number) {
  const source = versionNo <= 1 ? DEMO_VERSION_1 : DEMO_ARTIFACT;
  return {
    ok: true,
    artifact_id: DEMO_ARTIFACT.artifact_id,
    version_no: versionNo,
    versions: DEMO_VERSIONS,
    artifact: {
      html: source.html,
      manifest: { ...DEMO_ARTIFACT.manifest, version_no: versionNo },
      spec: source.spec,
      design: source.design,
      design_decisions: DEMO_ARTIFACT.design_decisions,
      design_summary: DEMO_ARTIFACT.design_summary,
      validation: source.validation,
      version_no: versionNo,
      artifact_id: DEMO_ARTIFACT.artifact_id,
    },
  };
}

function resolve(url: string, method: string): unknown | null {
  const path = url.startsWith('http') ? new URL(url).pathname + new URL(url).search : url;

  if (path.startsWith('/api/v5/sessions')) {
    return { ok: true, items: [{ ...DEMO_SESSION, working_version: workingVersion }] };
  }

  const rollback = /^\/api\/v5\/artifacts\/([^/?]+)\/rollback/.exec(path);
  if (rollback && method === 'POST') {
    return { ok: true };
  }

  const read = /^\/api\/v5\/artifacts\/([^/?]+)(\?.*)?$/.exec(path);
  if (read) {
    const query = new URLSearchParams((read[2] ?? '').replace(/^\?/, ''));
    const requested = Number(query.get('version') ?? workingVersion);
    const versionNo = DEMO_VERSIONS.includes(requested) ? requested : workingVersion;
    workingVersion = versionNo;
    return artifactPayload(versionNo);
  }

  return null;
}

export function installDemoApi(): void {
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();

    if (url.includes('/api/')) {
      const body = resolve(url, method);
      if (body !== null) {
        await new Promise<void>((done) => { window.setTimeout(done, LATENCY_MS); });
        return jsonResponse(body);
      }
      return new Response(JSON.stringify({ ok: false, error: `no route for ${url}` }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return original(input as RequestInfo, init);
  };
}
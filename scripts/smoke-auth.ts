async function main() {
  const jar = new Map<string, string>();
  const remember = (response: Response) => {
    const raw = response.headers.getSetCookie?.() ?? [];
    for (const cookie of raw) {
      const pair = cookie.split(';')[0];
      if (!pair) continue;
      const eq = pair.indexOf('=');
      jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  };
  const cookieHeader = () => [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');

  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  remember(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  console.log('cookies', [...jar.keys()]);

  const body = new URLSearchParams({
    csrfToken,
    email: 'owner@northstar.example',
    password: 'OrgPulse!dev',
    redirect: 'false',
    json: 'true',
  });

  const signIn = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookieHeader(),
    },
    body,
    redirect: 'manual',
  });
  remember(signIn);
  console.log('signin', signIn.status, signIn.headers.get('location'));

  const dashboard = await fetch('http://localhost:3000/api/v1/dashboard', {
    headers: { cookie: cookieHeader() },
    redirect: 'manual',
  });
  console.log('dashboard', dashboard.status, (await dashboard.text()).slice(0, 250));

  const graph = await fetch('http://localhost:3000/api/v1/charts/current/graph', {
    headers: { cookie: cookieHeader() },
  });
  const graphJson = (await graph.json()) as { totals?: unknown; nodes?: unknown[]; edges?: unknown[] };
  console.log('graph', graph.status, graphJson.totals, 'nodes', graphJson.nodes?.length, 'edges', graphJson.edges?.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

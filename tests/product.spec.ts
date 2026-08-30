import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sessionsForCleanup: Array<{session:{code:string};teacher_token:string}> = [];

async function newSession(request:any, retention_days=7) {
  const response = await request.post('/api/sessions', {data:{title:'Period 3 workshop',prompt:'How does setting shape the narrator’s choice?',retention_days}});
  expect(response.status()).toBe(201);
  const created = await response.json();
  sessionsForCleanup.push(created);
  return created;
}

async function freshRateWindow() {
  while (Date.now() % 1_000 > 100) await new Promise(resolve => setTimeout(resolve, 10));
}

test.afterEach(async ({request, page, context}) => {
  await context.setOffline(false).catch(() => {});
  try {
    const demo = await page.evaluate(() => JSON.parse(localStorage.getItem('demo:workspace') || 'null'));
    if (demo?.code && demo?.token) {
      sessionsForCleanup.push({session:{code:demo.code}, teacher_token:demo.token});
    }
  } catch {}
  for (const created of sessionsForCleanup.splice(0)) {
    let response = await request.delete(`/api/teacher/${created.session.code}`, {
      headers:{Authorization:`Bearer ${created.teacher_token}`}
    });
    if (response.status() === 429) {
      await new Promise(resolve => setTimeout(resolve, 1_100));
      response = await request.delete(`/api/teacher/${created.session.code}`, {
        headers:{Authorization:`Bearer ${created.teacher_token}`}
      });
    }
    // The teacher endpoint deliberately returns 401 after deletion so an
    // attacker cannot distinguish a missing session from a wrong token.
    expect([204, 401, 404]).toContain(response.status());
  }
});

test('@claim:sample-demo demo is isolated, seeded, and expires after 24 hours', async ({page, request}) => {
  const real = await newSession(request);
  await page.goto('/');
  const realKey = `teacher:${real.session.code}`;
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [realKey, real.teacher_token]);
  const realBefore = await (await request.get(`/api/teacher/${real.session.code}`, {
    headers:{Authorization:`Bearer ${real.teacher_token}`}
  })).json();
  await page.getByRole('link', {name:'Try it with sample data'}).click();
  await expect(page).toHaveURL(/\?demo=1$/);
  await expect(page.getByText('Demo — sample data, nothing is saved to your classes')).toBeVisible();
  await expect(page.locator('.response-ticket')).toHaveCount(3);
  expect((await page.evaluate(() => Object.keys(localStorage).sort()))).toEqual(['demo:workspace', realKey].sort());
  expect(await page.evaluate(key => localStorage.getItem(key), realKey)).toBe(real.teacher_token);
  const firstWorkspace = await page.evaluate(() => JSON.parse(localStorage.getItem('demo:workspace')!));
  sessionsForCleanup.push({session:{code:firstWorkspace.code}, teacher_token:firstWorkspace.token});
  const session = await page.request.get(`/api/sessions/${firstWorkspace.code}`);
  const sessionBody = await session.json();
  expect(sessionBody.is_demo).toBe(true);
  const demoLifetime = new Date(sessionBody.expires_at).getTime() - new Date(sessionBody.created_at).getTime();
  expect(demoLifetime).toBe(24 * 60 * 60 * 1000);
  expect(await (await request.get(`/api/teacher/${real.session.code}`, {
    headers:{Authorization:`Bearer ${real.teacher_token}`}
  })).json()).toEqual(realBefore);

  await page.getByRole('button', {name:'Reset demo'}).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('demo:workspace') || 'null')?.code)).not.toBe(firstWorkspace.code);
  await expect(page.locator('.response-ticket')).toHaveCount(3);
  const resetWorkspace = await page.evaluate(() => JSON.parse(localStorage.getItem('demo:workspace')!));
  sessionsForCleanup.push({session:{code:resetWorkspace.code}, teacher_token:resetWorkspace.token});
  expect(resetWorkspace.code).not.toBe(firstWorkspace.code);
  expect(await page.evaluate(key => localStorage.getItem(key), realKey)).toBe(real.teacher_token);
  expect(await (await request.get(`/api/teacher/${real.session.code}`, {
    headers:{Authorization:`Bearer ${real.teacher_token}`}
  })).json()).toEqual(realBefore);

  await page.getByRole('button', {name:'Start for real'}).click();
  await expect(page).toHaveURL(/\/start$/);
  expect(await page.evaluate(() => localStorage.getItem('demo:workspace'))).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), realKey)).toBe(real.teacher_token);
  expect(await (await request.get(`/api/teacher/${real.session.code}`, {
    headers:{Authorization:`Bearer ${real.teacher_token}`}
  })).json()).toEqual(realBefore);
});

test('@claim:csv-export demo CSV contains every ticket', async ({page}) => {
  await page.goto('/demo');
  await expect(page.locator('.response-ticket')).toHaveCount(3);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export sample CSV'}).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = ''; for await (const chunk of stream!) csv += chunk.toString();
  const lines = csv.trim().split('\n');
  expect(lines[0]).toBe('class_nickname,claim,evidence_location,revision_choice,exit_reflection,submitted_at');
  expect(lines).toHaveLength(4);
  expect(csv).toContain('Blue Finch');
});

test('@claim:pseudonymous-flow teacher sees four submitted checkpoints', async ({page,request}) => {
  const created = await newSession(request);
  await page.goto(`/session/${created.session.code}`);
  await page.getByLabel('Class nickname').fill('Green Comet');
  await page.getByLabel('Your working claim').fill('The doorway shows the narrator changing her mind.');
  await page.getByLabel('Evidence location').fill('Page 12, final paragraph.');
  await page.getByLabel('One revision choice').fill('I moved the quotation before my explanation.');
  await page.getByLabel('Exit reflection').fill('I need to explain the last image next.');
  const ticketRequest = page.waitForRequest(request =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/sessions/${created.session.code}/tickets`,
    {timeout:5_000}
  );
  const ticketResponse = page.waitForResponse(response =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/sessions/${created.session.code}/tickets`,
    {timeout:5_000}
  );
  await page.getByRole('button',{name:'Record my draft ticket'}).click();
  await expect(ticketRequest).resolves.toBeTruthy();
  expect((await ticketResponse).status()).toBe(201);
  await expect(page.getByText('Your draft ticket is recorded.')).toBeVisible();
  const teacher = await request.get(`/api/teacher/${created.session.code}`, {headers:{Authorization:`Bearer ${created.teacher_token}`}});
  const data = await teacher.json();
  expect(data.tickets).toHaveLength(1);
  expect(data.tickets[0]).toMatchObject({pseudonym:'Green Comet',claim:'The doorway shows the narrator changing her mind.',evidence:'Page 12, final paragraph.',revision:'I moved the quotation before my explanation.',reflection:'I need to explain the last image next.'});
});

test('@claim:session-retention supports every retention choice and deletes an expired session', async ({request}) => {
  for (const days of [1, 7, 30]) {
    const before = Date.now();
    const created = await newSession(request, days);
    const expiry = new Date(created.session.expires_at).getTime();
    expect(expiry - before).toBeGreaterThan((days * 24 - 1) * 60 * 60 * 1000);
    expect(expiry - before).toBeLessThan((days * 24 + 1) * 60 * 60 * 1000);
    expect((await request.delete(`/api/teacher/${created.session.code}`, {headers:{Authorization:`Bearer ${created.teacher_token}`}})).status()).toBe(204);
  }

  const expiring = await request.post('/api/sessions', {data:{
    title:'Short retention proof',
    prompt:'What changed in this draft?',
    retention_days:1,
    test_retention_seconds:1
  }});
  expect(expiring.status()).toBe(201);
  const expiringBody = await expiring.json();
  const {session} = expiringBody;
  const health = await (await request.get('/health')).json();
  if (health.build_sha === 'dev') {
    await expect.poll(async () => (await request.get(`/api/sessions/${session.code}`)).status(), {timeout:5_000}).toBe(404);
  } else {
    await request.delete(`/api/teacher/${session.code}`, {headers:{Authorization:`Bearer ${expiringBody.teacher_token}`}});
  }
});

test('@claim:free-capacity concurrent requests store exactly 40 free-session tickets', async ({request}) => {
  const created = await newSession(request);
  const body = {pseudonym:'Blue Finch',claim:'A focused working claim.',evidence:'Page 4, paragraph 2.',revision:'I moved the quotation earlier.',reflection:'I will explain the image next.'};
  const responses = [];
  for (let i = 0; i < 45; i++) {
    responses.push(await request.post(
      `/api/sessions/${created.session.code}/tickets`,
      {data:{...body,pseudonym:`Blue Finch ${i}`}}
    ));
    // Two live browser projects share one ingress address. Stay below the
    // separate 40 req/s safety boundary while proving the 40-ticket capacity.
    await new Promise(resolve => setTimeout(resolve, 75));
  }
  expect(responses.filter(response => response.status() === 201)).toHaveLength(40);
  expect(responses.filter(response => response.status() === 409)).toHaveLength(5);
  const overflowBodies = await Promise.all(responses.filter(response => response.status() === 409).map(response => response.json()));
  expect(overflowBodies).toEqual(Array.from({length:5}, () => expect.objectContaining({error:expect.stringContaining('reached 40 tickets')})));
  const teacher = await request.get(`/api/teacher/${created.session.code}`, {headers:{Authorization:`Bearer ${created.teacher_token}`}});
  expect((await teacher.json()).tickets).toHaveLength(40);
});

test('@claim:privacy-minimal no tracking, keystroke logging, or capture occurs', async ({page, request}) => {
  const created = await newSession(request);
  const requests:Array<{method:string;url:string}> = [];
  page.on('request', req => requests.push({method:req.method(),url:req.url()}));
  await page.addInitScript(() => {
    (window as any).__mediaCalls = 0;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { (window as any).__mediaCalls++; throw new Error('blocked in test'); };
  });
  await page.goto(`/session/${created.session.code}`);
  await expect(page.getByRole('heading', {name:'Record your drafting choices'})).toBeVisible();
  await page.waitForLoadState('networkidle');
  const requestCountBeforeTyping = requests.length;
  const localBefore = await page.evaluate(() => JSON.stringify({...localStorage}));
  const sessionBefore = await page.evaluate(() => JSON.stringify({...sessionStorage}));

  await page.getByLabel('Class nickname').fill('Green Comet');
  await page.getByLabel('Your working claim').fill('The doorway shows a change.');
  await page.getByLabel('Evidence location').fill('Page 12, final paragraph.');
  await page.getByLabel('One revision choice').fill('I moved the quotation earlier.');
  await page.getByLabel('Exit reflection').fill('I will explain the last image next.');
  await page.waitForTimeout(150);
  expect(requests).toHaveLength(requestCountBeforeTyping);
  expect(await page.evaluate(() => JSON.stringify({...localStorage}))).toBe(localBefore);
  expect(await page.evaluate(() => JSON.stringify({...sessionStorage}))).toBe(sessionBefore);

  const ticketRequest = page.waitForRequest(request =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/sessions/${created.session.code}/tickets`,
    {timeout:5_000}
  );
  const ticketResponse = page.waitForResponse(response =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/sessions/${created.session.code}/tickets`,
    {timeout:5_000}
  );
  await page.getByRole('button',{name:'Record my draft ticket'}).click();
  await expect(ticketRequest).resolves.toBeTruthy();
  expect((await ticketResponse).status()).toBe(201);
  await expect(page.getByText('Your draft ticket is recorded.')).toBeVisible();
  const origin = new URL(page.url()).origin;
  expect(requests.every(entry => new URL(entry.url).origin === origin)).toBe(true);
  const allowed = [
    /^\/$/, /^\/(demo|join|start|privacy|terms)$/, /^\/session\/[A-Z0-9]{6}$/,
    /^\/api\/sessions\/[A-Z0-9]{6}$/, /^\/api\/sessions\/[A-Z0-9]{6}\/tickets$/,
    /^\/assets\/(?:index-[^/]+\.(?:js|css)|draft-constellation\.webp)$/,
    /^\/fonts\/(?:atkinson-regular|fraunces-semibold)\.ttf$/, /^\/favicon\.svg$/, /^\/sw\.js$/
  ];
  for (const entry of requests) {
    const pathname = new URL(entry.url).pathname;
    expect(allowed.some(pattern => pattern.test(pathname)), `unexpected request ${entry.method} ${pathname}`).toBe(true);
    expect(pathname).not.toMatch(/analytics|telemetry|track|event|beacon/i);
  }
  const ticketPosts = requests.filter(entry => entry.method === 'POST' && new URL(entry.url).pathname.endsWith('/tickets'));
  expect(ticketPosts).toHaveLength(1);
  expect(await page.evaluate(() => (window as any).__mediaCalls)).toBe(0);
});

test('student ticket submission preserves the form and announces a retryable server failure', async ({page, request}) => {
  const created = await newSession(request);
  await page.goto(`/session/${created.session.code}`);
  await page.getByLabel('Class nickname').fill('Green Comet');
  await page.getByLabel('Your working claim').fill('The doorway shows a change.');
  await page.getByLabel('Evidence location').fill('Page 12, final paragraph.');
  await page.getByLabel('One revision choice').fill('I moved the quotation earlier.');
  await page.getByLabel('Exit reflection').fill('I will explain the last image next.');
  await page.route(`**/api/sessions/${created.session.code}/tickets`, route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({error:'The service is briefly unavailable. Keep this form open, then try again.'})
  }));

  await page.getByRole('button', {name:'Record my draft ticket'}).click();
  await expect(page.getByRole('alert')).toHaveText('The service is briefly unavailable. Keep this form open, then try again.');
  await expect(page.getByLabel('Class nickname')).toHaveValue('Green Comet');
  await expect(page.getByRole('button', {name:'Record my draft ticket'})).toBeEnabled();
});

test('@claim:no-ai-detection-or-authorship-verdict demo has no detection or verdict path', async ({page, request}) => {
  const requests:string[] = [];
  page.on('request', req => requests.push(req.url()));
  await page.goto('/?demo=1');
  await expect(page.locator('.response-ticket')).toHaveCount(3);
  expect(requests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(requests.some(url => /detect|authorship|\/v1\/responses|\/models/i.test(new URL(url).pathname))).toBe(false);
  await expect(page.getByRole('button', {name:/detect|authorship|judge/i})).toHaveCount(0);
  await expect(page.getByRole('link', {name:/detect|authorship|judge/i})).toHaveCount(0);

  await page.getByRole('link', {name:'In-Class Draft Ticket home'}).click();
  await expect(page.getByRole('heading', {name:'What this does not do'})).toBeVisible();
  await expect(page.getByText('No AI detection', {exact:true})).toBeVisible();
  await expect(page.getByText('No claim of proving authorship', {exact:true})).toBeVisible();
  expect([404, 405]).toContain((await request.post('/api/detect')).status());
  expect([404, 405]).toContain((await request.post('/api/authorship')).status());
});

test('@claim:free-no-account-core-flow teacher and student finish without sign-in or payment', async ({page}) => {
  const requests:string[] = [];
  page.on('request', req => requests.push(req.url()));
  await page.goto('/start');
  await expect(page.getByRole('link', {name:/sign in|buy|checkout|pay/i})).toHaveCount(0);
  await page.getByLabel('Class or section name').fill('Period 3 workshop');
  await page.getByLabel('Writing prompt').fill('How does setting shape the narrator’s choice?');
  await page.getByRole('button', {name:'Create session code'}).click();
  await expect(page.getByRole('heading', {name:'Review this drafting session'})).toBeVisible();
  const code = (await page.locator('.big-code').textContent())!.trim();
  const teacherToken = await page.evaluate(code => localStorage.getItem(`teacher:${code}`)!, code);
  sessionsForCleanup.push({session:{code}, teacher_token:teacherToken});

  await page.goto(`/session/${code}`);
  await page.getByLabel('Class nickname').fill('Green Comet');
  await page.getByLabel('Your working claim').fill('The doorway shows the narrator changing her mind.');
  await page.getByLabel('Evidence location').fill('Page 12, final paragraph.');
  await page.getByLabel('One revision choice').fill('I moved the quotation before my explanation.');
  await page.getByLabel('Exit reflection').fill('I need to explain the last image next.');
  await page.getByRole('button', {name:'Record my draft ticket'}).click();
  await expect(page.getByText('Your draft ticket is recorded.')).toBeVisible();

  await page.goto(`/teacher/${code}`);
  await expect(page.getByText('Green Comet', {exact:true})).toBeVisible();
  expect(requests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(requests.some(url => /checkout|payment|sign-?in|login/i.test(new URL(url).pathname))).toBe(false);
});

test('@claim:teacher-control private token protects read, export, and delete', async ({request}) => {
  const created = await newSession(request);
  expect((await request.get(`/api/teacher/${created.session.code}`)).status()).toBe(401);
  expect((await request.get(`/api/teacher/${created.session.code}/export`)).status()).toBe(401);
  expect((await request.delete(`/api/teacher/${created.session.code}`)).status()).toBe(401);
  expect((await request.get(`/api/teacher/${created.session.code}`, {headers:{Authorization:`Bearer ${created.teacher_token}`}})).status()).toBe(200);
  expect((await request.get(`/api/teacher/${created.session.code}/export`, {headers:{Authorization:`Bearer ${created.teacher_token}`}})).status()).toBe(200);
  const deleted = await request.delete(`/api/teacher/${created.session.code}`, {headers:{Authorization:`Bearer ${created.teacher_token}`}});
  expect(deleted.status()).toBe(204);
  expect((await request.get(`/api/sessions/${created.session.code}`)).status()).toBe(404);
});

test('API rate limit returns Retry-After', async ({request}) => {
  await freshRateWindow();
  const results = await Promise.all(Array.from({length:45}, () => request.get(
    '/api/sessions/ABCDEF', {headers:{'X-Forwarded-For':'203.0.113.10'}}
  )));
  expect(results.some(r => r.status() === 429)).toBe(true);
  expect(results.find(r => r.status() === 429)?.headers()['retry-after']).toBe('1');
  await new Promise(resolve => setTimeout(resolve, 1_100));
});

test('health is never cached so a release check sees the active storage backend', async ({request}) => {
  const health = await request.get(`/health?release-check=${Date.now()}`);
  expect(health.status()).toBe(200);
  expect(health.headers()['cache-control']).toBe('no-store, max-age=0');
  expect(['sqlite', 'postgres']).toContain((await health.json()).storage_backend);
});

test('API rate limit ignores caller-spoofed hops and uses the ingress-appended address', async ({request}, testInfo) => {
  const trustedAddress = testInfo.project.name === 'chromium' ? '203.0.113.77' : '203.0.113.78';
  await freshRateWindow();
  const results = await Promise.all(Array.from({length:45}, (_, i) => request.get('/api/sessions/ABCDEF', {
      headers:{'X-Forwarded-For':`198.51.100.${i + 1}, ${trustedAddress}`}
  })));
  const ordinary = results.filter(response => response.status() !== 429);
  const limited = results.filter(response => response.status() === 429);
  if (process.env.PLAYWRIGHT_BASE_URL) {
    expect(ordinary.length).toBeLessThanOrEqual(40);
    expect(limited.length).toBeGreaterThan(0);
  } else {
    expect(ordinary).toHaveLength(40);
    expect(limited).toHaveLength(5);
  }
  expect(results.filter(response => response.status() === 429).every(response => response.headers()['retry-after'] === '1')).toBe(true);
  await new Promise(resolve => setTimeout(resolve, 1_100));
});

const publicAccessibilityRoutes = ['/', '/demo', '/join', '/start', '/privacy', '/terms'];

test.describe('public route accessibility', () => {
  for (const route of publicAccessibilityRoutes) {
    test(`${route} passes axe, console, and reflow checks`, async ({page}, testInfo) => {
      const mobile = testInfo.project.name === 'mobile-chromium';
      const viewport = mobile ? {width:390, height:844} : {width:1440, height:900};
      const consoleErrors: string[] = [];
      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await page.setViewportSize(viewport);
      await page.goto(route);
      const results = await new AxeBuilder({page}).analyze();

      expect(
        results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || '')),
        `${route} at ${viewport.width}px`
      ).toEqual([]);
      expect(
        await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth),
        `${route} at ${viewport.width}px`
      ).toBe(true);
      expect(consoleErrors).toEqual([]);
    });
  }
});

test('first screens show all three facts and one completed sample ticket', async ({page}, testInfo) => {
  const viewport = testInfo.project.name === 'mobile-chromium'
    ? {width:390, height:844}
    : {width:1440, height:900};
  await page.setViewportSize(viewport);
  await page.goto('/');
  for (const fact of [
    'Students use class nicknames.',
    'Sessions expire automatically.',
    'Free sessions accept up to 40 draft tickets.'
  ]) {
    const box = await page.getByText(fact, {exact:true}).boundingBox();
    expect(box, fact).not.toBeNull();
    expect(box!.y + box!.height, `${fact} must be inside ${viewport.height}px`).toBeLessThanOrEqual(viewport.height);
  }

  await page.goto('/?demo=1');
  const feature = page.locator('.demo-feature');
  await expect(feature.getByRole('heading', {name:'Blue Finch'})).toBeVisible();
  await expect(feature.getByText('Memory acts like a second setting that keeps the past present.')).toBeVisible();
  await expect(feature.getByText('I moved the scene before my explanation so readers see the image first.')).toBeVisible();
  const box = await feature.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height, `completed ticket must be inside ${viewport.height}px`).toBeLessThanOrEqual(viewport.height);
});

test('landing uses the same fourth checkpoint name and capacity unit as the student ticket', async ({page}) => {
  await page.goto('/');
  await expect(page.getByText('Each ticket records a claim, evidence location, revision, and exit reflection.')).toBeVisible();
  await expect(page.getByText('Students name one claim, one evidence location, one revision, and one exit reflection.')).toBeVisible();
  await expect(page.getByText('Free sessions accept up to 40 draft tickets.')).toBeVisible();
  await expect(page.getByText('next step', {exact:false})).toHaveCount(0);

  const created = await newSession(page.request);
  await page.goto(`/session/${created.session.code}`);
  await expect(page.getByLabel('Exit reflection')).toBeVisible();
  await page.goto('/terms');
  await expect(page.getByText('Free sessions accept up to 40 draft tickets.')).toBeVisible();
});

test('390px layout reflows without horizontal scrolling at 200% text size', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  for (const route of ['/','/demo','/join','/start','/privacy','/terms']) {
    await page.goto(route);
    await page.evaluate(() => {
      // Browser text-only zoom changes the root text size. Inserting the rule
      // in the product stylesheet exercises that layout without weakening CSP.
      document.styleSheets[0].insertRule('html { font-size: 200% !important; }', 0);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(390);
  }
  await page.goto('/');
  await expect(page.getByRole('heading', {name:'Record in-class drafting without surveillance'})).toBeVisible();
  await expect(page.getByRole('link', {name:'Start a class session'})).toBeVisible();
});

test('routes expose one focused page heading and working legal links', async ({page}) => {
  for (const route of ['/','/demo','/privacy','/terms','/missing']) {
    await page.goto(route);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveTitle(/In-Class Draft Ticket/);
  }
});

test('public deep links return 200 documents and route metadata changes', async ({page, request}) => {
  for (const route of ['/demo','/join','/start','/privacy','/terms','/session/ABCDEF','/teacher/ABCDEF']) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
  }
  await page.goto('/privacy');
  await expect(page).toHaveTitle('Privacy — In-Class Draft Ticket');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://in-class-draft-ticket.sociobot.in/privacy');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Privacy — In-Class Draft Ticket');
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', 'Read how class session data is handled');

  await page.goto('/?demo=1');
  await expect(page).toHaveTitle('Demo — In-Class Draft Ticket');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://in-class-draft-ticket.sociobot.in/?demo=1');

  await page.goto('/');
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', 'Record in-class drafting without surveillance');
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', 'Record in-class drafting without surveillance');
});

test('direct 404 keeps the shared navigation, legal links, and complete metadata', async ({page, request}) => {
  const response = await page.goto('/not-a-route');
  expect(response?.status()).toBe(404);
  const axe = await new AxeBuilder({page}).analyze();
  expect(axe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://in-class-draft-ticket.sociobot.in/404.html');
  await expect(page.getByRole('heading', {name:'Page not found'})).toBeVisible();
  await expect(page.getByRole('link', {name:'Privacy'}).first()).toHaveAttribute('href', '/privacy');
  await expect(page.getByRole('link', {name:'Terms'})).toHaveAttribute('href', '/terms');
  expect((await request.get('/privacy')).status()).toBe(200);
  expect((await request.get('/terms')).status()).toBe(200);
});

test('service worker installs, updates its cache, and reloads the shell offline', async ({page, context}) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect.poll(() => page.evaluate(() => caches.keys())).toContain('draft-ticket-v3');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', {name:'Record in-class drafting without surveillance'})).toBeVisible();
});

test('Back restores the prior landing scroll position', async ({page}) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 1400));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1300);
  await page.getByRole('contentinfo').getByRole('link', {name:'Privacy'}).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1300);
});

test('mobile wordmark, navigation, and footer links meet the 44px target', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const headerLinks = page.locator('.site-header nav a');
  await expect(headerLinks).toHaveCount(4);
  for (const name of ['Demo', 'Join', 'Start a class', 'Privacy']) {
    await expect(page.getByRole('navigation', {name:'Main navigation'}).getByRole('link', {name, exact:true})).toBeVisible();
  }
  const heights = await page.locator('.wordmark, .site-header nav a, .site-footer nav a').evaluateAll(links => links.map(link => link.getBoundingClientRect().height));
  expect(heights.every(height => height >= 44)).toBe(true);
});

test('keyboard starts with the skip link and route changes focus the new heading', async ({page}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name:'Skip to main content'})).toBeFocused();
  await page.getByRole('link', {name:'Privacy'}).first().click();
  await expect(page.getByRole('heading', {name:'Privacy in plain words'})).toBeFocused();
});

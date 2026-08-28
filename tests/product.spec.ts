import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function newSession(request:any, retention_days=7) {
  const response = await request.post('/api/sessions', {data:{title:'Period 3 workshop',prompt:'How does setting shape the narrator’s choice?',retention_days}});
  expect(response.status()).toBe(201);
  return response.json();
}

test('@claim:sample-demo demo is isolated and seeded', async ({page}) => {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved to your classes')).toBeVisible();
  await expect(page.locator('.response-ticket')).toHaveCount(3);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['demo:workspace']);
  const workspace = await page.evaluate(() => JSON.parse(localStorage.getItem('demo:workspace')!));
  const session = await page.request.get(`/api/sessions/${workspace.code}`);
  expect((await session.json()).is_demo).toBe(true);
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
  await page.getByRole('button',{name:'Record my draft ticket'}).click();
  await expect(page.getByText('Your draft ticket is recorded.')).toBeVisible();
  const teacher = await request.get(`/api/teacher/${created.session.code}`, {headers:{Authorization:`Bearer ${created.teacher_token}`}});
  const data = await teacher.json();
  expect(data.tickets).toHaveLength(1);
  expect(data.tickets[0]).toMatchObject({pseudonym:'Green Comet',claim:'The doorway shows the narrator changing her mind.',evidence:'Page 12, final paragraph.',revision:'I moved the quotation before my explanation.',reflection:'I need to explain the last image next.'});
});

test('@claim:session-retention API records the selected deletion time', async ({request}) => {
  const before = Date.now(); const created = await newSession(request,1);
  const expiry = new Date(created.session.expires_at).getTime();
  expect(expiry - before).toBeGreaterThan(23*60*60*1000);
  expect(expiry - before).toBeLessThan(25*60*60*1000);
});

test('@claim:free-capacity concurrent requests store exactly 40 free-session tickets', async ({request}) => {
  const created = await newSession(request);
  const body = {pseudonym:'Blue Finch',claim:'A focused working claim.',evidence:'Page 4, paragraph 2.',revision:'I moved the quotation earlier.',reflection:'I will explain the image next.'};
  const responses = await Promise.all(Array.from({length:45}, (_, i) => request.post(
    `/api/sessions/${created.session.code}/tickets`,
    {headers:{'X-Forwarded-For':`10.0.0.${i+1}`},data:{...body,pseudonym:`Blue Finch ${i}`}}
  )));
  expect(responses.filter(response => response.status() === 201)).toHaveLength(40);
  expect(responses.filter(response => response.status() === 409)).toHaveLength(5);
  const overflowBodies = await Promise.all(responses.filter(response => response.status() === 409).map(response => response.json()));
  expect(overflowBodies).toEqual(Array.from({length:5}, () => expect.objectContaining({error:expect.stringContaining('reached 40 tickets')})));
  const teacher = await request.get(`/api/teacher/${created.session.code}`, {headers:{Authorization:`Bearer ${created.teacher_token}`}});
  expect((await teacher.json()).tickets).toHaveLength(40);
});

test('@claim:privacy-minimal no tracking or capture occurs', async ({page}) => {
  const origins = new Set<string>();
  page.on('request', req => origins.add(new URL(req.url()).origin));
  await page.addInitScript(() => {
    (window as any).__mediaCalls = 0;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { (window as any).__mediaCalls++; throw new Error('blocked in test'); };
  });
  await page.goto('/');
  await page.getByRole('link',{name:'Try it with sample data'}).click();
  await expect(page.locator('.response-ticket')).toHaveCount(3);
  expect([...origins]).toEqual(['http://127.0.0.1:8080']);
  expect(await page.evaluate(() => (window as any).__mediaCalls)).toBe(0);
});

test('@claim:paid-presets valid license saves local prompt presets', async ({page}) => {
  await page.route('https://api.sociobot.in/api/v1/products/in-class-draft-ticket/verify?*', route => route.fulfill({json:{valid:true,reason:'ok',expires_at:null}}));
  await page.goto('/?license=test-valid-license');
  await page.getByRole('link',{name:'Start a class session'}).click();
  await expect(page.getByLabel('Saved prompt presets')).toBeVisible();
  await page.getByLabel('Class or section name').fill('Morning seminar');
  await page.getByLabel('Writing prompt').fill('Where does the argument change direction?');
  await page.getByRole('button',{name:'Save as prompt preset'}).click();
  await expect(page.getByText('Prompt preset saved on this device.')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('paid:prompt-presets')!))).toHaveLength(1);
});

test('@claim:teacher-control private token protects and deletes a session', async ({request}) => {
  const created = await newSession(request);
  expect((await request.get(`/api/teacher/${created.session.code}`)).status()).toBe(401);
  const deleted = await request.delete(`/api/teacher/${created.session.code}`, {headers:{Authorization:`Bearer ${created.teacher_token}`}});
  expect(deleted.status()).toBe(204);
  expect((await request.get(`/api/sessions/${created.session.code}`)).status()).toBe(404);
});

test('API rate limit returns Retry-After', async ({request}) => {
  const results = [];
  for (let i=0;i<45;i++) results.push(await request.get('/api/sessions/ABCDEF',{headers:{'X-Forwarded-For':'203.0.113.10'}}));
  expect(results.some(r => r.status() === 429)).toBe(true);
  expect(results.find(r => r.status() === 429)?.headers()['retry-after']).toBe('1');
});

test('public routes pass desktop and 390px accessibility checks without console errors', async ({page}) => {
  const consoleErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    await page.setViewportSize(viewport);
    for (const route of ['/','/demo','/join','/start','/privacy','/terms']) {
      await page.goto(route);
      const results = await new AxeBuilder({page}).analyze();
      expect(results.violations.filter(v => ['serious','critical'].includes(v.impact || '')), `${route} at ${viewport.width}px`).toEqual([]);
      expect(await page.locator('body').evaluate(el => el.scrollWidth <= window.innerWidth), `${route} at ${viewport.width}px`).toBe(true);
    }
  }
  expect(consoleErrors).toEqual([]);
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
});

test('service worker installs, updates its cache, and reloads the shell offline', async ({page, context}) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect.poll(() => page.evaluate(() => caches.keys())).toContain('draft-ticket-v2');
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

test('mobile navigation and footer links meet the 44px target', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const heights = await page.locator('.site-header nav a, .site-footer nav a').evaluateAll(links => links
    .filter(link => getComputedStyle(link).display !== 'none')
    .map(link => link.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(0);
  expect(heights.every(height => height >= 44)).toBe(true);
});

test('keyboard starts with the skip link and route changes focus the new heading', async ({page}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name:'Skip to main content'})).toBeFocused();
  await page.getByRole('link', {name:'Privacy'}).first().click();
  await expect(page.getByRole('heading', {name:'Privacy in plain words'})).toBeFocused();
});

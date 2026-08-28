<script lang="ts">
  import { onMount } from 'svelte';

  type Session = { code:string; title:string; prompt:string; created_at:string; expires_at:string; is_demo:boolean };
  type Ticket = { id:string; session_code:string; pseudonym:string; claim:string; evidence:string; revision:string; reflection:string; created_at:string };
  type TeacherData = { session:Session; tickets:Ticket[] };

  let path = window.location.pathname;
  let online = navigator.onLine;
  let announcement = '';
  let busy = false;
  let error = '';
  let notice = '';
  let demoData: TeacherData | null = null;
  let demoToken = '';
  let joinCode = '';
  let session: Session | null = null;
  let teacherData: TeacherData | null = null;
  let license = { active:false, checked:false };
  let classTitle = '';
  let writingPrompt = '';
  let presets:{title:string;prompt:string}[] = [];
  let selectedPreset = '';

  const pageMeta = () => {
    if (path === '/') return ['In-Class Draft Ticket — Record drafting choices','Record in-class drafting without surveillance'];
    if (path === '/start') return ['Start a session — In-Class Draft Ticket','Start an in-class draft session'];
    if (path === '/join') return ['Join a session — In-Class Draft Ticket','Open your draft ticket'];
    if (path === '/demo') return ['Demo — In-Class Draft Ticket','Review a sample draft session'];
    if (path === '/privacy') return ['Privacy — In-Class Draft Ticket','Privacy in plain words'];
    if (path === '/terms') return ['Terms — In-Class Draft Ticket','Terms of use'];
    if (path.startsWith('/session/')) return ['Draft ticket — In-Class Draft Ticket','Record your drafting choices'];
    if (path.startsWith('/teacher/')) return ['Teacher session — In-Class Draft Ticket','Review this drafting session'];
    return ['Page not found — In-Class Draft Ticket','This point is not connected'];
  };

  function navigate(to:string) {
    history.pushState({}, '', to);
    path = to;
    error = ''; notice = ''; session = null; teacherData = null;
    window.scrollTo({top:0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    routeChanged();
  }

  function routeChanged() {
    document.title = pageMeta()[0];
    requestAnimationFrame(() => {
      const h1 = document.querySelector('main h1') as HTMLElement | null;
      h1?.focus();
      announcement = pageMeta()[1];
    });
    if (path.startsWith('/session/')) loadStudentSession();
    if (path.startsWith('/teacher/')) loadTeacherSession();
    if (path === '/demo') loadDemo(false);
  }

  function clickLink(event:MouseEvent) {
    const link = event.currentTarget as HTMLAnchorElement;
    if (link.origin === location.origin) { event.preventDefault(); navigate(link.pathname + link.search); }
  }

  async function api<T>(url:string, init:RequestInit = {}):Promise<T> {
    let response:Response;
    try { response = await fetch(url, { ...init, headers:{'Content-Type':'application/json', ...(init.headers || {})} }); }
    catch { throw new Error('The server could not be reached. Check your connection, then try again.'); }
    if (!response.ok) {
      const body = await response.json().catch(() => ({error:'The server did not respond. Check your connection, then try again.'}));
      throw new Error(body.error || 'The request failed. Try again.');
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  }

  async function startSession(event:SubmitEvent) {
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form); busy = true; error = '';
    try {
      const created = await api<{session:Session;teacher_token:string}>('/api/sessions', {method:'POST', body:JSON.stringify({title:data.get('title'), prompt:data.get('prompt'), retention_days:Number(data.get('retention'))})});
      localStorage.setItem(`teacher:${created.session.code}`, created.teacher_token);
      navigate(`/teacher/${created.session.code}`);
    } catch (e) { error = errorMessage(e); } finally { busy = false; }
  }

  function openCode(event:SubmitEvent) {
    event.preventDefault();
    const code = joinCode.replace(/[^a-z0-9]/gi,'').toUpperCase();
    if (code.length !== 6) { error = 'The session code needs six characters. Check the board, then try again.'; return; }
    navigate(`/session/${code}`);
  }

  async function loadStudentSession() {
    const code = path.split('/').pop() || '';
    try { session = await api<Session>(`/api/sessions/${code}`); }
    catch (e) { error = errorMessage(e); }
  }

  async function saveTicket(event:SubmitEvent) {
    event.preventDefault(); if (!session) return;
    const form = event.currentTarget as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form)); busy = true; error = '';
    try {
      await api<Ticket>(`/api/sessions/${session.code}/tickets`, {method:'POST', body:JSON.stringify(data)});
      notice = 'Your draft ticket is recorded. You may close this page.';
      form.reset();
    } catch (e) { error = errorMessage(e); } finally { busy = false; }
  }

  async function loadTeacherSession() {
    const code = path.split('/').pop() || '';
    const hashToken = location.hash.slice(1);
    if (hashToken.startsWith('dt_')) { localStorage.setItem(`teacher:${code}`, hashToken); history.replaceState({},'',location.pathname); }
    const token = localStorage.getItem(`teacher:${code}`) || '';
    if (!token) { error = 'Teacher access is missing on this device. Use the private link from the device that created the session.'; return; }
    try { teacherData = await api<TeacherData>(`/api/teacher/${code}`, {headers:{Authorization:`Bearer ${token}`}}); }
    catch (e) { error = errorMessage(e); }
  }

  async function exportCsv(data:TeacherData, token:string) {
    error = '';
    try {
      const response = await fetch(`/api/teacher/${data.session.code}/export`, {headers:{Authorization:`Bearer ${token}`}});
      if (!response.ok) throw new Error((await response.json()).error);
      const blob = await response.blob();
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `draft-tickets-${data.session.code}.csv`; link.click(); URL.revokeObjectURL(link.href);
      notice = `Exported ${data.tickets.length} draft tickets as CSV.`;
    } catch (e) { error = errorMessage(e); }
  }

  async function removeSession(data:TeacherData, token:string) {
    if (!confirm(`Delete ${data.session.title} and all ${data.tickets.length} tickets? This cannot be undone.`)) return;
    try { await api<void>(`/api/teacher/${data.session.code}`, {method:'DELETE', headers:{Authorization:`Bearer ${token}`}}); localStorage.removeItem(`teacher:${data.session.code}`); navigate('/'); }
    catch (e) { error = errorMessage(e); }
  }

  async function loadDemo(reset:boolean) {
    if (busy) return; busy = true; error = '';
    if (reset) { localStorage.removeItem('demo:workspace'); demoData = null; }
    try {
      let saved:{code:string;token:string}|null = null;
      try { saved = JSON.parse(localStorage.getItem('demo:workspace') || 'null'); } catch { saved = null; }
      if (saved) {
        try { demoData = await api<TeacherData>(`/api/teacher/${saved.code}`, {headers:{Authorization:`Bearer ${saved.token}`}}); demoToken = saved.token; }
        catch { saved = null; }
      }
      if (!saved) {
        const created = await api<{session:Session;teacher_token:string}>('/api/demo', {method:'POST'});
        demoToken = created.teacher_token;
        localStorage.setItem('demo:workspace', JSON.stringify({code:created.session.code,token:demoToken}));
        demoData = await api<TeacherData>(`/api/teacher/${created.session.code}`, {headers:{Authorization:`Bearer ${demoToken}`}});
      }
    } catch (e) { error = errorMessage(e); } finally { busy = false; }
  }

  function startReal() { localStorage.removeItem('demo:workspace'); navigate('/start'); }

  async function copyTeacherLink(data:TeacherData) {
    const token = localStorage.getItem(`teacher:${data.session.code}`) || '';
    try { await navigator.clipboard.writeText(`${location.origin}/teacher/${data.session.code}#${token}`); notice = 'Private teacher link copied. Store it somewhere only you can access.'; }
    catch { error = 'The link could not be copied. Use this browser to return to the session.'; }
  }

  function savePreset() {
    if (!license.active) { error = 'A teacher license is needed to save prompt presets.'; return; }
    if (classTitle.trim().length < 2 || writingPrompt.trim().length < 4) { error = 'Add a class name and writing prompt before saving this preset.'; return; }
    if (presets.length >= 10) { error = 'Ten presets are already saved. Remove one before adding another.'; return; }
    presets = [...presets,{title:classTitle.trim(),prompt:writingPrompt.trim()}];
    localStorage.setItem('paid:prompt-presets',JSON.stringify(presets)); notice = 'Prompt preset saved on this device.'; error = '';
  }

  function applyPreset(event:Event) {
    selectedPreset = (event.currentTarget as HTMLSelectElement).value;
    const index = Number(selectedPreset);
    if (Number.isInteger(index) && presets[index]) { classTitle = presets[index].title; writingPrompt = presets[index].prompt; }
  }

  function deletePreset() {
    const index = Number(selectedPreset);
    if (!Number.isInteger(index) || !presets[index]) { error = 'Choose a prompt preset before deleting it.'; return; }
    presets = presets.filter((_,i) => i !== index); selectedPreset = '';
    localStorage.setItem('paid:prompt-presets',JSON.stringify(presets)); notice = 'Prompt preset deleted from this device.'; error = '';
  }

  async function checkLicense(token:string, force=false) {
    if (!token) return;
    const cacheKey = 'sb_license_verdict:in-class-draft-ticket';
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (!force && cached?.valid && Date.now() - cached.checked_at < 86400000) { license = {active:true,checked:true}; return; }
    try {
      const response = await fetch(`https://api.sociobot.in/api/v1/products/in-class-draft-ticket/verify?license=${encodeURIComponent(token)}`);
      const result = await response.json();
      localStorage.setItem(cacheKey, JSON.stringify({...result,checked_at:Date.now()}));
      license = {active:Boolean(result.valid),checked:true};
      if (!result.valid) notice = 'This license is no longer active. The free class tools still work.';
    } catch { license = {active:Boolean(cached?.valid),checked:false}; }
  }

  function restoreLicense(event:SubmitEvent) {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget as HTMLFormElement).get('license') || '').trim();
    if (!token) { error = 'Paste the license from your receipt, then verify it.'; return; }
    localStorage.setItem('sb_license:in-class-draft-ticket', token); checkLicense(token, true);
  }

  function errorMessage(e:unknown) { return e instanceof Error ? e.message : 'The request failed. Try again.'; }
  function date(value:string) { return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)); }

  onMount(() => {
    const licenseParam = new URLSearchParams(location.search).get('license');
    if (licenseParam) {
      localStorage.setItem('sb_license:in-class-draft-ticket', licenseParam);
      history.replaceState({},'',location.pathname);
    }
    checkLicense(licenseParam || localStorage.getItem('sb_license:in-class-draft-ticket') || '');
    try { presets = JSON.parse(localStorage.getItem('paid:prompt-presets') || '[]'); } catch { presets = []; }
    const pop = () => { path = location.pathname; routeChanged(); };
    const status = () => online = navigator.onLine;
    addEventListener('popstate', pop); addEventListener('online', status); addEventListener('offline', status);
    routeChanged();
    return () => { removeEventListener('popstate', pop); removeEventListener('online', status); removeEventListener('offline', status); };
  });
</script>

<svelte:head>
  <title>{pageMeta()[0]}</title>
  <link rel="canonical" href={`https://in-class-draft-ticket.sociobot.in${path}`} />
</svelte:head>

<a class="skip-link" href="#main">Skip to main content</a>
<div class="announcement" aria-live="polite">{announcement}</div>
{#if !online}<div class="offline" role="status">You are offline. Reconnect before using a session.</div>{/if}

{#if path === '/demo'}
  <aside class="demo-bar" aria-label="Demo controls">
    <span><strong>Demo</strong> — sample data, nothing is saved to your classes</span>
    <span class="demo-actions"><button class="text-button" on:click={() => loadDemo(true)}>Reset demo</button><button class="text-button" on:click={startReal}>Start for real</button></span>
  </aside>
{/if}

<header class="site-header">
  <a class="wordmark" href="/" on:click={clickLink} aria-label="In-Class Draft Ticket home"><span class="plot-mark" aria-hidden="true">●—●</span><span>Draft Ticket</span></a>
  <nav aria-label="Main navigation">
    <a href="/demo" on:click={clickLink}>Demo</a>
    <a href="/join" on:click={clickLink}>Join</a>
    <a href="/start" on:click={clickLink}>Start a class</a>
    <a href="/privacy" on:click={clickLink}>Privacy</a>
  </nav>
</header>

<main id="main">
  {#if path === '/'}
    <section class="hero section-shell">
      <div class="hero-copy">
        <p class="eyebrow">A process record, not a detector</p>
        <h1 tabindex="-1">Record in-class drafting without surveillance</h1>
        <p class="lede">For writing teachers who need useful evidence of student choices during class.</p>
        <div class="hero-actions">
          <a class="button primary" href="/demo" on:click={clickLink}>Try it with sample data</a>
          <span>See three completed tickets.</span>
        </div>
        <a class="button secondary" href="/start" on:click={clickLink}>Start a class session</a>
        <ul class="plain-facts">
          <li>Students use class nicknames.</li>
          <li>Sessions expire automatically.</li>
          <li>Free for classes up to 40.</li>
        </ul>
      </div>
      <figure class="hero-art">
        <img src="/assets/draft-constellation.webp" width="1200" height="800" fetchpriority="high" alt="Four blank paper tickets joined by fine plotted lines." />
        <figcaption>Four checkpoints make the drafting process easier to discuss.</figcaption>
      </figure>
    </section>

    <section class="preview-band" aria-labelledby="preview-heading">
      <div class="section-shell preview-grid">
        <div><p class="eyebrow">Live preview</p><h2 id="preview-heading">A ticket stays short</h2><p>Students name one claim, one evidence location, one revision, and one next step.</p></div>
        <div class="mini-ticket" aria-label="Example draft ticket">
          <span class="ticket-number">03 / Quiet Maple</span>
          <p><strong>Claim</strong> Memory acts like a second setting.</p>
          <p><strong>Revision</strong> I moved the scene before my explanation.</p>
        </div>
      </div>
    </section>

    <section class="section-shell steps" aria-labelledby="how-heading">
      <p class="eyebrow">Three stops, one class period</p><h2 id="how-heading">How it works</h2>
      <ol class="plot-steps">
        <li><span>1</span><div><h3>Create a session</h3><p>Add the class name, prompt, and deletion date. Keep the private teacher link.</p></div></li>
        <li><span>2</span><div><h3>Share the code</h3><p>Students use a class nickname and answer four short prompts.</p></div></li>
        <li><span>3</span><div><h3>Review the choices</h3><p>Read each ticket beside the draft. Export the full session as CSV.</p></div></li>
      </ol>
    </section>

    <section class="section-shell boundaries" aria-labelledby="boundary-heading">
      <div><p class="eyebrow">Clear boundaries</p><h2 id="boundary-heading">What this does not do</h2></div>
      <ul><li>No AI detection</li><li>No webcam or microphone</li><li>No keystroke logging</li><li>No claim of proving authorship</li></ul>
      <p>The ticket gives teachers a starting point for feedback. It does not judge who wrote a draft.</p>
    </section>

    <section class="section-shell pricing" aria-labelledby="price-heading">
      <div><p class="eyebrow">Optional teacher license</p><h2 id="price-heading">Save reusable prompt presets</h2><p>Free sessions include every student and export feature. A $24 one-time license adds ten local prompt presets.</p></div>
      <div class="price-placard"><strong>$24</strong><span>one-time purchase</span><a class="button primary" href="https://api.sociobot.in/api/v1/products/in-class-draft-ticket/checkout">Buy teacher license</a><p>Sociobot and Dodo handle checkout and refunds.</p></div>
      <form class="restore" on:submit={restoreLicense}><label for="license">Have a license?</label><div><input id="license" name="license" autocomplete="off" placeholder="Paste license token" /><button class="button secondary">Verify license</button></div>{#if license.active}<p class="success">Teacher license active. Prompt presets are ready.</p>{/if}</form>
    </section>
  {:else if path === '/start'}
    <section class="task-page section-shell narrow">
      <p class="eyebrow">Teacher setup · about one minute</p><h1 tabindex="-1">Start an in-class draft session</h1><p class="lede">Set the prompt and deletion date. You will get a student code and a private teacher link.</p>
      <form class="ticket-form" on:submit|preventDefault={startSession}>
        {#if license.active}<div class="preset-tools"><label for="preset">Saved prompt presets</label><select id="preset" bind:value={selectedPreset} on:change={applyPreset}><option value="">Choose a preset</option>{#each presets as preset, i}<option value={i}>{preset.title}</option>{/each}</select>{#if presets.length}<button type="button" class="text-button" on:click={deletePreset}>Delete selected preset</button>{/if}</div>{/if}
        <label for="title">Class or section name</label><input id="title" name="title" bind:value={classTitle} required minlength="2" maxlength="80" autocomplete="off" placeholder="Room 204 · Period 3" />
        <label for="prompt">Writing prompt</label><textarea id="prompt" name="prompt" bind:value={writingPrompt} required minlength="4" maxlength="240" rows="4" placeholder="How does the author use setting to shape the narrator's choice?"></textarea>
        <label for="retention">Delete this session after</label><select id="retention" name="retention"><option value="1">1 day</option><option value="7" selected>7 days</option><option value="30">30 days</option></select>
        {#if notice}<p class="success" role="status">{notice}</p>{/if}{#if error}<p class="form-error" role="alert">{error}</p>{/if}
        {#if license.active}<button type="button" class="text-button preset-save" on:click={savePreset}>Save as prompt preset</button>{/if}
        <button class="button primary" disabled={busy}>{busy ? 'Creating session…' : 'Create session code'}</button>
      </form>
      <p class="fine-print">Do not enter student names in the class name or prompt.</p>
    </section>
  {:else if path === '/join'}
    <section class="task-page section-shell narrow">
      <p class="eyebrow">Student entry</p><h1 tabindex="-1">Open your draft ticket</h1><p class="lede">Enter the six-character code from your teacher. You will use a class nickname, not your name.</p>
      <form class="code-form" on:submit={openCode}><label for="code">Session code</label><input id="code" bind:value={joinCode} inputmode="text" autocapitalize="characters" autocomplete="off" maxlength="7" placeholder="K7M2QF" /><button class="button primary">Open draft ticket</button>{#if error}<p class="form-error" role="alert">{error}</p>{/if}</form>
    </section>
  {:else if path.startsWith('/session/')}
    <section class="task-page section-shell narrow">
      <p class="eyebrow">Student ticket · {path.split('/').pop()}</p><h1 tabindex="-1">Record your drafting choices</h1>
      {#if session}
        <div class="prompt-slip"><strong>{session.title}</strong><p>{session.prompt}</p></div>
        {#if notice}<div class="success-panel" role="status"><span aria-hidden="true">✓</span><p>{notice}</p></div>
        {:else}
          <form class="ticket-form" on:submit={saveTicket}>
            <label for="pseudonym">Class nickname <span>Use the nickname your teacher assigned.</span></label><input id="pseudonym" name="pseudonym" required minlength="2" maxlength="40" autocomplete="off" />
            <label for="claim">Your working claim <span>What are you arguing now?</span></label><textarea id="claim" name="claim" required minlength="3" maxlength="280" rows="3"></textarea>
            <label for="evidence">Evidence location <span>Name a page, paragraph, scene, or source.</span></label><textarea id="evidence" name="evidence" required minlength="3" maxlength="280" rows="3"></textarea>
            <label for="revision">One revision choice <span>What did you add, cut, move, or clarify?</span></label><textarea id="revision" name="revision" required minlength="3" maxlength="280" rows="3"></textarea>
            <label for="reflection">Exit reflection <span>What needs work next?</span></label><textarea id="reflection" name="reflection" required minlength="3" maxlength="500" rows="3"></textarea>
            {#if error}<p class="form-error" role="alert">{error}</p>{/if}<button class="button primary" disabled={busy}>{busy ? 'Recording ticket…' : 'Record my draft ticket'}</button>
          </form>
        {/if}
      {:else if error}<div class="error-panel" role="alert"><p>{error}</p><a class="button secondary" href="/join" on:click={clickLink}>Enter another code</a></div>
      {:else}<div class="loading" role="status">Opening the draft ticket…</div>{/if}
    </section>
  {:else if path.startsWith('/teacher/')}
    <section class="teacher-page section-shell">
      <p class="eyebrow">Private teacher view</p><h1 tabindex="-1">Review this drafting session</h1>
      {#if teacherData}
        <div class="session-head"><div><span class="code-label">Student code</span><strong class="big-code">{teacherData.session.code}</strong><p>{teacherData.session.title} · Deletes {date(teacherData.session.expires_at)}</p></div><div class="toolbar"><button class="button secondary" on:click={() => copyTeacherLink(teacherData!)}>Copy teacher link</button><button class="button secondary" on:click={loadTeacherSession}>Refresh tickets</button><button class="button primary" on:click={() => exportCsv(teacherData!, localStorage.getItem(`teacher:${teacherData!.session.code}`) || '')}>Export CSV</button></div></div>
        <div class="teacher-prompt"><strong>Writing prompt</strong><p>{teacherData.session.prompt}</p></div>
        {#if notice}<p class="success" role="status">{notice}</p>{/if}{#if error}<p class="form-error" role="alert">{error}</p>{/if}
        <div class="response-heading"><h2>Draft tickets</h2><span>{teacherData.tickets.length} of 40</span></div>
        {#if teacherData.tickets.length === 0}<div class="empty-state"><span aria-hidden="true">●—○</span><h3>No tickets yet</h3><p>Share code <strong>{teacherData.session.code}</strong>. Student tickets will appear here after you refresh.</p></div>
        {:else}<ol class="response-list">{#each teacherData.tickets as ticket, i}<li class="response-ticket"><div class="response-meta"><span>{String(i+1).padStart(2,'0')}</span><strong>{ticket.pseudonym}</strong><time datetime={ticket.created_at}>{date(ticket.created_at)}</time></div><dl><div><dt>Claim</dt><dd>{ticket.claim}</dd></div><div><dt>Evidence location</dt><dd>{ticket.evidence}</dd></div><div><dt>Revision choice</dt><dd>{ticket.revision}</dd></div><div><dt>Exit reflection</dt><dd>{ticket.reflection}</dd></div></dl></li>{/each}</ol>{/if}
        <div class="danger-zone"><h2>Remove this session</h2><p>This deletes the prompt and every ticket now.</p><button class="button danger" on:click={() => removeSession(teacherData!, localStorage.getItem(`teacher:${teacherData!.session.code}`) || '')}>Delete this session</button></div>
      {:else if error}<div class="error-panel" role="alert"><p>{error}</p><a class="button secondary" href="/start" on:click={clickLink}>Create a new session</a></div>{:else}<div class="loading" role="status">Loading class tickets…</div>{/if}
    </section>
  {:else if path === '/demo'}
    <section class="teacher-page section-shell demo-page">
      <p class="eyebrow">Sample teacher view</p><h1 tabindex="-1">Review a sample draft session</h1><p class="lede">These three fictional tickets show the session sheet after an in-class draft.</p>
      {#if demoData}
        <div class="session-head"><div><span class="code-label">Sample code</span><strong class="big-code">{demoData.session.code}</strong><p>{demoData.session.title}</p></div><button class="button primary" on:click={() => exportCsv(demoData!, demoToken)}>Export sample CSV</button></div>
        <div class="teacher-prompt"><strong>Writing prompt</strong><p>{demoData.session.prompt}</p></div>
        {#if notice}<p class="success" role="status">{notice}</p>{/if}
        <div class="response-heading"><h2>Sample draft tickets</h2><span>{demoData.tickets.length} records</span></div>
        <ol class="response-list">{#each demoData.tickets as ticket, i}<li class="response-ticket"><div class="response-meta"><span>{String(i+1).padStart(2,'0')}</span><strong>{ticket.pseudonym}</strong></div><dl><div><dt>Claim</dt><dd>{ticket.claim}</dd></div><div><dt>Evidence location</dt><dd>{ticket.evidence}</dd></div><div><dt>Revision choice</dt><dd>{ticket.revision}</dd></div><div><dt>Exit reflection</dt><dd>{ticket.reflection}</dd></div></dl></li>{/each}</ol>
      {:else if error}<div class="error-panel" role="alert"><p>{error}</p><button class="button secondary" on:click={() => loadDemo(true)}>Reload sample data</button></div>{:else}<div class="loading" role="status">Plotting sample tickets…</div>{/if}
    </section>
  {:else if path === '/privacy'}
    <article class="legal section-shell narrow"><p class="eyebrow">Effective 28 August 2026</p><h1 tabindex="-1">Privacy in plain words</h1><p>In-Class Draft Ticket stores only what teachers and students enter.</p><h2>What we store</h2><p>We store the class name, writing prompt, class nicknames, ticket answers, and timestamps. We do not ask for student names, email addresses, or accounts.</p><h2>Why we store it</h2><p>The teacher uses this data to discuss and export in-class drafting choices. We do not use it to train models, target ads, or judge authorship.</p><h2>When we delete it</h2><p>The teacher chooses one, seven, or thirty days. The teacher can also delete a session at any time. Demo sessions expire after one day.</p><h2>Who receives it</h2><p>Session data stays on this service. A purchase sends payment details to Sociobot and Dodo, the merchant of record. We do not run analytics or third-party tracking.</p><h2>Your choices</h2><p>Teachers can export or delete a session from the private teacher view. Contact <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a> for a data request.</p></article>
  {:else if path === '/terms'}
    <article class="legal section-shell narrow"><p class="eyebrow">Effective 28 August 2026</p><h1 tabindex="-1">Terms of use</h1><p>Use this service to record drafting choices during a class. Do not use it to collect sensitive student data.</p><h2>Teacher responsibility</h2><p>Teachers choose prompts, class nicknames, and retention periods. Teachers must follow their school rules and applicable privacy law.</p><h2>What the ticket means</h2><p>A draft ticket is a teaching aid. It does not prove authorship, detect AI use, or replace a teacher's judgment.</p><h2>Service limits</h2><p>Free sessions accept up to 40 tickets. The service may be unavailable during maintenance. Export important sessions before their deletion date.</p><h2>Purchases and refunds</h2><p>The $24 teacher license is a one-time purchase. It adds local prompt presets. Sociobot handles the license, and Dodo is the merchant of record. A refund revokes the license.</p><h2>Warranty</h2><p>The service is provided as available without warranties. We are not liable for lost class work or indirect damages.</p></article>
  {:else}
    <section class="not-found section-shell narrow"><div class="lost-plot" aria-hidden="true">● · · · ○</div><p class="eyebrow">404 · Missing page</p><h1 tabindex="-1">This point is not connected</h1><p>The address does not lead to a draft session or page.</p><a class="button primary" href="/" on:click={clickLink}>Return home</a></section>
  {/if}
</main>

<footer class="site-footer"><div><strong>In-Class Draft Ticket</strong><p>Record in-class drafting without surveillance.</p></div><nav aria-label="Footer navigation"><a href="/privacy" on:click={clickLink}>Privacy</a><a href="/terms" on:click={clickLink}>Terms</a><a href="https://hello-factory.sociobot.in">Built by Param Factory <span class="sr-only">(external site)</span></a></nav><p class="build">v1.0 · Generated artwork</p></footer>

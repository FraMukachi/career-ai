/* ═══════════════════════════════════════════
   CAREERAI — app.js
   Built by Francis Mujakachi
═══════════════════════════════════════════ */

/* ── CONFIG ── */
var API_KEY    = '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';
var GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
var GROQ_MODEL = 'llama-3.3-70b-versatile';

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ── APP STATE ── */
var S = {
  cvText: '',
  cvFile: '',
  jobs:   {},
  sel:    null,
  docs:   { cover: '', resume: '', email: '', analysis: '', improved: '' },
  tab:    'cover'
};

/* ══════════════════════════════════════════
   SCROLL — parallax + nav + reveal
══════════════════════════════════════════ */
window.addEventListener('scroll', function () {
  var y = window.scrollY;

  /* Nav shadow */
  document.getElementById('nav').classList.toggle('scrolled', y > 40);

  /* Hero parallax */
  var hp = document.getElementById('heroParallax');
  if (hp) hp.style.transform = 'translateY(' + (y * 0.28) + 'px)';

  /* Scroll-reveal */
  document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) {
    if (el.getBoundingClientRect().top < window.innerHeight - 60)
      el.classList.add('visible');
  });
});

/* Initial reveal on load */
setTimeout(function () {
  document.querySelectorAll('.reveal').forEach(function (el) {
    if (el.getBoundingClientRect().top < window.innerHeight - 40)
      el.classList.add('visible');
  });
}, 200);

function smoothScroll(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function v(id)       { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
function set(id, val){ var e = document.getElementById(id); if (e) e.value = val || ''; }
function show(id)    { document.getElementById(id).classList.remove('hidden'); }
function hide(id)    { document.getElementById(id).classList.add('hidden'); }
function esc(s)      { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function log(msg, type) {
  var box = document.getElementById('logBox');
  var t   = new Date().toLocaleTimeString('en-ZA', { hour12: false });
  var d   = document.createElement('div');
  d.className = 'll';
  d.innerHTML = '<span class="lt">' + t + '</span><span class="m' + (type || 'i') + '">' + msg + '</span>';
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}

function setWiz(n) {
  for (var i = 1; i <= 5; i++) {
    var ws = document.getElementById('ws' + i);
    var wl = document.getElementById('wl' + i);
    if (i < n) {
      ws.className = 'ws done';
      ws.querySelector('.wn').textContent = '✓';
      if (wl) wl.classList.add('done');
    } else if (i === n) {
      ws.className = 'ws active';
      ws.querySelector('.wn').textContent = i;
    } else {
      ws.className = 'ws';
      ws.querySelector('.wn').textContent = i;
      if (wl) wl.classList.remove('done');
    }
  }
}

function setProg(pct, label) {
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('progPct').textContent  = pct + '%';
  if (label) document.getElementById('progLabel').textContent = label;
}

function getP() {
  return {
    name:    v('p-name')    || 'Your Name',
    email:   v('p-email')   || 'you@email.co.za',
    phone:   v('p-phone')   || '',
    years:   v('p-years')   || '3',
    title:   v('p-title')   || 'Professional',
    edu:     v('p-edu')     || '',
    skills:  v('p-skills')  || 'Various skills',
    certs:   v('p-certs')   || '',
    summary: v('p-summary') || 'Experienced professional.',
    ach:     v('p-ach')     || 'Notable achievements.',
    loc:     v('p-loc')     || 'South Africa',
    salary:  v('p-salary')  || 'Market related'
  };
}

/* ══════════════════════════════════════════
   GROQ API
══════════════════════════════════════════ */
async function groq(sys, usr, tok) {
  var r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
    body: JSON.stringify({
      model: GROQ_MODEL, max_tokens: tok || 1800, temperature: 0.7,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }]
    })
  });
  if (!r.ok) {
    var e = await r.json().catch(function () { return {}; });
    throw new Error((e.error && e.error.message) || 'Groq ' + r.status);
  }
  return (await r.json()).choices[0].message.content;
}

function parseObj(raw) {
  var c = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  var s = c.indexOf('{'), e = c.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('No JSON object in response');
  return JSON.parse(c.substring(s, e + 1));
}

function parseArr(raw) {
  var c = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  var s = c.indexOf('['), e = c.lastIndexOf(']');
  if (s < 0 || e < 0) throw new Error('No JSON array in response');
  return JSON.parse(c.substring(s, e + 1));
}

/* ══════════════════════════════════════════
   CV UPLOAD
══════════════════════════════════════════ */
function handleCV(file) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) { alert('File too large. Max 15 MB.'); return; }
  var ext = file.name.split('.').pop().toLowerCase();

  document.getElementById('uploadZone').style.display = 'none';
  show('cvLoadedWrap');
  document.getElementById('cvName').textContent    = 'Reading ' + file.name + '…';
  document.getElementById('cvMeta').textContent    = 'Extracting text…';
  document.getElementById('cvPreview').textContent = 'Please wait…';
  document.getElementById('analyseBtn').disabled   = true;
  S.cvFile = file.name;

  if (ext === 'txt') {
    var r = new FileReader();
    r.onload  = function (e) { cvReady(file.name, e.target.result); };
    r.onerror = function ()  { cvErr('Could not read TXT file.'); };
    r.readAsText(file);

  } else if (ext === 'pdf') {
    var fr = new FileReader();
    fr.onload = function (e) {
      var arr = new Uint8Array(e.target.result);
      pdfjsLib.getDocument({ data: arr }).promise.then(function (pdf) {
        var pages = [], done = 0, total = pdf.numPages;
        for (var i = 1; i <= total; i++) {
          (function (idx) {
            pdf.getPage(idx).then(function (pg) {
              return pg.getTextContent().then(function (tc) {
                pages[idx - 1] = tc.items.map(function (it) { return it.str; }).join(' ');
                done++;
                if (done === total) {
                  var t = pages.join('\n\n').replace(/ {3,}/g, ' ').trim();
                  if (!t || t.length < 30) cvErr('Scanned PDF — no text found. Save as .txt.');
                  else cvReady(file.name, t);
                }
              });
            }).catch(function () {
              done++;
              if (done === total) {
                var t = pages.filter(Boolean).join('\n').trim();
                if (t.length > 30) cvReady(file.name, t);
                else cvErr('Could not read PDF pages.');
              }
            });
          })(i);
        }
      }).catch(function (err) { cvErr('PDF error: ' + err.message); });
    };
    fr.onerror = function () { cvErr('Could not read PDF.'); };
    fr.readAsArrayBuffer(file);

  } else if (ext === 'docx' || ext === 'doc') {
    var fr2 = new FileReader();
    fr2.onload = function (e) {
      mammoth.extractRawText({ arrayBuffer: e.target.result })
        .then(function (res) {
          if (!res.value || res.value.length < 20) cvErr('No text in Word file. Try PDF or TXT.');
          else cvReady(file.name, res.value);
        })
        .catch(function (err) { cvErr('DOCX error: ' + err.message); });
    };
    fr2.onerror = function () { cvErr('Could not read DOCX.'); };
    fr2.readAsArrayBuffer(file);

  } else {
    cvErr('Unsupported format: .' + ext + '. Use PDF, DOCX, or TXT.');
  }
}

function cvReady(name, text) {
  S.cvText = text;
  var words = text.split(/\s+/).filter(Boolean).length;
  document.getElementById('cvName').textContent    = '✅  ' + name;
  document.getElementById('cvMeta').textContent    = words + ' words extracted';
  document.getElementById('cvPreview').textContent = text.substring(0, 480) + (text.length > 480 ? '\n\n[preview truncated]' : '');
  document.getElementById('analyseBtn').disabled   = false;
}

function cvErr(msg) {
  document.getElementById('cvName').textContent    = '⚠️  Error';
  document.getElementById('cvMeta').textContent    = msg;
  document.getElementById('cvPreview').textContent = msg;
  document.getElementById('analyseBtn').disabled   = true;
  S.cvText = '';
}

function resetAll() {
  S = { cvText: '', cvFile: '', jobs: {}, sel: null, docs: { cover: '', resume: '', email: '', analysis: '', improved: '' }, tab: 'cover' };
  document.getElementById('uploadZone').style.display = '';
  hide('cvLoadedWrap');
  document.getElementById('cvFileInput').value = '';
  hide('sec-analysis'); hide('sec-jobs'); hide('sec-output');
  setWiz(1);
}

/* ══════════════════════════════════════════
   STEP 2 — ANALYSE CV
══════════════════════════════════════════ */
async function analyseCV() {
  if (!S.cvText) { alert('No text extracted. Try a different file format.'); return; }
  var btn = document.getElementById('analyseBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spin"></span>&nbsp;Analysing…';

  show('sec-analysis');
  document.getElementById('logBox').innerHTML = '';
  document.getElementById('progWrap').classList.remove('hidden');
  setProg(5, 'Starting…');
  setWiz(2);
  log('CareerAI agent started', 'ai');
  log('File: ' + S.cvFile + ' (' + Math.round(S.cvText.length / 1000) + 'kb)', 'mi');

  try {
    setProg(20, 'Extracting profile from CV…');
    log('Extracting profile…', 'mi');

    var raw = await groq(
      'Extract structured data from a CV. Return ONLY valid JSON. No markdown.',
      'Extract all data into this JSON:\n' +
      '{"name":"","email":"","phone":"","title":"","years":"","edu":"","skills":"","certs":"","summary":"","ach":"","loc":"South Africa","salary":""}\n\n' +
      'Rules: years=number. skills=comma list. ach=bullet points with •. summary=2-3 sentences. Empty string if missing.\n\nCV:\n' +
      S.cvText.substring(0, 4000),
      900
    );

    var prof = parseObj(raw);
    var fm   = { name: 'p-name', email: 'p-email', phone: 'p-phone', title: 'p-title', years: 'p-years', edu: 'p-edu', skills: 'p-skills', certs: 'p-certs', summary: 'p-summary', ach: 'p-ach', loc: 'p-loc', salary: 'p-salary' };
    var filled = 0;
    Object.keys(fm).forEach(function (k) {
      if (prof[k] && String(prof[k]).trim()) { set(fm[k], prof[k]); filled++; }
    });

    log('Profile extracted — ' + filled + ' fields filled', 'ok');
    document.getElementById('profileCard').style.display = 'block';
    setProg(40, 'Finding matching jobs…');
    setTimeout(function () { document.getElementById('profileCard').classList.add('visible'); }, 100);
    await findJobs();

  } catch (err) {
    log('Error: ' + err.message, 'er');
    setProg(0, 'Failed: ' + err.message);
  }

  btn.disabled  = false;
  btn.innerHTML = '🤖 Analyse CV & Find Matching Jobs';
}

/* ══════════════════════════════════════════
   STEP 3 — FIND JOBS
══════════════════════════════════════════ */
async function findJobs() {
  var p = getP();
  setProg(55, 'Searching for matching jobs…');
  setWiz(3);
  log('Searching SA jobs for your CV…', 'ai');

  try {
    var raw = await groq(
      'You are a South African recruitment AI. Output ONLY a valid JSON array. No markdown.',
      'Generate 6 realistic SA job listings BEST MATCHING this candidate.\n\n' +
      'CANDIDATE: Title: ' + p.title + ' | Years: ' + p.years + ' | Skills: ' + p.skills +
      ' | Education: ' + p.edu + ' | Location: ' + p.loc + ' | Salary: ' + p.salary + '\n\n' +
      'JSON array of 6:\n' +
      '[{"id":"j1","title":"","company":"Real SA Company","location":"' + p.loc + '","salary":"R__–R__ pm","type":"Full-time","mode":"On-site","recruiter":"First Last","recruiterEmail":"hr@company.co.za","matchScore":91,"source":"LinkedIn","whyMatch":"2 sentences why this suits their CV exactly","description":"2 sentences about the role","requirements":["req1","req2","req3","req4","req5"]}]\n\n' +
      'Rules: Real SA companies. ZAR salaries. .co.za emails. matchScore 70-97. Vary sources: LinkedIn,Indeed,PNet,Careers24,CareerJunction,Job Mail.',
      1500
    );

    var jobs = parseArr(raw);
    if (!Array.isArray(jobs) || !jobs.length) throw new Error('No jobs returned. Try again.');
    jobs.sort(function (a, b) { return b.matchScore - a.matchScore; });
    S.jobs = {};
    jobs.forEach(function (j) { S.jobs[j.id] = j; });

    renderJobs(jobs, p.title);
    show('sec-jobs');
    show('sec-output');
    document.getElementById('jobsHead').textContent = '🎯  Matched to your CV — ' + p.title;
    document.getElementById('jobsCnt').textContent  = jobs.length + ' matches';
    setProg(100, 'Done — ' + jobs.length + ' jobs found');
    setWiz(3);
    log(jobs.length + ' jobs matched to your profile', 'ok');
    log('Click "Generate & Apply" on any listing', 'ok');

    setTimeout(function () {
      document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) { el.classList.add('visible'); });
      document.getElementById('sec-jobs').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);

  } catch (err) {
    log('Error: ' + err.message, 'er');
    setProg(0, 'Failed: ' + err.message);
  }
}

/* ══════════════════════════════════════════
   RENDER JOB CARDS
══════════════════════════════════════════ */
function scClass(s) { return s >= 85 ? 'shi' : s >= 70 ? 'smd' : 'slo'; }

function srcBadge(src) {
  var m = { linkedin: 'sb-li', indeed: 'sb-in', pnet: 'sb-pn', careers24: 'sb-c2', careerjunction: 'sb-cj', 'job mail': 'sb-jm' };
  return m[(src || '').toLowerCase()] || 'sb-ai';
}

function renderJobs(jobs) {
  var list = document.getElementById('jobsList');
  list.innerHTML = '';
  jobs.forEach(function (job, idx) {
    var tags = (job.requirements || []).slice(0, 5).map(function (r) {
      return '<span class="jtag">' + esc(r) + '</span>';
    }).join('');
    var card = document.createElement('div');
    card.className = 'jcard reveal';
    card.id = 'jc-' + job.id;
    card.style.animationDelay = (idx * 0.07) + 's';
    card.innerHTML =
      '<div class="jtop">' +
        '<div class="jbody">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">' +
            '<div class="jt">' + esc(job.title) + '</div>' +
            '<span class="sbadge ' + srcBadge(job.source) + '">' + esc(job.source) + '</span>' +
            (idx === 0 ? '<span class="sbadge sb-ai">⭐ Best Match</span>' : '') +
          '</div>' +
          '<div class="jco">' + esc(job.company) + ' · ' + esc(job.location) + '</div>' +
          '<div class="jmeta">' +
            '<span>' + esc(job.type) + '</span>' +
            '<span>' + esc(job.mode || '') + '</span>' +
            '<span>' + esc(job.salary) + '</span>' +
            '<span>' + esc(job.recruiter) + '</span>' +
          '</div>' +
          (job.whyMatch ? '<div class="jwhy">' + esc(job.whyMatch) + '</div>' : '') +
          '<div class="jtags">' + tags + '</div>' +
        '</div>' +
        '<div class="jscore">' +
          '<div class="jnum ' + scClass(job.matchScore) + '">' + job.matchScore + '%</div>' +
          '<div class="jlbl">Match</div>' +
        '</div>' +
      '</div>' +
      '<div class="jbtns">' +
        '<button class="btn btn-gold btn-sm" onclick="generateDocs(\'' + job.id + '\')">✨ Generate &amp; Apply</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="viewJob(\'' + job.id + '\')">Details</button>' +
      '</div>';
    list.appendChild(card);
  });

  setTimeout(function () {
    document.querySelectorAll('.jcard.reveal').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight - 40) el.classList.add('visible');
    });
  }, 100);
}

/* ══════════════════════════════════════════
   STEP 4 — GENERATE DOCS
══════════════════════════════════════════ */
async function generateDocs(jid) {
  var job = S.jobs[jid];
  if (!job) return;
  var p = getP();
  S.sel  = job;
  S.docs = { cover: '', resume: '', email: '', analysis: '', improved: '' };

  document.querySelectorAll('.jcard').forEach(function (c) { c.classList.remove('sel'); });
  var el = document.getElementById('jc-' + jid);
  if (el) el.classList.add('sel');

  setWiz(4);
  show('sec-output');
  switchTab('cover');
  setDoc('cover', '⏳  Writing cover letter…');
  document.getElementById('oActs').style.display    = 'none';
  document.getElementById('sendPanel').style.display = 'none';
  document.getElementById('coverCheck').style.display  = 'none';
  document.getElementById('resumeCheck').style.display = 'none';
  log('Generating package: ' + job.title + ' @ ' + job.company, 'ai');

  var reqs  = (job.requirements || []).join(', ');
  var cvCtx = S.cvText ? '\n\nORIGINAL CV:\n' + S.cvText.substring(0, 2000) : '';

  try {
    /* ── 1. Cover Letter ── */
    log('Writing cover letter…', 'mi');
    var cover = await groq(
      'Expert South African career coach. Write compelling, personalised cover letters tailored 100% to the specific job requirements. First person, confident, professional. No clichés. No generic openers.',
      'Write a professional cover letter tailored SPECIFICALLY to this job.\n\n' +
      'CANDIDATE:\nName: ' + p.name + '\nTitle: ' + p.title + '\nYears: ' + p.years +
      '\nSkills: ' + p.skills + '\nSummary: ' + p.summary + '\nAchievements: ' + p.ach + '\n\n' +
      'TARGET JOB:\nTitle: ' + job.title + '\nCompany: ' + job.company +
      '\nLocation: ' + job.location + '\nSalary: ' + job.salary +
      '\nDescription: ' + job.description + '\nKey Requirements: ' + reqs + '\n\n' +
      'INSTRUCTIONS:\n' +
      '• Open with a powerful hook that references the specific role and company\n' +
      '• Para 2: Connect specific candidate achievements directly to the job requirements — be concrete\n' +
      '• Para 3: Demonstrate knowledge of the company/sector and give a clear call to action\n' +
      '• Sign off professionally\n\n' +
      'Format:\nDear ' + job.recruiter + ',\n\n[Hook paragraph]\n\n[Achievement-to-requirements paragraph]\n\n[Company enthusiasm + CTA]\n\nKind regards,\n' +
      p.name + (p.phone ? '\n' + p.phone : '') + (p.email ? '\n' + p.email : ''),
      1000
    );
    S.docs.cover = cover;
    setDoc('cover', cover);
    log('Cover letter done', 'ok');

    /* ── 2. ATS Resume 100% tailored ── */
    log('Building ATS resume tailored 100% to ' + job.title + '…', 'ai');
    var resume = await groq(
      'Expert South African CV writer. Create ATS-optimised resumes tailored 100% to a specific job. Plain text. Mirror exact keywords from the job description.',
      'Write a complete ATS-optimised CV tailored 100% to this specific job.\n\n' +
      'CANDIDATE:\nName: ' + p.name + '\nEmail: ' + p.email + (p.phone ? '\nPhone: ' + p.phone : '') +
      '\nTitle: ' + p.title + '\nYears: ' + p.years +
      '\nEducation: ' + (p.edu || 'Relevant qualification') +
      '\nSkills: ' + p.skills + '\nSummary: ' + p.summary + '\nAchievements: ' + p.ach +
      (p.certs ? '\nCerts: ' + p.certs : '') + cvCtx + '\n\n' +
      'TARGET JOB:\nTitle: ' + job.title + '\nCompany: ' + job.company +
      '\nDescription: ' + job.description + '\nKEY REQUIREMENTS (mirror these EXACTLY): ' + reqs + '\n\n' +
      'ATS RULES:\n' +
      '• Professional summary must be written SPECIFICALLY for ' + job.title + ' at ' + job.company + '\n' +
      '• Include EVERY keyword from the requirements list\n' +
      '• Reframe experience to highlight relevance to this exact role\n' +
      '• Quantify all achievements: ZAR amounts, percentages, team sizes, time frames\n' +
      '• Use action verbs: Led, Delivered, Achieved, Managed, Developed, Implemented\n' +
      '• South African CV format\n\n' +
      'REQUIRED SECTIONS (use these exact headings):\n' +
      'CURRICULUM VITAE\nPERSONAL DETAILS\nPROFESSIONAL SUMMARY\nCORE COMPETENCIES\n' +
      'PROFESSIONAL EXPERIENCE\nEDUCATION & QUALIFICATIONS\nCERTIFICATIONS & LICENCES\nREFERENCES\n\n' +
      'End with: References available on request\n\nWrite the complete tailored CV now:',
      2000
    );
    S.docs.resume = resume;
    log('ATS resume built — tailored to ' + job.title, 'ok');

    /* ── 3. Email ── */
    log('Drafting recruiter email…', 'mi');
    var emailDraft = await groq(
      'SA recruiter email writer. Punchy, professional, under 150 words.',
      'Recruiter outreach email.\nFROM: ' + p.name + ' (' + p.title + ', ' + p.years + ' yrs)\n' +
      'TO: ' + job.recruiter + ' <' + job.recruiterEmail + '>\n' +
      'ROLE: ' + job.title + ' at ' + job.company + '\n\n' +
      'Format:\nSubject: [subject]\n\n[Hook]\n[Key achievement matching role]\n[Request 15-min call]\n\n' +
      'Please find my tailored cover letter and ATS resume attached as PDFs.\n\nKind regards,\n' +
      p.name + (p.phone ? '\n' + p.phone : '') + (p.email ? '\n' + p.email : ''),
      500
    );
    S.docs.email = emailDraft;
    log('Email drafted', 'ok');

    /* ── 4. Job Fit Analysis ── */
    log('Analysing job fit…', 'mi');
    var analysis = await groq(
      'Senior SA HR recruiter. Honest job fit analysis.',
      'Analyse fit:\nCANDIDATE: ' + p.title + ', ' + p.years + ' yrs, skills: ' + p.skills +
      (p.certs ? ', certs: ' + p.certs : '') +
      '\nJOB: ' + job.title + ' @ ' + job.company + '\nReqs: ' + reqs + '\n\nMATCH: ' + job.matchScore + '%\n\n' +
      'STRENGTHS\n•[1]\n•[2]\n•[3]\n\nGAPS\n•[gap+how to handle]\n•[gap+suggestion]\n\n' +
      'SALARY TIP\n[SA market]\n\nINTERVIEW FOCUS\n[2 sentences]\n\nEE/B-BBEE\n[SA note]\n\n' +
      'PRIORITY: HIGH/MEDIUM/LOW — [reason]',
      700
    );
    S.docs.analysis = analysis;
    log('Analysis done', 'ok');

    /* ── 5. Improved CV ── */
    if (S.cvText) {
      log('Improving original CV…', 'ai');
      var improved = await groq(
        'Expert SA CV writer. Improve and modernise. Plain text only.',
        'Improve this CV for ' + job.title + '.\n\nOriginal:\n' + S.cvText.substring(0, 2500) + '\n\n' +
        'Fix grammar, strengthen bullets, quantify achievements, improve summary, add ATS keywords for ' +
        job.title + '. SA format. Full improved CV:',
        1500
      );
      S.docs.improved = improved;
      log('CV improved', 'ok');
    }

    /* ── Pre-fill send panel ── */
    var lines = S.docs.email.split('\n');
    var sl    = lines.find(function (l) { return l.toLowerCase().startsWith('subject:'); });
    var subj  = sl ? sl.replace(/^subject:\s*/i, '') : 'Application: ' + job.title + ' at ' + job.company;
    set('sp-to',      job.recruiterEmail);
    set('sp-from',    p.email);
    set('sp-subject', subj);

    var safeName = (p.name.replace(/\s+/g, '_') || 'Candidate');
    var safeComp = (job.company.replace(/[^a-z0-9]/gi, '_') || 'Company');
    document.getElementById('coverPdfName').textContent  = safeName + '_Cover_Letter.pdf';
    document.getElementById('resumePdfName').textContent = safeName + '_ATS_Resume_' + safeComp + '.pdf';

    switchTab('cover');
    document.getElementById('oActs').style.display    = 'flex';
    document.getElementById('sendPanel').style.display = 'block';
    setWiz(5);
    log('Package ready! Download PDFs and attach to your email. 🇿🇦', 'ai');

    setTimeout(function () {
      document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) { el.classList.add('visible'); });
      document.getElementById('sec-output').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);

  } catch (err) {
    log('Error: ' + err.message, 'er');
    setDoc(S.tab, 'Error: ' + err.message);
  }
}

function viewJob(jid) {
  var j = S.jobs[jid];
  if (!j) return;
  S.docs.analysis =
    'JOB DETAILS\n' + '─'.repeat(44) + '\n\n' +
    '📌  Title:     ' + j.title     + '\n' +
    '🏢  Company:   ' + j.company   + '\n' +
    '📍  Location:  ' + j.location  + '\n' +
    '💰  Salary:    ' + j.salary    + '\n' +
    '💼  Type:      ' + j.type + ' · ' + (j.mode || '') + '\n' +
    '🌐  Source:    ' + j.source    + '\n' +
    '👤  Recruiter: ' + j.recruiter + '\n' +
    '📧  Email:     ' + j.recruiterEmail + '\n\n' +
    'DESCRIPTION\n' + (j.description || '') + '\n\n' +
    'WHY THIS MATCHES YOUR CV\n' + (j.whyMatch || '') + '\n\n' +
    'REQUIREMENTS\n' + (j.requirements || []).map(function (r) { return '• ' + r; }).join('\n') + '\n\n' +
    'MATCH: ' + j.matchScore + '%\n\n' + '─'.repeat(44) +
    '\nClick "Generate & Apply" to build your package.';
  show('sec-output');
  switchTab('analysis');
  setTimeout(function () { document.getElementById('sec-output').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200);
}

/* ══════════════════════════════════════════
   OUTPUT TABS
══════════════════════════════════════════ */
function switchTab(t) {
  S.tab = t;
  ['cover', 'resume', 'email', 'analysis', 'improved'].forEach(function (k) {
    document.getElementById('ot-' + k).classList.toggle('hidden', k !== t);
  });
  document.querySelectorAll('.otab').forEach(function (el, i) {
    el.classList.toggle('on', ['cover', 'resume', 'email', 'analysis', 'improved'][i] === t);
  });
  if (S.docs[t]) setDoc(t, S.docs[t]);
}

function setDoc(tab, text) {
  var el = document.getElementById('ot-' + tab);
  if (text) { el.className = 'ocontent'; el.textContent = text; }
  else      { el.className = 'ocontent empty'; }
}

function copyActive() {
  var c = S.docs[S.tab];
  if (!c) return;
  var b = event.target;
  (navigator.clipboard && navigator.clipboard.writeText
    ? navigator.clipboard.writeText(c)
    : Promise.resolve(fbCopy(c))
  ).then(function () {
    b.textContent = 'Copied ✓';
    setTimeout(function () { b.textContent = 'Copy'; }, 2000);
  });
}

function fbCopy(t) {
  var ta = document.createElement('textarea');
  ta.value = t; ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
}

function dlActiveTxt() {
  var c = S.docs[S.tab];
  if (!c) return;
  var labels = { cover: 'cover-letter', resume: 'ats-resume', email: 'email-draft', analysis: 'analysis', improved: 'improved-cv' };
  var pre    = S.sel ? S.sel.company.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' : '';
  dlTxt(pre + labels[S.tab] + '.txt', c);
}

function dlTxt(name, content) {
  var a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
  a.download = name; a.click();
}

/* ══════════════════════════════════════════
   PDF GENERATION — Cover Letter
══════════════════════════════════════════ */
function buildCoverLetterPDF() {
  if (!S.docs.cover || !S.sel) return null;
  var p       = getP();
  var doc     = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  var W       = 210, margin = 22, contentW = W - margin * 2, y = margin;

  /* Dark header block */
  doc.setFillColor(13, 13, 15);
  doc.rect(0, 0, W, 42, 'F');

  /* Gold accent rule */
  doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.8);
  doc.line(margin, 42, W - margin, 42);

  /* Candidate name */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(245, 244, 240);
  doc.text(p.name || 'Applicant', margin, 18);

  /* Title & contact */
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(180, 160, 100);
  doc.text(p.title || '', margin, 25);
  var contactParts = [];
  if (p.email) contactParts.push(p.email);
  if (p.phone) contactParts.push(p.phone);
  if (p.loc)   contactParts.push(p.loc);
  doc.text(contactParts.join('  ·  '), margin, 31);

  /* Date (right-aligned) */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(201, 168, 76);
  var today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(today, W - margin, 18, { align: 'right' });

  /* Recruiter / company (right-aligned) */
  doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 160, 100);
  doc.text(S.sel.recruiter || '', W - margin, 25, { align: 'right' });
  doc.text(S.sel.company   || '', W - margin, 31, { align: 'right' });

  y = 54;

  /* Subject line */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(13, 13, 15);
  doc.text('RE: Application — ' + S.sel.title, margin, y);
  y += 5;
  doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 80, y);
  y += 10;

  /* Body text */
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(30, 30, 35);
  var lineH = 5.8;
  S.docs.cover.split('\n').forEach(function (line) {
    if (y > 270) { doc.addPage(); y = margin; }
    if (!line.trim()) { y += 3; return; }
    doc.splitTextToSize(line, contentW).forEach(function (wl) {
      if (y > 278) { doc.addPage(); y = margin; }
      doc.text(wl, margin, y); y += lineH;
    });
  });

  /* Footer on every page */
  var tp = doc.internal.getNumberOfPages();
  for (var i = 1; i <= tp; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
    doc.line(margin, 287, W - margin, 287);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(160, 160, 160);
    doc.text('Generated by CareerAI · careerai.co.za · Built by Francis Mujakachi', W / 2, 293, { align: 'center' });
    if (tp > 1) doc.text('Page ' + i + ' of ' + tp, W - margin, 293, { align: 'right' });
  }
  return doc;
}

/* ══════════════════════════════════════════
   PDF GENERATION — ATS Resume
══════════════════════════════════════════ */
function buildResumePDF() {
  if (!S.docs.resume || !S.sel) return null;
  var p       = getP();
  var doc     = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  var W       = 210, margin = 20, contentW = W - margin * 2, y = margin;

  /* Dark header */
  doc.setFillColor(13, 13, 15); doc.rect(0, 0, W, 52, 'F');

  /* Gold left bar */
  doc.setFillColor(201, 168, 76); doc.rect(0, 0, 5, 52, 'F');

  /* Name */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(245, 244, 240);
  doc.text(p.name || 'Applicant', margin + 4, 20);

  /* Title in gold */
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(201, 168, 76);
  doc.text(p.title || '', margin + 4, 29);

  /* Contact row */
  doc.setFontSize(8.5); doc.setTextColor(180, 160, 100);
  var ci = [];
  if (p.email) ci.push('✉ ' + p.email);
  if (p.phone) ci.push('📞 ' + p.phone);
  if (p.loc)   ci.push('📍 ' + p.loc);
  doc.text(ci.join('   '), margin + 4, 37);

  /* "Tailored for" chip */
  doc.setFillColor(201, 168, 76); doc.setTextColor(13, 13, 15);
  doc.roundedRect(W - margin - 68, 15, 68, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('TAILORED FOR: ' + String(S.sel.title || '').substring(0, 24).toUpperCase(), W - margin - 65, 20.5);

  y = 60;

  var lineH = 5.2;
  var SECTIONS = [
    'CURRICULUM VITAE', 'PERSONAL DETAILS', 'PROFESSIONAL SUMMARY', 'CORE COMPETENCIES',
    'PROFESSIONAL EXPERIENCE', 'EDUCATION & QUALIFICATIONS', 'EDUCATION AND QUALIFICATIONS',
    'CERTIFICATIONS & LICENCES', 'CERTIFICATIONS AND LICENCES', 'REFERENCES'
  ];

  S.docs.resume.split('\n').forEach(function (line) {
    if (y > 278) { doc.addPage(); y = margin; }
    var trimmed = line.trim();

    /* Section header */
    var isSec = SECTIONS.some(function (h) { return trimmed.toUpperCase() === h; });
    if (isSec) {
      y += 3;
      if (y > 270) { doc.addPage(); y = margin; }
      doc.setFillColor(201, 168, 76); doc.rect(margin, y - 4, contentW, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(13, 13, 15);
      doc.text(trimmed.toUpperCase(), margin + 3, y + 0.5);
      y += 9;
      return;
    }

    if (!trimmed) { y += 2.5; return; }

    /* Bullet point */
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      var bullet  = trimmed.replace(/^[•\-]\s*/, '');
      var wrapped = doc.splitTextToSize(bullet, contentW - 8);
      doc.setFillColor(201, 168, 76); doc.circle(margin + 3, y - 1.5, 1, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(40, 40, 45);
      wrapped.forEach(function (wl) {
        if (y > 278) { doc.addPage(); y = margin; }
        doc.text(wl, margin + 7, y); y += lineH;
      });
      return;
    }

    /* Bold for date ranges / ALL-CAPS role lines */
    var isBold =
      (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 2) ||
      /\d{4}\s*[-–]\s*(\d{4}|present)/i.test(trimmed);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 10 : 9.5);
    doc.setTextColor(isBold ? 20 : 40, isBold ? 20 : 40, isBold ? 25 : 45);

    doc.splitTextToSize(trimmed, contentW).forEach(function (wl) {
      if (y > 278) { doc.addPage(); y = margin; }
      doc.text(wl, margin, y); y += lineH;
    });
  });

  /* Footer on every page */
  var tp = doc.internal.getNumberOfPages();
  for (var i = 1; i <= tp; i++) {
    doc.setPage(i);
    doc.setFillColor(13, 13, 15); doc.rect(0, 287, W, 10, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150, 130, 80);
    doc.text('CareerAI · ATS-Tailored Resume · For: ' + String(S.sel.title || '').substring(0, 30) + ' @ ' + String(S.sel.company || '').substring(0, 25), margin, 293);
    doc.setTextColor(100, 100, 100);
    doc.text('Page ' + i + ' of ' + tp + ' · Built by Francis Mujakachi', W - margin, 293, { align: 'right' });
  }
  return doc;
}

/* ══════════════════════════════════════════
   DOWNLOAD PDFs
══════════════════════════════════════════ */
function dlCoverPDF() {
  if (!S.docs.cover) { alert('Generate a package first.'); return; }
  var doc = buildCoverLetterPDF();
  if (!doc) { alert('Cover letter not ready.'); return; }
  var p = getP();
  doc.save((p.name.replace(/\s+/g, '_') || 'Candidate') + '_Cover_Letter.pdf');
  document.getElementById('coverCheck').style.display = 'inline';
}

function dlResumePDF() {
  if (!S.docs.resume) { alert('Generate a package first.'); return; }
  var doc = buildResumePDF();
  if (!doc) { alert('Resume not ready.'); return; }
  var p        = getP();
  var safeComp = S.sel ? S.sel.company.replace(/[^a-z0-9]/gi, '_') : 'Company';
  doc.save((p.name.replace(/\s+/g, '_') || 'Candidate') + '_ATS_Resume_' + safeComp + '.pdf');
  document.getElementById('resumeCheck').style.display = 'inline';
}

/* ══════════════════════════════════════════
   STEP 5 — SEND APPLICATION
══════════════════════════════════════════ */
function sendApplication() {
  if (!S.sel)                          { showStat('Please generate a package first.', false); return; }
  if (!S.docs.cover || !S.docs.resume) { showStat('Please click "Generate & Apply" on a job first.', false); return; }

  var to      = v('sp-to')      || S.sel.recruiterEmail;
  var subject = v('sp-subject') || 'Application: ' + S.sel.title + ' at ' + S.sel.company;
  var body    = S.docs.email.split('\n')
                  .filter(function (l) { return !l.toLowerCase().startsWith('subject:'); })
                  .join('\n').trim();

  /* Open mailto */
  window.open(
    'mailto:' + encodeURIComponent(to) +
    '?subject=' + encodeURIComponent(subject) +
    '&body='    + encodeURIComponent(body),
    '_blank'
  );

  /* Staggered PDF downloads */
  setTimeout(function () { dlCoverPDF();  }, 400);
  setTimeout(function () { dlResumePDF(); }, 1000);

  showStat('✅  Email client opened. Both PDFs are downloading — attach them and hit Send!', true);
  setWiz(5);
}

function showStat(msg, ok) {
  var el = document.getElementById('spStatus');
  el.textContent = msg;
  el.className   = 'sp-status ' + (ok ? 'ok' : 'err');
  el.style.display = 'block';
  setTimeout(function () { el.style.display = 'none'; }, 9000);
}

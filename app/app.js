// Leonida Trophy Guide — tracker logic. Loads app/data/trophies.json (a file of this
// app, never the network), renders the checklist grouped by roadmap stage, and keeps
// earned trophies in localStorage with export, import and a share link.

const DATA_URL = './data/trophies.json';
const STORAGE_KEY = 'leonida-trophy-guide-earned-v1';

const STAGES = [
  { n: 1, title: 'Story', blurb: 'Play the story in order: the four chapters, the final mission, the named missions, and the stranger strands.' },
  { n: 2, title: 'Leonida Open World', blurb: 'Exploration, activities, driving and combat across the state — stunts, races, the shooting range, fishing, arcade, bowling, meditation, hunting and the whole map.' },
  { n: 3, title: 'Collections & Money', blurb: 'Cards, WAiNK It, challenges, robberies, laundering, spending and properties.' },
  { n: 4, title: 'Cleanup & Platinum', blurb: 'The seven missables first — save before each moment — then 100% completion, and the platinum unlocks last.' },
];

const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const GRADE_LETTER = { platinum: 'PT', gold: 'G', silver: 'S', bronze: 'B' };

const $ = (id) => document.getElementById(id);

let trophies = [];
let earned = new Set();

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) earned = new Set(JSON.parse(raw).filter((id) => Number.isInteger(id)));
  } catch { earned = new Set(); }
  // A share link (?earned=1,2,3) pre-fills the checklist for a fresh reader.
  const params = new URLSearchParams(location.search);
  const shared = params.get('earned');
  if (shared) {
    const ids = shared.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n));
    if (ids.length) { earned = new Set(ids); saveEarned(); }
  }
}

function saveEarned() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b))); } catch { /* storage off */ }
}

function gradeCount(grade) {
  return trophies.filter((t) => t.grade === grade).length;
}
function gradeEarned(grade) {
  return trophies.filter((t) => t.grade === grade && earned.has(t.id)).length;
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  $('progress-text').textContent = `${done} / ${total} earned`;
  $('progress-pct').textContent = total ? `${Math.round((done / total) * 100)}%` : '0%';
  $('progress-fill').style.width = total ? `${(done / total) * 100}%` : '0%';
  $('grade-breakdown').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `<span>${GRADE_LABEL[g]}: <b>${gradeEarned(g)}/${gradeCount(g)}</b></span>`)
    .join('');
}

function renderRoadmap() {
  $('stage-list').innerHTML = STAGES.map((s) => {
    const count = trophies.filter((t) => t.stage === s.n).length;
    const done = trophies.filter((t) => t.stage === s.n && earned.has(t.id)).length;
    return `<li><h3><span class="stage-num">${s.n}</span>${s.title}</h3><p>${s.blurb}</p><span class="stage-count">${done}/${count} earned</span></li>`;
  }).join('');
}

function renderMissable() {
  const list = trophies.filter((t) => t.missable);
  $('missable-list').innerHTML = list.map((t) =>
    `<li><span class="missable-name">${escapeHtml(t.name)}</span> — ${escapeHtml(t.description)}</li>`).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function cardHtml(t) {
  const isEarned = earned.has(t.id);
  const pills = [
    `<span class="pill kind">${escapeHtml(t.kind)}</span>`,
    t.missable ? '<span class="pill missable">Missable</span>' : '',
    t.hidden ? '<span class="pill hidden-pill">Hidden</span>' : '',
  ].join('');
  const spoilerNote = (t.kind === 'story' && !isEarned)
    ? '<p class="spoiler-hint">Spoiler-safe mode hides this story trophy until it is earned.</p>' : '';
  return `<article class="trophy-card ${isEarned ? 'earned' : ''} ${t.kind === 'story' ? 'story-card' : ''}" data-id="${t.id}">
    <div class="trophy-head">
      <span class="grade-badge grade-${t.grade}" title="${GRADE_LABEL[t.grade]}">${GRADE_LETTER[t.grade]}</span>
      <h3 class="trophy-name">${escapeHtml(t.name)}</h3>
    </div>
    <div class="trophy-meta">${pills}</div>
    <p class="trophy-desc">${escapeHtml(t.description)}</p>
    <p class="trophy-guide"><span class="guide-label">Guide:</span> ${escapeHtml(t.guide)}</p>
    <p class="trophy-source">Source: ${escapeHtml(t.source)} · ${GRADE_LABEL[t.grade]}</p>
    ${spoilerNote}
    <div class="earn-row">
      <input type="checkbox" id="earn-${t.id}" data-trophy="${t.id}" ${isEarned ? 'checked' : ''}>
      <label for="earn-${t.id}">${isEarned ? 'Earned' : 'Mark as earned'}</label>
    </div>
  </article>`;
}

function currentFilters() {
  return {
    q: $('search').value.trim().toLowerCase(),
    kind: $('filter-kind').value,
    grade: $('filter-grade').value,
    earned: $('filter-earned').value,
    missableOnly: $('filter-missable').checked,
  };
}

function matches(t, f) {
  if (f.kind !== 'all' && t.kind !== f.kind) return false;
  if (f.grade !== 'all' && t.grade !== f.grade) return false;
  if (f.earned === 'earned' && !earned.has(t.id)) return false;
  if (f.earned === 'unearned' && earned.has(t.id)) return false;
  if (f.missableOnly && !t.missable) return false;
  if (f.q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
    if (!hay.includes(f.q)) return false;
  }
  return true;
}

function renderSections() {
  const f = currentFilters();
  const wrap = $('trophy-sections');
  let html = '';
  let shown = 0;
  for (const s of STAGES) {
    const list = trophies.filter((t) => t.stage === s.n && matches(t, f));
    if (!list.length) continue;
    shown += list.length;
    const done = list.filter((t) => earned.has(t.id)).length;
    html += `<h2 class="stage-heading">Stage ${s.n} — ${s.title}</h2>
      <p class="stage-sub">${escapeHtml(s.blurb)} (${done}/${list.length} shown earned)</p>
      <div class="trophy-grid">${list.map(cardHtml).join('')}</div>`;
  }
  wrap.innerHTML = html;
  $('empty-note').hidden = shown > 0;
  wrap.querySelectorAll('input[data-trophy]').forEach((box) => {
    box.addEventListener('change', () => {
      const id = Number(box.dataset.trophy);
      if (box.checked) earned.add(id); else earned.delete(id);
      saveEarned();
      renderProgress();
      renderRoadmap();
      renderSections();
    });
  });
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderMissable();
  renderSections();
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function note(msg) {
  $('tool-note').textContent = msg;
  setTimeout(() => { if ($('tool-note').textContent === msg) $('tool-note').textContent = ''; }, 4000);
}

function wireTools() {
  $('btn-export').addEventListener('click', () => {
    download('leonida-trophies-earned.json', JSON.stringify({ earned: [...earned].sort((a, b) => a - b) }, null, 2));
    note(`Exported ${earned.size} earned trophies.`);
  });
  $('btn-import').addEventListener('click', () => $('file-import').click());
  $('file-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const ids = Array.isArray(data) ? data : data.earned;
      const valid = new Set(trophies.map((t) => t.id));
      const kept = ids.filter((id) => valid.has(Number(id))).map(Number);
      earned = new Set(kept);
      saveEarned();
      renderAll();
      note(`Imported ${kept.length} earned trophies.`);
    } catch {
      note('That file is not valid earned-trophy JSON.');
    }
    e.target.value = '';
  });
  $('btn-share').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?earned=${[...earned].sort((a, b) => a - b).join(',')}`;
    try {
      await navigator.clipboard.writeText(url);
      note('Share link copied.');
    } catch {
      prompt('Copy this share link:', url);
    }
  });
  $('btn-reset').addEventListener('click', () => {
    if (!confirm('Clear all earned trophies?')) return;
    earned = new Set();
    saveEarned();
    renderAll();
    note('Progress reset.');
  });
  ['search', 'filter-kind', 'filter-grade', 'filter-earned', 'filter-missable'].forEach((id) => {
    $(id).addEventListener('input', renderSections);
    $(id).addEventListener('change', renderSections);
  });
  $('spoiler-safe').addEventListener('change', (e) => {
    document.body.classList.toggle('spoiler-safe', e.target.checked);
    note(e.target.checked ? 'Spoiler-safe on: un-earned story trophies are blurred.' : 'Spoiler-safe off.');
  });
}

function applyDeepLinks() {
  // Deep links for sharing a view: ?spoiler=1 turns spoiler-safe mode on and
  // checks its box; ?missable=1 checks the missable-only filter; ?view=cards
  // hides the roadmap and missable callout for a focused checklist view.
  const params = new URLSearchParams(location.search);
  if (params.get('spoiler') === '1') {
    $('spoiler-safe').checked = true;
    document.body.classList.add('spoiler-safe');
  }
  if (params.get('missable') === '1') $('filter-missable').checked = true;
  if (params.get('view') === 'cards') document.body.classList.add('compact-view');
}

async function boot() {
  loadEarned();
  try {
    const res = await fetch(DATA_URL);
    const data = await res.json();
    trophies = data.trophies || data;
  } catch {
    trophies = [];
  }
  wireTools();
  applyDeepLinks();
  renderAll();
}

boot();

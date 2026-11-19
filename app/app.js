// Leonida Trophy Guide: checklist + tracker for the 55 GTA VI trophies on PS5.
// Progress lives in localStorage; export/import/share move it as a JSON file or a link.
// The app fetches only its own data/trophies.json and makes no network request.
const KEY = 'leonida-trophy-guide-v1';
const params = new URLSearchParams(location.search);
const cardsEl = document.getElementById('cards');
const searchEl = document.getElementById('search');
const kindEl = document.getElementById('kind');
const gradeEl = document.getElementById('grade');
const showEl = document.getElementById('show');
const spoilerEl = document.getElementById('spoiler');
const countLine = document.getElementById('countLine');
const emptyNote = document.getElementById('emptyNote');

let earned = new Set();
try { earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { earned = new Set(); }
// Share-progress links: ?earned=2,5,7 merges those trophy ids into the saved set.
if (params.get('earned')) {
  for (const raw of params.get('earned').split(',')) {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= 55) earned.add(n);
  }
}

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
// Merge shared ids that are names (older links used names); ignore unknown ones.
if (params.get('earnedNames')) {
  for (const name of params.get('earnedNames').split('|')) {
    const hit = trophies.find((t) => t.name === name);
    if (hit) earned.add(hit.id);
  }
}

const STAGES = [
  { n: 1, title: 'Story playthrough', text: 'Chapters 1–4, the opening and final missions, and the story moments. Nothing here is missable.' },
  { n: 2, title: 'Side strands & activities', text: 'Character strands (Andy, Kenton, Billy, Randy, Tyrone), Strangers & Freaks, races, shooting, fishing and the rest. Do the 7 missable ones carefully.' },
  { n: 3, title: 'Collectibles & exploration', text: 'Meditation spots, card sets, WAiNK locations, vehicles, areas, garages and the Scooter Bros app.' },
  { n: 4, title: 'Platinum', text: '100% completion, then the platinum pops on its own.' },
];

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function gradeLabel(g) {
  return g[0].toUpperCase() + g.slice(1);
}

function isStory(t) {
  return t.kind === 'story';
}

function matches(t) {
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
  const k = kindEl.value;
  if (k === 'story' && !isStory(t)) return false;
  if (k === 'missable' && !t.missable) return false;
  if (k === 'collectibles' && t.kind !== 'collectibles') return false;
  if (k === 'activities' && t.kind !== 'activities') return false;
  if (k === 'online') return false; // No online trophies in the official list.
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (showEl.value === 'earned' && !earned.has(t.id)) return false;
  if (showEl.value === 'unearned' && earned.has(t.id)) return false;
  return true;
}

function renderRoadmap() {
  const ol = document.getElementById('stages');
  ol.replaceChildren();
  for (const s of STAGES) {
    const items = trophies.filter((t) => t.roadmap === s.n);
    const done = items.filter((t) => earned.has(t.id)).length;
    const li = document.createElement('li');
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = `Stage ${s.n} · ${done}/${items.length}`;
    const h = document.createElement('h3');
    h.textContent = s.title;
    const p = document.createElement('p');
    p.textContent = s.text;
    li.append(num, h, p);
    ol.append(li);
  }
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  const pct = Math.round((n / total) * 100);
  document.getElementById('progressText').textContent = `${n} of ${total} earned`;
  document.getElementById('progressPct').textContent = `${pct}%`;
  document.getElementById('progressFill').style.width = `${pct}%`;
  const parts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return `${gradeLabel(g)} ${got}/${all}`;
  });
  document.getElementById('gradeCounts').textContent = parts.join(' · ');
}

function render() {
  renderRoadmap();
  renderProgress();
  cardsEl.replaceChildren();
  let shown = 0;
  const spoilerOn = spoilerEl.checked;
  for (const t of trophies) {
    if (!matches(t)) continue;
    shown += 1;
    const has = earned.has(t.id);
    const card = document.createElement('article');
    card.className = 'card' + (has ? ' earned' : '');
    if (spoilerOn && isStory(t) && !has) card.classList.add('spoiler-hidden');
    card.dataset.id = String(t.id);

    const head = document.createElement('div');
    head.className = 'card-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = has;
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      save();
      render();
    });
    const title = document.createElement('div');
    title.className = 'card-title';
    const h = document.createElement('h3');
    h.textContent = t.name;
    const d = document.createElement('p');
    d.className = 'desc';
    d.textContent = t.description;
    title.append(h, d);
    const badge = document.createElement('span');
    badge.className = `badge ${t.grade}`;
    badge.textContent = gradeLabel(t.grade);
    head.append(box, title, badge);

    const tags = document.createElement('div');
    tags.className = 'tags';
    const kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = t.kind === 'story' ? 'Story' : t.kind === 'activities' ? 'Activities' : 'Collectibles';
    tags.append(kindTag);
    const stageTag = document.createElement('span');
    stageTag.className = 'tag';
    stageTag.textContent = `Roadmap stage ${t.roadmap}`;
    tags.append(stageTag);
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'tag missable';
      m.textContent = 'Missable — do it during the mission or attempt';
      tags.append(m);
    }

    const guide = document.createElement('details');
    guide.className = 'guide';
    const sum = document.createElement('summary');
    sum.textContent = 'Guide & sources';
    const gp = document.createElement('p');
    gp.textContent = t.guide;
    const src = document.createElement('p');
    src.className = 'sources';
    const label = document.createElement('span');
    label.textContent = 'Sources: ';
    src.append(label, document.createTextNode(t.sources.join('; ')));
    guide.append(sum, gp, src);

    card.append(head, tags, guide);
    cardsEl.append(card);
  }
  emptyNote.hidden = shown !== 0;
  const missableTotal = trophies.filter((t) => t.missable).length;
  const missableGot = trophies.filter((t) => t.missable && earned.has(t.id)).length;
  countLine.textContent = kindEl.value === 'online'
    ? 'The official list holds no online trophies, so this filter is empty by design.'
    : `Showing ${shown} of ${trophies.length} trophies · Missable flagged: ${missableGot}/${missableTotal} earned.`;
}

// Deep links: ?kind=, ?grade=, ?spoiler=on, ?q=, ?open=<id> (expands that guide),
// ?compact=1 (hides the roadmap for a focused list view).
if (params.get('compact') === '1') {
  const roadmap = document.querySelector('.roadmap');
  if (roadmap) roadmap.style.display = 'none';
}
if (params.get('kind') && ['story', 'missable', 'collectibles', 'activities', 'online'].includes(params.get('kind'))) kindEl.value = params.get('kind');
if (params.get('grade') && ['platinum', 'gold', 'silver', 'bronze'].includes(params.get('grade'))) gradeEl.value = params.get('grade');
if (params.get('q')) searchEl.value = params.get('q');
if (params.get('spoiler') === 'on') spoilerEl.checked = true;

for (const el of [searchEl, kindEl, gradeEl, showEl, spoilerEl]) {
  el.addEventListener('input', render);
  el.addEventListener('change', render);
}

document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort((x, y) => x - y) }, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    const next = new Set();
    for (const n of ids ?? []) if (Number.isInteger(n) && byId.has(n)) next.add(n);
    earned = next;
    save();
    render();
  } catch {
    alert('That file is not a valid progress export.');
  }
  e.target.value = '';
});
document.getElementById('share').addEventListener('click', async () => {
  const url = `${location.origin}${location.pathname}?earned=${[...earned].sort((a, b) => a - b).join(',')}`;
  try {
    await navigator.clipboard.writeText(url);
    document.getElementById('share').textContent = 'Link copied!';
    setTimeout(() => { document.getElementById('share').textContent = 'Copy share link'; }, 2000);
  } catch {
    prompt('Copy your share link:', url);
  }
});
document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies?')) return;
  earned = new Set();
  save();
  render();
});

save();
render();

// Open one guide for a deep link (?open=<id>), after the first render.
const openId = Number(params.get('open'));
if (Number.isInteger(openId) && byId.has(openId)) {
  const card = cardsEl.querySelector(`[data-id="${openId}"]`);
  const details = card?.querySelector('details.guide');
  if (details) {
    details.open = true;
  }
}

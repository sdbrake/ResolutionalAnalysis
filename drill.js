// ===== CONFIG =====
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbxJwwCQXDbQySLUYjF4n6JVTpz3lBpzGiKnutbRKEmZXLl5F3r3K8aWeGIUA9LlIw-2Dw/exec';
const SECRET   = 'toadstools'; // must match the Apps Script
// ==================

let queue = [];      // shuffled resolutions
let current = null;
let shownAt = 0;
let answered = 0;
let debater = '';

const $ = id => document.getElementById(id);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function loadResolutions() {
  const res = await fetch('res.json');
  const data = await res.json();
  queue = shuffle(data.slice());
}

function nextCard() {
  if (queue.length === 0) {
    $('card').textContent = 'Done — you went through every resolution! Reload to go again.';
    return;
  }
  current = queue.pop();
  $('card').textContent = current.text;
  $('notes').value = '';
  $('confidence').value = '';
  shownAt = performance.now();
  $('count').textContent = `Answered: ${answered} · Remaining: ${queue.length}`;
}

function record(choice) {
  if (!current) return;
  const payload = {
    secret: SECRET,
    debater,
    resolution: current.text,
    tags: (current.tags || []).join(','),
    choice,
    confidence: $('confidence').value,
    notes: $('notes').value,
    ms_to_answer: Math.round(performance.now() - shownAt)
  };

  answered += (choice === 'SKIP' ? 0 : 1);

  // Fire-and-forget so the UI feels instant.
  fetch(ENDPOINT, {
    method: 'POST',
    // 'text/plain' avoids a CORS preflight that Apps Script doesn't handle well
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).then(() => {
    $('status').textContent = 'Saved ✓';
  }).catch(() => {
    $('status').textContent = '⚠ Could not save (logged locally).';
    // fallback: keep a local copy so nothing is lost
    const backup = JSON.parse(localStorage.getItem('drill_backup') || '[]');
    backup.push(payload);
    localStorage.setItem('drill_backup', JSON.stringify(backup));
  });

  nextCard();
}

$('start').addEventListener('click', async () => {
  debater = $('debater').value.trim() || 'anonymous';
  $('setup').style.display = 'none';
  $('drill').style.display = 'block';
  $('card').textContent = 'Loading resolutions…';
  await loadResolutions();
  nextCard();
});

$('affBtn').addEventListener('click', () => record('AFF'));
$('negBtn').addEventListener('click', () => record('NEG'));
$('skipBtn').addEventListener('click', () => record('SKIP'));

// Keyboard shortcuts: A = AFF, N = NEG, S = skip
document.addEventListener('keydown', e => {
  if ($('drill').style.display === 'none') return;
  if (document.activeElement.tagName === 'TEXTAREA') return;
  if (e.key.toLowerCase() === 'a') record('AFF');
  if (e.key.toLowerCase() === 'n') record('NEG');
  if (e.key.toLowerCase() === 's') record('SKIP');
});

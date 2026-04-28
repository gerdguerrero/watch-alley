// Watch Alley admin client.
// Auth via Supabase Auth (email + password). Authorization via watch_alley.admin_emails
// allowlist (checked server-side inside SECURITY DEFINER RPCs). The page never
// writes to the watches table directly.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Replace these two values with the real anon credentials from your Watch Alley
// Supabase project. They are intentionally left as placeholders right now because
// the original project (trqgzrylysybgipcejwe) was the wrong tenant. The admin
// page surfaces a "configure Supabase" notice until both values are filled in.
const SUPABASE_URL = 'https://YOUR-NEW-PROJECT-REF.supabase.co';
const SUPABASE_ANON_KEY = '';

const PLACEHOLDER_URL_HOST = 'YOUR-NEW-PROJECT-REF';
const isConfigured = !SUPABASE_URL.includes(PLACEHOLDER_URL_HOST) && SUPABASE_ANON_KEY.length > 0;

const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

const els = {
  status: document.getElementById('admin-status'),
  authPanel: document.getElementById('auth-panel'),
  authForm: document.getElementById('auth-form'),
  authEmail: document.getElementById('auth-email'),
  authPassword: document.getElementById('auth-password'),
  forbiddenPanel: document.getElementById('forbidden-panel'),
  forbiddenEmail: document.getElementById('forbidden-email'),
  forbiddenSignout: document.getElementById('forbidden-signout'),
  unconfiguredPanel: document.getElementById('unconfigured-panel'),
  workspace: document.getElementById('workspace-panel'),
  signoutLink: document.getElementById('admin-signout-link'),
  watchList: document.getElementById('watch-list'),
  watchCount: document.getElementById('watch-count'),
  watchFilter: document.getElementById('watch-filter'),
  newBtn: document.getElementById('new-watch-btn'),
  detailEmpty: document.getElementById('admin-detail-empty'),
  watchForm: document.getElementById('watch-form'),
  cancelBtn: document.getElementById('cancel-btn'),
  deleteBtn: document.getElementById('delete-btn'),
  markSoldBtn: document.getElementById('mark-sold-btn'),
  soldFieldset: document.getElementById('sold-fieldset'),
};

// Track state.
let authMode = 'signin';
let allWatches = [];
let activeId = null;
let activeWatchSnapshot = null;

function setStatus(message, tone) {
  els.status.textContent = message || '';
  if (tone) els.status.dataset.tone = tone;
  else els.status.removeAttribute('data-tone');
}

// ---------------- Auth flow ----------------

els.authForm.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-mode]');
  if (btn) authMode = btn.dataset.mode;
});

els.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) return;

  setStatus(authMode === 'signup' ? 'Creating account…' : 'Signing in…');
  try {
    const fn = authMode === 'signup'
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { data, error } = await fn;
    if (error) throw error;

    if (authMode === 'signup' && !data.session) {
      setStatus('Sign-up successful. Check your email for the confirmation link, then sign in.', 'success');
      authMode = 'signin';
      return;
    }
    setStatus('Signed in.', 'success');
    await renderForCurrentSession();
  } catch (error) {
    setStatus(error.message || 'Sign-in failed', 'error');
  }
});

async function signOut() {
  if (supabase) await supabase.auth.signOut();
  els.authEmail.value = '';
  els.authPassword.value = '';
  setStatus('Signed out.');
  await renderForCurrentSession();
}

els.signoutLink.addEventListener('click', (event) => { event.preventDefault(); signOut(); });
els.forbiddenSignout.addEventListener('click', signOut);

if (supabase) {
  supabase.auth.onAuthStateChange(() => {
    // Re-render whenever the session changes (token refresh, sign-in, sign-out).
    renderForCurrentSession();
  });
}

// ---------------- Authorization gate ----------------

async function renderForCurrentSession() {
  if (!supabase) {
    showOnly('unconfigured');
    setStatus('Supabase project not configured yet.', 'error');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    showOnly('auth');
    return;
  }
  // Ask the server whether this email is on the allowlist.
  const { data, error } = await supabase.rpc('admin_whoami');
  if (error) {
    setStatus(`whoami failed: ${error.message}`, 'error');
    showOnly('auth');
    return;
  }
  if (!data?.is_admin) {
    els.forbiddenEmail.textContent = data?.email || session.user?.email || '(unknown)';
    showOnly('forbidden');
    return;
  }
  showOnly('workspace');
  await loadWatches();
}

function showOnly(panel) {
  els.authPanel.hidden = panel !== 'auth';
  els.forbiddenPanel.hidden = panel !== 'forbidden';
  els.workspace.hidden = panel !== 'workspace';
  if (els.unconfiguredPanel) els.unconfiguredPanel.hidden = panel !== 'unconfigured';
  els.signoutLink.hidden = panel === 'auth' || panel === 'unconfigured';
}

// ---------------- Inventory list ----------------

async function loadWatches() {
  setStatus('Loading inventory…');
  const { data, error } = await supabase
    .from('watches')
    .select('*')
    .order('status', { ascending: true })
    .order('display_order', { ascending: true });
  if (error) {
    setStatus(`Failed to load watches: ${error.message}`, 'error');
    return;
  }
  allWatches = data || [];
  renderList();
  setStatus('');
}

function renderList() {
  const filter = (els.watchFilter.value || '').trim().toLowerCase();
  const filtered = !filter ? allWatches : allWatches.filter((w) => {
    return [w.brand, w.model, w.slug, w.reference, w.name]
      .some((field) => String(field || '').toLowerCase().includes(filter));
  });

  els.watchCount.textContent = `${filtered.length} of ${allWatches.length}`;
  els.watchList.innerHTML = '';
  for (const w of filtered) {
    const li = document.createElement('li');
    if (w.id === activeId) li.classList.add('is-active');
    li.innerHTML = `
      <button type="button" data-id="${escapeAttr(w.id)}">
        <div class="admin-row-name">${escapeHtml(w.name || w.slug || w.id)}</div>
        <div class="admin-row-meta">
          <span>${escapeHtml(w.brand || '')}</span>
          <span class="admin-status-pill" data-status="${escapeAttr(w.status)}">${escapeHtml(w.status)} · ₱${formatPrice(w.price)}</span>
        </div>
      </button>
    `;
    els.watchList.appendChild(li);
  }
}

els.watchFilter.addEventListener('input', renderList);

els.watchList.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-id]');
  if (!btn) return;
  const id = btn.dataset.id;
  const watch = allWatches.find((w) => w.id === id);
  if (watch) loadIntoForm(watch);
});

// ---------------- Form ----------------

els.newBtn.addEventListener('click', () => {
  loadIntoForm(null);
});

els.cancelBtn.addEventListener('click', () => {
  hideForm();
});

els.watchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveCurrentForm();
});

els.deleteBtn.addEventListener('click', async () => {
  if (!activeId) return;
  if (!confirm(`Delete ${activeId}? This cannot be undone.`)) return;
  setStatus('Deleting…');
  const { error } = await supabase.rpc('admin_delete_watch', { watch_id: activeId });
  if (error) {
    setStatus(`Delete failed: ${error.message}`, 'error');
    return;
  }
  setStatus('Deleted. Run pnpm sync:watches to update the live site.', 'success');
  hideForm();
  await loadWatches();
});

els.markSoldBtn.addEventListener('click', async () => {
  if (!activeId) return;
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const soldAt = prompt('Sold at (YYYY-MM)', defaultMonth);
  if (!soldAt) return;
  if (!/^[0-9]{4}-[0-9]{2}$/.test(soldAt)) {
    setStatus('Sold at must be YYYY-MM', 'error');
    return;
  }
  const soldPriceRaw = prompt('Sold price (PHP integer)', activeWatchSnapshot?.price ?? '');
  if (soldPriceRaw == null) return;
  const soldPrice = Number(soldPriceRaw);
  if (!Number.isFinite(soldPrice) || soldPrice < 0) {
    setStatus('Sold price must be a non-negative integer', 'error');
    return;
  }
  setStatus('Marking sold…');
  const { error } = await supabase.rpc('admin_mark_watch_sold', {
    watch_id: activeId,
    sold_at_value: soldAt,
    sold_price_value: Math.round(soldPrice),
  });
  if (error) {
    setStatus(`Mark sold failed: ${error.message}`, 'error');
    return;
  }
  setStatus('Marked sold. Run pnpm sync:watches to update the live site.', 'success');
  await loadWatches();
  const refreshed = allWatches.find((w) => w.id === activeId);
  if (refreshed) loadIntoForm(refreshed);
});

function hideForm() {
  els.watchForm.hidden = true;
  els.detailEmpty.hidden = false;
  els.deleteBtn.hidden = true;
  els.markSoldBtn.hidden = true;
  activeId = null;
  activeWatchSnapshot = null;
  document.querySelectorAll('.admin-watch-list li.is-active').forEach((el) => el.classList.remove('is-active'));
}

function loadIntoForm(watch) {
  els.detailEmpty.hidden = true;
  els.watchForm.hidden = false;
  activeId = watch?.id || null;
  activeWatchSnapshot = watch ? { ...watch } : null;

  setField('id', watch?.id || '');
  setField('slug', watch?.slug || '');
  setField('status', watch?.status || 'available');
  setField('brand', watch?.brand || '');
  setField('reference', watch?.reference || '');
  setField('model', watch?.model || '');
  setField('name', watch?.name || '');
  setField('price', watch?.price ?? '');
  setField('badge', watch?.badge || '');
  setField('conditionLabel', watch?.condition_label || '');
  setField('movement', watch?.movement || '');
  setField('caseSize', watch?.case_size || '');
  setField('material', watch?.material || '');
  setField('set', watch?.inclusion_set || '');
  setField('edition', watch?.edition || '');
  setField('description', watch?.description || '');
  setField('disclosure', watch?.disclosure || '');
  setField('primaryImage', watch?.primary_image || '');
  setField('images', Array.isArray(watch?.images) ? watch.images.join('\n') : '');
  setField('inquirySubject', watch?.inquiry_subject || '');
  setField('inquiryBody', watch?.inquiry_body || '');
  setField('soldAt', watch?.sold_at || '');
  setField('soldPrice', watch?.sold_price ?? '');
  setField('serviceHistory', watch?.service_history || '');
  setField('displayOrder', watch?.display_order ?? '');

  setCheckbox('hasBox', watch?.has_box === true);
  setCheckbox('hasPapers', watch?.has_papers === true);
  setCheckbox('featured', watch?.featured === true);
  setCheckbox('lowStock', watch?.low_stock === true);

  const isExisting = !!watch;
  els.deleteBtn.hidden = !isExisting;
  els.markSoldBtn.hidden = !isExisting || watch.status === 'sold';

  // highlight in the sidebar
  document.querySelectorAll('.admin-watch-list li').forEach((li) => {
    const btn = li.querySelector('button[data-id]');
    li.classList.toggle('is-active', !!btn && btn.dataset.id === activeId);
  });
}

async function saveCurrentForm() {
  const submitBtn = els.watchForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  try {
    const payload = collectFormPayload();
    setStatus('Saving…');
    const { data, error } = await supabase.rpc('admin_upsert_watch', { payload });
    if (error) throw error;
    setStatus('Saved. Run pnpm sync:watches to update the live site.', 'success');
    await loadWatches();
    if (data && data.id) {
      const refreshed = allWatches.find((w) => w.id === data.id);
      if (refreshed) loadIntoForm(refreshed);
    }
  } catch (error) {
    setStatus(`Save failed: ${error.message}`, 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function collectFormPayload() {
  const status = getField('status');
  const imagesText = getField('images') || '';
  const images = imagesText.split('\n').map((s) => s.trim()).filter(Boolean);
  let primaryImage = getField('primaryImage').trim();
  if (!primaryImage && images.length) primaryImage = images[0];

  if (!images.length) {
    throw new Error('Add at least one image path under "All image paths".');
  }
  if (!images.includes(primaryImage)) {
    throw new Error('Primary image must appear in the image paths list.');
  }

  const payload = {
    id: getField('id') || null,
    slug: getField('slug').trim(),
    brand: getField('brand').trim(),
    model: getField('model').trim(),
    reference: getField('reference').trim(),
    name: getField('name').trim(),
    price: Number(getField('price')) || 0,
    currency: 'PHP',
    status,
    conditionLabel: getField('conditionLabel').trim(),
    badge: getField('badge').trim(),
    movement: getField('movement').trim(),
    caseSize: getField('caseSize').trim(),
    set: getField('set').trim(),
    material: getField('material').trim(),
    edition: getField('edition').trim(),
    description: getField('description').trim(),
    disclosure: getField('disclosure').trim(),
    primaryImage,
    images,
    inquirySubject: getField('inquirySubject').trim(),
    inquiryBody: getField('inquiryBody').trim(),
    hasBox: getCheckbox('hasBox'),
    hasPapers: getCheckbox('hasPapers'),
    serviceHistory: getField('serviceHistory').trim() || null,
    featured: getCheckbox('featured'),
    lowStock: getCheckbox('lowStock'),
    displayOrder: Number(getField('displayOrder')) || 0,
  };

  if (status === 'sold') {
    const soldAt = getField('soldAt').trim();
    const soldPrice = Number(getField('soldPrice'));
    if (!/^[0-9]{4}-[0-9]{2}$/.test(soldAt)) {
      throw new Error('Sold listings need a Sold at (YYYY-MM) value.');
    }
    if (!Number.isFinite(soldPrice) || soldPrice < 0) {
      throw new Error('Sold listings need a non-negative Sold price.');
    }
    payload.soldAt = soldAt;
    payload.soldPrice = Math.round(soldPrice);
  } else {
    payload.soldAt = null;
    payload.soldPrice = null;
  }

  return payload;
}

// ---------------- Helpers ----------------

function field(name) { return document.getElementById(`field-${name}`); }
function getField(name) {
  const el = field(name);
  return el ? el.value : '';
}
function setField(name, value) {
  const el = field(name);
  if (el) el.value = value == null ? '' : String(value);
}
function getCheckbox(name) {
  const el = field(name);
  return !!(el && el.checked);
}
function setCheckbox(name, on) {
  const el = field(name);
  if (el) el.checked = !!on;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}
function escapeAttr(value) { return escapeHtml(value); }
function formatPrice(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

// kick off
renderForCurrentSession();

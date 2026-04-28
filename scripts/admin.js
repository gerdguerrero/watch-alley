// Watch Alley admin client.
// Auth via Supabase Auth (email + password). Authorization via watch_alley.admin_emails
// allowlist (checked server-side inside SECURITY DEFINER RPCs). The page never
// writes to the watches table directly.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Replace these two values with the real anon credentials from your Watch Alley
// Supabase project. Wired below for project: the-watch-alley
// (https://supabase.com/dashboard/project/yrzawkqcifuubtltktbk).
const SUPABASE_URL = 'https://yrzawkqcifuubtltktbk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OU38evYLP4E6Kl6TiByOqA_7l-mrxzY';

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
  authForgotBtn: document.getElementById('auth-forgot-btn'),
  passwordSetupPanel: document.getElementById('password-setup-panel'),
  passwordSetupForm: document.getElementById('password-setup-form'),
  passwordSetupNew: document.getElementById('password-setup-new'),
  passwordSetupConfirm: document.getElementById('password-setup-confirm'),
  passwordSetupStatus: document.getElementById('password-setup-status'),
  passwordSetupMeta: document.getElementById('password-setup-meta'),
  passwordSetupSignout: document.getElementById('password-setup-signout'),
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
  // Admins tab
  adminTabs: document.querySelectorAll('.admin-tab'),
  tabpanelInbox: document.getElementById('tabpanel-inbox'),
  tabpanelInventory: document.getElementById('tabpanel-inventory'),
  tabpanelAdmins: document.getElementById('tabpanel-admins'),
  tabpanelAccount: document.getElementById('tabpanel-account'),
  // Image uploader
  imageUploader: document.getElementById('image-uploader'),
  imageUploadInput: document.getElementById('image-upload-input'),
  imageDropzone: document.getElementById('image-dropzone'),
  imageThumbs: document.getElementById('image-thumbs'),
  imageUploadStatus: document.getElementById('image-upload-status'),
  // Inbox tab
  inboxList: document.getElementById('inbox-list'),
  inboxEmpty: document.getElementById('inbox-empty'),
  inboxCount: document.getElementById('inbox-count'),
  inboxStatusFilter: document.getElementById('inbox-status-filter'),
  inboxRefreshBtn: document.getElementById('inbox-refresh-btn'),
  inboxMetrics: document.getElementById('inbox-metrics'),
  inboxTopWatches: document.getElementById('inbox-top-watches'),
  inboxTopWatchesList: document.getElementById('inbox-top-watches-list'),
  inviteForm: document.getElementById('invite-admin-form'),
  inviteEmail: document.getElementById('invite-email'),
  inviteNote: document.getElementById('invite-note'),
  inviteStatus: document.getElementById('invite-status'),
  adminsList: document.getElementById('admins-list'),
  // Account tab
  accountEmail: document.getElementById('account-email'),
  changePasswordForm: document.getElementById('change-password-form'),
  changePasswordNew: document.getElementById('change-password-new'),
  changePasswordConfirm: document.getElementById('change-password-confirm'),
  changePasswordStatus: document.getElementById('change-password-status'),
};

// Track state.
let allWatches = [];
let activeId = null;
let activeWatchSnapshot = null;
// When the page loads via an invite or password-recovery email, we need to
// force the user through the password-setup panel before showing anything
// else. Supabase emits onAuthStateChange events with INITIAL_SESSION /
// PASSWORD_RECOVERY / SIGNED_IN; we capture those and the URL hash to
// decide whether to set this flag.
let mustSetPassword = false;
let passwordSetupReason = 'invite';

// Inspect the URL hash that Supabase Auth attaches after email-link auth.
// Hash looks like:
//   #access_token=...&refresh_token=...&type=invite
//   #access_token=...&refresh_token=...&type=recovery
// We only read it; supabase-js itself parses the same hash and exchanges it
// for a session. Reading does not consume it.
function readEmailLinkType() {
  const hash = window.location.hash || '';
  if (!hash.includes('access_token=')) return null;
  const m = hash.match(/[#&]type=([a-z_]+)/);
  return m ? m[1] : null;
}
const initialEmailLinkType = readEmailLinkType();
if (initialEmailLinkType === 'invite' || initialEmailLinkType === 'recovery' || initialEmailLinkType === 'signup') {
  mustSetPassword = true;
  passwordSetupReason = initialEmailLinkType === 'recovery' ? 'recovery' : 'invite';
}

function setStatus(message, tone) {
  els.status.textContent = message || '';
  if (tone) els.status.dataset.tone = tone;
  else els.status.removeAttribute('data-tone');
}

// ---------------- Auth flow ----------------

els.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) return;

  setStatus('Signing in…');
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setStatus('Signed in.', 'success');
    await renderForCurrentSession();
  } catch (error) {
    setStatus(error.message || 'Sign-in failed', 'error');
  }
});

if (els.authForgotBtn) {
  els.authForgotBtn.addEventListener('click', async () => {
    const email = (els.authEmail.value || '').trim();
    if (!email) {
      setStatus('Enter your email above first, then click Forgot password?', 'error');
      els.authEmail.focus();
      return;
    }
    setStatus('Sending password reset email…');
    try {
      const redirectTo = `${window.location.origin}/admin`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setStatus(`Reset email sent to ${email}. Check your inbox.`, 'success');
    } catch (error) {
      setStatus(error.message || 'Reset failed', 'error');
    }
  });
}

async function signOut() {
  if (supabase) await supabase.auth.signOut();
  els.authEmail.value = '';
  els.authPassword.value = '';
  mustSetPassword = false;
  // Drop any auth-link hash so a refresh after sign-out doesn't re-trigger
  // the password-setup gate.
  if (window.location.hash.includes('access_token=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  setStatus('Signed out.');
  await renderForCurrentSession();
}

els.signoutLink.addEventListener('click', (event) => { event.preventDefault(); signOut(); });
els.forbiddenSignout.addEventListener('click', signOut);
if (els.passwordSetupSignout) els.passwordSetupSignout.addEventListener('click', signOut);

if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    // PASSWORD_RECOVERY fires when supabase-js consumes a recovery link's
    // hash. SIGNED_IN can fire on invite acceptance too. The URL hash also
    // tells us — readEmailLinkType already captured it above. Either signal
    // is sufficient: surface the password-setup panel.
    if (event === 'PASSWORD_RECOVERY') {
      mustSetPassword = true;
      passwordSetupReason = 'recovery';
    }
    // Skip a full re-render on routine token refresh — that path doesn't
    // change the gate state and reloading inventory on every refresh would
    // disrupt the workspace UI.
    if (event === 'TOKEN_REFRESHED') return;
    // Don't auto-flip mustSetPassword off here — the password-setup form
    // handler clears it on success.
    renderForCurrentSession();
  });
}

// ---------------- Password setup (post-invite, post-recovery) ----------------

if (els.passwordSetupForm) {
  els.passwordSetupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabase) return;
    const newPassword = els.passwordSetupNew.value;
    const confirmPassword = els.passwordSetupConfirm.value;
    if (newPassword.length < 10) {
      setPasswordSetupStatus('Use at least 10 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordSetupStatus('Passwords do not match.', 'error');
      return;
    }
    const submitBtn = els.passwordSetupForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    setPasswordSetupStatus('Saving…');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      mustSetPassword = false;
      els.passwordSetupNew.value = '';
      els.passwordSetupConfirm.value = '';
      // Clear the auth-link hash so a refresh doesn't bounce them back here.
      if (window.location.hash.includes('access_token=')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      setPasswordSetupStatus('Password saved. Redirecting…', 'success');
      await renderForCurrentSession();
    } catch (error) {
      setPasswordSetupStatus(error.message || 'Could not save password', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function setPasswordSetupStatus(message, tone) {
  if (!els.passwordSetupStatus) return;
  els.passwordSetupStatus.textContent = message || '';
  if (tone) els.passwordSetupStatus.dataset.tone = tone;
  else els.passwordSetupStatus.removeAttribute('data-tone');
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
  // If the session arrived via an invite or recovery link, force the user
  // through the password-setup panel before anything else.
  if (mustSetPassword) {
    if (els.passwordSetupMeta) {
      els.passwordSetupMeta.textContent = passwordSetupReason === 'recovery'
        ? 'Reset link verified. Choose a new password to continue.'
        : 'Welcome to Watch Alley admin. Set a password to finish setting up your account.';
    }
    showOnly('passwordSetup');
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
  if (els.accountEmail) {
    els.accountEmail.textContent = data?.email || session.user?.email || '(unknown)';
  }
  showOnly('workspace');
  await loadWatches();
  loadInbox();
}

function showOnly(panel) {
  els.authPanel.hidden = panel !== 'auth';
  if (els.passwordSetupPanel) els.passwordSetupPanel.hidden = panel !== 'passwordSetup';
  els.forbiddenPanel.hidden = panel !== 'forbidden';
  els.workspace.hidden = panel !== 'workspace';
  if (els.unconfiguredPanel) els.unconfiguredPanel.hidden = panel !== 'unconfigured';
  els.signoutLink.hidden = panel === 'auth' || panel === 'unconfigured' || panel === 'passwordSetup';
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
  setStatus('Deleted. The website updates automatically.', 'success');
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
  setStatus('Marked sold. The website updates automatically.', 'success');
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
  setImageList([]);
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
  setImageList(Array.isArray(watch?.images) ? watch.images.slice() : []);
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
    setStatus('Saved. The website updates automatically.', 'success');
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

// ---------------- Tabs ----------------

const adminTabsArr = Array.from(els.adminTabs);
adminTabsArr.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab, { focus: false }));
  tab.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % adminTabsArr.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + adminTabsArr.length) % adminTabsArr.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = adminTabsArr.length - 1;
      activateTab(adminTabsArr[next].dataset.tab, { focus: true });
    }
  });
});

function activateTab(name, { focus = false } = {}) {
  adminTabsArr.forEach((t) => {
    const active = t.dataset.tab === name;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
    t.setAttribute('tabindex', active ? '0' : '-1');
    if (active && focus) t.focus();
  });
  if (els.tabpanelInbox) els.tabpanelInbox.hidden = name !== 'inbox';
  if (els.tabpanelInventory) els.tabpanelInventory.hidden = name !== 'inventory';
  if (els.tabpanelAdmins) els.tabpanelAdmins.hidden = name !== 'admins';
  if (els.tabpanelAccount) els.tabpanelAccount.hidden = name !== 'account';
  if (name === 'admins') loadAdminsList();
  if (name === 'inbox') loadInbox();
}

// ---------------- Account tab: change password ----------------

if (els.changePasswordForm) {
  els.changePasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabase) return;
    const newPassword = els.changePasswordNew.value;
    const confirmPassword = els.changePasswordConfirm.value;
    if (newPassword.length < 10) {
      setChangePasswordStatus('Use at least 10 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordStatus('Passwords do not match.', 'error');
      return;
    }
    const submitBtn = els.changePasswordForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    setChangePasswordStatus('Saving…');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      els.changePasswordNew.value = '';
      els.changePasswordConfirm.value = '';
      setChangePasswordStatus('Password updated.', 'success');
    } catch (error) {
      setChangePasswordStatus(error.message || 'Could not update password', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function setChangePasswordStatus(message, tone) {
  if (!els.changePasswordStatus) return;
  els.changePasswordStatus.textContent = message || '';
  if (tone) els.changePasswordStatus.dataset.tone = tone;
  else els.changePasswordStatus.removeAttribute('data-tone');
}

// ---------------- Admins tab ----------------

async function loadAdminsList() {
  if (!els.adminsList) return;
  els.adminsList.innerHTML = '<li class="admin-meta">Loading admins…</li>';
  const { data, error } = await supabase.rpc('admin_list_admin_emails');
  if (error) {
    els.adminsList.innerHTML = `<li class="admin-meta" data-tone="error">Failed to load: ${escapeHtml(error.message)}</li>`;
    return;
  }
  if (!data || !data.length) {
    els.adminsList.innerHTML = '<li class="admin-meta">No admins yet. Invite the first one above.</li>';
    return;
  }
  els.adminsList.innerHTML = '';
  for (const row of data) {
    const li = document.createElement('li');
    const safeEmail = escapeHtml(row.email);
    const safeNote = escapeHtml(row.note || '');
    const addedDate = row.added_at ? new Date(row.added_at).toLocaleDateString('en-PH') : '';
    li.innerHTML = `
      <div class="admin-row-name">${safeEmail}</div>
      <div class="admin-row-meta">
        <span>${safeNote}</span>
        <span>${escapeHtml(addedDate)}</span>
        <button type="button" class="btn-ghost" data-remove-email="${escapeAttr(row.email)}">Remove</button>
      </div>
    `;
    els.adminsList.appendChild(li);
  }
}

if (els.adminsList) {
  els.adminsList.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-remove-email]');
    if (!btn) return;
    const email = btn.dataset.removeEmail;
    if (!confirm(`Remove ${email} from admin allowlist? They will lose admin access immediately.`)) return;
    btn.disabled = true;
    const { error } = await supabase.rpc('admin_remove_admin_email', { target_email: email });
    btn.disabled = false;
    if (error) {
      setStatus(`Remove failed: ${error.message}`, 'error');
      return;
    }
    setStatus(`Removed ${email}.`, 'success');
    await loadAdminsList();
  });
}

if (els.inviteForm) {
  els.inviteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabase) return;
    const email = (els.inviteEmail.value || '').trim().toLowerCase();
    const note = (els.inviteNote.value || '').trim() || null;
    if (!email) return;

    const submitBtn = els.inviteForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    setInviteStatus('Sending invite…');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('No active session — sign in again.');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, note }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Invite failed (HTTP ${response.status})`);
      }
      setInviteStatus(`Invite sent to ${email}. They'll receive an email with a one-time link.`, 'success');
      els.inviteEmail.value = '';
      els.inviteNote.value = '';
      await loadAdminsList();
    } catch (error) {
      setInviteStatus(error.message || 'Invite failed', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function setInviteStatus(message, tone) {
  if (!els.inviteStatus) return;
  els.inviteStatus.textContent = message || '';
  if (tone) els.inviteStatus.dataset.tone = tone;
  else els.inviteStatus.removeAttribute('data-tone');
}

// ---------------- Image uploader (Supabase Storage: bucket "watches") ----------------

const STORAGE_BUCKET = 'watches';
let imageList = [];

function setImageList(list) {
  imageList = Array.isArray(list) ? list.filter(Boolean) : [];
  syncImageFields();
  renderImageThumbs();
}

function syncImageFields() {
  setField('images', imageList.join('\n'));
  setField('primaryImage', imageList[0] || '');
}

function renderImageThumbs() {
  if (!els.imageThumbs) return;
  els.imageThumbs.innerHTML = '';
  imageList.forEach((url, index) => {
    const li = document.createElement('li');
    li.className = 'admin-image-thumb' + (index === 0 ? ' is-primary' : '');
    li.dataset.imageUrl = url;
    li.innerHTML = `
      <img src="${escapeAttr(url)}" alt="Photo ${index + 1}" loading="lazy">
      ${index === 0 ? '<span class="admin-image-thumb-primary-badge">Primary</span>' : ''}
      <div class="admin-image-thumb-controls">
        <button type="button" data-image-action="left" data-image-index="${index}" aria-label="Move left" ${index === 0 ? 'disabled' : ''}>◀</button>
        <button type="button" data-image-action="right" data-image-index="${index}" aria-label="Move right" ${index === imageList.length - 1 ? 'disabled' : ''}>▶</button>
        <button type="button" data-image-action="remove" data-image-index="${index}" aria-label="Remove">✕</button>
      </div>
    `;
    els.imageThumbs.appendChild(li);
  });
}

function setUploadStatus(message, tone) {
  if (!els.imageUploadStatus) return;
  els.imageUploadStatus.textContent = message || '';
  if (tone) els.imageUploadStatus.dataset.tone = tone;
  else els.imageUploadStatus.removeAttribute('data-tone');
}

function sanitizeFilename(name) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  const cleanStem = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'photo';
  const cleanExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg';
  return `${cleanStem}.${cleanExt}`;
}

function buildStoragePath(file) {
  const slugRaw = (getField('slug') || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  const folder = slugRaw || 'unsorted';
  const rand = Math.random().toString(36).slice(2, 8);
  const stamp = Date.now();
  return `${folder}/${stamp}-${rand}-${sanitizeFilename(file.name)}`;
}

async function uploadFiles(fileList) {
  if (!supabase) return;
  const files = Array.from(fileList || []).filter((f) => f && f.type && f.type.startsWith('image/'));
  if (!files.length) return;

  setUploadStatus(`Uploading ${files.length} photo${files.length === 1 ? '' : 's'}…`);

  let succeeded = 0;
  let failed = 0;

  for (const file of files) {
    const path = buildStoragePath(file);
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = pub && pub.publicUrl;
      if (!publicUrl) throw new Error('No public URL returned');
      imageList[imageList.length] = publicUrl;
      succeeded += 1;
    } catch (error) {
      console.error('Upload failed for', file.name, error);
      failed += 1;
    }
  }

  syncImageFields();
  renderImageThumbs();

  if (failed === 0) {
    setUploadStatus(`Uploaded ${succeeded} photo${succeeded === 1 ? '' : 's'}.`, 'success');
  } else if (succeeded === 0) {
    setUploadStatus(`Upload failed for all ${failed} photo${failed === 1 ? '' : 's'}. Check the file size (≤10 MB) and format (JPEG, PNG, WebP, AVIF).`, 'error');
  } else {
    setUploadStatus(`Uploaded ${succeeded}, failed ${failed}. Check the failed files and try again.`, 'error');
  }
}

if (els.imageUploadInput) {
  els.imageUploadInput.addEventListener('change', async (event) => {
    const input = event.target;
    await uploadFiles(input.files);
    input.value = '';
  });
}

if (els.imageDropzone) {
  els.imageDropzone.addEventListener('click', () => {
    if (els.imageUploadInput) els.imageUploadInput.click();
  });
  els.imageDropzone.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && els.imageUploadInput) {
      event.preventDefault();
      els.imageUploadInput.click();
    }
  });
  ['dragenter', 'dragover'].forEach((evt) => {
    els.imageDropzone.addEventListener(evt, (event) => {
      event.preventDefault();
      els.imageDropzone.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    els.imageDropzone.addEventListener(evt, (event) => {
      event.preventDefault();
      els.imageDropzone.classList.remove('is-dragover');
    });
  });
  els.imageDropzone.addEventListener('drop', async (event) => {
    const files = event.dataTransfer && event.dataTransfer.files;
    await uploadFiles(files);
  });
}

if (els.imageThumbs) {
  els.imageThumbs.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-image-action]');
    if (!btn) return;
    const action = btn.dataset.imageAction;
    const index = Number(btn.dataset.imageIndex);
    if (!Number.isFinite(index)) return;

    if (action === 'remove') {
      imageList.splice(index, 1);
    } else if (action === 'left' && index > 0) {
      [imageList[index - 1], imageList[index]] = [imageList[index], imageList[index - 1]];
    } else if (action === 'right' && index < imageList.length - 1) {
      [imageList[index + 1], imageList[index]] = [imageList[index], imageList[index + 1]];
    }
    syncImageFields();
    renderImageThumbs();
  });
}

// Keep the thumb grid honest if the operator edits the raw paths textarea.
const fieldImagesEl = document.getElementById('field-images');
if (fieldImagesEl) {
  fieldImagesEl.addEventListener('input', () => {
    imageList = (fieldImagesEl.value || '').split('\n').map((s) => s.trim()).filter(Boolean);
    setField('primaryImage', imageList[0] || '');
    renderImageThumbs();
  });
}

// ---------------- Inbox tab: inquiries ----------------

let inboxInquiries = [];
let inboxExpandedId = null;
let inboxLoading = false;

const INBOX_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'viewing', label: 'Viewing scheduled' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Won (sold)' },
  { value: 'lost', label: 'Lost' },
  { value: 'spam', label: 'Spam' },
];

async function loadInbox() {
  if (!supabase || !els.inboxList) return;
  if (inboxLoading) return;
  inboxLoading = true;
  els.inboxList.innerHTML = '<li class="admin-meta">Loading inquiries…</li>';
  if (els.inboxEmpty) els.inboxEmpty.hidden = true;

  const statusFilter = (els.inboxStatusFilter && els.inboxStatusFilter.value) || null;

  try {
    const [listResult, metricsResult] = await Promise.all([
      supabase.rpc('admin_list_inquiries', {
        status_filter: statusFilter || null,
        limit_count: 100,
        offset_count: 0,
      }),
      supabase.rpc('admin_inquiry_metrics'),
    ]);

    if (listResult.error) throw listResult.error;
    inboxInquiries = Array.isArray(listResult.data) ? listResult.data : [];
    renderInboxList();

    if (!metricsResult.error && metricsResult.data) {
      renderInboxMetrics(metricsResult.data);
    }
  } catch (error) {
    els.inboxList.innerHTML = `<li class="admin-meta" data-tone="error">Failed to load inquiries: ${escapeHtml(error.message || error)}</li>`;
  } finally {
    inboxLoading = false;
  }
}

function renderInboxList() {
  if (!els.inboxList) return;
  if (!inboxInquiries.length) {
    els.inboxList.innerHTML = '';
    if (els.inboxEmpty) els.inboxEmpty.hidden = false;
    if (els.inboxCount) els.inboxCount.textContent = '0 inquiries';
    return;
  }
  if (els.inboxEmpty) els.inboxEmpty.hidden = true;
  if (els.inboxCount) els.inboxCount.textContent = `${inboxInquiries.length} ${inboxInquiries.length === 1 ? 'inquiry' : 'inquiries'}`;

  els.inboxList.innerHTML = '';
  for (const row of inboxInquiries) {
    const li = document.createElement('li');
    li.dataset.inquiryId = row.id;
    li.innerHTML = renderInboxRow(row);
    if (row.id === inboxExpandedId) {
      const drawer = document.createElement('div');
      drawer.className = 'inbox-drawer';
      drawer.innerHTML = renderInboxDrawer(row);
      li.appendChild(drawer);
    }
    els.inboxList.appendChild(li);
  }
}

function renderInboxRow(row) {
  const watchLabel = row.watch_slug || row.watch_id || '(no watch)';
  const channel = row.buyer_channel ? row.buyer_channel.toUpperCase() : 'EMAIL';
  const age = relativeTimeFromIso(row.created_at);
  const message = String(row.message || '').replace(/\s+/g, ' ').trim();
  return `
    <div class="inbox-row" data-inquiry-toggle="${escapeAttr(row.id)}">
      <div class="inbox-row-main">
        <div class="inbox-row-name">${escapeHtml(row.buyer_name || 'Anonymous')} · <span style="opacity:0.7">${escapeHtml(row.buyer_email || '')}</span></div>
        <div class="inbox-row-meta">
          <span>${escapeHtml(watchLabel)}</span>
          <span>${escapeHtml(channel)}</span>
          ${row.buyer_phone ? `<span>${escapeHtml(row.buyer_phone)}</span>` : ''}
        </div>
        <div class="inbox-row-message">${escapeHtml(message)}</div>
      </div>
      <div class="inbox-row-side">
        <span class="inbox-status-pill" data-status="${escapeAttr(row.status)}">${escapeHtml(row.status)}</span>
        <span class="inbox-row-age">${escapeHtml(age)}</span>
      </div>
    </div>
  `;
}

function renderInboxDrawer(row) {
  const fullMessage = String(row.message || '');
  const watchLabel = row.watch_slug || row.watch_id || '';
  const watchHref = row.watch_slug ? `../#/watch/${encodeURIComponent(row.watch_slug)}` : '';
  const respondedAt = row.responded_at ? new Date(row.responded_at).toLocaleString('en-PH') : '—';
  const closedAt = row.closed_at ? new Date(row.closed_at).toLocaleString('en-PH') : '—';
  const created = row.created_at ? new Date(row.created_at).toLocaleString('en-PH') : '—';

  const statusOptionsHtml = INBOX_STATUS_OPTIONS
    .map((opt) => `<option value="${escapeAttr(opt.value)}"${opt.value === row.status ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`)
    .join('');

  return `
    <p class="inbox-drawer-message">${escapeHtml(fullMessage)}</p>
    <dl class="inbox-drawer-meta">
      <div><dt>Email</dt><dd><a href="mailto:${escapeAttr(row.buyer_email || '')}">${escapeHtml(row.buyer_email || '—')}</a></dd></div>
      ${row.buyer_phone ? `<div><dt>Phone</dt><dd>${escapeHtml(row.buyer_phone)}</dd></div>` : ''}
      <div><dt>Watch</dt><dd>${watchHref ? `<a href="${escapeAttr(watchHref)}" target="_blank" rel="noopener">${escapeHtml(watchLabel)}</a>` : escapeHtml(watchLabel || '—')}</dd></div>
      <div><dt>Created</dt><dd>${escapeHtml(created)}</dd></div>
      <div><dt>Responded</dt><dd>${escapeHtml(respondedAt)}</dd></div>
      <div><dt>Closed</dt><dd>${escapeHtml(closedAt)}</dd></div>
      ${row.status_note ? `<div><dt>Last note</dt><dd>${escapeHtml(row.status_note)}</dd></div>` : ''}
    </dl>
    <div class="inbox-drawer-actions">
      <select data-inquiry-status-select="${escapeAttr(row.id)}">${statusOptionsHtml}</select>
      <input type="text" placeholder="Add a status note (optional)" data-inquiry-status-note="${escapeAttr(row.id)}" maxlength="500">
      <button type="button" data-inquiry-status-save="${escapeAttr(row.id)}">Update status</button>
    </div>
  `;
}

function renderInboxMetrics(metrics) {
  if (!els.inboxMetrics) return;
  const totals = (metrics && metrics.totals) || {};
  const map = {
    new: totals.new_count,
    contacted: totals.contacted_count,
    viewing: totals.viewing_count,
    reserved: totals.reserved_count,
    won: totals.won_count,
    last7: totals.last7,
  };
  for (const [metric, value] of Object.entries(map)) {
    const node = els.inboxMetrics.querySelector(`[data-metric="${metric}"]`);
    if (node) node.textContent = value == null ? '—' : String(value);
  }

  const top = Array.isArray(metrics && metrics.perWatchTop20) ? metrics.perWatchTop20 : [];
  if (els.inboxTopWatches && els.inboxTopWatchesList) {
    if (top.length === 0) {
      els.inboxTopWatches.hidden = true;
    } else {
      els.inboxTopWatches.hidden = false;
      els.inboxTopWatchesList.innerHTML = top
        .map((item) => `<li><span>${escapeHtml(item.watch_id || 'unknown')}</span><span>${item.inquiries} inquiries · ${item.won || 0} won</span></li>`)
        .join('');
    }
  }
}

function relativeTimeFromIso(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString('en-PH');
}

if (els.inboxList) {
  els.inboxList.addEventListener('click', async (event) => {
    const toggle = event.target.closest('[data-inquiry-toggle]');
    const saveBtn = event.target.closest('[data-inquiry-status-save]');

    if (saveBtn) {
      event.stopPropagation();
      const id = saveBtn.dataset.inquiryStatusSave;
      const select = els.inboxList.querySelector(`[data-inquiry-status-select="${cssEscape(id)}"]`);
      const noteInput = els.inboxList.querySelector(`[data-inquiry-status-note="${cssEscape(id)}"]`);
      const newStatus = select ? select.value : null;
      const note = noteInput ? noteInput.value.trim() : '';
      if (!newStatus) return;
      saveBtn.disabled = true;
      try {
        const { data, error } = await supabase.rpc('admin_update_inquiry_status', {
          inquiry_id: id,
          new_status: newStatus,
          note: note || null,
        });
        if (error) throw error;
        const updated = data || null;
        if (updated && updated.id) {
          const idx = inboxInquiries.findIndex((row) => row.id === updated.id);
          if (idx >= 0) inboxInquiries[idx] = updated;
        }
        await loadInbox();
        setStatus(`Inquiry updated to ${newStatus}.`, 'success');
      } catch (error) {
        setStatus(`Update failed: ${error.message || error}`, 'error');
      } finally {
        saveBtn.disabled = false;
      }
      return;
    }

    if (toggle) {
      const id = toggle.dataset.inquiryToggle;
      inboxExpandedId = inboxExpandedId === id ? null : id;
      renderInboxList();
    }
  });
}

if (els.inboxStatusFilter) {
  els.inboxStatusFilter.addEventListener('change', () => loadInbox());
}
if (els.inboxRefreshBtn) {
  els.inboxRefreshBtn.addEventListener('click', () => loadInbox());
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

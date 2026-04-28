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
  tabpanelInventory: document.getElementById('tabpanel-inventory'),
  tabpanelAdmins: document.getElementById('tabpanel-admins'),
  tabpanelAccount: document.getElementById('tabpanel-account'),
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
  if (els.tabpanelInventory) els.tabpanelInventory.hidden = name !== 'inventory';
  if (els.tabpanelAdmins) els.tabpanelAdmins.hidden = name !== 'admins';
  if (els.tabpanelAccount) els.tabpanelAccount.hidden = name !== 'account';
  if (name === 'admins') loadAdminsList();
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

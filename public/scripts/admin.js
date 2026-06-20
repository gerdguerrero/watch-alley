// Watch Alley admin client.
// Auth via Supabase Auth (email + password). Authorization via watch_alley.admin_emails
// allowlist (checked server-side inside SECURITY DEFINER RPCs). The page never
// writes to the watches table directly.
//
// supabase-js is loaded as a regular <script> (UMD build) from
// ../scripts/vendor/supabase.min.js — zero external CDN dependencies.

import { renderMarkdown } from './lib/markdown.mjs';

// Replace these two values with the real anon credentials from your Watch Alley
// Supabase project. Wired below for project: the-watch-alley
// (https://supabase.com/dashboard/project/yrzawkqcifuubtltktbk).
const SUPABASE_URL = 'https://yrzawkqcifuubtltktbk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OU38evYLP4E6Kl6TiByOqA_7l-mrxzY';
const REVALIDATION_TOKEN = 'twa-reval-8k2mN7pQ4vX1yF9bR3wL6dH5';

const PLACEHOLDER_URL_HOST = 'YOUR-NEW-PROJECT-REF';
const isConfigured = !SUPABASE_URL.includes(PLACEHOLDER_URL_HOST) && SUPABASE_ANON_KEY.length > 0;

const supabase = isConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  watchStateFilters: document.querySelectorAll('[data-watch-state-filter]'),
  newBtn: document.getElementById('new-watch-btn'),
  detailEmpty: document.getElementById('admin-detail-empty'),
  watchForm: document.getElementById('watch-form'),
  watchFormErrors: document.getElementById('watch-form-errors'),
  saveWatchBtn: document.getElementById('save-watch-btn'),
  cancelBtn: document.getElementById('cancel-btn'),
  deleteBtn: document.getElementById('delete-btn'),
  markSoldBtn: document.getElementById('mark-sold-btn'),
  reserveToggleBtn: document.getElementById('reserve-toggle-btn'),
  publishWatchBtn: document.getElementById('publish-watch-btn'),
  viewListingBtn: document.getElementById('view-listing-btn'),
  soldFieldset: document.getElementById('sold-fieldset'),
  socialGeneratePreviewBtn: document.getElementById('social-generate-preview-btn'),
  socialPrimaryImagePreview: document.getElementById('social-primary-image-preview'),
  socialFacebookCaption: document.getElementById('social-facebook-caption'),
  socialInstagramCaption: document.getElementById('social-instagram-caption'),
  socialCopyFacebookBtn: document.getElementById('social-copy-facebook-btn'),
  socialCopyInstagramBtn: document.getElementById('social-copy-instagram-btn'),
  socialPreviewStatus: document.getElementById('social-preview-status'),
  socialSaveDraftBtn: document.getElementById('social-save-draft-btn'),
  savedDraftsMeta: document.getElementById('social-saved-drafts-meta'),
  // Compact Preview & Limits panel (replaces FB/IG impersonation mockups).
  socialPreviewSummary: document.getElementById('social-preview-summary'),
  socialPreviewSummaryImage: document.getElementById('social-preview-summary-image'),
  socialPreviewSummaryImageEmpty: document.getElementById('social-preview-summary-photo-empty'),
  socialPreviewSummaryFb: document.getElementById('social-preview-summary-fb'),
  socialPreviewSummaryIg: document.getElementById('social-preview-summary-ig'),
  socialPreviewSummaryFbChars: document.querySelector('[data-target="fb-chars"]'),
  socialPreviewSummaryFbState: document.querySelector('[data-target="fb-state"]'),
  socialPreviewSummaryIgChars: document.querySelector('[data-target="ig-chars"]'),
  socialPreviewSummaryIgTags: document.querySelector('[data-target="ig-tags"]'),
  socialPreviewSummaryIgState: document.querySelector('[data-target="ig-state"]'),
  socialPreviewSummaryLink: document.getElementById('social-preview-summary-link-anchor'),
  // Admins tab
  adminTabs: document.querySelectorAll('.admin-tab'),
  tabpanelDashboard: document.getElementById('tabpanel-dashboard'),
  tabpanelInbox: document.getElementById('tabpanel-inbox'),
  tabpanelInventory: document.getElementById('tabpanel-inventory'),
  tabpanelJournal: document.getElementById('tabpanel-journal'),
  tabpanelAdmins: document.getElementById('tabpanel-admins'),
  tabpanelAccount: document.getElementById('tabpanel-account'),
  inventoryBackBtn: document.getElementById('inventory-back-btn'),
  // Dashboard tab
  dashboardMeta: document.getElementById('admin-dashboard-meta'),
  dashboardRefresh: document.getElementById('admin-dashboard-refresh'),
  dashboardGrid: document.getElementById('admin-dashboard-grid'),
  dashboardTopWatches: document.getElementById('admin-dashboard-top-watches'),
  dashboardTopWatchesEmpty: document.getElementById('admin-dashboard-top-watches-empty'),
  dashboardLostReasons: document.getElementById('admin-dashboard-lost-reasons'),
  dashboardLostReasonsEmpty: document.getElementById('admin-dashboard-lost-reasons-empty'),
  dashboardActivity: document.getElementById('admin-dashboard-activity'),
  dashboardActivityEmpty: document.getElementById('admin-dashboard-activity-empty'),
  dashboardJournal: document.getElementById('admin-dashboard-journal'),
  // Journal tab
  journalList: document.getElementById('journal-list'),
  journalCount: document.getElementById('journal-count'),
  journalFilter: document.getElementById('journal-filter'),
  journalNewBtn: document.getElementById('journal-new-btn'),
  journalBackBtn: document.getElementById('journal-back-btn'),
  journalDetail: document.getElementById('journal-detail'),
  journalDetailEmpty: document.getElementById('journal-detail-empty'),
  journalForm: document.getElementById('journal-form'),
  journalFieldId: document.getElementById('journal-field-id'),
  journalFieldStatus: document.getElementById('journal-field-status'),
  journalFieldPublishAtWrapper: document.getElementById('journal-field-publish-at-wrapper'),
  journalFieldPublishAt: document.getElementById('journal-field-publish-at'),
  journalFieldTitle: document.getElementById('journal-field-title'),
  journalFieldSlug: document.getElementById('journal-field-slug'),
  journalFieldSummary: document.getElementById('journal-field-summary'),
  journalFieldAuthor: document.getElementById('journal-field-author'),
  journalFieldReadMinutes: document.getElementById('journal-field-read-minutes'),
  journalFieldTags: document.getElementById('journal-field-tags'),
  journalFieldHeroImage: document.getElementById('journal-field-hero-image'),
  journalHeroDropzone: document.getElementById('journal-hero-dropzone'),
  journalHeroInput: document.getElementById('journal-hero-input'),
  journalHeroPreview: document.getElementById('journal-hero-preview'),
  journalHeroPreviewImg: document.getElementById('journal-hero-preview-img'),
  journalHeroRemove: document.getElementById('journal-hero-remove'),
  journalHeroStatus: document.getElementById('journal-hero-status'),
  journalFieldBody: document.getElementById('journal-field-body'),
  journalPreview: document.getElementById('journal-preview'),
  journalSaveBtn: document.getElementById('journal-save-btn'),
  journalPublishBtn: document.getElementById('journal-publish-btn'),
  journalPreviewBtn: document.getElementById('journal-preview-btn'),
  journalDeleteBtn: document.getElementById('journal-delete-btn'),
  journalCancelBtn: document.getElementById('journal-cancel-btn'),
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
  inboxLogFormWrap: document.getElementById('inbox-log-form-wrap'),
  inboxLogForm: document.getElementById('inbox-log-form'),
  inboxLogName: document.getElementById('log-inq-name'),
  inboxLogWatchSlug: document.getElementById('log-inq-watch-slug'),
  inboxLogChannel: document.getElementById('log-inq-channel'),
  inboxLogEmail: document.getElementById('log-inq-email'),
  inboxLogPhone: document.getElementById('log-inq-phone'),
  inboxLogMessage: document.getElementById('log-inq-message'),
  inboxLogSubmit: document.getElementById('inbox-log-submit'),
  inboxLogStatus: document.getElementById('inbox-log-status'),
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
  // Newsletter tab
  tabpanelNewsletter: document.getElementById('tabpanel-newsletter'),
  newsletterCount: document.getElementById('newsletter-count'),
  newsletterNewBtn: document.getElementById('newsletter-new-btn'),
  newsletterFilter: document.getElementById('newsletter-filter'),
  newsletterList: document.getElementById('newsletter-list'),
  newsletterDetailEmpty: document.getElementById('newsletter-detail-empty'),
  newsletterForm: document.getElementById('newsletter-form'),
  newsletterFieldId: document.getElementById('newsletter-field-id'),
  newsletterFieldSlug: document.getElementById('newsletter-field-slug'),
  newsletterFieldStatus: document.getElementById('newsletter-field-status'),
  newsletterFieldScheduledAtWrapper: document.getElementById('newsletter-field-scheduled-at-wrapper'),
  newsletterFieldScheduledAt: document.getElementById('newsletter-field-scheduled-at'),
  newsletterFieldSubject: document.getElementById('newsletter-field-subject'),
  newsletterFieldPreheader: document.getElementById('newsletter-field-preheader'),
  newsletterFieldPublicTitle: document.getElementById('newsletter-field-public-title'),
  newsletterFieldBodyHtml: document.getElementById('newsletter-field-body-html'),
  newsletterFieldBodyText: document.getElementById('newsletter-field-body-text'),
  newsletterFieldArchiveVisible: document.getElementById('newsletter-field-archive-visible'),
  newsletterPreview: document.getElementById('newsletter-preview'),
  newsletterTestRecipient: document.getElementById('newsletter-test-recipient'),
  newsletterSendTestBtn: document.getElementById('newsletter-send-test-btn'),
  newsletterTestStatus: document.getElementById('newsletter-test-status'),
  newsletterSaveBtn: document.getElementById('newsletter-save-btn'),
  newsletterApproveBtn: document.getElementById('newsletter-approve-btn'),
  newsletterScheduleBtn: document.getElementById('newsletter-schedule-btn'),
  newsletterSendNowBtn: document.getElementById('newsletter-send-now-btn'),
  newsletterDeleteBtn: document.getElementById('newsletter-delete-btn'),
  newsletterCancelBtn: document.getElementById('newsletter-cancel-btn'),
  newsletterBackBtn: document.getElementById('newsletter-back-btn'),
};

// Track state.
let allWatches = [];
let activeId = null;
let activeWatchSnapshot = null;
let watchStateFilter = 'all';
// When the page loads via an invite or password-recovery email, we need to
// force the user through the password-setup panel before showing anything
// else. Supabase emits onAuthStateChange events with INITIAL_SESSION /
// PASSWORD_RECOVERY / SIGNED_IN; we capture those and the URL hash to
// decide whether to set this flag.
let mustSetPassword = false;
let passwordSetupReason = 'invite';
// Guard against duplicate session renders. The top-level renderForCurrentSession
// call at the bottom of this file handles the initial session. The
// onAuthStateChange listener also fires INITIAL_SESSION on load, and SIGNED_IN
// fires after a successful signInWithPassword() — both of which would
// re-render the workspace and trigger admin_whoami + admin_list_watches +
// admin_dashboard_metrics a second time. That tripled the post-sign-in RPC
// load and surfaced as the workspace appearing to "hang" for 3-5 seconds
// after submitting the sign-in form.
let renderInFlight = false;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) && String(value || '').length <= 254;
}

function getAdminRedirectTo() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('token');
  const base = `${window.location.origin}/admin`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

function passwordResetSuccessMessage(email) {
  return `If ${email} is an admin account, a password reset email is on its way.`;
}

async function sendPasswordResetEmail(email) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error('Enter a valid email address.');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: getAdminRedirectTo(),
  });
  if (error) throw error;
  return normalized;
}

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

// ---------------- Revalidation ---------------- 

/**
 * Trigger Next.js on-demand ISR revalidation so the storefront reflects
 * mutations (save, delete, mark-sold) instantly instead of waiting for
 * the 60-second time-based window.
 */
async function revalidateStorefront(slug) {
  const paths = ['/available', '/sold', '/journal'];
  if (slug) paths.push(`/watch/${slug}`);
  // Fire-and-forget: don't block the UI on revalidation.
  fetch('/api/revalidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${REVALIDATION_TOKEN}`,
    },
    body: JSON.stringify({ paths }),
  }).catch(() => {});
}

// ---------------- Confirmation modal ----------------

let confirmResolve = null;

function showConfirmModal({ title, message, confirmLabel, confirmClass }) {
  return new Promise((resolve) => {
    // Remove any existing modal
    const existing = document.getElementById('admin-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'admin-confirm-overlay';
    overlay.className = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal">
        <h2 class="admin-modal-title">${escapeHtml(title)}</h2>
        <p class="admin-modal-message">${escapeHtml(message)}</p>
        <div class="admin-modal-actions">
          <button class="btn-ghost" id="admin-confirm-cancel">Cancel</button>
          <button class="${confirmClass || 'btn-danger'}" id="admin-confirm-ok">${escapeHtml(confirmLabel || 'Confirm')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const okBtn = overlay.querySelector('#admin-confirm-ok');
    const cancelBtn = overlay.querySelector('#admin-confirm-cancel');

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };

    okBtn.addEventListener('click', () => cleanup(true));
    cancelBtn.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onEsc);
        cleanup(false);
      }
    });

    okBtn.focus();
  });
}

// ---------------- Auth flow ----------------

els.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) return;

  const submitBtn = els.authForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  setStatus('Signing in…');
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setStatus('Signed in.', 'success');
    // onAuthStateChange will fire SIGNED_IN and run renderForCurrentSession().
    // Don't call it explicitly here — doing so doubled every post-sign-in
    // RPC (admin_whoami, admin_list_watches, admin_dashboard_metrics).
  } catch (error) {
    setStatus(error.message || 'Sign-in failed', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

if (els.authForgotBtn) {
  els.authForgotBtn.addEventListener('click', async () => {
    const email = normalizeEmail(els.authEmail.value);
    if (!isValidEmail(email)) {
      setStatus('Enter a valid email above first, then click Forgot password.', 'error');
      els.authEmail.focus();
      return;
    }
    setStatus('Sending password reset email…');
    els.authForgotBtn.disabled = true;
    try {
      const normalized = await sendPasswordResetEmail(email);
      setStatus(passwordResetSuccessMessage(normalized), 'success');
    } catch (error) {
      setStatus(error.message || 'Reset failed', 'error');
    } finally {
      els.authForgotBtn.disabled = false;
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
    // USER_UPDATED fires after we change the password from the Account tab.
    // The workspace is already loaded; rerendering would needlessly refire
    // every dashboard RPC.
    if (event === 'USER_UPDATED') return;
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
  // Reentrancy guard: the initial kickoff at file bottom, the INITIAL_SESSION
  // event, and the SIGNED_IN event can all land within the same tick. Without
  // this guard each one fires admin_whoami + admin_list_watches +
  // admin_dashboard_metrics in parallel, producing the post-sign-in "hang".
  if (renderInFlight) return;
  renderInFlight = true;
  try {
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
      // Distinguish "you're not an admin" (clean forbidden state) from
      // "the RPC errored" (network blip, project paused, RLS misconfig).
      // The previous behavior bounced everyone back to the sign-in form,
      // which made transient errors look like a sign-in failure.
      setStatus(`Could not verify admin status: ${error.message}. Try refreshing.`, 'error');
      els.forbiddenEmail.textContent = session.user?.email || '(unknown)';
      showOnly('forbidden');
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
    // Parallelize the two heavy reads so the workspace paints in one
    // round-trip's worth of latency instead of two.
    await Promise.all([loadWatches(), loadDashboard()]);
  } finally {
    renderInFlight = false;
  }
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
  // public.watches now hides drafts from authenticated readers (RLS only
  // exposes published=true rows; service role bypasses). The admin needs
  // to see drafts to edit them, so we use the SECURITY DEFINER RPC that
  // gates on watch_alley.is_admin() and returns every row.
  const { data, error } = await supabase.rpc('admin_list_watches');
  if (error) {
    setStatus(`Failed to load watches: ${error.message}`, 'error');
    return;
  }
  allWatches = Array.isArray(data) ? data : [];
  renderList();
  setStatus('');
}

function renderList() {
  const filter = (els.watchFilter.value || '').trim().toLowerCase();
  const stateFiltered = allWatches.filter((w) => {
    if (watchStateFilter === 'draft') return w.published === false;
    if (watchStateFilter === 'published') return w.published !== false;
    return true;
  });
  const filtered = !filter ? stateFiltered : stateFiltered.filter((w) => {
    return [w.brand, w.model, w.slug, w.reference, w.name]
      .some((field) => String(field || '').toLowerCase().includes(filter));
  });

  const draftCount = allWatches.filter((w) => w.published === false).length;
  const publishedCount = allWatches.length - draftCount;
  els.watchCount.textContent = `${filtered.length} shown · ${draftCount} drafts · ${publishedCount} published`;
  els.watchList.innerHTML = '';
  for (const w of filtered) {
    const li = document.createElement('li');
    if (w.id === activeId) li.classList.add('is-active');
    // Render the DRAFT pill inline. A prior version used a MutationObserver
    // on #watch-list to retrofit pills after the fact — that observer fired
    // on every subtree mutation, and its own appendChild/removeChild calls
    // re-triggered itself, locking up the page with an infinite loop the
    // moment any inventory loaded.
    const draftPill = w.published === false
      ? '<span class="watch-list-draft-pill">DRAFT</span>'
      : '';
    li.innerHTML = `
      <button type="button" data-id="${escapeAttr(w.id)}">
        <div class="admin-row-name">${escapeHtml(w.name || w.slug || w.id)}</div>
        <div class="admin-row-meta">
          <span>${escapeHtml(w.brand || '')}</span>
          <span class="admin-status-pill" data-status="${escapeAttr(w.status)}">${escapeHtml(w.status)} · ₱${formatPrice(w.price)}</span>
        </div>
        ${draftPill}
      </button>
    `;
    els.watchList.appendChild(li);
  }
}

els.watchFilter.addEventListener('input', renderList);

if (els.watchStateFilters) {
  els.watchStateFilters.forEach((btn) => {
    btn.addEventListener('click', () => {
      watchStateFilter = btn.dataset.watchStateFilter || 'all';
      els.watchStateFilters.forEach((option) => {
        option.classList.toggle('is-active', option === btn);
      });
      renderList();
    });
  });
}

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

if (els.inventoryBackBtn) {
  els.inventoryBackBtn.addEventListener('click', () => {
    hideForm();
    if (els.watchFilter) els.watchFilter.focus({ preventScroll: true });
  });
}

els.watchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveCurrentForm();
});

if (els.publishWatchBtn) {
  els.publishWatchBtn.addEventListener('click', publishCurrentListing);
}
const publishedField = field('published');
if (publishedField) {
  publishedField.addEventListener('change', () => syncListingActionButtons());
}
const statusField = field('status');
if (statusField) {
  statusField.addEventListener('change', () => syncListingActionButtons());
}

if (els.socialGeneratePreviewBtn) {
  els.socialGeneratePreviewBtn.addEventListener('click', () => {
    renderSocialPreviewFromForm({ announce: true });
  });
}
if (els.socialCopyFacebookBtn) {
  els.socialCopyFacebookBtn.addEventListener('click', () => copySocialCaption('facebook'));
}
if (els.socialCopyInstagramBtn) {
  els.socialCopyInstagramBtn.addEventListener('click', () => copySocialCaption('instagram'));
}
if (els.socialSaveDraftBtn) {
  els.socialSaveDraftBtn.addEventListener('click', () => {
    saveSocialDrafts();
  });
}
if (els.socialFacebookCaption) {
  els.socialFacebookCaption.addEventListener('input', () => renderSocialPreviewSummary());
}
if (els.socialInstagramCaption) {
  els.socialInstagramCaption.addEventListener('input', () => renderSocialPreviewSummary());
}

els.deleteBtn.addEventListener('click', async () => {
  if (!activeId) return;
  const watchName = activeWatchSnapshot?.name || activeWatchSnapshot?.slug || activeId;
  const confirmed = await showConfirmModal({
    title: 'Delete listing',
    message: `Delete "${watchName}"?\n\nThis permanently removes the watch from the database. This cannot be undone.`,
    confirmLabel: 'Delete',
    confirmClass: 'btn-danger',
  });
  if (!confirmed) return;
  setStatus('Deleting…');
  const slug = activeWatchSnapshot?.slug;
  const { error } = await supabase.rpc('admin_delete_watch', { watch_id: activeId });
  if (error) {
    setStatus(`Delete failed: ${error.message}`, 'error');
    return;
  }
  setStatus('Deleted. The website updates in seconds.', 'success');
  hideForm();
  await loadWatches();
  revalidateStorefront(slug);
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
  setStatus('Marked sold. The website updates in seconds.', 'success');
  await loadWatches();
  const refreshed = allWatches.find((w) => w.id === activeId);
  if (refreshed) loadIntoForm(refreshed);
  const slug = activeWatchSnapshot?.slug;
  revalidateStorefront(slug);
});

if (els.reserveToggleBtn) {
  els.reserveToggleBtn.addEventListener('click', async () => {
    if (!activeId) return;
    const targetStatus = els.reserveToggleBtn.dataset.targetStatus || 'reserved';
    if (targetStatus !== 'available' && targetStatus !== 'reserved') return;
    setField('status', targetStatus);
    setField('soldAt', '');
    setField('soldPrice', '');
    syncListingActionButtons();
    const result = await saveCurrentForm();
    if (result) {
      setStatus(
        targetStatus === 'reserved'
          ? 'Reserved. The piece stays on Available with a reserve tag.'
          : 'Unreserved. The piece is fully available again.',
        'success'
      );
    }
  });
}

function hideForm() {
  els.watchForm.hidden = true;
  els.detailEmpty.hidden = false;
  if (els.tabpanelInventory) els.tabpanelInventory.dataset.mobileView = 'list';
  els.deleteBtn.hidden = true;
  els.markSoldBtn.hidden = true;
  if (els.reserveToggleBtn) els.reserveToggleBtn.hidden = true;
  if (els.publishWatchBtn) els.publishWatchBtn.hidden = true;
  if (els.viewListingBtn) els.viewListingBtn.hidden = true;
  clearWatchValidation();
  activeId = null;
  activeWatchSnapshot = null;
  setImageList([]);
  clearSocialPreview('Fill in listing details, then generate social previews.');
  if (els.savedDraftsMeta) {
    els.savedDraftsMeta.hidden = true;
    els.savedDraftsMeta.textContent = '';
  }
  document.querySelectorAll('.admin-watch-list li.is-active').forEach((el) => el.classList.remove('is-active'));
}

function loadIntoForm(watch) {
  els.detailEmpty.hidden = true;
  els.watchForm.hidden = false;
  if (els.tabpanelInventory) els.tabpanelInventory.dataset.mobileView = 'detail';
  activeId = watch?.id || null;
  activeWatchSnapshot = watch ? { ...watch } : null;

  setField('id', watch?.id || '');
  setField('status', watch?.status || 'available');
  setField('category', watch?.category || '');
  setBadges(watch?.badges || []);
  setField('brand', watch?.brand || '');
  setField('reference', watch?.reference || '');
  setField('model', watch?.model || '');
  setField('name', watch?.name || '');
  setField('price', watch?.price ?? '');
  setField('conditionLabel', watch?.condition_label || '');
  setField('movement', watch?.movement || '');
  setField('caseSize', watch?.case_size || '');
  setField('material', watch?.material || '');
  setField('set', watch?.inclusion_set || '');
  setField('edition', watch?.edition || '');
  setField('description', watch?.description || '');
  setField('disclosure', watch?.disclosure || '');
  setField('provenance', watch?.provenance || '');
  setField('primaryImage', watch?.primary_image || '');
  setField('images', Array.isArray(watch?.images) ? watch.images.join('\n') : '');
  setImageList(Array.isArray(watch?.images) ? watch.images.slice() : []);
  // Inquiry subject/body fields were removed from the form — the storefront
  // generates the Messenger message per-watch. Nothing to populate here.
  setField('soldAt', watch?.sold_at || '');
  setField('soldPrice', watch?.sold_price ?? '');
  setField('serviceHistory', watch?.service_history || '');
  setField('displayOrder', watch?.display_order ?? '');

  setCheckbox('hasBox', watch?.has_box === true);
  setCheckbox('hasPapers', watch?.has_papers === true);
  setCheckbox('featured', watch?.featured === true);
  setCheckbox('lowStock', watch?.low_stock === true);
  // Commerce admin posture: new inventory starts as a private draft until
  // the owner explicitly publishes it. Existing rows keep their stored state.
  setCheckbox('published', watch ? watch.published === true : false);

  const isExisting = !!watch;
  els.deleteBtn.hidden = !isExisting;
  els.markSoldBtn.hidden = !isExisting || watch.status === 'sold';
  if (els.reserveToggleBtn) els.reserveToggleBtn.hidden = !isExisting || watch.status === 'sold';
  clearWatchValidation();
  syncListingActionButtons(watch);
  renderSocialPreviewFromForm({ announce: false });
  loadSocialDraftsForActiveWatch();

  // highlight in the sidebar
  document.querySelectorAll('.admin-watch-list li').forEach((li) => {
    const btn = li.querySelector('button[data-id]');
    li.classList.toggle('is-active', !!btn && btn.dataset.id === activeId);
  });
}

async function saveCurrentForm({ publishNow = false, skipValidation = false } = {}) {
  if (!skipValidation && !validateWatchForm({ mode: publishNow ? 'publish' : 'save' })) {
    return null;
  }
  const submitBtn = els.watchForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  if (els.publishWatchBtn) els.publishWatchBtn.disabled = true;
  try {
    const payload = collectFormPayload();
    if (publishNow) payload.published = true;
    setStatus(publishNow ? 'Publishing…' : 'Saving…');
    const { data, error } = await supabase.rpc('admin_upsert_watch', { payload });
    if (error) throw error;
    await loadWatches();
    if (data && data.id) {
      const refreshed = allWatches.find((w) => w.id === data.id);
      if (refreshed) loadIntoForm(refreshed);
    }
    // Auto-save social drafts in the same click. Silent if user did not
    // generate / write any captions — no error, no status flash.
    await saveSocialDrafts({ silentIfEmpty: true });
    setStatus(
      publishNow
        ? 'Published. View Listing is ready and the website updates in seconds.'
        : payload.published === false
          ? 'Draft saved. Add photos later, then use Publish now when ready.'
          : 'Saved. The website updates in seconds.',
      'success'
    );
    revalidateStorefront(payload.slug);
    return data || null;
  } catch (error) {
    setStatus(`Save failed: ${error.message}`, 'error');
    return null;
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (els.publishWatchBtn) els.publishWatchBtn.disabled = false;
  }
}

async function publishCurrentListing() {
  const wasPublished = getCheckbox('published');
  setCheckbox('published', true);
  syncListingActionButtons();
  if (!validateWatchForm({ mode: 'publish' })) {
    setCheckbox('published', wasPublished);
    syncListingActionButtons();
    return;
  }

  const listingName = getField('name').trim() || currentWatchSlug() || 'this listing';
  const confirmed = window.confirm(
    `Publish "${listingName}" now?\n\nIt will become visible on the public website as soon as Supabase saves the listing.`
  );
  if (!confirmed) {
    setCheckbox('published', wasPublished);
    syncListingActionButtons();
    return;
  }

  await saveCurrentForm({ publishNow: true, skipValidation: true });
}

function readSocialPreviewListingFromForm() {
  const images = (getField('images') || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const primaryImage = getField('primaryImage').trim() || images[0] || '';
  return {
    slug: currentWatchSlug(),
    status: getField('status') || 'available',
    brand: getField('brand').trim(),
    model: deriveModelValue(),
    reference: getField('reference').trim(),
    name: getField('name').trim(),
    price: Number(getField('price')) || 0,
    conditionLabel: getField('conditionLabel').trim(),
    inclusionSet: getField('set').trim(),
    hasBox: getCheckbox('hasBox'),
    hasPapers: getCheckbox('hasPapers'),
    primaryImage,
  };
}

function deriveModelValue() {
  const displayName = getField('name').trim();
  if (displayName) return displayName;
  return [getField('brand').trim(), getField('reference').trim()].filter(Boolean).join(' ');
}

function currentWatchSlug() {
  const activeFormId = getField('id') || activeId || '';
  const savedSlug =
    activeWatchSnapshot?.id && activeWatchSnapshot.id === activeFormId
      ? activeWatchSnapshot.slug
      : '';
  return savedSlug || slugify(getField('name'));
}

function buildPublicWatchUrl(slug) {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) return 'https://thewatchalley.com/#arrivals';
  const origin = window.location.hostname === 'thewatchalley.com' || window.location.hostname === 'www.thewatchalley.com'
    ? window.location.origin
    : 'https://thewatchalley.com';
  return `${origin}/watch/${encodeURIComponent(cleanSlug)}`;
}

function socialListingDisplayName(listing) {
  return listing.name || [listing.brand, listing.model].filter(Boolean).join(' ') || 'this timepiece';
}

function socialInclusionsText(listing) {
  if (listing.inclusionSet) return listing.inclusionSet;
  if (listing.hasBox && listing.hasPapers) return 'Box and papers';
  if (listing.hasBox) return 'Original box';
  if (listing.hasPapers) return 'Papers / warranty';
  return 'Inquire for inclusions';
}

function socialStatusText(status) {
  if (status === 'reserved') return 'Reserved — message us to check availability.';
  if (status === 'sold') return 'Sold — ask about similar references.';
  return 'Available now.';
}

function brandHashtag(brand) {
  const compactBrand = String(brand || '').replace(/[^a-z0-9]/gi, '');
  return compactBrand ? `#${compactBrand}PH` : '#WatchPH';
}

function buildSocialPreviewDraft(listing) {
  const displayName = socialListingDisplayName(listing);
  const condition = listing.conditionLabel || 'Condition available on request';
  const inclusions = socialInclusionsText(listing);
  const priceText = listing.price > 0 ? `₱${formatPrice(listing.price)}` : 'Price on request';
  const publicUrl = buildPublicWatchUrl(listing.slug);
  const facebookLines = [
    `New arrival at The Watch Alley: ${displayName}.`,
    listing.reference ? `Reference: ${listing.reference}` : '',
    `Condition: ${condition}`,
    `Includes: ${inclusions}`,
    `Price: ${priceText}`,
    `Status: ${socialStatusText(listing.status)}`,
    '',
    `View details or inquire: ${publicUrl}`,
  ].filter((line, index, lines) => line || (index > 0 && lines[index - 1] !== ''));

  const instagramLines = [
    `New arrival: ${displayName}.`,
    '',
    `${condition}. ${inclusions} included.`,
    listing.status === 'sold' ? 'This reference has sold, but you can ask The Watch Alley about similar pieces.' : 'DM The Watch Alley to inquire.',
    '',
    ['#TheWatchAlley', '#WatchPH', brandHashtag(listing.brand), '#PreOwnedWatchesPH']
      .filter((tag, index, tags) => tags.indexOf(tag) === index)
      .join(' '),
  ];

  return {
    facebook: facebookLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    instagram: instagramLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
  };
}

function renderSocialImagePreview(image, name) {
  if (!els.socialPrimaryImagePreview) return;
  if (!image) {
    els.socialPrimaryImagePreview.hidden = true;
    els.socialPrimaryImagePreview.removeAttribute('src');
    return;
  }
  els.socialPrimaryImagePreview.src = image;
  els.socialPrimaryImagePreview.alt = `${name || 'Selected watch'} cover image preview`;
  els.socialPrimaryImagePreview.hidden = false;
}

function setSocialPreviewStatus(message, tone) {
  if (!els.socialPreviewStatus) return;
  els.socialPreviewStatus.textContent = message || '';
  if (tone) els.socialPreviewStatus.dataset.tone = tone;
  else els.socialPreviewStatus.removeAttribute('data-tone');
}

function clearSocialPreview(message = '') {
  if (els.socialFacebookCaption) els.socialFacebookCaption.value = '';
  if (els.socialInstagramCaption) els.socialInstagramCaption.value = '';
  renderSocialImagePreview('', '');
  renderSocialPreviewSummary();
  setSocialPreviewStatus(message);
}

function renderSocialPreviewFromForm({ announce = true } = {}) {
  const listing = readSocialPreviewListingFromForm();
  if (!listing.name && !listing.brand && !listing.model && !listing.slug) {
    clearSocialPreview('Fill in listing details, then generate social previews.');
    return;
  }
  const captions = buildSocialPreviewDraft(listing);
  if (els.socialFacebookCaption) els.socialFacebookCaption.value = captions.facebook;
  if (els.socialInstagramCaption) els.socialInstagramCaption.value = captions.instagram;
  renderSocialImagePreview(listing.primaryImage, socialListingDisplayName(listing));
  renderSocialPreviewSummary();
  if (announce) setSocialPreviewStatus('Social previews generated. Review and edit before posting.', 'success');
  else setSocialPreviewStatus('Preview ready. Edit captions before sharing.');
}

// Platform character + hashtag limits used by the Preview & Limits panel.
// These mirror the public Meta caps; treat them as advisory — going over
// renders an over-limit pill so the operator sees it before posting.
const SOCIAL_LIMITS = {
  facebook: { chars: 63206 },
  instagram: { chars: 2200, hashtags: 30 },
};

// Defense-in-depth: only allow http(s), data:image/, and same-origin
// (absolute or relative) URLs as the preview image source. Owner is the
// only writer (admin allowlist + RLS), and `<img src="javascript:…">`
// is inert per the HTML spec, but this filter rejects exotic schemes
// before they ever reach the DOM.
const SAFE_MOCKUP_IMAGE_SCHEME = /^(https?:|data:image\/|\/|\.)/i;

function applyPreviewImage(imgEl, placeholderEl, image, altText) {
  if (!imgEl || !placeholderEl) return;
  const safe = typeof image === 'string' && SAFE_MOCKUP_IMAGE_SCHEME.test(image) ? image : '';
  if (safe) {
    // Fall back to the placeholder if the image fails to load (typo'd
    // path, 404, broken upload). Without this, the panel shows a generic
    // broken-image glyph which feels unfinished.
    imgEl.onerror = () => {
      imgEl.hidden = true;
      imgEl.removeAttribute('src');
      placeholderEl.hidden = false;
    };
    imgEl.src = safe;
    if (altText) imgEl.alt = altText;
    imgEl.hidden = false;
    placeholderEl.hidden = true;
  } else {
    imgEl.onerror = null;
    imgEl.hidden = true;
    imgEl.removeAttribute('src');
    placeholderEl.hidden = false;
  }
}

function countHashtags(text) {
  if (!text) return 0;
  // Word-boundary preceded by # avoids counting URL fragments or doubled
  // ##, then unique-ifies so the same tag twice counts once (Meta dedupes).
  const matches = text.match(/(^|[^\w#])#([\p{L}\p{N}_]+)/gu) || [];
  const unique = new Set();
  for (const raw of matches) unique.add(raw.replace(/^[^#]*#/, '').toLowerCase());
  return unique.size;
}

function limitState(actual, cap) {
  if (actual > cap) return 'over';
  if (actual >= Math.floor(cap * 0.9)) return 'warn';
  return 'ok';
}

function limitStateLabel(state, kind) {
  if (state === 'over') return `${kind} over limit`;
  if (state === 'warn') return `${kind} near limit`;
  return 'within limit';
}

// Resolve the strongest available source for the cover image. Prefer the
// validated <img> in renderSocialImagePreview, fall back to the form field
// so live typing still updates the panel.
function resolvePreviewImageSource() {
  if (els.socialPrimaryImagePreview && !els.socialPrimaryImagePreview.hidden) {
    return els.socialPrimaryImagePreview.getAttribute('src') || '';
  }
  return (getField('primaryImage') || '').trim();
}

// Renders the compact Preview & Limits panel from the current captions,
// the cover image, and the listing slug. Replaces the previous Facebook /
// Instagram impersonation mockups with information that is actually
// useful pre-flight: real photo, character counts vs. caps, hashtag count
// vs. cap, and the destination URL the post will deep-link to.
function renderSocialPreviewSummary() {
  const fbText = (els.socialFacebookCaption && els.socialFacebookCaption.value) || '';
  const igText = (els.socialInstagramCaption && els.socialInstagramCaption.value) || '';

  // --- Cover photo --------------------------------------------------------
  applyPreviewImage(
    els.socialPreviewSummaryImage,
    els.socialPreviewSummaryImageEmpty,
    resolvePreviewImageSource(),
    'Post photo'
  );

  // --- Facebook char count ------------------------------------------------
  const fbChars = fbText.length;
  const fbCap = SOCIAL_LIMITS.facebook.chars;
  const fbState = limitState(fbChars, fbCap);
  if (els.socialPreviewSummaryFbChars) {
    els.socialPreviewSummaryFbChars.textContent = fbChars.toLocaleString();
  }
  if (els.socialPreviewSummaryFbState) {
    els.socialPreviewSummaryFbState.textContent = limitStateLabel(fbState, 'chars');
  }
  if (els.socialPreviewSummaryFb) {
    els.socialPreviewSummaryFb.dataset.state = fbState;
  }

  // --- Instagram char + hashtag count -------------------------------------
  const igChars = igText.length;
  const igTags = countHashtags(igText);
  const igCap = SOCIAL_LIMITS.instagram.chars;
  const igTagCap = SOCIAL_LIMITS.instagram.hashtags;
  const igCharState = limitState(igChars, igCap);
  const igTagState = limitState(igTags, igTagCap);
  // Worst-of for the row pill so the operator sees the strictest signal.
  const igState = igCharState === 'over' || igTagState === 'over'
    ? 'over'
    : (igCharState === 'warn' || igTagState === 'warn' ? 'warn' : 'ok');
  if (els.socialPreviewSummaryIgChars) {
    els.socialPreviewSummaryIgChars.textContent = igChars.toLocaleString();
  }
  if (els.socialPreviewSummaryIgTags) {
    els.socialPreviewSummaryIgTags.textContent = String(igTags);
  }
  if (els.socialPreviewSummaryIgState) {
    if (igState === 'over') {
      els.socialPreviewSummaryIgState.textContent =
        igCharState === 'over' ? 'chars over limit' : 'hashtags over limit';
    } else if (igState === 'warn') {
      els.socialPreviewSummaryIgState.textContent =
        igCharState === 'warn' ? 'chars near limit' : 'hashtags near limit';
    } else {
      els.socialPreviewSummaryIgState.textContent = 'within limit';
    }
  }
  if (els.socialPreviewSummaryIg) {
    els.socialPreviewSummaryIg.dataset.state = igState;
  }

  // --- Destination link ---------------------------------------------------
  const slug = currentWatchSlug();
  if (els.socialPreviewSummaryLink) {
    if (slug) {
      const url = buildPublicWatchUrl(slug);
      els.socialPreviewSummaryLink.setAttribute('href', url);
      els.socialPreviewSummaryLink.textContent = url;
      els.socialPreviewSummaryLink.removeAttribute('data-empty');
    } else {
      els.socialPreviewSummaryLink.setAttribute('href', '#');
      els.socialPreviewSummaryLink.textContent = 'Save the listing to see its destination link.';
      els.socialPreviewSummaryLink.setAttribute('data-empty', 'true');
    }
  }
}

async function copyTextWithFallback(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text);
    return;
  }
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.top = '-9999px';
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand('copy');
  helper.remove();
  if (!copied) throw new Error('Copy failed');
}

async function copySocialCaption(platform) {
  const target = platform === 'facebook' ? els.socialFacebookCaption : els.socialInstagramCaption;
  const label = platform === 'facebook' ? 'Facebook' : 'Instagram';
  if (!target) return;
  let text = target.value.trim();
  if (!text) {
    renderSocialPreviewFromForm({ announce: false });
    text = target.value.trim();
  }
  if (!text) {
    setSocialPreviewStatus(`Generate the ${label} caption first.`, 'error');
    return;
  }
  try {
    await copyTextWithFallback(text);
    setSocialPreviewStatus(`${label} caption copied.`, 'success');
  } catch (error) {
    setSocialPreviewStatus(`Could not copy ${label} caption. Select the text and copy manually.`, 'error');
  }
}

// Format a Supabase ISO timestamp into a short human label like
// "Apr 28, 2026 · 4:12 PM" for the saved-drafts meta line. Returns
// the original string on parse failure so we never leak a JS error
// into owner-facing copy.
function formatDraftSavedTimestamp(value) {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  try {
    const date = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch {
    return dt.toISOString();
  }
}

function setSavedDraftsMeta(rows) {
  if (!els.savedDraftsMeta) return;
  if (!Array.isArray(rows) || rows.length === 0) {
    els.savedDraftsMeta.hidden = true;
    els.savedDraftsMeta.textContent = '';
    return;
  }
  const platforms = rows
    .map((r) => (r.platform === 'facebook' ? 'Facebook' : r.platform === 'instagram' ? 'Instagram' : null))
    .filter(Boolean);
  const latest = rows.reduce((acc, row) => {
    if (!row?.updated_at) return acc;
    if (!acc) return row.updated_at;
    return row.updated_at > acc ? row.updated_at : acc;
  }, null);
  const stamp = formatDraftSavedTimestamp(latest);
  const platformLabel = platforms.length === 2 ? 'Facebook + Instagram' : (platforms[0] || 'Drafts');
  els.savedDraftsMeta.textContent = stamp
    ? `Saved ${platformLabel} drafts last updated ${stamp}.`
    : `Saved ${platformLabel} drafts on file.`;
  els.savedDraftsMeta.hidden = false;
}

// Loads any previously-saved Facebook / Instagram drafts for the active
// watch and replaces the in-form captions with the saved versions, so
// the owner picks up exactly where they left off across sessions and
// devices. Silently no-ops when no listing is loaded yet.
//
// Captures the activeId at call time and bails on response if the user
// has switched listings while the RPC was in flight — otherwise a
// stale response from watch A could overwrite watch B's captions and
// the next Save click would silently persist A's drafts onto B.
async function loadSocialDraftsForActiveWatch() {
  if (!els.savedDraftsMeta) return;
  if (!activeId) {
    setSavedDraftsMeta([]);
    return;
  }
  const requestedWatchId = activeId;
  try {
    const { data, error } = await supabase.rpc('admin_list_social_drafts_for_watch', {
      target_watch_id: requestedWatchId,
    });
    if (error) throw error;
    if (requestedWatchId !== activeId) return; // user switched listings; bail.
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      setSavedDraftsMeta([]);
      return;
    }
    for (const row of rows) {
      if (row.platform === 'facebook' && els.socialFacebookCaption && typeof row.caption === 'string') {
        els.socialFacebookCaption.value = row.caption;
      }
      if (row.platform === 'instagram' && els.socialInstagramCaption && typeof row.caption === 'string') {
        els.socialInstagramCaption.value = row.caption;
      }
    }
    setSavedDraftsMeta(rows);
    setSocialPreviewStatus('Loaded saved drafts. Edit and re-save to update.', 'success');
  } catch (error) {
    if (requestedWatchId !== activeId) return; // user switched listings; bail.
    // Non-blocking — owner can still generate fresh previews.
    setSavedDraftsMeta([]);
  }
}

// Persist the current Facebook + Instagram captions to Supabase as
// drafts. Phase A only writes status='draft'. Requires a saved listing
// (foreign key) — a brand-new unsaved row has no watch_id to anchor
// the drafts to. Captures activeId at call time so a mid-flight watch
// switch cannot stamp the success message or reload against the wrong
// listing (the writes themselves are already keyed by the captured id
// inside the rpc payload).
async function saveSocialDrafts({ silentIfEmpty = false } = {}) {
  if (!activeId) {
    if (silentIfEmpty) return;
    setSocialPreviewStatus('Save the listing first, then save its social drafts.', 'error');
    return;
  }
  const requestedWatchId = activeId;
  const fb = (els.socialFacebookCaption?.value || '').trim();
  const ig = (els.socialInstagramCaption?.value || '').trim();
  if (!fb && !ig) {
    if (silentIfEmpty) return;
    setSocialPreviewStatus('Generate or write at least one caption before saving drafts.', 'error');
    return;
  }
  let previousLabel = '';
  if (els.socialSaveDraftBtn) {
    els.socialSaveDraftBtn.disabled = true;
    previousLabel = els.socialSaveDraftBtn.textContent;
    els.socialSaveDraftBtn.textContent = 'Saving drafts…';
  }
  try {
    const primaryImage = (getField('primaryImage') || '').trim();
    const targets = [
      fb ? { platform: 'facebook', caption: fb } : null,
      ig ? { platform: 'instagram', caption: ig } : null,
    ].filter(Boolean);

    const results = await Promise.all(
      targets.map(({ platform, caption }) =>
        supabase.rpc('admin_save_social_draft', {
          payload: {
            watchId: requestedWatchId,
            platform,
            caption,
            mediaUrls: primaryImage ? [primaryImage] : [],
          },
        })
      )
    );

    const firstError = results.find((r) => r?.error)?.error;
    if (firstError) throw firstError;

    if (requestedWatchId !== activeId) return; // user switched listings; bail.

    setSocialPreviewStatus(
      targets.length === 2
        ? 'Drafts saved for Facebook and Instagram.'
        : `Draft saved for ${targets[0].platform === 'facebook' ? 'Facebook' : 'Instagram'}.`,
      'success'
    );
    await loadSocialDraftsForActiveWatch();
  } catch (error) {
    if (requestedWatchId !== activeId) return; // user switched listings; bail.
    setSocialPreviewStatus(error?.message
      ? `Could not save drafts: ${error.message}`
      : 'Could not save drafts. Try again or check your connection.', 'error');
  } finally {
    if (els.socialSaveDraftBtn) {
      els.socialSaveDraftBtn.disabled = false;
      els.socialSaveDraftBtn.textContent = previousLabel || 'Save drafts to inventory';
    }
  }
}

function collectFormPayload() {
  const status = getField('status');
  const imagesText = getField('images') || '';
  const images = imagesText.split('\n').map((s) => s.trim()).filter(Boolean);
  let primaryImage = getField('primaryImage').trim();
  if (!primaryImage && images.length) primaryImage = images[0];

  if (!images.length) {
    primaryImage = '';
  } else if (!images.includes(primaryImage)) {
    throw new Error('Primary image must appear in the image paths list.');
  }

  const displayName = getField('name').trim();
  const slug = currentWatchSlug();

  const payload = {
    id: getField('id') || null,
    slug,
    brand: getField('brand').trim(),
    model: deriveModelValue(),
    reference: getField('reference').trim(),
    name: displayName,
    price: Number(getField('price')) || 0,
    currency: 'PHP',
    status,
    category: getField('category'),
    badges: getBadges(),
    conditionLabel: getField('conditionLabel').trim(),
    badge: deriveBadgeDisplay(),
    movement: getField('movement').trim(),
    caseSize: getField('caseSize').trim(),
    set: getField('set').trim(),
    material: getField('material').trim(),
    edition: getField('edition').trim(),
    description: getField('description').trim(),
    disclosure: getField('disclosure').trim(),
    provenance: getField('provenance').trim() || null,
    primaryImage,
    images,
    // Deprecated manual inquiry copy. The form fields were removed and the
    // storefront generates the message per-watch, but the DB columns are still
    // NOT NULL — persist empty strings to satisfy the constraint.
    inquirySubject: '',
    inquiryBody: '',
    hasBox: getCheckbox('hasBox'),
    hasPapers: getCheckbox('hasPapers'),
    serviceHistory: getField('serviceHistory').trim() || null,
    featured: getCheckbox('featured'),
    lowStock: getCheckbox('lowStock'),
    published: images.length ? getCheckbox('published') : false,
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

function clearWatchValidation() {
  if (!els.watchForm) return;
  els.watchForm.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  els.watchForm.querySelectorAll('.admin-field-error').forEach((el) => el.remove());
  els.watchForm.querySelectorAll('[data-invalid="true"]').forEach((el) => el.removeAttribute('data-invalid'));
  if (els.watchFormErrors) {
    els.watchFormErrors.hidden = true;
    els.watchFormErrors.textContent = '';
  }
}

function watchControlLabel(control) {
  const label = control?.closest('label');
  if (!label) return 'this field';
  const text = Array.from(label.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join(' ')
    .replace('*', '')
    .trim();
  return text || 'this field';
}

function watchValidationMessage(control) {
  const label = watchControlLabel(control);
  if (control.validity?.valueMissing) return `Please fill out ${label}.`;
  if (control.validity?.patternMismatch) {
    return control.title || `${label} is not in the expected format.`;
  }
  if (control.validity?.rangeUnderflow) return `${label} cannot be below ${control.min}.`;
  if (control.validity?.badInput) return `${label} must be a valid number.`;
  return `Please check ${label}.`;
}

function addWatchValidationError(control, message, focusTarget = control) {
  if (!control) return null;
  control.dataset.invalid = 'true';
  const group = control.closest('label') || control.closest('.admin-image-uploader') || control.closest('.admin-fieldset');
  if (group) group.classList.add('is-invalid');

  const error = document.createElement('p');
  error.className = 'admin-field-error';
  error.textContent = message;
  const anchor = control.closest('.admin-image-uploader') || control.closest('label') || control;
  anchor.insertAdjacentElement('afterend', error);
  return { control, focusTarget: focusTarget || control, message };
}

function showWatchValidationSummary(errors, mode = 'save') {
  if (!errors.length) return;
  if (els.watchFormErrors) {
    els.watchFormErrors.hidden = false;
    const heading = document.createElement('strong');
    heading.textContent = mode === 'publish'
      ? 'Please complete the required listing details before publishing.'
      : 'Please fill out the highlighted required fields before saving.';
    const detail = document.createElement('span');
    detail.textContent = ` ${errors[0].message}`;
    els.watchFormErrors.replaceChildren(heading, detail);
  }
  setStatus(
    mode === 'publish'
      ? 'Publish paused. Complete the highlighted fields first.'
      : 'Please fill out the highlighted required fields.',
    'error'
  );
}

function focusInvalidWatchField(error) {
  const target = error?.focusTarget || error?.control;
  if (!target) return;
  const details = target.closest('details');
  if (details) details.open = true;
  const scrollTarget = target.closest('.admin-image-uploader') || target.closest('label') || target;
  scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => {
    if (typeof target.focus === 'function') target.focus({ preventScroll: true });
  }, 200);
}

function validateWatchForm({ mode = 'save' } = {}) {
  clearWatchValidation();
  const errors = [];
  const recordError = (error) => {
    errors[errors.length] = error;
  };
  const skipIds = new Set(['field-primaryImage', 'field-images']);
  const requiredControls = Array.from(els.watchForm.querySelectorAll('[required]'))
    .filter((control) => !control.disabled && !skipIds.has(control.id));

  for (const control of requiredControls) {
    if (!control.checkValidity()) {
      recordError(addWatchValidationError(control, watchValidationMessage(control)));
    }
  }

  const imagesText = getField('images') || '';
  const images = imagesText.split('\n').map((s) => s.trim()).filter(Boolean);
  const primaryImage = getField('primaryImage').trim() || images[0] || '';
  if (mode === 'publish' && !images.length) {
    recordError(addWatchValidationError(
      field('images'),
      'Please upload at least one listing photo.',
      els.imageDropzone || field('images')
    ));
  } else if (images.length && primaryImage && !images.includes(primaryImage)) {
    recordError(addWatchValidationError(
      field('primaryImage'),
      'Primary image must appear in the image paths list.'
    ));
  }

  if (getField('status') === 'sold') {
    const soldAt = field('soldAt');
    const soldPrice = field('soldPrice');
    if (!/^[0-9]{4}-[0-9]{2}$/.test(getField('soldAt').trim())) {
      recordError(addWatchValidationError(soldAt, 'Please enter Sold at in YYYY-MM format.'));
    }
    const soldPriceValue = Number(getField('soldPrice'));
    if (!Number.isFinite(soldPriceValue) || soldPriceValue < 0) {
      recordError(addWatchValidationError(soldPrice, 'Please enter a non-negative sold price.'));
    }
  }

  const validErrors = errors.filter(Boolean);
  if (validErrors.length) {
    showWatchValidationSummary(validErrors, mode);
    focusInvalidWatchField(validErrors[0]);
    return false;
  }
  return true;
}

function listingUrlForSlug(slug) {
  const cleanSlug = String(slug || '').trim();
  return cleanSlug ? `/watch/${encodeURIComponent(cleanSlug)}` : '';
}

function syncListingActionButtons(watch = activeWatchSnapshot) {
  const isExisting = !!(watch?.id || activeId);
  const slug = currentWatchSlug() || watch?.slug || '';
  const listingUrl = isExisting ? listingUrlForSlug(slug) : '';
  const isPublished = getCheckbox('published');
  const currentStatus = getField('status') || watch?.status || 'available';
  const previewBtn = document.getElementById('preview-as-buyer-btn');

  for (const btn of [previewBtn, els.viewListingBtn]) {
    if (!btn) continue;
    if (listingUrl) {
      btn.hidden = false;
      btn.dataset.url = listingUrl;
    } else {
      btn.hidden = true;
      delete btn.dataset.url;
    }
  }

  if (els.publishWatchBtn) {
    els.publishWatchBtn.hidden = isPublished;
  }
  if (els.saveWatchBtn) {
    els.saveWatchBtn.textContent = isPublished ? 'Save' : 'Save Draft';
  }
  if (els.markSoldBtn) {
    els.markSoldBtn.hidden = !isExisting || currentStatus === 'sold';
  }
  if (els.reserveToggleBtn) {
    const isSold = currentStatus === 'sold';
    els.reserveToggleBtn.hidden = !isExisting || isSold;
    els.reserveToggleBtn.textContent = currentStatus === 'reserved' ? 'Unreserve' : 'Reserve';
    els.reserveToggleBtn.dataset.targetStatus =
      currentStatus === 'reserved' ? 'available' : 'reserved';
  }
}

function openListingUrlFromButton(btn) {
  if (!btn || btn.hidden) return;
  const url = btn.dataset.url;
  if (url) window.open(url, '_blank', 'noopener');
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
const BADGE_IDS = ['limited-edition', 'rare', 'collaboration', 'discontinued', 'jdm'];
function setBadges(list = []) {
  for (const id of BADGE_IDS) {
    const el = document.getElementById(`field-badge-${id}`);
    if (el) el.checked = list.includes(id);
  }
}
function getBadges() {
  return BADGE_IDS.filter((id) => {
    const el = document.getElementById(`field-badge-${id}`);
    return el && el.checked;
  });
}

const BADGE_DISPLAY = {
  'limited-edition': 'Limited Edition',
  rare: 'Rare',
  collaboration: 'Collaboration',
  discontinued: 'Discontinued',
  jdm: 'JDM',
};

function deriveBadgeDisplay() {
  const checked = getBadges();
  return checked.map((id) => BADGE_DISPLAY[id] || id).join(' · ');
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
  if (els.tabpanelDashboard) els.tabpanelDashboard.hidden = name !== 'dashboard';
  if (els.tabpanelInbox) els.tabpanelInbox.hidden = name !== 'inbox';
  if (els.tabpanelInventory) els.tabpanelInventory.hidden = name !== 'inventory';
  if (els.tabpanelJournal) els.tabpanelJournal.hidden = name !== 'journal';
  if (els.tabpanelNewsletter) els.tabpanelNewsletter.hidden = name !== 'newsletter';
  if (els.tabpanelAdmins) els.tabpanelAdmins.hidden = name !== 'admins';
  if (els.tabpanelAccount) els.tabpanelAccount.hidden = name !== 'account';
  if (name === 'admins') loadAdminsList();
  if (name === 'inbox') loadInbox();
  if (name === 'journal') loadJournalPosts();
  if (name === 'newsletter') loadNewsletterTab();
  if (name === 'dashboard') loadDashboard();
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
        <button type="button" class="btn-ghost" data-reset-email="${escapeAttr(row.email)}">Send reset</button>
        <button type="button" class="btn-ghost" data-remove-email="${escapeAttr(row.email)}">Remove</button>
      </div>
    `;
    els.adminsList.appendChild(li);
  }
}

if (els.adminsList) {
  els.adminsList.addEventListener('click', async (event) => {
    const resetBtn = event.target.closest('button[data-reset-email]');
    if (resetBtn) {
      const email = normalizeEmail(resetBtn.dataset.resetEmail);
      resetBtn.disabled = true;
      setStatus(`Sending password reset to ${email}…`);
      try {
        const normalized = await sendPasswordResetEmail(email);
        setStatus(passwordResetSuccessMessage(normalized), 'success');
      } catch (error) {
        setStatus(error.message || 'Reset failed', 'error');
      } finally {
        resetBtn.disabled = false;
      }
      return;
    }
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
    const email = normalizeEmail(els.inviteEmail.value);
    const note = (els.inviteNote.value || '').trim() || null;
    if (!isValidEmail(email)) {
      setInviteStatus('Enter a valid email address.', 'error');
      els.inviteEmail.focus();
      return;
    }

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
const IMAGE_UPLOAD_SOURCE_MAX_BYTES = 30 * 1024 * 1024;
const IMAGE_UPLOAD_TARGET_BYTES = 900 * 1024;
const IMAGE_UPLOAD_MAX_EDGE = 2200;
const IMAGE_UPLOAD_MIME = 'image/webp';
const IMAGE_UPLOAD_EXT = 'webp';
// Grid/gallery thumbnail emitted next to each upload as `<name>.thumb.webp`.
// Kept in sync with thumbnailUrl() in src/lib/inventory/image.ts and the
// backfill in scripts/generate-watch-thumbnails.mjs.
const THUMB_SUFFIX = '.thumb.webp';
const THUMB_MAX_EDGE = 900;
const THUMB_QUALITY = 0.72;
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

function buildWatchImageFolder() {
  return currentWatchSlug();
}

function buildStoragePath(file, folder) {
  const rand = Math.random().toString(36).slice(2, 8);
  const stamp = Date.now();
  return `${folder}/${stamp}-${rand}-${sanitizeFilename(file.name)}`;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function replaceFilenameExtension(name, ext) {
  const cleanExt = String(ext || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const base = String(name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
  return `${base}.${cleanExt}`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not compress image.'));
    }, type, quality);
  });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file.'));
    };
    image.src = url;
  });
}

async function decodeUploadImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Safari and older browsers can be picky with some JPEGs. Fall back to
      // an HTMLImageElement before we give up on the upload.
    }
  }
  return loadImageElement(file);
}

async function prepareImageForUpload(file) {
  if (file.size > IMAGE_UPLOAD_SOURCE_MAX_BYTES) {
    throw new Error(`Source file is ${formatFileSize(file.size)}. Please choose an image under ${formatFileSize(IMAGE_UPLOAD_SOURCE_MAX_BYTES)}.`);
  }

  const image = await decodeUploadImage(file);
  const width = image.width;
  const height = image.height;
  if (!width || !height) throw new Error('Image has no readable dimensions.');

  const scale = Math.min(1, IMAGE_UPLOAD_MAX_EDGE / Math.max(width, height));
  const outputWidth = Math.max(1, Math.round(width * scale));
  const outputHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Browser could not prepare the image canvas.');
  context.drawImage(image, 0, 0, outputWidth, outputHeight);
  if (typeof image.close === 'function') image.close();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, IMAGE_UPLOAD_MIME, quality);
  while (blob.size > IMAGE_UPLOAD_TARGET_BYTES && quality > 0.62) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, IMAGE_UPLOAD_MIME, quality);
  }

  const compressed = new File([blob], replaceFilenameExtension(file.name, IMAGE_UPLOAD_EXT), {
    type: blob.type || IMAGE_UPLOAD_MIME,
    lastModified: Date.now(),
  });

  // Small WebP thumbnail for the catalog grids / gallery filmstrip, drawn from
  // the already-scaled canvas so we don't decode the source twice.
  const thumbScale = Math.min(1, THUMB_MAX_EDGE / Math.max(outputWidth, outputHeight));
  const thumbWidth = Math.max(1, Math.round(outputWidth * thumbScale));
  const thumbHeight = Math.max(1, Math.round(outputHeight * thumbScale));
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;
  const thumbContext = thumbCanvas.getContext('2d', { alpha: false });
  let thumbBlob = null;
  if (thumbContext) {
    thumbContext.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
    thumbBlob = await canvasToBlob(thumbCanvas, IMAGE_UPLOAD_MIME, THUMB_QUALITY);
  }

  return {
    file: compressed,
    thumbBlob,
    originalName: file.name,
    originalBytes: file.size,
    compressedBytes: compressed.size,
    width: outputWidth,
    height: outputHeight,
  };
}

function uploadErrorMessage(file, error) {
  const message = error && error.message ? error.message : String(error || 'Unknown upload error');
  const statusCode = error && (error.statusCode || error.status);
  const code = error && error.error;
  const detail = [statusCode ? `status ${statusCode}` : '', code || ''].filter(Boolean).join(', ');
  return `${file.name}: ${message}${detail ? ` (${detail})` : ''}`;
}

async function uploadFiles(fileList) {
  if (!supabase) return;
  const files = Array.from(fileList || []).filter((f) => f && f.type && f.type.startsWith('image/'));
  if (!files.length) return;

  const folder = buildWatchImageFolder();
  if (!folder) {
    setUploadStatus('Enter the Display Name before uploading photos so they can be stored under the correct watch folder.', 'error');
    const nameField = field('name');
    if (nameField) nameField.focus();
    return;
  }

  setUploadStatus(`Preparing ${files.length} photo${files.length === 1 ? '' : 's'} for web upload...`);

  let succeeded = 0;
  let failed = 0;
  let savedBytes = 0;
  const errors = [];

  for (const file of files) {
    try {
      const prepared = await prepareImageForUpload(file);
      const path = buildStoragePath(prepared.file, folder);
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, prepared.file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: prepared.file.type,
      });
      if (error) throw error;

      // Upload the matching thumbnail at `<name>.thumb.webp`. The storefront
      // derives this path from the full image URL, so a failure here would only
      // mean the grid falls back to a missing thumb — log but don't fail the
      // image, which already uploaded successfully.
      if (prepared.thumbBlob) {
        const thumbPath = path.replace(/\.[^./]+$/, THUMB_SUFFIX);
        const { error: thumbError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(thumbPath, prepared.thumbBlob, {
            cacheControl: '31536000',
            upsert: true,
            contentType: IMAGE_UPLOAD_MIME,
          });
        if (thumbError) console.warn('Thumbnail upload failed for', path, thumbError);
      }

      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = pub && pub.publicUrl;
      if (!publicUrl) throw new Error('No public URL returned');
      imageList[imageList.length] = publicUrl;
      savedBytes += Math.max(0, prepared.originalBytes - prepared.compressedBytes);
      succeeded += 1;
    } catch (error) {
      console.error('Upload failed for', file.name, error);
      errors.push(uploadErrorMessage(file, error));
      failed += 1;
    }
  }

  syncImageFields();
  renderImageThumbs();

  if (failed === 0) {
    setUploadStatus(`Uploaded ${succeeded} photo${succeeded === 1 ? '' : 's'} (${formatFileSize(savedBytes)} saved before storage).`, 'success');
  } else if (succeeded === 0) {
    setUploadStatus(`Upload failed for all ${failed} photo${failed === 1 ? '' : 's'}. ${errors.slice(0, 2).join(' ')}`, 'error');
  } else {
    setUploadStatus(`Uploaded ${succeeded}, failed ${failed}. ${errors.slice(0, 2).join(' ')}`, 'error');
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

// Lost-reason taxonomy mirrors the CHECK constraint in migration 0012. The
// labels stay short so they read on a 320px drawer; the values match the DB.
const LOST_REASON_OPTIONS = [
  { value: 'price', label: 'Price' },
  { value: 'condition', label: 'Condition' },
  { value: 'sold_elsewhere', label: 'Sold elsewhere' },
  { value: 'no_response', label: 'No response from buyer' },
  { value: 'timing', label: 'Timing / not the right moment' },
  { value: 'other', label: 'Other' },
];

function lostReasonLabel(value) {
  const found = LOST_REASON_OPTIONS.find((opt) => opt.value === value);
  return found ? found.label : value || '—';
}

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
  const watchHref = row.watch_slug ? `../watch/${encodeURIComponent(row.watch_slug)}` : '';
  const respondedAt = row.responded_at ? new Date(row.responded_at).toLocaleString('en-PH') : '—';
  const closedAt = row.closed_at ? new Date(row.closed_at).toLocaleString('en-PH') : '—';
  const created = row.created_at ? new Date(row.created_at).toLocaleString('en-PH') : '—';

  const statusOptionsHtml = INBOX_STATUS_OPTIONS
    .map((opt) => `<option value="${escapeAttr(opt.value)}"${opt.value === row.status ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`)
    .join('');

  // Lost-reason select. Hidden until the operator chooses status=lost. Pre-
  // selects the existing reason if the inquiry is already lost.
  const lostReasonOptionsHtml = [`<option value="" disabled${row.lost_reason ? '' : ' selected'}>Select a reason…</option>`]
    .concat(
      LOST_REASON_OPTIONS.map((opt) =>
        `<option value="${escapeAttr(opt.value)}"${opt.value === row.lost_reason ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`
      )
    )
    .join('');
  const lostReasonHidden = row.status !== 'lost';

  return `
    <p class="inbox-drawer-message">${escapeHtml(fullMessage)}</p>
    <dl class="inbox-drawer-meta">
      <div><dt>Email</dt><dd>${row.buyer_email ? `<a href="mailto:${escapeAttr(row.buyer_email)}">${escapeHtml(row.buyer_email)}</a>` : '—'}</dd></div>
      ${row.buyer_phone ? `<div><dt>Phone</dt><dd>${escapeHtml(row.buyer_phone)}</dd></div>` : ''}
      <div><dt>Watch</dt><dd>${watchHref ? `<a href="${escapeAttr(watchHref)}" target="_blank" rel="noopener">${escapeHtml(watchLabel)}</a>` : escapeHtml(watchLabel || '—')}</dd></div>
      <div><dt>Created</dt><dd>${escapeHtml(created)}</dd></div>
      <div><dt>Responded</dt><dd>${escapeHtml(respondedAt)}</dd></div>
      <div><dt>Closed</dt><dd>${escapeHtml(closedAt)}</dd></div>
      ${row.status_note ? `<div><dt>Last note</dt><dd>${escapeHtml(row.status_note)}</dd></div>` : ''}
      ${row.lost_reason ? `<div><dt>Lost reason</dt><dd>${escapeHtml(lostReasonLabel(row.lost_reason))}</dd></div>` : ''}
    </dl>
    <div class="inbox-drawer-actions">
      <select data-inquiry-status-select="${escapeAttr(row.id)}">${statusOptionsHtml}</select>
      <select data-inquiry-lost-reason="${escapeAttr(row.id)}"${lostReasonHidden ? ' hidden aria-hidden="true"' : ''} aria-label="Lost reason">${lostReasonOptionsHtml}</select>
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
      const lostReasonSelect = els.inboxList.querySelector(`[data-inquiry-lost-reason="${cssEscape(id)}"]`);
      const newStatus = select ? select.value : null;
      const note = noteInput ? noteInput.value.trim() : '';
      const reason = lostReasonSelect ? lostReasonSelect.value.trim() : '';
      if (!newStatus) return;
      // Lost transitions require a reason; bail before the RPC so the operator
      // sees a clean inline message instead of a Postgres CHECK error.
      if (newStatus === 'lost' && !reason) {
        setStatus('Pick a lost reason before saving.', 'error');
        if (lostReasonSelect) lostReasonSelect.focus();
        return;
      }
      saveBtn.disabled = true;
      try {
        const { data, error } = await supabase.rpc('admin_update_inquiry_status', {
          inquiry_id: id,
          new_status: newStatus,
          note: note || null,
          reason: newStatus === 'lost' ? reason : null,
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

  // Reveal/hide the lost-reason select as the operator picks a new status.
  // The dropdown only matters for lost transitions; everything else hides it.
  els.inboxList.addEventListener('change', (event) => {
    const target = event.target;
    if (!target || !target.matches('[data-inquiry-status-select]')) return;
    const id = target.dataset.inquiryStatusSelect;
    const lostReasonSelect = els.inboxList.querySelector(`[data-inquiry-lost-reason="${cssEscape(id)}"]`);
    if (!lostReasonSelect) return;
    const isLost = target.value === 'lost';
    lostReasonSelect.hidden = !isLost;
    lostReasonSelect.setAttribute('aria-hidden', isLost ? 'false' : 'true');
    if (isLost) lostReasonSelect.focus();
  });
  els.inboxRefreshBtn.addEventListener('click', () => loadInbox());
}

if (els.inboxLogForm) {
  els.inboxLogForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabase) return;

    const name = (els.inboxLogName?.value || '').trim();
    const message = (els.inboxLogMessage?.value || '').trim();
    if (!name || !message) {
      els.inboxLogStatus.textContent = 'Name and message are required.';
      return;
    }

    const payload = {
      name,
      message,
      channel: els.inboxLogChannel?.value || 'messenger',
      watchSlug: (els.inboxLogWatchSlug?.value || '').trim() || null,
      email: (els.inboxLogEmail?.value || '').trim() || null,
      phone: (els.inboxLogPhone?.value || '').trim() || null,
    };

    els.inboxLogSubmit.disabled = true;
    els.inboxLogStatus.textContent = 'Logging…';
    try {
      const { error } = await supabase.rpc('admin_log_inquiry', { payload });
      if (error) throw error;
      els.inboxLogForm.reset();
      if (els.inboxLogChannel) els.inboxLogChannel.value = 'messenger';
      els.inboxLogStatus.textContent = 'Logged.';
      if (els.inboxLogFormWrap) els.inboxLogFormWrap.open = false;
      await loadInbox();
      setStatus('Inquiry logged in Inbox.', 'success');
    } catch (error) {
      const detail = error?.message || String(error);
      els.inboxLogStatus.textContent = `Failed: ${detail}`;
      setStatus(`Log inquiry failed: ${detail}`, 'error');
    } finally {
      els.inboxLogSubmit.disabled = false;
    }
  });
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}
// =====================================================================
// Dashboard tab — the operator's landing surface
// =====================================================================

let dashboardLoading = false;

function formatRelativeTime(at) {
  if (!at) return '';
  const then = new Date(at).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(at).toLocaleDateString('en-PH');
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 90) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 36) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

function setDashboardKpi(key, value) {
  const node = document.querySelector(`[data-kpi="${key}"]`);
  if (node) node.textContent = value == null ? '—' : String(value);
}

const ACTIVITY_KIND_LABEL = {
  inquiry: 'INQUIRY',
  sold: 'SOLD',
  journal: 'JOURNAL',
};

async function loadDashboard() {
  if (!supabase || !els.dashboardGrid) return;
  if (dashboardLoading) return;
  dashboardLoading = true;
  try {
    const { data, error } = await supabase.rpc('admin_dashboard_metrics');
    if (error) throw error;
    renderDashboard(data || {});
  } catch (error) {
    setStatus(`Failed to load dashboard: ${error.message || error}`, 'error');
  } finally {
    dashboardLoading = false;
  }
}

function renderDashboard(data) {
  const inq = data.inquiries || {};
  const repl = data.replySla || {};
  const conv = data.conversion || {};
  const inv = data.inventory || {};
  const journal = data.journal || {};
  const top = Array.isArray(data.topWatches) ? data.topWatches : [];
  const lost = Array.isArray(data.lostReasons) ? data.lostReasons : [];
  const activity = Array.isArray(data.activity) ? data.activity : [];

  // Refreshed-at line in the watchmaker's voice.
  if (els.dashboardMeta) {
    const at = data.generatedAt ? new Date(data.generatedAt) : new Date();
    els.dashboardMeta.textContent = `Last refreshed ${at.toLocaleString('en-PH')}.`;
  }

  // KPI tiles
  const last7 = Number(inq.last7 || 0);
  const last30 = Number(inq.last30 || 0);
  setDashboardKpi('inquiries.last7', last7);
  setDashboardKpi('inquiries.last30Foot', `${last30} in the last 30 days`);

  const open = Number(inq.open_new || 0) + Number(inq.open_contacted || 0) + Number(inq.open_viewing || 0) + Number(inq.open_reserved || 0);
  setDashboardKpi('inquiries.open', open);
  const openParts = [
    inq.open_new ? `${inq.open_new} new` : null,
    inq.open_contacted ? `${inq.open_contacted} contacted` : null,
    inq.open_viewing ? `${inq.open_viewing} viewing` : null,
    inq.open_reserved ? `${inq.open_reserved} reserved` : null,
  ].filter(Boolean);
  setDashboardKpi('inquiries.openFoot', openParts.length ? openParts.join(' · ') : 'no open inquiries');

  const won = Number(conv.won || 0);
  const closed = Number(conv.closed || 0);
  const rate = closed > 0 ? Math.round((won / closed) * 100) : null;
  setDashboardKpi('conversion.rate', rate == null ? '—' : `${rate}%`);
  setDashboardKpi('conversion.foot', closed > 0 ? `${won} won of ${closed} closed` : 'no closed inquiries yet');

  const median = Number(repl.medianSeconds);
  setDashboardKpi('replySla.median', Number.isFinite(median) ? formatDuration(median) : '—');
  const replied = Number(repl.repliedCount || 0);
  const total = Number(repl.inquiryCount || 0);
  setDashboardKpi('replySla.foot', total > 0 ? `${replied} of ${total} replied` : 'no inquiries yet');

  setDashboardKpi('inventory.soldThisMonth', Number(inv.sold_this_month || 0));
  setDashboardKpi('inventory.soldFoot', `${inv.sold_all_time || 0} placed all time`);

  setDashboardKpi('inventory.published', Number(inv.published || 0));
  setDashboardKpi('inventory.publishedFoot', `${inv.published || 0} published · ${inv.drafts || 0} drafts`);

  setDashboardKpi('journal.published', Number(journal.published || 0));
  setDashboardKpi('journal.drafts', Number(journal.drafts || 0));
  setDashboardKpi('journal.scheduled', Number(journal.scheduled || 0));

  renderTopWatches(top);
  renderLostReasons(lost);
  renderActivity(activity);
}

function renderTopWatches(rows) {
  if (!els.dashboardTopWatches) return;
  const max = rows.reduce((m, r) => Math.max(m, Number(r.inquiries || 0)), 0);
  if (rows.length === 0) {
    els.dashboardTopWatches.innerHTML = '';
    if (els.dashboardTopWatchesEmpty) els.dashboardTopWatchesEmpty.hidden = false;
    return;
  }
  if (els.dashboardTopWatchesEmpty) els.dashboardTopWatchesEmpty.hidden = true;
  els.dashboardTopWatches.innerHTML = rows.map((r) => {
    const inquiries = Number(r.inquiries || 0);
    const won = Number(r.won || 0);
    const pct = max > 0 ? Math.round((inquiries / max) * 100) : 0;
    const label = (r.label || '').trim() || (r.watch_id ? r.watch_id : 'Unknown listing');
    return `
      <li>
        <div class="dashboard-list-bar-wrapper">
          <span class="dashboard-list-label">${escapeHtml(label)}</span>
          <span class="dashboard-list-bar" style="width: ${pct}%"></span>
        </div>
        <span class="dashboard-list-meta">${inquiries} INQ${won ? ` · ${won} WON` : ''}</span>
      </li>
    `;
  }).join('');
}

const LOST_REASON_LABEL = {
  price: 'Price',
  condition: 'Condition',
  sold_elsewhere: 'Sold elsewhere',
  no_response: 'No response',
  timing: 'Timing',
  other: 'Other',
  unspecified: 'Unspecified',
};

function renderLostReasons(rows) {
  if (!els.dashboardLostReasons) return;
  const max = rows.reduce((m, r) => Math.max(m, Number(r.losses || 0)), 0);
  if (rows.length === 0) {
    els.dashboardLostReasons.innerHTML = '';
    if (els.dashboardLostReasonsEmpty) els.dashboardLostReasonsEmpty.hidden = false;
    return;
  }
  if (els.dashboardLostReasonsEmpty) els.dashboardLostReasonsEmpty.hidden = true;
  els.dashboardLostReasons.innerHTML = rows.map((r) => {
    const losses = Number(r.losses || 0);
    const pct = max > 0 ? Math.round((losses / max) * 100) : 0;
    const label = LOST_REASON_LABEL[r.reason] || (r.reason || 'Unspecified');
    return `
      <li>
        <div class="dashboard-list-bar-wrapper">
          <span class="dashboard-list-label">${escapeHtml(label)}</span>
          <span class="dashboard-list-bar" style="width: ${pct}%"></span>
        </div>
        <span class="dashboard-list-meta">${losses}</span>
      </li>
    `;
  }).join('');
}

function renderActivity(rows) {
  if (!els.dashboardActivity) return;
  if (rows.length === 0) {
    els.dashboardActivity.innerHTML = '';
    if (els.dashboardActivityEmpty) els.dashboardActivityEmpty.hidden = false;
    return;
  }
  if (els.dashboardActivityEmpty) els.dashboardActivityEmpty.hidden = true;
  els.dashboardActivity.innerHTML = rows.map((r) => {
    const kindLabel = ACTIVITY_KIND_LABEL[r.kind] || (r.kind || '').toUpperCase();
    const when = formatRelativeTime(r.at);
    const label = r.label || '';
    let labelHtml = escapeHtml(label);
    // Deep-link the row to /watch/<slug> or /journal/<slug> when slug is present.
    if (r.slug) {
      const url = r.kind === 'journal'
        ? `/journal/${encodeURIComponent(r.slug)}`
        : `/watch/${encodeURIComponent(r.slug)}`;
      labelHtml = `<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${labelHtml}</a>`;
    }
    return `
      <li>
        <span class="dashboard-activity-kind">${escapeHtml(kindLabel)}</span>
        <span class="dashboard-activity-label">${labelHtml}</span>
        <span class="dashboard-activity-when">${escapeHtml(when)}</span>
      </li>
    `;
  }).join('');
}

if (els.dashboardRefresh) {
  els.dashboardRefresh.addEventListener('click', () => loadDashboard());
}

// Preview as buyer — opens the public storefront URL for the active watch
// in a new tab. Drafts render with a DRAFT banner + noindex; published
// listings show their normal page. Wired here because both states share
// the same /watch/<slug> URL.
document.addEventListener('click', (event) => {
  const btn = event.target.closest('#preview-as-buyer-btn, #view-listing-btn');
  openListingUrlFromButton(btn);
});

// (DRAFT pill rendering moved into renderList()'s template directly.
// The previous MutationObserver-based approach was a CPU bomb: each
// pill add/remove triggered the observer, which re-ran the decoration,
// which mutated the DOM again, locking the page with "Page Unresponsive"
// the moment any inventory loaded.)

// =====================================================================
// Journal tab — list, edit, save, delete, toolbar, live preview, hero
// =====================================================================

let journalPosts = [];
let activeJournalId = null;
let journalLoading = false;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
    .replace(/^-|-$/g, '');
}

function isoToLocalDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // <input type="datetime-local"> wants 'YYYY-MM-DDTHH:MM' in local time.
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDateTimeToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function loadJournalPosts() {
  if (!supabase || !els.journalList) return;
  if (journalLoading) return;
  journalLoading = true;
  els.journalList.innerHTML = '<li class="admin-meta">Loading…</li>';
  try {
    const { data, error } = await supabase.rpc('admin_list_journal_posts', { status_filter: null, limit_count: 200 });
    if (error) throw error;
    journalPosts = Array.isArray(data) ? data : [];
    renderJournalList();
  } catch (error) {
    journalPosts = [];
    els.journalList.innerHTML = `<li class="admin-meta">Failed to load: ${escapeHtml(error.message || error)}</li>`;
  } finally {
    journalLoading = false;
  }
}

function renderJournalList() {
  if (!els.journalList) return;
  const filter = (els.journalFilter && els.journalFilter.value || '').trim().toLowerCase();
  const filtered = filter
    ? journalPosts.filter((p) =>
        (p.title || '').toLowerCase().includes(filter) ||
        (p.slug || '').toLowerCase().includes(filter)
      )
    : journalPosts;
  els.journalCount.textContent = `${journalPosts.length}`;
  if (filtered.length === 0) {
    els.journalList.innerHTML = '<li class="admin-meta">No posts yet. Click + New post.</li>';
    return;
  }
  els.journalList.innerHTML = filtered.map((post) => {
    const status = post.status || 'draft';
    const statusClass = status === 'published' ? 'is-published' : status === 'scheduled' ? 'is-scheduled' : 'is-draft';
    const isActive = post.id === activeJournalId ? ' is-active' : '';
    return `
      <li class="${isActive}">
        <button type="button" class="admin-watch-list-btn" data-journal-id="${escapeAttr(post.id)}">
          <span class="admin-watch-list-name">${escapeHtml(post.title || '(untitled)')}</span>
          <span class="admin-watch-list-meta">
            <span class="journal-list-status ${statusClass}">${escapeHtml(status)}</span>
            <span>${escapeHtml(post.slug || '')}</span>
          </span>
        </button>
      </li>
    `;
  }).join('');
}

if (els.journalList) {
  els.journalList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-journal-id]');
    if (!btn) return;
    const post = journalPosts.find((p) => p.id === btn.dataset.journalId);
    if (post) loadJournalPostIntoForm(post);
  });
}
if (els.journalFilter) {
  els.journalFilter.addEventListener('input', () => renderJournalList());
}
if (els.journalNewBtn) {
  els.journalNewBtn.addEventListener('click', () => loadJournalPostIntoForm(null));
}
if (els.journalBackBtn) {
  els.journalBackBtn.addEventListener('click', () => {
    closeJournalForm();
    if (els.journalFilter) els.journalFilter.focus({ preventScroll: true });
  });
}

function loadJournalPostIntoForm(post) {
  if (!els.journalForm) return;
  activeJournalId = post?.id || null;
  if (els.tabpanelJournal) els.tabpanelJournal.dataset.mobileView = 'detail';
  els.journalDetailEmpty.hidden = true;
  els.journalForm.hidden = false;

  els.journalFieldId.value = post?.id || '';
  els.journalFieldStatus.value = post?.status || 'draft';
  els.journalFieldPublishAt.value = isoToLocalDateTime(post?.publish_at);
  els.journalFieldTitle.value = post?.title || '';
  els.journalFieldSlug.value = post?.slug || '';
  els.journalFieldSummary.value = post?.summary || '';
  els.journalFieldAuthor.value = post?.author || '';
  els.journalFieldReadMinutes.value = Number.isFinite(post?.read_minutes) ? post.read_minutes : '';
  els.journalFieldTags.value = Array.isArray(post?.tags) ? post.tags.join(', ') : '';
  els.journalFieldHeroImage.value = post?.hero_image || '';
  els.journalFieldBody.value = post?.body_markdown || '';

  updateJournalHeroPreview(post?.hero_image || '');
  updateJournalPublishAtVisibility();
  updateJournalPreviewBtnVisibility(post);
  updateJournalDeleteBtnVisibility(post);
  updateJournalLivePreview();
  renderJournalList();
}

function updateJournalHeroPreview(url) {
  if (!els.journalHeroPreview) return;
  if (url) {
    els.journalHeroPreviewImg.src = url;
    els.journalHeroPreviewImg.alt = els.journalFieldTitle.value || 'Hero image';
    els.journalHeroPreview.hidden = false;
  } else {
    els.journalHeroPreviewImg.removeAttribute('src');
    els.journalHeroPreview.hidden = true;
  }
}

function updateJournalPublishAtVisibility() {
  if (!els.journalFieldPublishAtWrapper) return;
  const status = els.journalFieldStatus.value;
  els.journalFieldPublishAtWrapper.hidden = status !== 'scheduled';
}

function updateJournalPreviewBtnVisibility(post) {
  if (!els.journalPreviewBtn) return;
  const isPublished = post && post.status === 'published' && post.slug;
  els.journalPreviewBtn.hidden = !isPublished;
  if (isPublished) {
    els.journalPreviewBtn.dataset.url = `/journal/${post.slug}`;
  }
}

function updateJournalDeleteBtnVisibility(post) {
  if (!els.journalDeleteBtn) return;
  els.journalDeleteBtn.hidden = !(post && post.id);
}

function updateJournalLivePreview() {
  if (!els.journalPreview) return;
  const body = els.journalFieldBody.value || '';
  if (!body.trim()) {
    els.journalPreview.innerHTML = '<p class="journal-preview-empty">The article preview will appear here as you type.</p>';
    return;
  }
  els.journalPreview.innerHTML = renderMarkdown(body);
}

if (els.journalFieldBody) {
  els.journalFieldBody.addEventListener('input', updateJournalLivePreview);
}
if (els.journalFieldStatus) {
  els.journalFieldStatus.addEventListener('change', updateJournalPublishAtVisibility);
}
if (els.journalFieldTitle) {
  // Auto-fill the slug on first edit, but stop once the user has typed in
  // the slug field directly (or once the post has an id, since changing the
  // slug breaks any inbound links).
  let slugTouched = false;
  els.journalFieldSlug.addEventListener('input', () => { slugTouched = true; });
  els.journalFieldTitle.addEventListener('input', () => {
    if (slugTouched) return;
    if (els.journalFieldId.value) return;
    els.journalFieldSlug.value = slugify(els.journalFieldTitle.value);
  });
}

// ── Toolbar (Word-style buttons + keyboard shortcuts) ────────────────────
function applyMarkdownAction(action) {
  const ta = els.journalFieldBody;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const value = ta.value;
  const selected = value.slice(start, end);
  let replacement = '';
  let cursorOffset = 0;
  switch (action) {
    case 'bold':
      replacement = `**${selected || 'bold text'}**`;
      cursorOffset = selected ? 0 : -2;
      break;
    case 'italic':
      replacement = `*${selected || 'italic text'}*`;
      cursorOffset = selected ? 0 : -1;
      break;
    case 'h2': {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const before = value.slice(0, lineStart);
      const after = value.slice(lineStart);
      ta.value = `${before}## ${after.trimStart()}`;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
      return;
    }
    case 'h3': {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const before = value.slice(0, lineStart);
      const after = value.slice(lineStart);
      ta.value = `${before}### ${after.trimStart()}`;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
      return;
    }
    case 'ul':
      replacement = (selected || 'List item').split('\n').map((line) => `- ${line.replace(/^[-*]\s*/, '')}`).join('\n');
      break;
    case 'ol':
      replacement = (selected || 'List item').split('\n').map((line, i) => `${i + 1}. ${line.replace(/^\d+\.\s*/, '')}`).join('\n');
      break;
    case 'quote':
      replacement = (selected || 'Quote').split('\n').map((line) => `> ${line}`).join('\n');
      break;
    case 'link': {
      const url = window.prompt('Link URL', 'https://');
      if (!url) return;
      replacement = `[${selected || 'link text'}](${url})`;
      break;
    }
    case 'image':
      // Trigger the same hero-input element under the hood — it uploads to
      // the journal-images bucket and inserts a markdown image at the
      // cursor when it returns. We re-route via a hidden input.
      els.journalHeroInput.dataset.target = 'inline';
      els.journalHeroInput.click();
      return;
    case 'hr':
      replacement = `\n\n---\n\n`;
      break;
    default:
      return;
  }
  const newValue = value.slice(0, start) + replacement + value.slice(end);
  ta.value = newValue;
  const newCursor = start + replacement.length + cursorOffset;
  ta.setSelectionRange(newCursor, newCursor);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.focus();
}

document.querySelectorAll('[data-md-action]').forEach((btn) => {
  btn.addEventListener('click', () => applyMarkdownAction(btn.dataset.mdAction));
});

if (els.journalFieldBody) {
  els.journalFieldBody.addEventListener('keydown', (event) => {
    const meta = event.metaKey || event.ctrlKey;
    if (!meta) return;
    if (event.key === 'b') { event.preventDefault(); applyMarkdownAction('bold'); }
    else if (event.key === 'i') { event.preventDefault(); applyMarkdownAction('italic'); }
    else if (event.key === 'k') { event.preventDefault(); applyMarkdownAction('link'); }
  });
}

// ── Hero image / inline image upload ─────────────────────────────────────
async function uploadJournalImage(file) {
  if (!supabase) throw new Error('Not signed in.');
  if (!file) throw new Error('No file selected.');
  const prepared = await prepareImageForUpload(file);
  const ext = (prepared.file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeBase = (prepared.file.name || 'image').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-]+/g, '-').slice(0, 60) || 'image';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}.${ext}`;
  const { error } = await supabase.storage.from('journal-images').upload(filename, prepared.file, {
    cacheControl: '31536000',
    contentType: prepared.file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('journal-images').getPublicUrl(filename);
  return data?.publicUrl || '';
}

async function handleJournalHeroFile(file, mode) {
  if (!file) return;
  els.journalHeroStatus.textContent = 'Uploading…';
  try {
    const url = await uploadJournalImage(file);
    if (!url) throw new Error('Upload returned no URL.');
    if (mode === 'inline') {
      // Insert at the cursor as a markdown image.
      const ta = els.journalFieldBody;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const insert = `\n![${file.name.replace(/\.[^.]+$/, '')}](${url})\n`;
      ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
    } else {
      els.journalFieldHeroImage.value = url;
      updateJournalHeroPreview(url);
    }
    els.journalHeroStatus.textContent = 'Uploaded.';
  } catch (error) {
    els.journalHeroStatus.textContent = `Upload failed: ${error.message || error}`;
  } finally {
    setTimeout(() => { if (els.journalHeroStatus) els.journalHeroStatus.textContent = ''; }, 3000);
  }
}

if (els.journalHeroInput) {
  els.journalHeroInput.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    const mode = event.target.dataset.target === 'inline' ? 'inline' : 'hero';
    event.target.dataset.target = '';
    event.target.value = '';
    if (file) handleJournalHeroFile(file, mode);
  });
}
if (els.journalHeroDropzone) {
  els.journalHeroDropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    els.journalHeroDropzone.style.borderColor = 'var(--gold)';
  });
  els.journalHeroDropzone.addEventListener('dragleave', () => {
    els.journalHeroDropzone.style.borderColor = '';
  });
  els.journalHeroDropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    els.journalHeroDropzone.style.borderColor = '';
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) handleJournalHeroFile(file, 'hero');
  });
}
if (els.journalHeroRemove) {
  els.journalHeroRemove.addEventListener('click', () => {
    els.journalFieldHeroImage.value = '';
    updateJournalHeroPreview('');
  });
}

// ── Save / Publish / Cancel / Delete / Preview ──────────────────────────
async function saveJournalPost(forcedStatus) {
  if (!supabase) return;
  const status = forcedStatus || els.journalFieldStatus.value;
  const title = els.journalFieldTitle.value.trim();
  const slug = els.journalFieldSlug.value.trim();
  const summary = els.journalFieldSummary.value.trim();
  const body = els.journalFieldBody.value;

  if (!title) { setStatus('Add a title first.', 'error'); els.journalFieldTitle.focus(); return; }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setStatus('Slug must be lowercase letters, numbers, and hyphens.', 'error'); els.journalFieldSlug.focus(); return; }
  if (!summary) { setStatus('Add a summary so the Journal index has a teaser.', 'error'); els.journalFieldSummary.focus(); return; }
  if (status === 'scheduled' && !els.journalFieldPublishAt.value) {
    setStatus('Pick a publish-at date for scheduled posts.', 'error');
    els.journalFieldPublishAt.focus();
    return;
  }

  const tags = els.journalFieldTags.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  const payload = {
    id: els.journalFieldId.value || null,
    slug,
    title,
    summary,
    bodyMarkdown: body,
    heroImage: els.journalFieldHeroImage.value || null,
    tags,
    status,
    publishAt: status === 'scheduled' ? localDateTimeToIso(els.journalFieldPublishAt.value) : null,
    author: els.journalFieldAuthor.value.trim() || null,
    readMinutes: els.journalFieldReadMinutes.value ? Number(els.journalFieldReadMinutes.value) : null,
  };

  els.journalSaveBtn.disabled = true;
  els.journalPublishBtn.disabled = true;
  try {
    const { data, error } = await supabase.rpc('admin_upsert_journal_post', { payload });
    if (error) throw error;
    setStatus(
      status === 'published'
        ? 'Published. The website updates automatically.'
        : 'Saved. The website updates automatically.',
      'success'
    );
    await loadJournalPosts();
    if (data && data.id) loadJournalPostIntoForm(data);
  } catch (error) {
    setStatus(`Save failed: ${error.message || error}`, 'error');
  } finally {
    els.journalSaveBtn.disabled = false;
    els.journalPublishBtn.disabled = false;
  }
}

if (els.journalForm) {
  els.journalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveJournalPost();
  });
}
if (els.journalPublishBtn) {
  els.journalPublishBtn.addEventListener('click', () => {
    els.journalFieldStatus.value = 'published';
    updateJournalPublishAtVisibility();
    saveJournalPost('published');
  });
}
if (els.journalCancelBtn) {
  els.journalCancelBtn.addEventListener('click', () => {
    closeJournalForm();
  });
}
if (els.journalDeleteBtn) {
  els.journalDeleteBtn.addEventListener('click', async () => {
    if (!supabase) return;
    const id = els.journalFieldId.value;
    if (!id) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    els.journalDeleteBtn.disabled = true;
    try {
      const { error } = await supabase.rpc('admin_delete_journal_post', { post_id: id });
      if (error) throw error;
      setStatus('Deleted. The website updates automatically.', 'success');
      activeJournalId = null;
      if (els.tabpanelJournal) els.tabpanelJournal.dataset.mobileView = 'list';
      els.journalForm.hidden = true;
      els.journalDetailEmpty.hidden = false;
      await loadJournalPosts();
    } catch (error) {
      setStatus(`Delete failed: ${error.message || error}`, 'error');
    } finally {
      els.journalDeleteBtn.disabled = false;
    }
  });
}

function closeJournalForm() {
  activeJournalId = null;
  if (els.tabpanelJournal) els.tabpanelJournal.dataset.mobileView = 'list';
  if (els.journalForm) els.journalForm.hidden = true;
  if (els.journalDetailEmpty) els.journalDetailEmpty.hidden = false;
  renderJournalList();
}
if (els.journalPreviewBtn) {
  els.journalPreviewBtn.addEventListener('click', () => {
    const url = els.journalPreviewBtn.dataset.url;
    if (url) window.open(url, '_blank');
  });
}

// ---------------- Newsletters tab ----------------

let currentNewsletters = [];
let selectedNewsletter = null;

async function loadNewsletterTab() {
  if (!supabase) return;
  setStatus('Loading dispatches...', 'pending');
  try {
    const { data, error } = await supabase.rpc('admin_list_newsletter_issues');
    if (error) throw error;
    
    currentNewsletters = data || [];
    renderNewsletterList();
    clearNewsletterForm();
    setStatus('Dispatches loaded.');
  } catch (err) {
    console.error('loadNewsletterTab failed:', err);
    setStatus('Failed to load newsletters.', 'error');
  }
}

function renderNewsletterList() {
  const list = els.newsletterList;
  if (!list) return;
  list.innerHTML = '';
  
  const filterVal = els.newsletterFilter.value.trim().toLowerCase();
  const filtered = currentNewsletters.filter(n => 
    !filterVal || 
    (n.public_title && n.public_title.toLowerCase().includes(filterVal)) ||
    (n.subject && n.subject.toLowerCase().includes(filterVal)) ||
    (n.slug && n.slug.toLowerCase().includes(filterVal))
  );

  els.newsletterCount.textContent = `${filtered.length} dispatch${filtered.length === 1 ? '' : 'es'}`;

  if (filtered.length === 0) {
    list.innerHTML = '<li class="admin-sidebar-empty">No dispatches found.</li>';
    return;
  }

  filtered.forEach(n => {
    const li = document.createElement('li');
    if (selectedNewsletter && selectedNewsletter.id === n.id) {
      li.classList.add('is-active');
    }
    
    const formattedDate = n.sent_at 
      ? new Date(n.sent_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
      : n.scheduled_at 
        ? `Sched: ${new Date(n.scheduled_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`
        : 'Draft';

    li.innerHTML = `
      <button type="button" data-newsletter-id="${escapeAttr(n.id)}">
        <div class="admin-row-name">${escapeHtml(n.public_title || 'Untitled Dispatch')}</div>
        <div class="admin-row-meta">
          <span>${escapeHtml(n.status.replaceAll('_', ' '))}</span>
          <span>${escapeHtml(formattedDate)}</span>
        </div>
      </button>
    `;
    
    const btn = li.querySelector('button');
    if (btn) {
      btn.addEventListener('click', () => selectNewsletter(n));
    }
    list.appendChild(li);
  });
}

function clearNewsletterForm() {
  selectedNewsletter = null;
  if (els.newsletterForm) els.newsletterForm.hidden = true;
  if (els.newsletterDetailEmpty) els.newsletterDetailEmpty.hidden = false;
  if (els.tabpanelNewsletter) els.tabpanelNewsletter.dataset.mobileView = 'list';
  
  if (els.newsletterList) {
    const activeItems = els.newsletterList.querySelectorAll('.admin-watch-item.is-active');
    activeItems.forEach(item => item.classList.remove('is-active'));
  }
}

function selectNewsletter(n) {
  selectedNewsletter = n;
  if (els.newsletterDetailEmpty) els.newsletterDetailEmpty.hidden = true;
  if (els.newsletterForm) els.newsletterForm.hidden = false;
  if (els.tabpanelNewsletter) els.tabpanelNewsletter.dataset.mobileView = 'detail';
  
  renderNewsletterList(); // updates active item highlight

  // Populate form
  els.newsletterFieldId.value = n.id || '';
  els.newsletterFieldSlug.value = n.slug || '';
  els.newsletterFieldStatus.value = n.status || 'draft';
  els.newsletterFieldSubject.value = n.subject || '';
  els.newsletterFieldPreheader.value = n.preheader || '';
  els.newsletterFieldPublicTitle.value = n.public_title || '';
  els.newsletterFieldBodyHtml.value = n.body_html || '';
  els.newsletterFieldBodyText.value = n.body_text || '';
  els.newsletterFieldArchiveVisible.checked = !!n.archive_visible;

  // Scheduled date
  if (n.status === 'scheduled') {
    els.newsletterFieldScheduledAtWrapper.hidden = false;
    if (n.scheduled_at) {
      // Format to datetime-local local string: YYYY-MM-DDTHH:MM
      const date = new Date(n.scheduled_at);
      const tzOffset = date.getTimezoneOffset() * 60000; // in ms
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
      els.newsletterFieldScheduledAt.value = localISOTime;
    } else {
      els.newsletterFieldScheduledAt.value = '';
    }
  } else {
    els.newsletterFieldScheduledAtWrapper.hidden = true;
    els.newsletterFieldScheduledAt.value = '';
  }

  // Update preview
  updateNewsletterPreview();

  // Button visibilities based on status
  const s = n.status;
  
  // Can delete if draft / needs_review / rejected / failed
  const deletable = ['draft', 'needs_review', 'rejected', 'failed'].includes(s);
  els.newsletterDeleteBtn.hidden = !deletable;

  // Can approve if draft / needs_review / rejected
  const approvable = ['draft', 'needs_review', 'rejected'].includes(s);
  els.newsletterApproveBtn.hidden = !approvable;

  // Can schedule if draft / needs_review / approved / rejected
  const schedulable = ['draft', 'needs_review', 'approved', 'rejected', 'scheduled'].includes(s);
  els.newsletterScheduleBtn.hidden = !schedulable;

  // Can broadcast now if approved or scheduled
  const sendable = ['approved', 'scheduled'].includes(s);
  els.newsletterSendNowBtn.hidden = !sendable;

  // Save changes allowed for all non-sending/sent/archived statuses
  const editable = !['sending', 'sent', 'archived'].includes(s);
  els.newsletterSaveBtn.hidden = !editable;
  
  // Disable fields if not editable
  els.newsletterFieldSubject.disabled = !editable;
  els.newsletterFieldPreheader.disabled = !editable;
  els.newsletterFieldPublicTitle.disabled = !editable;
  els.newsletterFieldBodyHtml.disabled = !editable;
  els.newsletterFieldBodyText.disabled = !editable;
  
  // Clear test email status
  els.newsletterTestStatus.textContent = '';
}

function updateNewsletterPreview() {
  const html = els.newsletterFieldBodyHtml.value;
  els.newsletterPreview.innerHTML = html || '<p class="admin-meta">No content written yet.</p>';
}

if (els.newsletterFieldBodyHtml) {
  els.newsletterFieldBodyHtml.addEventListener('input', updateNewsletterPreview);
}

if (els.newsletterNewBtn) {
  els.newsletterNewBtn.addEventListener('click', async () => {
    const title = prompt('Enter a title prefix for this newsletter issue (optional):');
    setStatus('Generating AI dispatch draft...', 'pending');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/newsletter/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title })
      });
      
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.message || 'Generation failed.');

      setStatus('AI Draft generated successfully!');
      await loadNewsletterTab();
    } catch (err) {
      console.error('Failed to generate draft:', err);
      setStatus(`Draft generation failed: ${err.message}`, 'error');
    }
  });
}

if (els.newsletterForm) {
  els.newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedNewsletter) return;

    setStatus('Saving dispatch changes...', 'pending');
    try {
      // Fetch items array if editing an existing issue to preserve them
      const { data: currentIssue, error: getErr } = await supabase.rpc('admin_get_newsletter_issue', { issue_id: selectedNewsletter.id });
      if (getErr) throw getErr;

      const payload = {
        id: els.newsletterFieldId.value,
        slug: els.newsletterFieldSlug.value,
        status: els.newsletterFieldStatus.value,
        internalTitle: currentIssue?.issue?.internal_title || els.newsletterFieldPublicTitle.value.trim() || 'Newsletter',
        subject: els.newsletterFieldSubject.value.trim(),
        preheader: els.newsletterFieldPreheader.value.trim(),
        publicTitle: els.newsletterFieldPublicTitle.value.trim(),
        bodyHtml: els.newsletterFieldBodyHtml.value.trim(),
        bodyText: els.newsletterFieldBodyText.value.trim(),
        archiveVisible: els.newsletterFieldArchiveVisible.checked,
        items: currentIssue?.items || []
      };

      const { data, error } = await supabase.rpc('admin_upsert_newsletter_issue', { payload });
      if (error) throw error;

      setStatus('Dispatch saved successfully.');
      await loadNewsletterTab();
    } catch (err) {
      console.error('Failed to save newsletter:', err);
      setStatus(`Failed to save: ${err.message}`, 'error');
    }
  });
}

if (els.newsletterSendTestBtn) {
  els.newsletterSendTestBtn.addEventListener('click', async () => {
    if (!selectedNewsletter) return;
    const recipient = els.newsletterTestRecipient.value.trim();
    if (!recipient) {
      alert('Please enter a recipient email address.');
      return;
    }

    els.newsletterTestStatus.textContent = 'Sending test email...';
    els.newsletterTestStatus.style.color = '#fde047';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/newsletter/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          issueId: selectedNewsletter.id,
          recipient
        })
      });

      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.message || 'Test send failed.');

      els.newsletterTestStatus.textContent = `Test email sent to ${recipient}!`;
      els.newsletterTestStatus.style.color = '#10b981';
    } catch (err) {
      console.error('Test email failed:', err);
      els.newsletterTestStatus.textContent = `Test failed: ${err.message}`;
      els.newsletterTestStatus.style.color = '#ef4444';
    }
  });
}

if (els.newsletterApproveBtn) {
  els.newsletterApproveBtn.addEventListener('click', async () => {
    if (!selectedNewsletter) return;
    
    const confirmed = confirm('Approve this dispatch? Once approved, it can be scheduled or broadcast to subscribers.');
    if (!confirmed) return;

    setStatus('Approving dispatch...', 'pending');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/newsletter/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ issueId: selectedNewsletter.id })
      });

      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.message || 'Approval failed.');

      setStatus('Dispatch approved.');
      await loadNewsletterTab();
    } catch (err) {
      console.error('Failed to approve dispatch:', err);
      setStatus(`Approval failed: ${err.message}`, 'error');
    }
  });
}

if (els.newsletterScheduleBtn) {
  els.newsletterScheduleBtn.addEventListener('click', async () => {
    if (!selectedNewsletter) return;

    let promptDate = prompt('Enter schedule date (Format: YYYY-MM-DD HH:MM in Manila time, e.g. 2026-06-25 10:00):');
    if (!promptDate) return;

    const dateObj = new Date(promptDate.replace(' ', 'T') + '+08:00');
    if (isNaN(dateObj.getTime())) {
      alert('Invalid date format. Please try again.');
      return;
    }
    const isoString = dateObj.toISOString();

    setStatus('Scheduling dispatch...', 'pending');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/newsletter/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          issueId: selectedNewsletter.id,
          scheduledAt: isoString
        })
      });

      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.message || 'Scheduling failed.');

      setStatus(`Dispatch scheduled for ${promptDate} (Manila time).`);
      await loadNewsletterTab();
    } catch (err) {
      console.error('Failed to schedule dispatch:', err);
      setStatus(`Scheduling failed: ${err.message}`, 'error');
    }
  });
}

if (els.newsletterSendNowBtn) {
  els.newsletterSendNowBtn.addEventListener('click', async () => {
    if (!selectedNewsletter) return;

    const confirmed = confirm('⚠️ WARNING: Broadcast this dispatch to ALL active newsletter subscribers now? This action CANNOT be undone.');
    if (!confirmed) return;

    setStatus('Broadcasting dispatch to subscribers...', 'pending');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const res = await fetch('/api/newsletter/send-approved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ issueId: selectedNewsletter.id })
      });

      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.message || 'Broadcast failed.');

      setStatus(`Broadcast completed successfully to ${body.recipientCount || 0} subscribers.`);
      await loadNewsletterTab();
    } catch (err) {
      console.error('Broadcast failed:', err);
      setStatus(`Broadcast failed: ${err.message}`, 'error');
    }
  });
}

if (els.newsletterDeleteBtn) {
  els.newsletterDeleteBtn.addEventListener('click', async () => {
    if (!selectedNewsletter) return;

    const confirmed = confirm(`Delete the dispatch "${selectedNewsletter.public_title || 'Untitled'}"? This cannot be undone.`);
    if (!confirmed) return;

    setStatus('Deleting dispatch...', 'pending');
    try {
      const { data, error } = await supabase.rpc('admin_delete_newsletter_issue', { issue_id: selectedNewsletter.id });
      if (error) throw error;

      setStatus('Dispatch deleted.');
      await loadNewsletterTab();
    } catch (err) {
      console.error('Failed to delete dispatch:', err);
      setStatus(`Delete failed: ${err.message}`, 'error');
    }
  });
}

if (els.newsletterCancelBtn) els.newsletterCancelBtn.addEventListener('click', clearNewsletterForm);
if (els.newsletterBackBtn) els.newsletterBackBtn.addEventListener('click', clearNewsletterForm);
if (els.newsletterFilter) els.newsletterFilter.addEventListener('input', renderNewsletterList);


'use strict';
// Admin panel module — lazily imported by app.js ONLY when a signed-in user
// has the admin role (route-level code splitting: regular visitors never
// download this code). Expects the shared helpers to be injected via
// renderAdmin(deps) so it stays decoupled from app.js internals.
async function renderAdmin(deps){
  const { api, esc, t, $, $$, state, toast, reload } = deps;
  if(!state.user || state.user.role !== 'admin') return;
  try{
    const data = await api('/api/admin/overview', null, 'GET');
    $('#adminConfig').innerHTML=`<b>AI:</b> ${data.config.aiConfigured?'✓':'✕'} ${esc(data.config.aiModel)} · <b>Stripe:</b> ${data.config.stripeConfigured && data.config.stripePriceConfigured?'✓':'✕'} · <b>Contact webhook:</b> ${data.config.contactWebhookConfigured?'✓':'stored only'} · <b>Payments required:</b> ${data.config.paymentsRequired?'yes':'no'} · <b>Analytics tag:</b> ${data.config.analyticsConfigured?'✓':'✕'} · <b>Marketing tag:</b> ${data.config.marketingConfigured?'✓':'✕'}`;
    const allSources=[...(data.envSources||[]), ...(data.sources||[])];
    $('#sourcesList').innerHTML=allSources.length?allSources.map(s=>`<div class="admin-row"><span><b>${esc(s.name)}</b><br><small>${esc(s.url)} · ${esc(s.language||'any')} ${s.id.startsWith('env_')?'· env':''}</small></span>${s.id.startsWith('env_')?'':`<button class="secondary-button" data-delete-source="${s.id}">Delete</button>`}</div>`).join(''):`<p class="disclaimer">No sources configured. Add official/permitted RSS/API URLs.</p>`;
    $('#usersList').innerHTML=data.users.map(u=>`<div class="admin-row"><span><b>${esc(u.email)}</b><br><small>${esc(u.role)} · ${esc(u.subscription?.status||'none')} · ${esc(u.createdAt||'')}</small></span></div>`).join('');
    $('#messagesList').innerHTML=(data.contacts||[]).map(m=>`<div class="admin-row"><span><b>${esc(m.email)}</b> · ${esc(m.topic)}<br><small>${esc(m.message).slice(0,240)}</small></span><small>${esc(m.status)}</small></div>`).join('') || '<p class="disclaimer">No messages.</p>';
    $$('[data-delete-source]').forEach(btn=>btn.addEventListener('click', async()=>{ await api('/api/admin/sources/'+btn.dataset.deleteSource, null, 'DELETE'); toast(t('saved')); reload(); }));
  } catch(err){ console.warn(err); }
}
const AstritsaAdmin = { renderAdmin };
export { AstritsaAdmin, renderAdmin };
if (typeof window !== 'undefined') window.AstritsaAdmin = AstritsaAdmin;

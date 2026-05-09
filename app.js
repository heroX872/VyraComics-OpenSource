import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ihiuygpxoxttwmbwbpns.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Te0kRJCi7DbW21iEj9w6QA_iO9av2fR'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── ID anônimo do usuário ──────────────────────────────────────
// TODO (auth): substituir por supabase.auth.getUser()
const USER_ID = (() => {
  let uid = localStorage.getItem('vyra_uid');
  if (!uid) { uid = crypto.randomUUID(); localStorage.setItem('vyra_uid', uid); }
  return uid;
})();

// ── State ──────────────────────────────────────────────────────
let hqs = [], editingHqIdx;
let user = { name: "Usuário", user: "@user", avatar: "", banner: "" };

let readerHqIdx    = 0;
let readerCapIdx   = 0;
let currentObraIdx = null;

// ── Utilities ──────────────────────────────────────────────────
const toBase64 = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.readAsDataURL(file);
  r.onload  = () => res(r.result);
  r.onerror = e  => rej(e);
});

async function uploadAvatar(file, slot) {
  const ext  = file.name.split('.').pop();
  const path = `${USER_ID}/${slot}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

window.toast = (msg, type = 'info') => {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

function btnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? '⏳ Aguarde...' : label;
}

// ── Mapeamento Supabase ↔ estado local ─────────────────────────
function rowToHq(row) {
  return {
    id:           row.id,
    name:         row.name,
    genre:        row.genre,
    cover:        row.cover,
    synopsis:     row.synopsis  || '',
    authorHandle: row.author_handle,
    authorId:     row.author_id,
    chapters:     row.chapters  || []
  };
}

// ── Data Layer ─────────────────────────────────────────────────
async function loadHqs() {
  const { data, error } = await supabase
    .from('hqs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('loadHqs:', error.message); return; }
  hqs = (data || []).map(rowToHq);
  renderHome(hqs);
  renderStudioList();
  renderProfileList();
  handleRoute();
}

async function insertHq(hq) {
  const { error } = await supabase.from('hqs').insert({
    id:            hq.id,
    author_id:     hq.authorId,
    author_handle: hq.authorHandle,
    name:          hq.name,
    genre:         hq.genre || null,
    cover:         hq.cover,
    synopsis:      hq.synopsis || '',
    chapters:      hq.chapters || []
  });
  if (error) throw new Error(error.message);
}

async function updateHq(idx, fields) {
  const { error } = await supabase
    .from('hqs')
    .update(fields)
    .eq('id', hqs[idx].id);
  if (error) throw new Error(error.message);
}

async function deleteHqById(id) {
  const { error } = await supabase.from('hqs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function loadUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', USER_ID)
    .maybeSingle();
  if (!error && data) {
    user = {
      name:   data.name,
      user:   data.handle,
      avatar: data.avatar || '',
      banner: data.banner || ''
    };
  }
  renderProfile();
  renderStudioList();
  renderProfileList();
}

async function saveUser() {
  const { error } = await supabase.from('users').upsert({
    id:     USER_ID,
    name:   user.name,
    handle: user.user,
    avatar: user.avatar || null,
    banner: user.banner || null
  });
  if (error) throw new Error(error.message);
}

// ── Inicialização ──────────────────────────────────────────────
loadUser();
loadHqs();

// ── Navigation ─────────────────────────────────────────────────
const NAV_MAP = { inicio: 0, categorias: 1, estudio: 2, perfil: 3 };

window.navTo = screen => {
  window.location.hash = screen;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function handleRoute() {
  const hash = window.location.hash.replace('#', '') || 'inicio';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(hash) || document.getElementById('inicio');
  if(target) target.classList.add('active');
  
  document.querySelectorAll('.nav-item').forEach((el, i) =>
    el.classList.toggle('active', i === (NAV_MAP[hash] ?? -1))
  );
  if (hash === 'edit-perfil') fillEditPerfilForm();
}

function fillEditPerfilForm() {
  document.getElementById('edit-name').value = user.name;
  document.getElementById('edit-user').value = user.user;
}
window.addEventListener('hashchange', handleRoute);

// ── Home ───────────────────────────────────────────────────────
const GENRE_LABELS = {
  acao: '⚔️ Ação', aventura: '🌎 Aventura',
  comedia: '😂 Comédia', drama: '🎭 Drama'
};

function buildCards(list) {
  if (!list.length) {
    return `<div class="empty-state"><div class="ei">📚</div><p>Nenhuma HQ encontrada.</p></div>`;
  }
  return list.map(h => {
    const idx   = hqs.findIndex(item => item.id === h.id);
    const genre = h.genre ? `<div class="genre-badge">${GENRE_LABELS[h.genre] || h.genre}</div>` : '';
    return `
      <div class="hq-card" onclick="renderObraView(${idx})">
        <img class="hq-card-img" src="${h.cover}" alt="${h.name}" loading="lazy" decoding="async">
        <div class="hq-card-body">
          <div class="hq-card-title">${h.name}</div>
          <div class="hq-card-sub">${h.authorHandle || '@autor'}</div>
          ${genre}
        </div>
      </div>`;
  }).join('');
}

function renderHome(list) {
  const el = document.getElementById('home-list');
  if (!el) return;
  el.innerHTML = buildCards(list ?? hqs);
}

window.filterHome = q => {
  const term = q.trim().toLowerCase();
  renderHome(term ? hqs.filter(h => h.name.toLowerCase().includes(term)) : hqs);
};

window.clearSearch = () => {
  const input = document.getElementById('search-input');
  if(input) input.value = '';
  renderHome(hqs);
};

// ── Studio ─────────────────────────────────────────────────────
function renderStudioList() {
  const list = document.getElementById('studio-list');
  if (!list) return;
  const mine = hqs.filter(h => h.authorId === USER_ID);
  
  list.innerHTML = mine.length
    ? hqs.map((h, i) => h.authorId !== USER_ID ? '' : `
        <div class="hq-card" onclick="openEditModal(${i})">
          <img class="hq-card-img" src="${h.cover}" alt="${h.name}" loading="lazy" decoding="async">
          <div class="hq-card-body">
            <div class="hq-card-title">${h.name}</div>
            <div class="hq-card-sub">Toque para editar</div>
          </div>
        </div>`).join('')
    : `<div class="empty-state"><div class="ei">✏️</div><p>Você ainda não tem obras.</p></div>`;

  const sel = document.getElementById('st-select');
  if (sel) sel.innerHTML = hqs
    .map((h, i) => h.authorHandle === user.user ? `<option value="${i}">${h.name}</option>` : '')
    .join('');
}

window.createWork = async () => {
  const name  = document.getElementById('st-name').value.trim();
  const genre = document.getElementById('st-genre').value;
  const file  = document.getElementById('st-cover-file').files[0];
  if (!name || !file) { toast('Informe o título e a capa da HQ.', 'error'); return; }

  btnLoading('btn-create', true, '+ Criar Obra');
  try {
    const cover = await toBase64(file);
    const newHq = {
      id: crypto.randomUUID(),
      name, genre, cover,
      synopsis:     '',
      authorHandle: user.user,
      authorId:     USER_ID,
      chapters:     []
    };
    await insertHq(newHq);
    hqs.unshift(newHq);
    document.getElementById('st-name').value       = '';
    document.getElementById('st-genre').value      = '';
    document.getElementById('st-cover-file').value = '';
    renderStudioList();
    renderHome(hqs);
    toast('HQ criada com sucesso!', 'success');
  } catch (e) {
    toast('Erro ao criar HQ. Tente novamente.', 'error');
    console.error(e);
  } finally {
    btnLoading('btn-create', false, '+ Criar Obra');
  }
};

window.openEditModal = idx => {
  editingHqIdx = idx;
  document.getElementById('edit-hq-name').value        = hqs[idx].name;
  document.getElementById('edit-hq-title').textContent = hqs[idx].name;
  renderModalChapters();
  document.getElementById('edit-hq-modal').classList.add('active');
};

window.closeEditModal = () => document.getElementById('edit-hq-modal').classList.remove('active');

window.updateHqBasic = async () => {
  const name = document.getElementById('edit-hq-name').value.trim();
  if (!name) { toast('O título não pode ficar vazio.', 'error'); return; }

  btnLoading('btn-update-hq', true, 'Salvar Alterações');
  try {
    const fields = { name };
    const file = document.getElementById('edit-hq-cover-file').files[0];
    if (file) fields.cover = await toBase64(file);
    await updateHq(editingHqIdx, fields);
    Object.assign(hqs[editingHqIdx], fields);
    renderStudioList();
    renderHome(hqs);
    toast('Alterações salvas!', 'success');
  } catch (e) {
    toast('Erro ao salvar. Tente novamente.', 'error');
    console.error(e);
  } finally {
    btnLoading('btn-update-hq', false, 'Salvar Alterações');
  }
};

window.addChapterFromModal = async () => {
  const name  = document.getElementById('modal-cap-name').value.trim();
  const files = document.getElementById('modal-cap-files').files;
  if (!name || !files.length) { toast('Informe o nome e as páginas do capítulo.', 'error'); return; }

  btnLoading('btn-add-cap', true, '+ Adicionar Capítulo');
  try {
    const pages = [];
    for (const f of files) pages.push(await toBase64(f));
    const chapters = [...hqs[editingHqIdx].chapters, { name, pages }];
    await updateHq(editingHqIdx, { chapters });
    hqs[editingHqIdx].chapters = chapters;
    renderModalChapters();
    document.getElementById('modal-cap-name').value  = '';
    document.getElementById('modal-cap-files').value = '';
    toast(`Capítulo "${name}" adicionado!`, 'success');
  } catch (e) {
    toast('Erro ao adicionar capítulo.', 'error');
    console.error(e);
  } finally {
    btnLoading('btn-add-cap', false, '+ Adicionar Capítulo');
  }
};

function renderModalChapters() {
  const caps = hqs[editingHqIdx].chapters || [];
  document.getElementById('modal-cap-list').innerHTML = caps.length
    ? caps.map((c, i) => `
        <div class="cap-item">
          <span>${c.name}<span class="cap-item-pages">(${c.pages.length} págs)</span></span>
          <button class="cap-remove" onclick="removeCap(${i})">✕</button>
        </div>`).join('')
    : `<p style="color:var(--muted); font-size:13px; margin-bottom:8px;">Nenhum capítulo ainda.</p>`;
}

window.removeCap = async i => {
  const cap = hqs[editingHqIdx].chapters[i];
  const chapters = hqs[editingHqIdx].chapters.filter((_, j) => j !== i);
  try {
    await updateHq(editingHqIdx, { chapters });
    hqs[editingHqIdx].chapters = chapters;
    renderModalChapters();
    toast(`Capítulo "${cap.name}" removido.`, 'info');
  } catch (e) {
    toast('Erro ao remover capítulo.', 'error');
    console.error(e);
  }
};

window.deleteHq = async () => {
  if (!confirm('Deletar esta HQ permanentemente?')) return;
  const hq = hqs[editingHqIdx];
  try {
    await deleteHqById(hq.id);
    hqs.splice(editingHqIdx, 1);
    closeEditModal();
    renderStudioList();
    renderHome(hqs);
    toast(`"${hq.name}" excluída.`, 'info');
  } catch (e) {
    toast('Erro ao excluir HQ.', 'error');
    console.error(e);
  }
};

// ── Obra view ──────────────────────────────────────────────────
window.renderObraView = id => {
  currentObraIdx = id;
  const h    = hqs[id];
  const caps = h.chapters || [];
  const genre = h.genre
    ? `<div class="genre-badge" style="margin-bottom:12px;">${GENRE_LABELS[h.genre] || h.genre}</div>`
    : '';

  document.getElementById('obra-content').innerHTML = `
    <img src="${h.cover}" class="obra-cover" alt="${h.name}" loading="eager" decoding="async">
    ${genre}
    <h2 class="obra-title">${h.name}</h2>
    <p class="obra-synopsis">${h.synopsis || 'Sem sinopse ainda.'}</p>
    <div class="section-title" style="font-size:20px; margin-bottom:12px;">📖 Capítulos</div>
    ${caps.length
      ? caps.map((c, i) => `
          <div class="chapter-item" onclick="openReader(${id}, ${i})">
            <span>${c.name}</span>
            <span class="chapter-arrow">${c.pages.length} págs ›</span>
          </div>`).join('')
      : `<p style="color:var(--muted); font-size:14px;">Nenhum capítulo publicado ainda.</p>`
    }`;
  navTo('obra-view');
};

// ── Reader ─────────────────────────────────────────────────────
window.openReader = (hqIdx, capIdx) => {
  readerHqIdx  = hqIdx;
  readerCapIdx = capIdx;
  renderReaderPages();
  document.getElementById('reader-modal').classList.add('active');
  document.getElementById('reader-pages').scrollTop = 0;
  document.body.style.overflow = 'hidden';
  showReaderTip();
};

window.closeReader = () => {
  document.getElementById('reader-modal').classList.remove('active');
  document.body.style.overflow = '';
};

window.changeChapter = delta => {
  const total = hqs[readerHqIdx].chapters.length;
  const next  = readerCapIdx + delta;
  if (next < 0 || next >= total) return;
  readerCapIdx = next;
  renderReaderPages();
  document.getElementById('reader-pages').scrollTop = 0;
};

function renderReaderPages() {
  const hq    = hqs[readerHqIdx];
  const cap   = hq.chapters[readerCapIdx];
  const total = hq.chapters.length;

  document.getElementById('reader-hq-name').textContent  = hq.name;
  document.getElementById('reader-cap-name').textContent = cap.name;
  document.getElementById('reader-counter').textContent  = `${readerCapIdx + 1} / ${total}`;
  document.getElementById('reader-progress').style.width = `${((readerCapIdx + 1) / total) * 100}%`;

  document.getElementById('reader-prev').disabled = readerCapIdx === 0;
  document.getElementById('reader-next').disabled = readerCapIdx === total - 1;

  document.getElementById('reader-pages').innerHTML = cap.pages.map((src, i) =>
    `<img src="${src}" alt="Página ${i + 1}" loading="lazy" decoding="async">`
  ).join('');
}

// ── Profile ────────────────────────────────────────────────────
function renderProfileList() {
  const list = document.getElementById('perfil-list');
  if (!list) return;
  const mine = hqs.filter(h => h.authorId === USER_ID);
  list.innerHTML = mine.length
    ? hqs.map((h, i) => h.authorId !== USER_ID ? '' : `
        <div class="hq-card" onclick="renderObraView(${i})">
          <img class="hq-card-img" src="${h.cover}" alt="${h.name}" loading="lazy" decoding="async">
          <div class="hq-card-body">
            <div class="hq-card-title">${h.name}</div>
          </div>
        </div>`).join('')
    : `<div class="empty-state"><div class="ei">🎨</div><p>Nenhuma obra publicada.</p></div>`;
}

window.saveProfile = async () => {
  const name   = document.getElementById('edit-name').value.trim();
  const handle = document.getElementById('edit-user').value.trim();
  if (!name || !handle) { toast('Preencha nome e @usuario.', 'error'); return; }

  btnLoading('btn-save-profile', true, 'Salvar Perfil');
  try {
    user.name = name;
    user.user = handle;
    const av = document.getElementById('edit-avatar-file').files[0];
    const bn = document.getElementById('edit-banner-file').files[0];
    if (av) user.avatar = await uploadAvatar(av, 'avatar');
    if (bn) user.banner = await uploadAvatar(bn, 'banner');
    await saveUser();
    renderProfile();
    renderStudioList();
    renderProfileList();
    toast('Perfil atualizado!', 'success');
    navTo('perfil');
  } catch (e) {
    toast('Erro ao salvar perfil.', 'error');
    console.error(e);
  } finally {
    btnLoading('btn-save-profile', false, 'Salvar Perfil');
  }
};

function renderProfile() {
  document.getElementById('view-name').textContent = user.name;
  document.getElementById('view-user').textContent = user.user;
  document.getElementById('view-avatar').style.backgroundImage = user.avatar ? `url(${user.avatar})` : '';
  document.getElementById('view-banner').style.backgroundImage = user.banner ? `url(${user.banner})` : '';
}

// ── Synopsis ───────────────────────────────────────────────────
window.saveSynopsis = async () => {
  const i = document.getElementById('st-select').value;
  if (i === '') { toast('Selecione uma HQ primeiro.', 'error'); return; }
  const synopsis = document.getElementById('st-synopsis').value;
  try {
    await updateHq(Number(i), { synopsis });
    hqs[i].synopsis = synopsis;
    toast('Sinopse salva!', 'success');
    navTo('estudio');
  } catch (e) {
    toast('Erro ao salvar sinopse.', 'error');
    console.error(e);
  }
};

window.loadSynopsis = () => {
  const i = document.getElementById('st-select').value;
  document.getElementById('st-synopsis').value = hqs[i]?.synopsis || '';
};

// ── Reader swipe (esquerda = próximo, direita = anterior) ──────
(function () {
  const pages = document.getElementById('reader-pages');
  if(!pages) return;
  const hintPrev = document.getElementById('swipe-hint-prev');
  const hintNext = document.getElementById('swipe-hint-next');
  let startX = 0, startY = 0;

  function hideHints() {
    if(hintPrev) hintPrev.classList.remove('show');
    if(hintNext) hintNext.classList.remove('show');
  }

  pages.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  pages.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 20) { hideHints(); return; }

    const total = hqs[readerHqIdx]?.chapters?.length ?? 0;
    if (dx > 20 && readerCapIdx > 0)               { hintPrev.classList.add('show'); hintNext.classList.remove('show'); }
    else if (dx < -20 && readerCapIdx < total - 1) { hintNext.classList.add('show'); hintPrev.classList.remove('show'); }
    else                                            { hideHints(); }
  }, { passive: true });

  pages.addEventListener('touchend', e => {
    hideHints();
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    changeChapter(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

function showReaderTip() {
  if (sessionStorage.getItem('readerTipSeen')) return;
  sessionStorage.setItem('readerTipSeen', '1');
  const tip = document.createElement('div');
  tip.className = 'reader-first-tip';
  tip.textContent = '← Arraste para navegar entre capítulos →';
  document.body.appendChild(tip);
  setTimeout(() => tip.remove(), 3200);
}

// app.js

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Credenciais sincronizadas com o seu começar.html
const SUPABASE_URL = "https://ihiuygpxoxttwmbwbpns.supabase.co";
const SUPABASE_KEY = "sb_publishable_Te0kRJCi7DbW21iEj9w6QA_iO9av2fR";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let hqs = [];
let USER_ID = null;

let user = {
  name: "Usuário",
  user: "@user",
  avatar: "",
  banner: ""
};

const NAV_MAP = {
  inicio: 0,
  categorias: 1,
  estudio: 2,
  perfil: 3
};

async function init() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    setTimeout(async () => {
      const { data: { session: retrySession } } = await supabase.auth.getSession();
      if (!retrySession) {
        window.location.replace("começar.html");
        return;
      }
      USER_ID = retrySession.user.id;
      await setupApp();
    }, 700);
    return;
  }

  USER_ID = session.user.id;
  await setupApp();
}

async function setupApp() {
  await loadUser();
  await fetchHqs();
  startRealtime();
}

function startRealtime() {
  supabase
    .channel("public:hqs")
    .on("postgres_changes", { event: "*", schema: "public", table: "hqs" }, () => {
      fetchHqs();
    })
    .subscribe();
}

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    window.location.replace("começar.html");
  }
});

// =========================================================================
// EXPOSIÇÃO GLOBAL DE FUNÇÕES (Garante o funcionamento de todos os botões)
// =========================================================================

window.navTo = function(screen) {
  window.location.hash = screen;
  handleRoute();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.filterHome = function(q) {
  const term = q.toLowerCase().trim();
  if (!term) {
    renderHome(hqs);
    return;
  }
  renderHome(hqs.filter(h => h.name.toLowerCase().includes(term)));
};

window.clearSearch = function() {
  const input = document.getElementById("search-input");
  if (input) input.value = "";
  renderHome(hqs);
};

window.openHq = function(hqId) {
  alert("Abrindo visualização da HQ ID: " + hqId);
};

window.createWork = async function() {
  const name = document.getElementById("st-name").value.trim();
  const genre = document.getElementById("st-genre").value;
  const file = document.getElementById("st-cover-file").files[0];

  if (!name || !file) {
    alert("Preencha os dados da obra.");
    return;
  }

  const id = crypto.randomUUID();
  const cover = await uploadCover(file, id);

  const { error } = await supabase
    .from("hqs")
    .insert([{
      id, name, genre, cover,
      synopsis: "",
      authorHandle: user.user,
      authorId: USER_ID,
      chapters: []
    }]);

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("st-name").value = "";
  document.getElementById("st-cover-file").value = "";
  fetchHqs();
};

// Funções do Modal de Edição de Perfil
window.openEditProfileModal = function() {
  document.getElementById("edit-name").value = user.name;
  document.getElementById("edit-username").value = user.user.replace("@", "");
  document.getElementById("edit-modal").classList.add("active");
};

window.closeEditProfileModal = function() {
  document.getElementById("edit-modal").classList.remove("active");
};

window.saveProfile = async function() {
  const newName = document.getElementById("edit-name").value.trim();
  const newUsername = document.getElementById("edit-username").value.trim();
  const avatarFile = document.getElementById("edit-avatar-file").files[0];
  const bannerFile = document.getElementById("edit-banner-file").files[0];

  if (!newName || !newUsername) {
    alert("Nome e Arroba não podem ficar vazios.");
    return;
  }

  let finalAvatar = user.avatar;
  let finalBanner = user.banner;

  if (avatarFile) {
    finalAvatar = await uploadProfileImage(avatarFile, 'avatar');
  }
  if (bannerFile) {
    finalBanner = await uploadProfileImage(bannerFile, 'banner');
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: "@" + newUsername,
      avatar_url: finalAvatar,
      banner_url: finalBanner,
      display_name: newName
    })
    .eq("id", USER_ID);

  if (error) {
    console.error(error);
    alert("Erro ao salvar perfil.");
    return;
  }

  user.name = newName;
  user.user = "@" + newUsername;
  user.avatar = finalAvatar;
  user.banner = finalBanner;

  renderProfile();
  window.closeEditProfileModal();
};

// =========================================================================

function handleRoute() {
  const hash = window.location.hash.replace("#", "") || "inicio";

  document.querySelectorAll(".screen").forEach(el => {
    el.classList.remove("active");
  });

  const target = document.getElementById(hash) || document.getElementById("inicio");
  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-item").forEach((el, i) => {
    el.classList.toggle("active", i === (NAV_MAP[hash] ?? -1));
  });
}

window.addEventListener("hashchange", handleRoute);

async function fetchHqs() {
  const { data, error } = await supabase.from("hqs").select("*");
  if (error) {
    console.error(error);
    return;
  }
  hqs = data || [];
  renderHome(hqs);
  renderStudio();
  renderProfileList();
}

function renderHome(list) {
  const el = document.getElementById("home-list");
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<p>Nenhuma HQ encontrada.</p>`;
    return;
  }

  el.innerHTML = list.map(h => `
    <div class="hq-card" onclick="openHq('${h.id}')">
      <img class="hq-card-img" src="${h.cover}">
      <div class="hq-card-body">
        <div class="hq-card-title">${h.name}</div>
        <div class="hq-card-sub">${h.authorHandle || "@autor"}</div>
      </div>
    </div>
  `).join("");
}

function renderStudio() {
  const list = document.getElementById("studio-list");
  if (!list) return;

  const mine = hqs.filter(h => h.authorId === USER_ID);

  list.innerHTML = mine.map(h => `
    <div class="hq-card" onclick="openHq('${h.id}')">
      <img class="hq-card-img" src="${h.cover}">
      <div class="hq-card-body">
        <div class="hq-card-title">${h.name}</div>
        <div class="hq-card-sub">Toque para editar</div>
      </div>
    </div>
  `).join("");
}

function renderProfileList() {
  const list = document.getElementById("perfil-list");
  if (!list) return;

  const mine = hqs.filter(h => h.authorId === USER_ID);

  list.innerHTML = mine.map(h => `
    <div class="hq-card" onclick="openHq('${h.id}')">
      <img class="hq-card-img" src="${h.cover}">
      <div class="hq-card-body">
        <div class="hq-card-title">${h.name}</div>
      </div>
    </div>
  `).join("");
}

async function loadUser() {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", USER_ID)
    .single();

  if (!data) return;

  user.name = data.display_name || "Usuário";
  user.user = data.username || "@user";
  user.avatar = data.avatar_url || "";
  user.banner = data.banner_url || "";
  renderProfile();
}

function renderProfile() {
  const viewName = document.getElementById("view-name");
  const viewUser = document.getElementById("view-user");
  const viewAvatar = document.getElementById("view-avatar");
  const viewBanner = document.getElementById("view-banner");

  if (viewName) viewName.textContent = user.name;
  if (viewUser) viewUser.textContent = user.user;

  if (viewAvatar) {
    viewAvatar.style.backgroundImage = user.avatar ? `url('${user.avatar}')` : "none";
  }

  if (viewBanner) {
    viewBanner.style.backgroundImage = user.banner ? `url('${user.banner}')` : "none";
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

async function uploadCover(file, hqId) {
  const ext  = file.name.split('.').pop();
  const path = `${hqId}/cover.${ext}`;
  const { error } = await supabase.storage.from('hq-covers').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('hq-covers').getPublicUrl(path).data.publicUrl;
}

async function uploadPage(file, hqId, chapterIdx, pageIdx) {
  const ext  = file.name.split('.').pop();
  const path = `${hqId}/${chapterIdx}/${pageIdx}.${ext}`;
  const { error } = await supabase.storage.from('hq-pages').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('hq-pages').getPublicUrl(path).data.publicUrl;
}

async function uploadProfileImage(file, slot) {
  const ext  = file.name.split('.').pop();
  const path = `${USER_ID}/${slot}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

// Inicializações básicas de UI e dados
handleRoute();
init();

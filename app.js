import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://ihiuygpxoxttwmbwbpns.supabase.co";
const SUPABASE_KEY = "sb_publishable_Te0kRJCi7DbW21iEj9w6QA_iO9av2fR";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let hqs = [];
let USER_ID = null;
let activeCategory = "Todos";
let realtimeStarted = false;

let user = {
  name: "Usuário",
  user: "@user",
  avatar: "",
  banner: ""
};

// =========================================================
// AUTH DEBUG
// =========================================================

supabase.auth.onAuthStateChange((event) => {
  console.log("AUTH EVENT:", event);
});

// =========================================================
// INIT
// =========================================================

async function init() {
  console.log("INIT RODANDO");

  bindNavButtons();

  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Erro ao obter sessão:", error);
      return;
    }

    if (!session) {
      console.log("Usuário não autenticado");

      if (!window.location.pathname.includes("começar.html")) {
        window.location.href = "começar.html";
      }

      return;
    }

    USER_ID = session.user.id;

    await setupApp();

  } catch (err) {
    console.error("Erro no init:", err);
  }
}

async function setupApp() {
  await loadUser();
  await fetchHqs();
  startRealtime();
}

// =========================================================
// REALTIME
// =========================================================

function startRealtime() {
  if (realtimeStarted) return;

  realtimeStarted = true;

  supabase
    .channel("public:hqs")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hqs"
      },
      () => {
        console.log("Realtime atualizado");
        fetchHqs();
      }
    )
    .subscribe();
}

// =========================================================
// NAV
// =========================================================

function bindNavButtons() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const screen = item.dataset.screen;
      window.navTo(screen);
    });
  });
}

// =========================================================
// GLOBAL FUNCTIONS
// =========================================================

window.navTo = function(screen) {
  window.location.hash = screen;
  handleRoute();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

window.filterHome = function(q) {
  const term = q.toLowerCase().trim();

  if (!term) {
    renderHome(hqs);
    renderCategoryGrid(hqs);
    return;
  }

  const filtered = hqs.filter(h =>
    h.name.toLowerCase().includes(term)
  );

  renderHome(filtered);
  renderCategoryGrid(filtered);
};

window.switchCategory = function(genre, element) {
  document.querySelectorAll(".category-tab")
    .forEach(tab => tab.classList.remove("active"));

  element.classList.add("active");

  activeCategory = genre;

  renderCategoryGrid(hqs);
};

window.openHq = function(id) {
  const hq = hqs.find(h => h.id == id);

  if (!hq) return;

  const content = document.getElementById("reader-content");

  content.innerHTML = `
    <img class="reader-cover" src="${hq.cover}">
    
    <div class="reader-title">
      ${hq.name}
    </div>

    <div class="reader-author">
      ${hq.authorHandle || "@autor"}
    </div>

    <div class="reader-synopsis">
      ${hq.synopsis || "Sem sinopse disponível para esta obra."}
    </div>
  `;

  window.navTo("reader");
};

// =========================================================
// CREATE WORK
// =========================================================

window.createWork = async function() {
  const name = document.getElementById("st-name").value.trim();

  const genre = document.getElementById("st-genre").value;

  const file = document.getElementById("st-cover-file").files[0];

  if (!name || !file) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  const id = crypto.randomUUID();

  try {
    const cover = await uploadCover(file, id);

    const { error } = await supabase
      .from("hqs")
      .insert([{
        id,
        name,
        genre,
        cover,
        synopsis: "",
        authorHandle: user.user,
        authorId: USER_ID,
        chapters: []
      }]);

    if (error) throw error;

    document.getElementById("st-name").value = "";
    document.getElementById("st-cover-file").value = "";

    await fetchHqs();

  } catch (err) {
    console.error(err);
    alert("Erro ao criar obra.");
  }
};

// =========================================================
// PROFILE MODAL
// =========================================================

window.openEditProfileModal = function() {
  document.getElementById("edit-name").value = user.name;

  document.getElementById("edit-username").value =
    user.user.replace("@", "");

  document.getElementById("edit-modal")
    .classList.add("active");
};

window.closeEditProfileModal = function() {
  document.getElementById("edit-modal")
    .classList.remove("active");
};

// =========================================================
// SAVE PROFILE
// =========================================================

window.saveProfile = async function() {
  const newName =
    document.getElementById("edit-name").value.trim();

  const newUsername =
    document.getElementById("edit-username").value.trim();

  const avatarFile =
    document.getElementById("edit-avatar-file").files[0];

  const bannerFile =
    document.getElementById("edit-banner-file").files[0];

  if (!newName || !newUsername) {
    alert("Nome e Username são obrigatórios.");
    return;
  }

  let finalAvatar = user.avatar;
  let finalBanner = user.banner;

  try {

    if (avatarFile) {
      finalAvatar = await uploadProfileImage(
        avatarFile,
        "avatar"
      );
    }

    if (bannerFile) {
      finalBanner = await uploadProfileImage(
        bannerFile,
        "banner"
      );
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

    if (error) throw error;

    user.name = newName;
    user.user = "@" + newUsername;
    user.avatar = finalAvatar;
    user.banner = finalBanner;

    renderProfile();

    window.closeEditProfileModal();

  } catch (err) {
    console.error(err);
    alert("Erro ao salvar.");
  }
};

// =========================================================
// ROUTER
// =========================================================

function handleRoute() {
  const hash =
    window.location.hash.replace("#", "") || "inicio";

  document.querySelectorAll(".screen")
    .forEach(el => {
      el.classList.remove("active");
    });

  const target =
    document.getElementById(hash) ||
    document.getElementById("inicio");

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-item")
    .forEach(el => {
      el.classList.toggle(
        "active",
        el.dataset.screen === hash
      );
    });
}

// =========================================================
// FETCH HQS
// =========================================================

async function fetchHqs() {
  try {

    const { data, error } =
      await supabase
        .from("hqs")
        .select("*");

    if (error) throw error;

    hqs = data || [];

    renderHome(hqs);
    renderCategoryGrid(hqs);
    renderStudio();
    renderProfileList();
    calculateStats();

  } catch (err) {
    console.error("Erro ao carregar HQs:", err);
  }
}

// =========================================================
// STATS
// =========================================================

function calculateStats() {
  const mine =
    hqs.filter(h => h.authorId === USER_ID);

  document.getElementById("stat-works-count")
    .textContent = mine.length;

  document.getElementById("stat-views-count")
    .textContent = mine.length * 28;
}

// =========================================================
// HOME
// =========================================================

function renderHome(list) {
  const el = document.getElementById("home-list");

  if (!el) return;

  if (!list.length) {
    el.innerHTML = `
      <p style="
        grid-column: span 2;
        color: var(--muted);
        text-align:center;
        padding:20px;
      ">
        Nenhuma HQ encontrada.
      </p>
    `;
    return;
  }

  el.innerHTML = list.map(h => `
    <div class="hq-card" onclick="openHq('${h.id}')">

      <img class="hq-card-img" src="${h.cover}">

      <div class="hq-card-body">

        <div class="hq-card-title">
          ${h.name}
        </div>

        <div class="hq-card-sub">
          ${h.authorHandle || "@autor"}
        </div>

      </div>

    </div>
  `).join("");
}

// =========================================================
// CATEGORY GRID
// =========================================================

function renderCategoryGrid(list) {
  const el = document.getElementById("category-grid");

  if (!el) return;

  const filtered =
    activeCategory === "Todos"
      ? list
      : list.filter(h => h.genre === activeCategory);

  if (!filtered.length) {
    el.innerHTML = `
      <p style="
        grid-column: span 2;
        color: var(--muted);
        text-align:center;
        padding:20px;
      ">
        Nenhuma obra nesta categoria.
      </p>
    `;
    return;
  }

  el.innerHTML = filtered.map(h => `
    <div class="hq-card" onclick="openHq('${h.id}')">

      <img class="hq-card-img" src="${h.cover}">

      <div class="hq-card-body">

        <div class="hq-card-title">
          ${h.name}
        </div>

        <div class="hq-card-sub">
          ${h.genre}
        </div>

      </div>

    </div>
  `).join("");
}

// =========================================================
// STUDIO
// =========================================================

function renderStudio() {
  const list = document.getElementById("studio-list");

  if (!list) return;

  const mine =
    hqs.filter(h => h.authorId === USER_ID);

  if (!mine.length) {
    list.innerHTML = `
      <p style="
        grid-column: span 2;
        color: var(--muted);
        text-align:center;
        padding:10px;
      ">
        Você ainda não tem obras.
      </p>
    `;
    return;
  }

  list.innerHTML = mine.map(h => `
    <div class="hq-card" onclick="openHq('${h.id}')">

      <img class="hq-card-img" src="${h.cover}">

      <div class="hq-card-body">

        <div class="hq-card-title">
          ${h.name}
        </div>

        <div class="hq-card-sub">
          Toque para ver
        </div>

      </div>

    </div>
  `).join("");
}

// =========================================================
// PROFILE LIST
// =========================================================

function renderProfileList() {
  const list =
    document.getElementById("perfil-list");

  if (!list) return;

  const mine =
    hqs.filter(h => h.authorId === USER_ID);

  if (!mine.length) {
    list.innerHTML = `
      <p style="
        grid-column: span 2;
        color: var(--muted);
        text-align:center;
        padding:10px;
      ">
        Nenhuma publicação.
      </p>
    `;
    return;
  }

  list.innerHTML = mine.map(h => `
    <div class="hq-card" onclick="openHq('${h.id}')">

      <img class="hq-card-img" src="${h.cover}">

      <div class="hq-card-body">

        <div class="hq-card-title">
          ${h.name}
        </div>

      </div>

    </div>
  `).join("");
}

// =========================================================
// LOAD USER
// =========================================================

async function loadUser() {
  try {

    const { data, error } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", USER_ID)
        .single();

    if (error) throw error;

    if (!data) return;

    user.name =
      data.display_name || "Usuário";

    user.user =
      data.username || "@user";

    user.avatar =
      data.avatar_url || "";

    user.banner =
      data.banner_url || "";

    renderProfile();

  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

// =========================================================
// RENDER PROFILE
// =========================================================

function renderProfile() {
  const viewName =
    document.getElementById("view-name");

  const viewUser =
    document.getElementById("view-user");

  const viewAvatar =
    document.getElementById("view-avatar");

  const viewBanner =
    document.getElementById("view-banner");

  if (viewName) {
    viewName.textContent = user.name;
  }

  if (viewUser) {
    viewUser.textContent = user.user;
  }

  if (viewAvatar && user.avatar) {
    viewAvatar.style.backgroundImage =
      `url('${user.avatar}')`;
  }

  if (viewBanner && user.banner) {
    viewBanner.style.backgroundImage =
      `url('${user.banner}')`;
  }
}

// =========================================================
// UPLOADS
// =========================================================

async function uploadCover(file, hqId) {
  const ext =
    file.name.split(".").pop();

  const path =
    `${hqId}/cover.${ext}`;

  const { error } =
    await supabase.storage
      .from("hq-covers")
      .upload(path, file, {
        upsert: true
      });

  if (error) throw error;

  return supabase.storage
    .from("hq-covers")
    .getPublicUrl(path)
    .data.publicUrl;
}

async function uploadProfileImage(file, slot) {
  const ext =
    file.name.split(".").pop();

  const path =
    `${USER_ID}/${slot}.${ext}`;

  const { error } =
    await supabase.storage
      .from("avatars")
      .upload(path, file, {
        upsert: true
      });

  if (error) throw error;

  return supabase.storage
    .from("avatars")
    .getPublicUrl(path)
    .data.publicUrl;
}

// =========================================================
// EVENTS
// =========================================================

window.addEventListener(
  "hashchange",
  handleRoute
);

// =========================================================
// START
// =========================================================

handleRoute();

init();
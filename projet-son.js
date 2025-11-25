// ===== SUPABASE CONFIG =====
const SUPABASE_URL = "https://knnojnkgtybvgsantkik.supabase.co";
const SUPABASE_KEY = "sb_publishable_aldORvIKeUUXivA2i8ZQjQ_5imrP3Y2";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// =========================
// 0) TRACKS DE BASE (BACKUP OFFLINE)
// =========================
let tracks = [
  { title: "200 voix", file: "music/200 voix.mp3", cover: "covers/200 voix.png", source: "backup" },
  { title: "sablier", file: "music/sablier.mp3", cover: "covers/sablier.png", source: "backup" },
  { title: "fin ghadi bia", file: "music/fin ghadi bia.mp3", cover: "covers/fin ghadi bia.png", source: "backup" },
  { title: "800 ACTES", file: "music/800 ACTES.mp3", cover: "covers/800 ACTES.png", source: "backup" },
  { title: "alouhette", file: "music/alouhette.mp3", cover: "covers/alouhette.png", source: "backup" },
  { title: "préambule", file: "music/préambule.mp3", cover: "covers/préambule.png", source: "backup" },
  { title: "QUE TAL", file: "music/QUE TAL.mp3", cover: "covers/QUE TAL.png", source: "backup" }
];

let currentTrack = 0;
let isShuffling = false;
let isSeeking = false;
let currentMode = null;

const DEFAULT_COVER = "";


// =========================
// 1) ELEMENTS DOM
// =========================
const audio = document.getElementById("audio");
const title = document.getElementById("title");
const cover = document.getElementById("cover");
const trackList = document.getElementById("track-list");

const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");

const miniPlayer = document.getElementById("mini-player");
const miniTitle = document.getElementById("mini-title");
const miniPlayIcon = document.getElementById("mini-play-icon");
const miniCover = document.getElementById("mini-cover");

const navButtons = document.querySelectorAll(".nav-btn, .nav-import");
const navImportBtn = document.querySelector(".nav-import");

const views = {
  home: document.getElementById("view-home"),
  listen: document.getElementById("view-listen"),
  import: document.getElementById("view-import"),
};

const gateSection = document.getElementById("gate");
const appHeader = document.getElementById("app-header");
const mainHeader = document.querySelector("body > header");
const bottomNav = document.querySelector(".bottom-nav");

const btnListener = document.getElementById("btn-auditeur");
const btnEditor = document.getElementById("btn-editeur");
const switchModeBtn = document.getElementById("switch-mode");
const modeLabel = document.getElementById("mode-label");

const importForm = document.getElementById("import-form");
const importTitle = document.getElementById("import-title");
const importAudio = document.getElementById("import-audio");
const importCover = document.getElementById("import-cover");


// =========================
// ✅ FIX MOBILE AUDIO (iOS / Android)
// =========================
audio.setAttribute("playsinline", "");
audio.setAttribute("webkit-playsinline", "");
audio.playsInline = true;
audio.preload = "metadata";

let userGesturePlay = false; // sert à retry play mobile


// =========================
// 2) NAVIGATION
// =========================
function showView(name){
  Object.values(views).forEach(v => v && v.classList.remove("active"));
  if (views[name]) views[name].classList.add("active");
  navButtons.forEach(b => b.classList.toggle("active", b.dataset.view === name));
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const v = btn.dataset.view;
    if (v) showView(v);
  });
});


// =========================
// 3) GATE MODES
// =========================
const PASS_EDITOR = "rsq3";

function hideAppUI(){
  mainHeader?.classList.add("hidden");
  appHeader?.classList.add("hidden");
  bottomNav?.classList.add("hidden");
  Object.values(views).forEach(v => v && v.classList.add("hidden"));
  miniPlayer?.classList.add("hidden");
}

function showAppUI(){
  mainHeader?.classList.remove("hidden");
  appHeader?.classList.remove("hidden");
  bottomNav?.classList.remove("hidden");
  Object.values(views).forEach(v => v && v.classList.remove("hidden"));
}

function applyModeUI(){
  const isEditor = currentMode === "editor";
  if (modeLabel){
    modeLabel.textContent = isEditor ? "Mode Éditeur" : "Mode Auditeur";
  }
  if (views.import) views.import.style.display = isEditor ? "" : "none";
  if (navImportBtn) navImportBtn.style.display = isEditor ? "" : "none";
}

function setMode(mode){
  currentMode = mode;
  localStorage.setItem("shadow_mode", mode);

  gateSection?.classList.add("hidden");
  showAppUI();
  applyModeUI();
  showView("home");

  refreshTrackList();
  refreshHome();

  if (tracks.length > 0) {
    loadTrack(0, false);
  } else {
    audio.pause();
    miniPlayer?.classList.add("hidden");
    title.textContent = "Aucun son pour l’instant";
    cover.src = DEFAULT_COVER;
  }
}

function checkMode(){
  const savedMode = localStorage.getItem("shadow_mode");
  if(savedMode){
    setMode(savedMode);
  } else {
    hideAppUI();
    gateSection?.classList.remove("hidden");
  }
}

btnListener?.addEventListener("click", () => setMode("listener"));

btnEditor?.addEventListener("click", () => {
  const mdp = prompt("Mot de passe éditeur :");
  if(mdp === PASS_EDITOR){
    setMode("editor");
  } else {
    alert("Mot de passe incorrect 😅");
  }
});

function resetModeToGate(){
  localStorage.removeItem("shadow_mode");
  currentMode = null;
  hideAppUI();
  gateSection?.classList.remove("hidden");
}
switchModeBtn?.addEventListener("click", resetModeToGate);


// =========================
// 4) LOAD TRACKS FROM CLOUD (OPTION B OFFLINE)
// =========================
async function loadTracksFromCloud(){
  const backupTracks = tracks.filter(t => t.source === "backup");

  try {
    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0){
      console.warn("Mode OFFLINE → sons backup utilisés");
      tracks = backupTracks;
      initApp();
      return;
    }

    const cloudTracks = data.map(t => ({
      id: t.id,
      title: t.title,
      file: t.audio_url,
      cover: t.cover_url || "",
      source: "cloud"
    }));

    tracks = cloudTracks; // online => cloud only
    console.log("Cloud chargé → backups masqués");
    initApp();

  } catch (e){
    console.warn("Cloud impossible → fallback backup");
    tracks = backupTracks;
    initApp();
  }
}

loadTracksFromCloud();


// =========================
// 5) INIT APP
// =========================
function initApp(){
  refreshTrackList();
  refreshHome();
  checkMode();
}


// =========================
// Helpers URL (local vs cloud)
// =========================
function getPlayableSrc(track){
  if (track.source === "cloud") return track.file;
  return encodeURI(track.file);
}

function getCoverSrc(track){
  if (!track.cover) return DEFAULT_COVER;
  if (track.source === "cloud") return track.cover;
  return encodeURI(track.cover);
}


// =========================
// 6) LISTE DES MORCEAUX (+ edit + delete cloud en éditeur)
// =========================
function refreshTrackList() {
  trackList.innerHTML = "";

  tracks.forEach((track, index) => {
    const div = document.createElement("div");
    div.className = "track";
    div.onclick = () => loadTrack(index);

    const img = document.createElement("img");
    img.src = getCoverSrc(track);
    img.alt = track.title;

    const span = document.createElement("span");
    span.textContent = track.title;

    div.appendChild(img);
    div.appendChild(span);

    if (track.source === "cloud" && currentMode === "editor") {
      // ✏️ rename
      const edit = document.createElement("button");
      edit.className = "edit-btn";
      edit.innerHTML = "✏️";
      edit.onclick = (e) => {
        e.stopPropagation();
        renameTrack(index);
      };
      div.appendChild(edit);

      // 🗑️ delete
      const del = document.createElement("button");
      del.className = "delete-btn";
      del.innerHTML = "🗑️";
      del.onclick = (e) => {
        e.stopPropagation();
        deleteTrack(index);
      };
      div.appendChild(del);
    }

    trackList.appendChild(div);
  });

  highlightActiveTrack();
}

function highlightActiveTrack() {
  document.querySelectorAll(".track").forEach((item, i) => {
    item.classList.toggle("active", i === currentTrack);
  });
}


// =========================
// 7) SUPPRIMER UN TRACK CLOUD (DB seulement)
// =========================
async function deleteTrack(index){
  const track = tracks[index];
  if (track.source !== "cloud") return;

  const ok = confirm(`Supprimer "${track.title}" ?`);
  if(!ok) return;

  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("id", track.id);

  if (error){
    alert("Erreur suppression cloud: " + error.message);
    console.error(error);
    return;
  }

  tracks.splice(index, 1);

  if(index === currentTrack){
    if(tracks.length > 0){
      currentTrack = Math.min(currentTrack, tracks.length - 1);
      loadTrack(currentTrack, false);
    } else {
      audio.pause();
      miniPlayer.classList.add("hidden");
      title.textContent = "Titre";
      cover.src = "";
    }
  } else if(index < currentTrack){
    currentTrack--;
  }

  refreshTrackList();
  refreshHome();
}


// =========================
// 7.5) RENOMMER UN TRACK CLOUD
// =========================
async function renameTrack(index){
  const track = tracks[index];
  if (track.source !== "cloud") return;

  const newName = prompt("Nouveau titre :", track.title);
  if (!newName || newName.trim() === "") return;

  try {
    const { error } = await supabase
      .from("tracks")
      .update({ title: newName.trim() })
      .eq("id", track.id);

    if (error){
      alert("Erreur lors du renommage : " + error.message);
      console.error(error);
      return;
    }

    track.title = newName.trim();
    refreshTrackList();
    refreshHome();

    if (currentTrack === index){
      title.textContent = newName.trim();
      miniTitle.textContent = newName.trim();
    }

    alert("Nom mis à jour ✔️");

  } catch (err){
    console.error("Rename error:", err);
    alert("Erreur inconnue 😅");
  }
}


// =========================
// 8) CHARGER UN MORCEAU (FIX CLOUD + FIX MOBILE)
// =========================
async function loadTrack(index, autoplay = true) {
  currentTrack = index;
  const track = tracks[index];

  audio.src = getPlayableSrc(track);
  audio.crossOrigin = "anonymous";
  audio.load();

  title.textContent = track.title;
  cover.src = getCoverSrc(track);

  highlightActiveTrack();
  updateMiniPlayer();

  if (!autoplay) {
    updatePlayButton(false);
    return;
  }

  // tap utilisateur => autorise play mobile
  userGesturePlay = true;

  const tryPlay = async () => {
    if (!userGesturePlay) return;
    try {
      await audio.play();
      updatePlayButton(true);
      userGesturePlay = false;
    } catch (e) {
      console.warn("play bloqué, retry quand prêt…", e);
    }
  };

  await tryPlay();
  audio.oncanplay = () => tryPlay();
}


// =========================
// 9) PLAY / PAUSE (FIX MOBILE)
// =========================
async function togglePlay() {
  try {
    if (audio.paused) {
      userGesturePlay = true;
      await audio.play();
      updatePlayButton(true);
      userGesturePlay = false;
    } else {
      audio.pause();
      updatePlayButton(false);
    }
  } catch (e) {
    console.error("togglePlay error:", e);
    alert("Le navigateur bloque la lecture. Retape ▶️ une fois.");
  }
}

function updatePlayButton(isPlaying) {
  const playBtn = document.querySelector(".play-btn");
  if (!playBtn) return;

  playBtn.innerHTML = isPlaying
    ? `<svg width="40" height="40" viewBox="0 0 24 24" fill="black">
         <rect x="8" y="5" width="4" height="14"></rect>
         <rect x="14" y="5" width="4" height="14"></rect>
       </svg>`
    : `<svg width="40" height="40" viewBox="0 0 24 24" fill="black">
         <polygon points="8,5 20,12 8,19"/>
       </svg>`;
}

audio.onplay = () => updatePlayButton(true);
audio.onpause = () => updatePlayButton(false);
audio.addEventListener("play", updateMiniPlayer);
audio.addEventListener("pause", updateMiniPlayer);


// =========================
// 10) NEXT / PREV / SHUFFLE / LOOP
// =========================
function prevTrack() {
  currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
  loadTrack(currentTrack);
}

function nextTrack() {
  currentTrack = isShuffling
    ? Math.floor(Math.random() * tracks.length)
    : (currentTrack + 1) % tracks.length;
  loadTrack(currentTrack);
}

function toggleShuffle() {
  isShuffling = !isShuffling;
  alert(isShuffling ? "Mode aléatoire activé" : "Mode aléatoire désactivé");
}

function toggleLoop() {
  audio.loop = !audio.loop;
  alert(audio.loop ? "Boucle activée" : "Boucle désactivée");
}

audio.onended = () => {
  if (!audio.loop) nextTrack();
};


// =========================
// 11) TIMELINE
// =========================
function formatTime(sec){
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  if (!isSeeking) {
    const percent = (audio.currentTime / audio.duration) * 100 || 0;
    progress.value = percent;
    progress.style.setProperty("--progress", `${percent}%`);
    currentTimeEl.textContent = formatTime(audio.currentTime);
  }
});

progress.addEventListener("input", () => {
  isSeeking = true;
  const seekTime = (progress.value / 100) * audio.duration;
  currentTimeEl.textContent = formatTime(seekTime);
  progress.style.setProperty("--progress", `${progress.value}%`);
});

progress.addEventListener("change", () => {
  const seekTime = (progress.value / 100) * audio.duration;
  audio.currentTime = seekTime;
  isSeeking = false;
});


// =========================
// 12) IMPORT (SUPABASE CLOUD)
// =========================
if (importForm){
  importForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titleVal = importTitle.value.trim();
    if (!titleVal) return alert("Mets un titre ❤️");

    const audioFile = importAudio.files[0];
    if(!audioFile) return alert("Choisis un mp3");

    if (audioFile.type.startsWith("video/")) {
      alert("Choisis un fichier audio (mp3/wav), pas une vidéo 😅");
      return;
    }

    const coverFile = importCover.files[0];

    try {
      const audioPath = `audio/${Date.now()}_${audioFile.name}`;
      const { error: audioErr } = await supabase
        .storage.from("tracks")
        .upload(audioPath, audioFile);

      if (audioErr) throw audioErr;

      const { data: audioPublic } = supabase
        .storage.from("tracks")
        .getPublicUrl(audioPath);

      const audioUrl = audioPublic.publicUrl;

      let coverUrl = "";
      if (coverFile){
        const coverPath = `covers/${Date.now()}_${coverFile.name}`;
        const { error: coverErr } = await supabase
          .storage.from("tracks")
          .upload(coverPath, coverFile);

        if (coverErr) throw coverErr;

        const { data: coverPublic } = supabase
          .storage.from("tracks")
          .getPublicUrl(coverPath);

        coverUrl = coverPublic.publicUrl;
      }

      const { data, error: insertErr } = await supabase
        .from("tracks")
        .insert([{ title: titleVal, audio_url: audioUrl, cover_url: coverUrl }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      tracks.push({
        id: data.id,
        title: data.title,
        file: data.audio_url,
        cover: data.cover_url || "",
        source: "cloud"
      });

      refreshTrackList();
      refreshHome();
      importForm.reset();
      alert("Upload cloud réussi 🔥");
      showView("home");

    } catch (err) {
      alert("Erreur cloud (upload): " + err.message);
      console.error(err);
    }
  });
}


// =========================
// 13) ACCUEIL (3 récents)
// =========================
function refreshHome(){
  const xl = document.getElementById("recent-xl");
  const small = document.getElementById("recent-small");

  xl.innerHTML = "";
  small.innerHTML = "";

  const recents = tracks.slice(-3).reverse();

  if(recents[0]){
    const big = recents[0];

    xl.innerHTML = `
      <img src="${getCoverSrc(big) || ''}" alt="${big.title}">
      <div class="title">${big.title}</div>
      <div class="play-btn-xl">Écouter maintenant</div>
    `;

    xl.onclick = () => {
      const index = tracks.findIndex(t => t.title === big.title && t.file === big.file);
      showView("listen");
      if(index !== -1) loadTrack(index);
    };
  }

  recents.slice(1).forEach(track => {
    const div = document.createElement("div");
    div.className = "small-card";

    div.innerHTML = `
      <img src="${getCoverSrc(track) || ''}">
      <div class="title">${track.title}</div>
    `;

    div.onclick = () => {
      const index = tracks.findIndex(t => t.title === track.title && t.file === track.file);
      showView("listen");
      if(index !== -1) loadTrack(index);
    };

    small.appendChild(div);
  });
}


// =========================
// 14) MINI PLAYER
// =========================
function updateMiniPlayer(){
  miniTitle.textContent = tracks[currentTrack]?.title || "";
  miniCover.src = getCoverSrc(tracks[currentTrack]) || "";

  miniPlayIcon.innerHTML = audio.paused
    ? `<polygon points="8,5 20,12 8,19"/>`
    : `<rect x="8" y="5" width="4" height="14"></rect>
       <rect x="14" y="5" width="4" height="14"></rect>`;

  miniPlayer.classList.remove("hidden");
}


// =========================
// 15) HEADER compact au scroll
// =========================
const header = document.querySelector("header");
window.addEventListener("scroll", () => {
  header.classList.toggle("compact", window.scrollY > 30);
});

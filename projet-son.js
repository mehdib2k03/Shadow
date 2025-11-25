let tracks = [];
let currentTrack = 0;
let isShuffling = false;

const audio = document.getElementById("audio");
const title = document.getElementById("title");
const cover = document.getElementById("cover");
const trackList = document.getElementById("track-list");

// =========================
// 1. Ajouter un bouton pour choisir le dossier
// =========================

const btn = document.createElement("button");
btn.innerText = "importer";
btn.style.marginBottom = "10px";
btn.style.width = "100%";
btn.style.padding = "10px";
btn.style.cursor = "pointer";
btn.style.borderRadius = "6px";
btn.style.background = "#4a90a4";
btn.style.color = "#fff";
btn.style.fontSize = "16px";

// Ajout en haut de la liste des morceaux
trackList.parentNode.insertBefore(btn, trackList);

// Input invisible pour choisir le dossier
const folderPicker = document.createElement("input");
folderPicker.type = "file";
folderPicker.webkitdirectory = true;
folderPicker.style.display = "none";
document.body.appendChild(folderPicker);

// Quand on clique sur le bouton → ouvrir le picker
btn.onclick = () => folderPicker.click();

// Quand le dossier est choisi → charger les musiques
folderPicker.addEventListener("change", () => {
    loadFolderFiles(folderPicker.files);
});


// =========================
// 2. Charger les fichiers depuis le dossier choisi
// =========================

function loadFolderFiles(fileList) {
    tracks = [];

    for (const file of fileList) {
        if (file.name.endsWith(".mp3")) {

            const audioURL = URL.createObjectURL(file);
            const baseName = file.name.replace(".mp3", "");

            // Chercher la pochette associée
            let coverURL = "";
            for (const f of fileList) {
                if (f.name === baseName + ".png" || f.name === baseName + ".jpg") {
                    coverURL = URL.createObjectURL(f);
                }
            }

            tracks.push({
                title: baseName,
                file: audioURL,
                cover: coverURL
            });
        }
    }

    refreshTrackList();

    if (tracks.length > 0) {
        loadTrack(0);
    }
}


// =========================
// 3. Afficher la liste des morceaux
// =========================

function refreshTrackList() {
    trackList.innerHTML = "";

    tracks.forEach((track, index) => {
        const div = document.createElement("div");
        div.className = "track";
        div.innerHTML = track.title;
        div.onclick = () => loadTrack(index);
        trackList.appendChild(div);
    });
}


// =========================
// 4. Charger un morceau
// =========================

function loadTrack(index) {
    currentTrack = index;
    audio.src = tracks[index].file;
    title.textContent = tracks[index].title;
    cover.src = tracks[index].cover || "";
    audio.play();
}


// =========================
// 5. Contrôles lecture
// =========================

function togglePlay() {
    audio.paused ? audio.play() : audio.pause();
}

function prevTrack() {
    currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrack);
}

function nextTrack() {
    if (isShuffling) {
        currentTrack = Math.floor(Math.random() * tracks.length);
    } else {
        currentTrack = (currentTrack + 1) % tracks.length;
    }
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

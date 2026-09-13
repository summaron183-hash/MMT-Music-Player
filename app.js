// Paste your Client ID inside the quotes below:
const CLIENT_ID = 'f2ed4d7a';

const audio = document.getElementById('main-audio');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const trackCover = document.getElementById('track-cover');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const suggestionsDropdown = document.getElementById('suggestions-dropdown');
const resultsList = document.getElementById('results-list');
const favoritesList = document.getElementById('favorites-list');
const playlistsList = document.getElementById('playlists-list');
const lyricsDisplay = document.getElementById('lyrics-display');
const favBtn = document.getElementById('fav-btn');
const addToPlaylistBtn = document.getElementById('add-to-playlist-btn');
const downloadMp3Btn = document.getElementById('download-mp3-btn');
const downloadLyricsBtn = document.getElementById('download-lyrics-btn');
const pipBtn = document.getElementById('pip-btn');
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const playlistNameInput = document.getElementById('playlist-name-input');

const pipVideo = document.getElementById('pip-video');
const pipCanvas = document.getElementById('pip-canvas');
const ctx = pipCanvas.getContext('2d');

let currentTrack = null;
let currentLyricsText = "";
let searchDebounceTimer = null;

// 1. Live Auto-Suggest & Fuzzy Search as User Types
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  const query = searchInput.value.trim();

  if (!query) {
    suggestionsDropdown.style.display = 'none';
    return;
  }

  // Debounce API requests for smooth typing
  searchDebounceTimer = setTimeout(async () => {
    const tracks = await fetchSearchResults(query, 5);
    renderSuggestions(tracks);
  }, 250);
});

async function fetchSearchResults(query, limit = 10) {
  // Uses Jamendo's fuzzy search matching engine
  const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&fuzzysearch=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.results || [];
}

function renderSuggestions(tracks) {
  suggestionsDropdown.innerHTML = '';
  if (tracks.length === 0) {
    suggestionsDropdown.style.display = 'none';
    return;
  }

  tracks.forEach(track => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    const coverUrl = track.album_image || 'https://via.placeholder.com/50';
    item.innerHTML = `
      <img src="${coverUrl}" alt="Cover">
      <div>
        <strong>${track.name}</strong><br>
        <small>${track.artist_name}</small>
      </div>
    `;
    item.addEventListener('click', () => {
      loadTrack(track);
      suggestionsDropdown.style.display = 'none';
    });
    suggestionsDropdown.appendChild(item);
  });

  suggestionsDropdown.style.display = 'block';
}

// Full Search Trigger
searchBtn.addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) return;
  suggestionsDropdown.style.display = 'none';
  const tracks = await fetchSearchResults(query, 12);
  renderResults(tracks);
});

function renderResults(tracks) {
  resultsList.innerHTML = '';
  if(tracks.length === 0) {
    resultsList.innerHTML = '<p>No songs found.</p>';
    return;
  }
  tracks.forEach(track => {
    const div = document.createElement('div');
    div.className = 'track-item';
    const coverUrl = track.album_image || 'https://via.placeholder.com/50';
    div.innerHTML = `
      <div class="track-info">
        <img src="${coverUrl}" alt="Cover">
        <div class="track-text">
          <strong>${track.name}</strong>
          <small>${track.artist_name}</small>
        </div>
      </div>
      <button onclick='loadTrack(${JSON.stringify(track).replace(/'/g, "&apos;")})'>Play</button>
    `;
    resultsList.appendChild(div);
  });
}

// Hide suggestion dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-section')) {
    suggestionsDropdown.style.display = 'none';
  }
});

// 2. Play Selected Track
async function loadTrack(track) {
  currentTrack = track;
  trackTitle.innerText = track.name;
  trackArtist.innerText = track.artist_name;
  trackCover.src = track.album_image || 'https://via.placeholder.com/300';
  audio.src = track.audio;
  audio.play();

  updateFavButtonState();

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist_name,
      artwork: [{ src: track.album_image || 'https://via.placeholder.com/300', sizes: '512x512', type: 'image/jpeg' }]
    });

    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  }

  drawCanvas(track.name, track.artist_name, track.album_image);
  fetchLyrics(track.artist_name, track.name);
}

// 3. Picture-in-Picture Floating Mode
function drawCanvas(title, artist, imgUrl) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imgUrl || 'https://via.placeholder.com/300';
  img.onload = () => {
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, 600, 600);
    ctx.drawImage(img, 100, 50, 400, 400);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText(title, 300, 490);
    ctx.font = "20px Arial";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText(artist, 300, 530);

    const stream = pipCanvas.captureStream();
    pipVideo.srcObject = stream;
    pipVideo.play();
  };
}

pipBtn.addEventListener('click', async () => {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
  } else if (document.pictureInPictureEnabled && pipVideo.srcObject) {
    await pipVideo.requestPictureInPicture();
  }
});

// 4. Fetch Lyrics (LRCLIB API)
async function fetchLyrics(artist, title) {
  lyricsDisplay.innerText = "Loading lyrics...";
  try {
    const res = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`);
    const data = await res.json();
    currentLyricsText = data.syncedLyrics || data.plainLyrics || "No lyrics found for this track.";
    lyricsDisplay.innerText = currentLyricsText;
  } catch (err) {
    currentLyricsText = "No lyrics found.";
    lyricsDisplay.innerText = currentLyricsText;
  }
}

// 5. Download MP3 & Download Lyrics (.txt)
downloadMp3Btn.addEventListener('click', () => {
  if (!currentTrack) return;
  const a = document.createElement('a');
  a.href = currentTrack.audio;
  a.download = `${currentTrack.name}.mp3`;
  a.target = "_blank";
  a.click();
});

downloadLyricsBtn.addEventListener('click', () => {
  if (!currentLyricsText) return;
  const blob = new Blob([currentLyricsText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${trackTitle.innerText}_Lyrics.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// 6. Favorites Feature (Add & Unfavorite/Remove)
favBtn.addEventListener('click', () => {
  if (!currentTrack) return;
  let favorites = JSON.parse(localStorage.getItem('web_favorites')) || [];
  const index = favorites.findIndex(fav => fav.id === currentTrack.id);

  if (index === -1) {
    favorites.push(currentTrack);
  } else {
    favorites.splice(index, 1); // Unfavorite
  }

  localStorage.setItem('web_favorites', JSON.stringify(favorites));
  updateFavButtonState();
  loadFavorites();
});

function updateFavButtonState() {
  if (!currentTrack) return;
  let favorites = JSON.parse(localStorage.getItem('web_favorites')) || [];
  const isFav = favorites.some(fav => fav.id === currentTrack.id);
  
  if (isFav) {
    favBtn.innerText = "💔 Unfavorite";
    favBtn.classList.add("danger-btn");
  } else {
    favBtn.innerText = "❤️ Add to Favorites";
    favBtn.classList.remove("danger-btn");
  }
}

function loadFavorites() {
  favoritesList.innerHTML = '';
  let favorites = JSON.parse(localStorage.getItem('web_favorites')) || [];
  
  if (favorites.length === 0) {
    favoritesList.innerHTML = '<p style="font-size: 13px; color: #888;">No favorites saved.</p>';
    return;
  }

  favorites.forEach(track => {
    const div = document.createElement('div');
    div.className = 'track-item';
    const coverUrl = track.album_image || 'https://via.placeholder.com/50';
    div.innerHTML = `
      <div class="track-info">
        <img src="${coverUrl}" alt="Cover">
        <div class="track-text">
          <strong>${track.name}</strong>
          <small>${track.artist_name}</small>
        </div>
      </div>
      <div class="item-buttons">
        <button onclick='loadTrack(${JSON.stringify(track).replace(/'/g, "&apos;")})'>Play</button>
        <button class="danger-btn" onclick='removeFavorite("${track.id}")'>❌</button>
      </div>
    `;
    favoritesList.appendChild(div);
  });
}

function removeFavorite(trackId) {
  let favorites = JSON.parse(localStorage.getItem('web_favorites')) || [];
  favorites = favorites.filter(fav => fav.id !== trackId);
  localStorage.setItem('web_favorites', JSON.stringify(favorites));
  updateFavButtonState();
  loadFavorites();
}

// 7. Playlist Management
createPlaylistBtn.addEventListener('click', () => {
  const name = playlistNameInput.value.trim();
  if (!name) return;

  let playlists = JSON.parse(localStorage.getItem('web_playlists')) || {};
  if (!playlists[name]) {
    playlists[name] = [];
    localStorage.setItem('web_playlists', JSON.stringify(playlists));
    playlistNameInput.value = '';
    loadPlaylists();
  }
});

addToPlaylistBtn.addEventListener('click', () => {
  if (!currentTrack) return;
  let playlists = JSON.parse(localStorage.getItem('web_playlists')) || {};
  const names = Object.keys(playlists);

  if (names.length === 0) {
    alert("Please create a playlist first!");
    return;
  }

  const chosenName = prompt(`Enter playlist name to add to:\n${names.join(", ")}`);
  if (chosenName && playlists[chosenName]) {
    if (!playlists[chosenName].some(t => t.id === currentTrack.id)) {
      playlists[chosenName].push(currentTrack);
      localStorage.setItem('web_playlists', JSON.stringify(playlists));
      loadPlaylists();
    }
  }
});

function loadPlaylists() {
  playlistsList.innerHTML = '';
  let playlists = JSON.parse(localStorage.getItem('web_playlists')) || {};
  const names = Object.keys(playlists);

  if (names.length === 0) {
    playlistsList.innerHTML = '<p style="font-size: 13px; color: #888;">No playlists created.</p>';
    return;
  }

  names.forEach(name => {
    const card = document.createElement('div');
    card.className = 'playlist-card';
    
    let tracksHtml = playlists[name].map(track => `
      <div class="track-item">
        <div class="track-info">
          <img src="${track.album_image || 'https://via.placeholder.com/50'}" alt="Cover">
          <div class="track-text">
            <strong>${track.name}</strong>
            <small>${track.artist_name}</small>
          </div>
        </div>
        <div class="item-buttons">
          <button onclick='loadTrack(${JSON.stringify(track).replace(/'/g, "&apos;")})'>Play</button>
          <button class="danger-btn" onclick='removeFromPlaylist("${name}", "${track.id}")'>❌</button>
        </div>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="playlist-header">
        <strong>📁 ${name}</strong>
        <button class="danger-btn" onclick='deletePlaylist("${name}")'>Delete Playlist</button>
      </div>
      <div>${tracksHtml || '<p style="font-size: 12px; color: #888;">Empty playlist</p>'}</div>
    `;
    playlistsList.appendChild(card);
  });
}

function removeFromPlaylist(playlistName, trackId) {
  let playlists = JSON.parse(localStorage.getItem('web_playlists')) || {};
  if (playlists[playlistName]) {
    playlists[playlistName] = playlists[playlistName].filter(t => t.id !== trackId);
    localStorage.setItem('web_playlists', JSON.stringify(playlists));
    loadPlaylists();
  }
}

function deletePlaylist(playlistName) {
  let playlists = JSON.parse(localStorage.getItem('web_playlists')) || {};
  delete playlists[playlistName];
  localStorage.setItem('web_playlists', JSON.stringify(playlists));
  loadPlaylists();
}

// Initial Setup
loadFavorites();
loadPlaylists();

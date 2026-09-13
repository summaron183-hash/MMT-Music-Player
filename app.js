// Paste your Client ID inside the quotes below:
const CLIENT_ID = 'f2ed4d7a';

const audio = document.getElementById('main-audio');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const trackCover = document.getElementById('track-cover');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsList = document.getElementById('results-list');
const favoritesList = document.getElementById('favorites-list');
const lyricsDisplay = document.getElementById('lyrics-display');
const favBtn = document.getElementById('fav-btn');
const downloadMp3Btn = document.getElementById('download-mp3-btn');
const downloadLyricsBtn = document.getElementById('download-lyrics-btn');
const pipBtn = document.getElementById('pip-btn');

const pipVideo = document.getElementById('pip-video');
const pipCanvas = document.getElementById('pip-canvas');
const ctx = pipCanvas.getContext('2d');

let currentTrack = null;
let currentLyricsText = "";

// 1. Search Music
searchBtn.addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) return;

  const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=10&search=${encodeURIComponent(query)}`);
  const data = await res.json();
  renderResults(data.results);
});

function renderResults(tracks) {
  resultsList.innerHTML = '';
  tracks.forEach(track => {
    const div = document.createElement('div');
    div.className = 'track-item';
    div.innerHTML = `
      <div>
        <strong>${track.name}</strong> - <small>${track.artist_name}</small>
      </div>
      <button onclick='loadTrack(${JSON.stringify(track).replace(/'/g, "&apos;")})'>Play</button>
    `;
    resultsList.appendChild(div);
  });
}

// 2. Play Track & Enable Background Media Controls
async function loadTrack(track) {
  currentTrack = track;
  trackTitle.innerText = track.name;
  trackArtist.innerText = track.artist_name;
  trackCover.src = track.album_image || 'https://via.placeholder.com/300';
  audio.src = track.audio;
  audio.play();

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist_name,
      artwork: [{ src: track.album_image, sizes: '512x512', type: 'image/jpeg' }]
    });

    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  }

  drawCanvas(track.name, track.artist_name, track.album_image);
  fetchLyrics(track.artist_name, track.name);
}

// 3. Floating Picture-in-Picture Player
function drawCanvas(title, artist, imgUrl) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imgUrl;
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

// 4. Lyrics Fetching
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

// 5. Download MP3 & Lyrics
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

// 6. Favorites Storage
favBtn.addEventListener('click', () => {
  if (!currentTrack) return;
  let favorites = JSON.parse(localStorage.getItem('web_favorites')) || [];
  if (!favorites.some(fav => fav.id === currentTrack.id)) {
    favorites.push(currentTrack);
    localStorage.setItem('web_favorites', JSON.stringify(favorites));
    loadFavorites();
  }
});

function loadFavorites() {
  favoritesList.innerHTML = '';
  let favorites = JSON.parse(localStorage.getItem('web_favorites')) || [];
  favorites.forEach(track => {
    const li = document.createElement('li');
    li.style.margin = "8px 0";
    li.innerHTML = `
      ${track.name} 
      <button onclick='loadTrack(${JSON.stringify(track).replace(/'/g, "&apos;")})'>Play</button>
    `;
    favoritesList.appendChild(li);
  });
}

loadFavorites();

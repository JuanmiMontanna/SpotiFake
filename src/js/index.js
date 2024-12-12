const songList = document.querySelector('.main');
const currentSongLogo = document.querySelector('.currentSongLogo');
const playButton = document.querySelector('#playButton');
const pauseTopButton = document.querySelector('.header2 button');
const progressBar = document.querySelector('.progressBar');
const currentTime = document.querySelector('.time.current');
const totalTime = document.querySelector('.time.total');
const modalContainer = document.getElementById('modal');
const addQueueButton = document.getElementById('addToList');
const addQueueForm = document.getElementById('addToListForm');
const uploadButton = document.getElementById("upload-button");
const songsContainer = document.getElementById('songs');
const loopButtonIcon = document.querySelector('#loopButton i');
const shuffleButtonIcon = document.querySelector('#shuffleButton i');

const API = "http://informatica.iesalbarregas.com:7008";
const songsEndPoint = API + "/songs";
const uploadEndPoint = API + "/upload";

const options = {
  method: 'GET'
};

let currentSong = null;
let currentAudio = null;
let isPlaying = false;
let songsList = [];
let currentSongIndex = 0;
let isLooping = false;
let isShuffle = false;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

fetch(songsEndPoint, options)
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`Network error: ${response.status}`);
    }
  })
  .then(songs => {
    songsList = songs;
    songs.forEach(song => {
      const songItem = createSongItem(song);
      songsContainer.appendChild(songItem);
    });

    document.getElementById('nextSongButton').addEventListener('click', playNextSong);
    document.getElementById('previousSongButton').addEventListener('click', playPreviousSong);
    document.getElementById('loopButton').addEventListener('click', toggleLoop);
    document.getElementById('shuffleButton').addEventListener('click', toggleShuffle);

    playButton.addEventListener('click', () => {
      if (currentSong) {
        togglePlayPause();
      }
    });

    pauseTopButton.addEventListener('click', () => {
      if (currentSong) {
        togglePlayPause();
      }
    });
  })
  .catch(error => {
    console.error('Error fetching songs:', error.message);
  });

function createSongItem(song) {
  const songItem = document.createElement('div');
  songItem.classList.add('song-item');

  const playSongButton = document.createElement('span');
  playSongButton.classList.add("play-song-button");
  playSongButton.innerHTML = `<i class="bx bx-play play-icon"></i>`;

  const title = document.createElement('span');
  title.textContent = song.title;

  const artist = document.createElement('span');
  artist.textContent = song.artist;

  const duration = document.createElement('span');
  const audio = new Audio(song.filepath);
  audio.addEventListener('loadedmetadata', () => {
    const minutes = Math.floor(audio.duration / 60);
    const seconds = Math.floor(audio.duration % 60).toString().padStart(2, '0');
    duration.textContent = `${minutes}:${seconds}`;
  });

  const favButton = document.createElement('button');
  favButton.classList.add("fav-button");
  if (favorites.some(fav => fav.filepath === song.filepath)) {
    favButton.innerHTML = `<i class='bx bxs-heart'></i>`;
  } else {
    favButton.innerHTML = `<i class='bx bx-heart'></i>`;
  }

  songItem.append(playSongButton, title, artist, duration, favButton);
  songsContainer.append(songItem);

  favButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (favButton.firstChild.classList.contains("bx-heart")) {
      favButton.innerHTML = `<i class='bx bxs-heart'></i>`;
      favorites.push(song);
      localStorage.setItem('favorites', JSON.stringify(favorites));
    } else {
      favButton.innerHTML = `<i class='bx bx-heart'></i>`;
      favorites = favorites.filter(fav => fav.filepath !== song.filepath);
      localStorage.setItem('favorites', JSON.stringify(favorites));

      if (songsContainer.classList.contains('favorites-view')) {
        const songItem = favButton.parentElement;
        songsContainer.removeChild(songItem);

        if (favorites.length === 0) {
          songsContainer.innerHTML = "<p>You don't have favorite songs, add some to listen to whenever you want.</p>";
        }
      }
    }
  });

  songItem.addEventListener('click', () => {
    console.log(songItem)
    selectSong(song);
  });

  return songItem;
}

const favoriteSongsButton = document.getElementById("favoriteSongsButton");

favoriteSongsButton.addEventListener("click", () => {
  loadFavorites();
});

let currentSongItem = null;

function selectSong(song) {
  if (songsContainer.classList.contains('favorites-view')) {
    if (!favorites.some(fav => fav.filepath === song.filepath)) {
      return;
    }
  }

  if (songsContainer.classList.contains('favorites-view')) {
    currentSongIndex = favorites.findIndex(s => s.filepath === song.filepath);
  } else {
    currentSongIndex = songsList.findIndex(s => s.filepath === song.filepath);
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  currentSong = song;
  currentSongLogo.innerHTML = `
    <div class="songInfo">
      <img id="coverInfo" src="${song.cover}" alt="${song.title}">
    </div>
  `;
  const musicData = document.querySelector('#songInfo');
  musicData.innerHTML = `
    <div class="songName">${song.title}</div>
    <div class="artistName">${song.artist}</div>
  `;

  isPlaying = false;
  updatePlayPauseButton(false);

  const activeSongs = document.querySelectorAll('.song-item-active');
  activeSongs.forEach(song => song.classList.remove('song-item-active'));

  currentSongItem = document.querySelector(`.song-item:nth-child(${currentSongIndex + 1})`);
  playSong(song.filepath);
}

function togglePlayPause() {
  if (!currentSong) return;

  if (!currentAudio || currentAudio.src !== currentSong.filepath) {
    playSong(currentSong);
  } else if (isPlaying) {

    currentAudio.pause();
    isPlaying = false;
    updatePlayPauseButton(false);
  } else {
    currentAudio.play();
    isPlaying = true;
    updatePlayPauseButton(true);
  }
}

function playSong(songUrl) {
  if (currentAudio) {
    currentAudio.pause();
  }
  currentAudio = new Audio(songUrl);

  currentAudio.addEventListener('loadedmetadata', () => {
    totalTime.textContent = formatTime(currentAudio.duration);
  });

  currentAudio.play();
  currentAudio.volume = volumeRange.value;
  isPlaying = true;
  updatePlayPauseButton(true);

  currentAudio.addEventListener('ended', () => {
    if (isLooping) {
      currentAudio.currentTime = 0;
      currentAudio.play();
    } else if (isShuffle) {
      playNextSong();
    } else {
      playNextSong();
    }
  });

  currentAudio.addEventListener('timeupdate', () => {
    const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
    if (!Number.isNaN(progress)) {
      progressBar.value = progress;
    }
    currentTime.textContent = formatTime(currentAudio.currentTime);
  });

  if (currentSongItem) {
    currentSongItem.classList.add('song-item-active');
    currentAudio.addEventListener('ended', () => {
      if (currentSongItem) {
        currentSongItem.classList.remove('song-item-active');
      }
    });
  }
}

function updatePlayPauseButton(playing) {
  const playButtonIcon = playButton.querySelector('i');
  if (playing) {
    pauseTopButton.textContent = "PAUSE";
    playButtonIcon.classList.remove('bx-play-circle');
    playButtonIcon.classList.add('bx-pause-circle');
  } else {
    pauseTopButton.textContent = "PLAY";
    playButtonIcon.classList.remove('bx-pause-circle');
    playButtonIcon.classList.add('bx-play-circle');
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

progressBar.addEventListener('mousedown', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const progress = (clickX / rect.width) * 100;
  if (isFinite(progress)) {
    progressBar.value = progress;
    updateCurrentTime(progress);
    if (currentAudio != null && isFinite(currentAudio.duration)) {
      currentAudio.currentTime = (progress / 100) * currentAudio.duration;
    }
  }
  const handleMouseMove = (e) => {
    const clickX = e.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;
    if (isFinite(progress)) {
      progressBar.value = progress;
      updateCurrentTime(progress);
      if (currentAudio != null && isFinite(currentAudio.duration)) {
        currentAudio.currentTime = (progress / 100) * currentAudio.duration;
      }
    }
  };
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', () => {
    window.removeEventListener('mousemove', handleMouseMove);
  });
});

function updateCurrentTime(progress) {
  if (currentAudio != null) {
    const newTime = (progress / 100) * currentAudio.duration;
    currentTime.textContent = formatTime(newTime);
  }
}

addQueueButton.addEventListener('click', () => {
  modalContainer.classList.replace("hidden", "modal");
  document.querySelectorAll('.errorMessage').forEach(span => span.textContent = '');
})

window.onclick = function (event) {
  if (event.target == modalContainer) {
    modalContainer.classList.replace("modal", "hidden");
    closeModal();
  }
}

const closeFormButton = document.getElementById("closeButton");
closeFormButton.addEventListener('click', () => {
  closeModal();
})

function closeModal() {
  document.querySelectorAll('.errorMessage').forEach(span => span.textContent = '');
  modalContainer.classList.add('hidden');
  clearForm();
}

function clearForm() {
  addQueueForm.reset();
  document.querySelectorAll('.errorMessage').forEach(span => span.textContent = '');
}

addQueueForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const title = document.getElementById('songTitle');
  const artist = document.getElementById('songArtist');
  const file = document.getElementById('songFile');
  const cover = document.getElementById('songImage');
  let isValid = true;

  file.addEventListener('change', () => {
    file.style.color = "black";
  })

  const regex = /^[A-Za-z\s]{1,20}$/;

  document.querySelectorAll('.errorMessage').forEach(span => span.textContent = '');

  if (!regex.test(title.value)) {
    isValid = false;
    document.getElementById('errorTitle').textContent = 'El campo está vacío o contiene caracteres no válidos.';
  }

  if (!regex.test(artist.value)) {
    isValid = false;
    document.getElementById('errorArtist').textContent = 'El campo está vacío o contiene caracteres no válidos.';
  }

  if (!file.files.length) {
    isValid = false;
    document.getElementById('errorFile').textContent = 'Debes seleccionar un archivo de audio.';
  }

  if (!cover.files.length) {
    isValid = false;
    document.getElementById('errorCover').textContent = 'Debes seleccionar una portada.';
  }

  if (!isValid) return;

  const formData = new FormData(addQueueForm);

  fetch(uploadEndPoint, {
    method: "POST",
    body: formData,
    headers: {
      "Accept": "application/json",
    },
  })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`Error al subir música: ${response.status}`);
      }
    })
    .then(data => {
      console.log("Música subida con éxito:", data);

      addQueueForm.reset();
      document.querySelectorAll('.errorMessage').forEach(span => span.textContent = '');
      modalContainer.classList.replace("modal", "hidden");
      songsList.push(data);
      const newSongItem = createSongItem(data.result);
      songsContainer.appendChild(newSongItem);
    })
    .catch(error => {
      console.error(error.message);
      alert("Hubo un error al subir la canción. Inténtalo de nuevo.");
    });
});

function playNextSong() {
  if (isLooping) {
    currentAudio.currentTime = 0;
    currentAudio.play();
    return;
  }

  if (songsContainer.classList.contains('favorites-view')) {
    if (isShuffle) {
      playRandomFavSong();
    } else {
      currentSongIndex = (currentSongIndex + 1) % favorites.length;
      selectSong(favorites[currentSongIndex]);
    }
  } else {
    if (isShuffle) {
      playRandomSong();
    } else {
      currentSongIndex = (currentSongIndex + 1) % songsList.length;
      selectSong(songsList[currentSongIndex]);
    }
  }
}
function playPreviousSong() {
  if (isLooping) {
    currentAudio.currentTime = 0;
    currentAudio.play();
    return;
  }

  if (songsContainer.classList.contains('favorites-view')) {
    if (isShuffle) {
      playRandomFavSong();
    } else {
      currentSongIndex = (currentSongIndex - 1 + favorites.length) % favorites.length;
      selectSong(favorites[currentSongIndex]);
    }
  } else {
    if (isShuffle) {
      playRandomSong();
    } else {
      currentSongIndex = (currentSongIndex - 1 + songsList.length) % songsList.length;
      selectSong(songsList[currentSongIndex]);
    }
  }
}

function playRandomFavSong() {
  if (!favorites.length) return;

  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * favorites.length);
  } while (favorites[randomIndex].filepath === currentSong.filepath);

  const randomSong = favorites[randomIndex];
  selectSong(randomSong);
}

function toggleLoop() {
  isLooping = !isLooping;
  if (isLooping) {
    loopButtonIcon.classList.add('active');
    loopButtonIcon.style.color = 'var(--color-primary)';
    if (isShuffle) {
      isShuffle = false;
      const shuffleButtonIcon = document.querySelector('#shuffleButton i');
      shuffleButtonIcon.classList.remove('active');
      shuffleButtonIcon.style.color = '';
    }
  } else {
    loopButtonIcon.classList.remove('active');
    loopButtonIcon.style.color = '';
  }
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  if (isShuffle) {
    shuffleButtonIcon.classList.add('active');
    shuffleButtonIcon.style.color = 'var(--color-primary)';
    if (isLooping) {
      isLooping = false;
      const loopButtonIcon = document.querySelector('#loopButton i');
      loopButtonIcon.classList.remove('active');
      loopButtonIcon.style.color = '';
    }
  } else {
    shuffleButtonIcon.classList.remove('active');
    shuffleButtonIcon.style.color = '';
  }
}

function playRandomSong() {
  if (!songsList.length) return;

  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * songsList.length);
  } while (songsList[randomIndex].filepath === currentSong.filepath);

  const randomSong = songsList[randomIndex];
  selectSong(randomSong);
}

function loadFavorites() {
  songsContainer.innerHTML = "";
  songsContainer.classList.add('favorites-view');
  favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  if (favorites.length === 0) {
    songsContainer.innerHTML = "<p>You don't have favorite songs, add some to listen to whenever you want.</p>";
    return;
  }
  favorites.forEach(song => {
    const songItem = createSongItem(song);
    songsContainer.appendChild(songItem);
  });
}

const allSongsButton = document.getElementById("allSongsButton");
allSongsButton.addEventListener('click', () => {
  loadAllSongs();
})

function loadAllSongs() {
  songsContainer.innerHTML = "";
  songsContainer.classList.remove('favorites-view');

  songsList.forEach(song => {
    const songItem = createSongItem(song);
    songsContainer.appendChild(songItem);
  });
}

const volumeRange = document.getElementById("volume");
const volumenContainer = document.querySelector(".volume");
volumeRange.addEventListener('input', (e) => {
  if (currentAudio != null) {
    currentAudio.volume = e.target.value;
  }
  if (e.target.value == 0) {
    volumenContainer.firstElementChild.className = "";
    volumenContainer.firstElementChild.classList.add("bx", "bxs-volume-mute");
  } else if (e.target.value <= 0.50) {
    volumenContainer.firstElementChild.className = "";
    volumenContainer.firstElementChild.classList.add("bx", "bxs-volume-low");
  } else {
    volumenContainer.firstElementChild.className = "";
    volumenContainer.firstElementChild.classList.add("bx", "bxs-volume-full");
  }
})

volumeRange.addEventListener('input', function () {
  const value = (this.value - this.min) / (this.max - this.min) * 100;
  this.style.setProperty('--range-progress', `${value}%`);
});

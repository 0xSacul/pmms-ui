import { sendNui } from './nui.js';
import { loading } from './stores.js';

const MAX_TIME_DIFFERENCE = 2;

let _isRDR = false;
let _currentServerEndpoint = '127.0.0.1:30120';
let _audioVisualizations = {};

export function configureEngine({ isRDR, currentServerEndpoint, audioVisualizations }) {
  _isRDR = isRDR;
  if (currentServerEndpoint) _currentServerEndpoint = currentServerEndpoint;
  if (audioVisualizations) _audioVisualizations = audioVisualizations;
}

function resolveUrl(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `http://${_currentServerEndpoint}/pmms/media/${url}`;
}

export function parseTimecode(timecode) {
  if (typeof timecode !== 'string') return timecode;
  if (timecode.includes(':')) {
    const [h, m, s] = timecode.split(':');
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
  }
  return parseInt(timecode);
}

export function timeToString(time) {
  const h = Math.floor(time / 3600);
  const m = Math.floor(time / 60) % 60;
  const s = Math.floor(time) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getAudioSource(player, context) {
  if (player.youTubeApi) {
    const el = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');
    return context.createMediaElementSource(el);
  }
  if (player.hlsPlayer) return context.createMediaElementSource(player.hlsPlayer.media);
  if (player.originalNode) return context.createMediaElementSource(player.originalNode);
  return context.createMediaElementSource(player);
}

function buildFilterChain(context, source, lowFreq, highFreq, gain = 0.5) {
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);
  const gainNode = context.createGain();
  gainNode.gain.value = gain;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = lowFreq;
  lowpass.gain.value = -1;
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = highFreq;
  highpass.gain.value = -1;

  source.connect(splitter);
  splitter.connect(merger, 0, 0);
  splitter.connect(merger, 1, 0);
  splitter.connect(merger, 0, 1);
  splitter.connect(merger, 1, 1);
  merger.connect(gainNode);
  gainNode.connect(lowpass);
  lowpass.connect(highpass);
  highpass.connect(context.destination);
}

function applyPhonographFilter(player) {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = getAudioSource(player, context);
    if (source) buildFilterChain(context, source, 3000, 300);

    const noise = document.createElement('audio');
    noise.id = `${player.id}_noise`;
    noise.src = 'https://redm.khzae.net/phonograph/noise.webm';
    noise.volume = 0;
    document.body.appendChild(noise);
    noise.play();
    player.style.filter = 'sepia()';
    player.addEventListener('play', () => noise.play());
    player.addEventListener('pause', () => noise.pause());
    player.addEventListener('volumechange', () => { noise.volume = player.volume; });
    player.addEventListener('seeked', () => { noise.currentTime = player.currentTime; });
  } catch (e) {
    console.warn('[engine] phonograph filter failed:', e);
  }
}

function applyRadioFilter(player) {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = getAudioSource(player, context);
    if (source) buildFilterChain(context, source, 5000, 200);
  } catch (e) {
    console.warn('[engine] radio filter failed:', e);
  }
}

function createAudioVisualization(player, visualization) {
  if (typeof Wave === 'undefined') return;

  const waveCanvas = document.createElement('canvas');
  waveCanvas.id = `${player.id}_visualization`;
  waveCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%';
  player.appendChild(waveCanvas);

  let html5Player;
  if (player.youTubeApi) {
    html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');
  } else if (player.hlsPlayer) {
    html5Player = player.hlsPlayer.media;
  } else if (player.originalNode) {
    html5Player = player.originalNode;
  } else {
    html5Player = player;
  }

  if (!html5Player.id) html5Player.id = `${player.id}_html5Player`;
  html5Player.style.visibility = 'hidden';
  if (player.youTubeApi) player.youTubeApi.getIframe().style.visibility = 'hidden';

  const doc = player.youTubeApi ? player.youTubeApi.getIframe().contentWindow.document : document;
  const opts = _audioVisualizations[visualization] || {};
  if (!opts.type) opts.type = visualization || 'cubes';
  opts.skipUserEventsWatcher = true;
  opts.elementDoc = doc;

  const wave = new Wave();
  wave.fromElement(html5Player.id, waveCanvas.id, opts);
}

function initPlayer(id, handle, options) {
  if (typeof MediaElement === 'undefined') {
    console.warn('[engine] MediaElement not available (dev mode?) — skipping player init');
    return null;
  }

  const el = document.createElement('video');
  el.id = id;
  el.src = resolveUrl(options.url);
  document.body.appendChild(el);

  new MediaElement(id, {
    error(media) {
      loading.set(false);
      sendNui('initError', { url: options.url, message: media.error?.message });
      media.remove();
    },
    success(media) {
      media.className = 'pmms-player';
      media.pmms = {
        initialized: false,
        attenuationFactor: options.attenuation?.diffRoom ?? 6,
        volumeFactor: options.diffRoomVolume ?? 0.25,
        filterAdded: false,
        visualizationAdded: false,
      };
      media.volume = 0;
      media.style.display = options.video ? 'block' : 'none';
      media.style.position = 'absolute';
      media.style.transform = 'translate(-50%, -100%)';
      media.style.opacity = '0.9';

      media.addEventListener('error', () => {
        loading.set(false);
        sendNui('playError', { url: options.url, message: media.error?.message });
        if (!media.pmms.initialized) media.remove();
      });

      media.addEventListener('canplay', () => {
        if (media.pmms.initialized) return;
        loading.set(false);

        if (!media.duration || media.duration === Infinity || media.hlsPlayer) {
          options.offset = 0;
          options.duration = false;
          options.loop = false;
        } else {
          options.duration = media.duration;
        }

        if (media.youTubeApi) {
          options.title = media.youTubeApi.getVideoData().title;
          media.videoTracks = { length: 1 };
        } else if (media.hlsPlayer) {
          media.videoTracks = media.hlsPlayer.videoTracks;
        } else {
          media.videoTracks = media.originalNode?.videoTracks;
        }

        sendNui('init', { handle, options });
        media.pmms.initialized = true;
        media.play();
      });

      media.addEventListener('playing', () => {
        if (options.filter && !media.pmms.filterAdded) {
          if (_isRDR) applyPhonographFilter(media);
          else applyRadioFilter(media);
          media.pmms.filterAdded = true;
        }
        if (options.visualization && !media.pmms.visualizationAdded) {
          createAudioVisualization(media, options.visualization);
          media.pmms.visualizationAdded = true;
        }
      });

      media.play();
    },
  });
}

export function getPlayer(handle, options) {
  if (handle == null) return null;
  const id = `pmms_player_${handle}`;
  let player = document.getElementById(id);
  if (!player && options?.url) {
    initPlayer(id, handle, options);
    player = document.getElementById(id);
  }
  return player;
}

export function removePlayer(player) {
  const noise = document.getElementById(`${player.id}_noise`);
  if (noise) noise.remove();
  player.remove();
}

export function engineInit(data) {
  if (!data.options?.url) return;
  loading.set(true);
  data.options.offset = parseTimecode(data.options.offset);
  if (!data.options.title) data.options.title = data.options.url;
  getPlayer(data.handle, data.options);
}

export function enginePlay(handle) {
  getPlayer(handle);
}

export function engineStop(handle) {
  const player = getPlayer(handle);
  if (player) removePlayer(player);
}

function setAttenuationFactor(player, target) {
  if (player.pmms.attenuationFactor > target) player.pmms.attenuationFactor -= 0.1;
  else player.pmms.attenuationFactor += 0.1;
}

function setVolumeFactor(player, target) {
  if (player.pmms.volumeFactor > target) player.pmms.volumeFactor -= 0.01;
  else player.pmms.volumeFactor += 0.01;
}

function setVolumeSlow(player, target) {
  if (Math.abs(player.volume - target) > 0.1) {
    if (player.volume > target) player.volume -= 0.05;
    else player.volume += 0.05;
  }
}

function calculateFocalLength(fov) {
  const x = 43.266615300557;
  const f = (x / 2) * Math.tan((Math.PI * fov) / 360);
  return (1 / f) * 50;
}

export function engineUpdate(data) {
  const player = getPlayer(data.handle, data.options);
  if (!player) return;

  if (data.options.paused || data.distance < 0 || data.distance > data.options.range) {
    if (!player.paused) player.pause();
  } else {
    if (data.sameRoom) {
      setAttenuationFactor(player, data.options.attenuation.sameRoom);
      setVolumeFactor(player, 1.0);
    } else {
      setAttenuationFactor(player, data.options.attenuation.diffRoom);
      setVolumeFactor(player, data.options.diffRoomVolume);
    }

    if (player.readyState > 0) {
      let volume;
      if (data.options.muted || data.volume === 0) {
        volume = 0;
      } else {
        volume =
          (((100 - data.distance * player.pmms.attenuationFactor) / 100) * player.pmms.volumeFactor) *
          (data.volume / 100);
      }

      if (volume > 0) {
        if (data.distance > 100) setVolumeSlow(player, volume);
        else player.volume = volume;
      } else {
        player.volume = 0;
      }

      if (data.options.duration) {
        const currentTime = data.options.offset % player.duration;
        if (Math.abs(currentTime - player.currentTime) > MAX_TIME_DIFFERENCE) {
          player.currentTime = currentTime;
        }
      }

      if (player.paused) player.play();
    }
  }

  if (data.options.video && data.sameRoom && data.camDistance >= 0 && data.distance <= data.options.range) {
    const scale = calculateFocalLength(data.fov) / data.camDistance;
    const width = data.options.videoSize * scale;
    player.style.left = `${data.screenX * 100}%`;
    player.style.top = `${data.screenY * 100}%`;
    player.style.width = `${width}vw`;
    if (player.youTubeApi) player.style.height = `${width * (9 / 16)}vw`;
    player.style.zIndex = String(Math.floor(data.camDistance * -1));
    if (player.style.display === 'none') player.style.display = 'block';
  } else {
    if (player.style.display === 'block') player.style.display = 'none';
  }
}

export function engineReset() {
  document.querySelectorAll('.pmms-player').forEach(removePlayer);
}

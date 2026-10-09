function fakeResponse(data) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function emit(type, extra = {}) {
  window.dispatchEvent(new MessageEvent('message', { data: { type, ...extra } }));
}

export function mockResponse(endpoint, data) {
  console.debug('[PMMS mock] sendNui:', endpoint, data);

  switch (endpoint) {
    case 'startup':
      return fakeResponse({
        isRDR: false,
        defaultSameRoomAttenuation: 4.0,
        defaultDiffRoomAttenuation: 6.0,
        defaultDiffRoomVolume: 0.25,
        defaultRange: 50,
        maxRange: 200,
        defaultVideoSize: 30,
        defaultScaleformName: 'pmms_texture_renderer',
        enableFilterByDefault: false,
        currentServerEndpoint: '127.0.0.1:30120',
        audioVisualizations: {
          cubes: { name: 'Cubes' },
          lines: { name: 'Lines' },
          wave: { name: 'Wave' },
        },
        tooltipsEnabled: true,
      });

    case 'setMediaPlayerDefaults':
      return fakeResponse({
        label: 'Mock Radio',
        filter: true,
        volume: 80,
        attenuation: { sameRoom: 4.0, diffRoom: 6.0 },
        diffRoomVolume: 0.25,
        range: 50,
        isVehicle: false,
        scaleform: null,
      });

    default:
      return fakeResponse({ ok: true });
  }
}

const MOCK_ACTIVE = [
  {
    handle: 101,
    distance: 8,
    label: 'Bar Radio',
    canInteract: true,
    info: {
      url: 'https://example.com/stream.mp3',
      title: 'Jazz FM – Late Night Session',
      offset: 135,
      duration: 3600,
      paused: false,
      loop: true,
      muted: false,
      locked: false,
      video: false,
      videoSize: 30,
      range: 30,
      queue: [],
    },
  },
  {
    handle: 202,
    distance: 22,
    label: 'Street Speaker',
    canInteract: false,
    info: {
      url: 'https://youtu.be/dQw4w9WgXcQ',
      title: 'Rick Astley – Never Gonna Give You Up',
      offset: 47,
      duration: 213,
      paused: false,
      loop: false,
      muted: false,
      locked: true,
      video: false,
      videoSize: 30,
      range: 25,
      queue: [
        { options: { url: 'https://example.com/next.mp3', offset: 0, filter: true, video: false, visualization: null }, name: 'Player 1' },
      ],
    },
  },
];

const MOCK_USABLE = [
  { handle: 101, distance: 8, label: 'Bar Radio', active: true, standaloneScaleform: false, coords: null },
  { handle: 303, distance: 15, label: 'Boombox', active: false, standaloneScaleform: false, coords: null },
  { handle: 404, distance: 28, label: 'TV Screen', active: false, standaloneScaleform: false, coords: null },
];

const MOCK_PRESETS = {
  'https://stream.example.com/jazz': { title: 'Jazz FM', video: false },
  'https://stream.example.com/pop': { title: 'Pop Hits', video: false },
};

export function startMock() {
  setTimeout(() => {
    emit('showUi');
    emitUpdateUi();
  }, 300);
  let tick = 0;
  setInterval(() => {
    tick++;
    MOCK_ACTIVE[0].info.offset = (MOCK_ACTIVE[0].info.offset + 1) % MOCK_ACTIVE[0].info.duration;
    MOCK_ACTIVE[1].info.offset = (MOCK_ACTIVE[1].info.offset + 1) % MOCK_ACTIVE[1].info.duration;
    emitUpdateUi();
  }, 1000);

  setTimeout(() => {
    emit('showNotification', {
      args: { title: 'PMMS', text: 'Dev mock started successfully', duration: 4000 },
    });
  }, 3000);
}

function emitUpdateUi() {
  emit('updateUi', {
    uiIsOpen: true,
    activeMediaPlayers: JSON.stringify(MOCK_ACTIVE),
    usableMediaPlayers: JSON.stringify(MOCK_USABLE),
    presets: JSON.stringify(MOCK_PRESETS),
    maxDiscoveryDistance: 30,
    permissions: {
      interact: true,
      anyEntity: false,
      customUrl: true,
      anyUrl: true,
      manage: true,
    },
    baseVolume: 75,
  });
}

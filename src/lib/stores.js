import { writable } from 'svelte/store';

export const uiOpen = writable(false);
export const statusOpen = writable(false);

export const activeMediaPlayers = writable([]);
export const usableMediaPlayers = writable([]);
export const presets = writable({});
export const permissions = writable({
  interact: false,
  anyEntity: false,
  customUrl: false,
  anyUrl: false,
  manage: false,
});
export const baseVolume = writable(100);
export const maxDiscoveryDistance = writable(30);

export const isRDR = writable(false);
export const config = writable({
  defaultSameRoomAttenuation: 4.0,
  defaultDiffRoomAttenuation: 6.0,
  defaultDiffRoomVolume: 0.25,
  defaultRange: 50,
  maxRange: 200,
  defaultVideoSize: 30,
  defaultScaleformName: 'pmms_texture_renderer',
  enableFilterByDefault: false,
  audioVisualizations: {},
  tooltipsEnabled: true,
});

export const notifications = writable([]);

let _notifId = 0;
export function pushNotification({ title = '', text = '', color = '', duration = 4000 }) {
  const id = ++_notifId;
  notifications.update(n => [...n, { id, title, text, color }]);
  setTimeout(() => {
    notifications.update(n => n.filter(x => x.id !== id));
  }, duration);
}

export const loading = writable(false);

import { writable, derived, get } from 'svelte/store';

// Converts a locale value to the string the tooltip action expects.
// Plain strings pass through unchanged.
// Objects { title?, body } build styled HTML:
//   - title → .tooltip-title div
//   - body (string or string[]) → .tooltip-para divs
//   - `backtick` spans in body → .literal spans
function buildTooltip(val) {
  if (typeof val !== 'object' || val === null) return String(val ?? '');
  let html = '';
  if (val.title) html += `<div class='tooltip-title'>${val.title}</div>`;
  const paras = Array.isArray(val.body) ? val.body : val.body ? [val.body] : [];
  for (const para of paras) {
    const content = para.replace(/`([^`]+)`/g, "<span class='literal'>$1</span>");
    html += `<div class='tooltip-para'>${content}</div>`;
  }
  return html;
}

const defaults = {
  // CoreUI
  panel_title: 'Media Player',
  close: 'Close',
  select_player: 'Choose a player...',
  url_placeholder: 'Enter media URL...',
  loop: 'Loop',
  radio_filter: 'Radio filter',
  mute: 'Mute',
  unmute: 'Unmute',
  lock: 'Lock',
  unlock: 'Unlock',
  video: 'Video',
  advanced_settings: 'Advanced Settings',
  play_btn: 'Play',
  move: 'Move',
  // ActivePlayerCard
  resume: 'Resume',
  pause: 'Pause',
  stop: 'Stop',
  next_in_queue: 'Next in queue',
  copy_url: 'Copy URL',
  decrease_video_size: 'Decrease video size',
  increase_video_size: 'Increase video size',
  copy_to_player: 'Copy to selected player',
  queue_label: 'Queue',
  remove_from_queue: 'Remove from queue',
  url_copied: 'URL copied!',
  // AdvancedPanel
  back: 'Back',
  adv_title: 'Advanced Settings',
  section_playback: 'Playback',
  section_attenuation: 'Attenuation',
  section_options: 'Options',
  section_scaleform: 'Scaleform',
  section_save: 'Save',
  tooltip_offset: {
    title: 'Start time',
    body: [
      'Time at which the media will start.',
      'In seconds (e.g. `120`) or hh:mm:ss (e.g. `00:02:00`).',
    ],
  },
  tooltip_offset_short: 'Start (hh:mm:ss)',
  tooltip_volume: 'Volume (%)',
  tooltip_range: {
    title: 'Range',
    body: 'Maximum distance (in meters) at which the player is visible/audible.',
  },
  tooltip_range_short: 'Range (m)',
  tooltip_same_room: {
    title: 'Attenuation (same room)',
    body: [
      'Rate at which sound fades when moving away within the same room.',
      'A value of `0` means no decrease.',
    ],
  },
  tooltip_diff_room: {
    title: 'Attenuation (different room)',
    body: [
      'Rate at which sound fades when moving away in a different room.',
      'A value of `0` means no decrease.',
    ],
  },
  tooltip_diff_room_vol: {
    title: 'Volume (different room)',
    body: [
      "Ratio by which the player's base volume is reduced when in a different room.",
      'A value of `1` means the volume stays the same.',
    ],
  },
  tooltip_vehicle_mode: {
    title: 'Vehicle mode',
    body: 'If enabled, the entity is a vehicle: the interior counts as the same room, the exterior as different.',
  },
  tooltip_enable_scaleform: {
    title: 'Enable Scaleform',
    body: "Play media on a scaleform instead of an object's render target.",
  },
  tooltip_scaleform_name: 'Scaleform name',
  tooltip_use_my_pos: 'Use my position',
  tooltip_use_entity_pos: "Use entity's position",
  tooltip_attached: 'Attached to entity',
  video_size: 'Video size',
  visualization: 'Visualization',
  no_visualization: 'None',
  scale_label: 'Sca',
  tooltip_label: 'Label',
  label_placeholder: 'Label...',
  save_method_title: 'Save method:',
  save_server_model: 'Server model',
  save_server_entity: 'Server entity',
  save_new: 'New',
  new_model_title: 'New model:',
  model_placeholder: 'Model...',
  save_btn: 'Save',
  delete_by_title: 'Delete by:',
  delete_model: 'Model',
  delete_entity: 'Entity',
  tooltip_save: 'Save',
  tooltip_delete: 'Delete',
  tooltip_revert: 'Reset settings',
  tooltip_fix: 'Fix players',
  tooltip_toggle_status: 'Show/hide status bar',
  tooltip_restore_pos: 'Reset interface position',
};

const _locale = writable(defaults);

export async function loadLocale() {
  try {
    const resp = await fetch('./locale.json');
    if (!resp.ok) return;
    const data = await resp.json();
    _locale.update(d => ({ ...d, ...data }));
  } catch {}
}

// Reactive store for use in Svelte templates: $t('key')
export const t = derived(_locale, $l => key => buildTooltip($l[key] ?? key));

// Synchronous helper for use inside JS functions
export function tr(key) {
  return buildTooltip(get(_locale)[key] ?? key);
}

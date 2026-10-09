<script>
  import { permissions, loading } from "../lib/stores.js";
  import { sendNui } from "../lib/nui.js";
  import { tooltip } from "../lib/tooltip.js";
  import { timeToString, getPlayer } from "../lib/engine.js";
  import { t, tr } from "../lib/locale.js";

  export let player;
  export let selectedHandle = "";

  $: p = player ?? {};
  $: info = p.info ?? {};
  $: perms = $permissions;

  $: canInteract = p.canInteract && (!info.locked || perms.manage);
  $: canSeek = canInteract && !!info.duration;
  $: hasQueue = (info.queue ?? []).length > 0;

  let scrubbing = false;
  let scrubValue = 0;

  $: if (!scrubbing) scrubValue = info.offset ?? 0;

  $: currentTime = (() => {
    if (scrubbing) return scrubValue;
    const el = getPlayer(p.handle);
    return el ? el.currentTime : (info.offset ?? 0);
  })();

  function onSliderInput(e) {
    scrubbing = true;
    scrubValue = parseFloat(e.target.value);
  }

  function onSliderChange(e) {
    const val = parseFloat(e.target.value);
    const el = getPlayer(p.handle);
    if (el) el.currentTime = val;
    sendNui("seekToTime", { handle: p.handle, offset: val });
    scrubbing = false;
  }

  function copyUrl() {
    try {
      const el = document.createElement("textarea");
      el.textContent = info.url ?? "";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    } catch {}
    sendNui("notify", { text: tr('url_copied') });
  }

  function copyToPlayer() {
    const target = parseInt(selectedHandle);
    if (!isNaN(target)) {
      sendNui("copy", { oldHandle: p.handle, newHandle: target });
    }
  }

  function removeFromQueue(index) {
    loading.set(true);
    sendNui("removeFromQueue", { handle: p.handle, index: index + 1 });
  }

  function wrappedSend(endpoint, data = {}) {
    loading.set(true);
    sendNui(endpoint, data);
  }
</script>

{#if info && p.handle != null}
  <div class="active-player">
    <div class="row-header">
      <div class="title-wrap">
        <span class="player-label">{p.label || p.handle}</span>
        {#if p.distance >= 0}
          <span class="distance">{Math.floor(p.distance)}m</span>
        {/if}
        <span class="player-title">{info.title ?? ""}</span>
      </div>
      <div class="ctrl-group">
        <button
          class="btn-xs"
          disabled={!canSeek || $loading}
          on:click={() => wrappedSend("pause", { handle: p.handle })}
          use:tooltip={$t(info.paused ? 'resume' : 'pause')}
          ><i class="fas {info.paused ? 'fa-play' : 'fa-pause'}"></i></button
        >
        <button
          class="btn-xs red"
          disabled={!canInteract || $loading}
          on:click={() => wrappedSend("stop", { handle: p.handle })}
          use:tooltip={$t('stop')}><i class="fas fa-stop"></i></button
        >
      </div>
    </div>

    <div class="row-seek">
      <button
        class="btn-xxs"
        disabled={!canSeek || $loading}
        on:click={() => wrappedSend("seekBackward", { handle: p.handle })}
        use:tooltip={"-10s"}><i class="fas fa-backward"></i></button
      >

      <div class="seek-group">
        {#if info.duration}
          <span class="time-compact"
            >{timeToString(currentTime)} / {timeToString(info.duration)}</span
          >
          <input
            class="seek-slider"
            type="range"
            min="0"
            max={info.duration}
            step="1"
            value={scrubbing ? scrubValue : currentTime}
            disabled={!canSeek || $loading}
            on:input={onSliderInput}
            on:change={onSliderChange}
          />
        {:else}
          <span class="time-compact">Live</span>
        {/if}
      </div>

      <button
        class="btn-xxs"
        disabled={!canSeek || $loading}
        on:click={() => wrappedSend("seekForward", { handle: p.handle })}
        use:tooltip={"+10s"}><i class="fas fa-forward"></i></button
      >

      <button
        class="btn-xxs"
        disabled={!hasQueue || !canInteract || $loading}
        on:click={() => wrappedSend("next", { handle: p.handle })}
        use:tooltip={$t('next_in_queue')}><i class="fas fa-step-forward"></i></button
      >
    </div>

    <div class="row-toggles">
      <div class="toggle-group">
        {#if perms.manage}
          <button
            class="btn-xxs"
            class:active={info.locked}
            disabled={$loading}
            on:click={() =>
              wrappedSend(info.locked ? "unlock" : "lock", {
                handle: p.handle,
              })}
            use:tooltip={$t(info.locked ? 'unlock' : 'lock')}
            ><i class="fas {info.locked ? 'fa-lock' : 'fa-lock-open'}"
            ></i></button
          >
        {/if}
        <button class="btn-xxs" on:click={copyUrl} use:tooltip={$t('copy_url')}>
          <i class="fas fa-link"></i>
        </button>
        <button
          class="btn-xxs"
          class:active={info.loop}
          disabled={!canSeek || $loading}
          on:click={() =>
            wrappedSend("setLoop", { handle: p.handle, loop: !info.loop })}
          use:tooltip={$t('loop')}><i class="fas fa-redo"></i></button
        >
        <button
          class="btn-xxs"
          class:active={info.video}
          disabled={!canInteract || $loading}
          on:click={() =>
            wrappedSend(info.video ? "disableVideo" : "enableVideo", {
              handle: p.handle,
            })}
          use:tooltip={$t('video')}><i class="fas fa-video"></i></button
        >
        <button
          class="btn-xxs"
          class:active={info.muted}
          disabled={!canInteract || $loading}
          on:click={() =>
            wrappedSend(info.muted ? "unmute" : "mute", { handle: p.handle })}
          use:tooltip={$t(info.muted ? 'unmute' : 'mute')}
          ><i class="fas {info.muted ? 'fa-volume-mute' : 'fa-volume-up'}"
          ></i></button
        >
      </div>

      <div class="right-group">
        {#if info.video}
          <button
            class="btn-xxs"
            disabled={!canInteract}
            on:click={() => sendNui("decreaseVideoSize", { handle: p.handle })}
            use:tooltip={$t('decrease_video_size')}><i class="fas fa-minus"></i></button
          >
          <span class="video-size">{info.videoSize ?? 30}</span>
          <button
            class="btn-xxs"
            disabled={!canInteract}
            on:click={() => sendNui("increaseVideoSize", { handle: p.handle })}
            use:tooltip={$t('increase_video_size')}><i class="fas fa-plus"></i></button
          >
        {/if}

        <button
          class="btn-xxs"
          disabled={!canInteract || !selectedHandle || $loading}
          on:click={() => {
            loading.set(true);
            copyToPlayer();
          }}
          use:tooltip={$t('copy_to_player')}
          ><i class="fas fa-clone"></i></button
        >
      </div>
    </div>

    {#if hasQueue}
      <div class="queue">
        <span class="queue-label">{$t('queue_label')} ({info.queue.length})</span>
        {#each info.queue as entry, i}
          <div class="queue-row">
            <span class="queue-url" use:tooltip={entry.options?.url}
              >{(entry.options?.title
                ? entry.options.title
                : entry.options?.url
              ).slice(0, 35)}</span
            >
            <span class="queue-by">{entry.name ?? ""}</span>
            <button
              class="btn-xxs red"
              disabled={$loading}
              on:click={() => removeFromQueue(i)}
              use:tooltip={$t('remove_from_queue')}><i class="fas fa-times"></i></button
            >
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .active-player {
    padding: 0.8vh 1vw;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    gap: 0.5vh;
  }

  .row-header,
  .row-seek,
  .row-toggles {
    display: flex;
    align-items: center;
    gap: 0.4vw;
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 0.4vw;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  .player-label {
    font-weight: 700;
    font-size: 1.2vh;
    color: #fff;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .distance {
    font-size: 1vh;
    color: rgba(255, 255, 255, 0.4);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .player-title {
    font-size: 1.2vh;
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ctrl-group {
    display: flex;
    gap: 0.25vw;
    flex-shrink: 0;
  }

  .seek-group {
    display: flex;
    align-items: center;
    gap: 0.4vw;
    flex: 1;
    min-width: 0;
  }
  .time-compact {
    font-family: monospace;
    font-size: 1.1vh;
    color: rgba(255, 255, 255, 0.6);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .seek-slider {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 0.4vh;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  .seek-slider:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .seek-slider::-webkit-slider-runnable-track {
    height: 0.4vh;
  }
  .seek-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 1vh;
    height: 1vh;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    margin-top: -0.3vh;
  }

  .toggle-group {
    display: flex;
    gap: 0.25vw;
  }
  .right-group {
    display: flex;
    align-items: center;
    gap: 0.25vw;
    margin-left: auto;
  }
  .video-size {
    font-size: 1.1vh;
    color: rgba(255, 255, 255, 0.7);
    min-width: 1.8vw;
    text-align: center;
  }

  .queue {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 0.4vh;
    display: flex;
    flex-direction: column;
    gap: 0.3vh;
  }
  .queue-label {
    font-size: 1vh;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .queue-row {
    display: flex;
    align-items: center;
    gap: 0.4vw;
    font-size: 1.1vh;
  }
  .queue-url {
    flex: 1;
    color: rgba(255, 255, 255, 0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .queue-by {
    color: rgba(255, 255, 255, 0.3);
    white-space: nowrap;
    flex-shrink: 0;
  }

  button {
    appearance: none;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition:
      background 0.15s,
      border-color 0.15s;
    flex-shrink: 0;
  }
  button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.3);
  }
  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  button.active {
    background: #5e6cb6;
    border-color: #5e6cb6;
  }
  button.red {
    color: #ff5252;
  }
  button.red:hover:not(:disabled) {
    background: rgba(255, 82, 82, 0.2);
  }

  .btn-xs {
    width: 2.6vh;
    height: 2.6vh;
    font-size: 1.1vh;
  }
  .btn-xxs {
    width: 2.2vh;
    height: 2.2vh;
    font-size: 1vh;
  }
</style>

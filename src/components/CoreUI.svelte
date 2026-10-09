<script>
  import { createEventDispatcher, onMount } from "svelte";
  import ActivePlayerCard from "./ActivePlayerCard.svelte";
  import AdvancedPanel from "./AdvancedPanel.svelte";
  import { tooltip } from "../lib/tooltip.js";
  import { sendNui } from "../lib/nui.js";
  import { t } from "../lib/locale.js";
  import {
    activeMediaPlayers,
    usableMediaPlayers,
    permissions,
    baseVolume,
    config,
    isRDR,
    loading,
  } from "../lib/stores.js";

  const dispatch = createEventDispatcher();

  let view = "basic";

  let selectedHandle = "";
  let customUrl = "";
  let loop = false;
  let filter = false;
  let muted = false;

  let offset = "00:00:00";
  let sameRoomAttenuation = 4.0;
  let diffRoomAttenuation = 6.0;
  let diffRoomVolume = 0.25;
  let range = 50;
  let volume = 100;
  let isVehicle = false;
  let locked = false;
  let video = false;
  let videoSize = 30;
  let visualization = "";
  let saveLabel = "";

  let scaleformEnabled = false;
  let scaleformName = "pmms_texture_renderer";
  let scaleformPosX = 0,
    scaleformPosY = 0,
    scaleformPosZ = 0;
  let scaleformRotX = 0,
    scaleformRotY = 0,
    scaleformRotZ = 0;
  let scaleformScaleX = 0.1,
    scaleformScaleY = 0.05,
    scaleformScaleZ = 0;
  let scaleformAttached = false;

  $: cfg = $config;
  $: rdr = $isRDR;
  $: perms = $permissions;
  $: players = scaleformEnabled
    ? [
        {
          handle: "scaleform",
          label: "Scaleform",
          distance: 0,
          active: false,
          standaloneScaleform: true,
        },
        ...$usableMediaPlayers,
      ]
    : $usableMediaPlayers;
  $: activePlayers = $activeMediaPlayers;

  $: if (!scaleformEnabled && selectedHandle === "scaleform") {
    selectedHandle = "";
  }
  let initialized = false;
  $: if (cfg && Object.keys(cfg).length > 0 && !initialized) {
    if (cfg.defaultSameRoomAttenuation)
      sameRoomAttenuation = cfg.defaultSameRoomAttenuation;
    if (cfg.defaultDiffRoomAttenuation)
      diffRoomAttenuation = cfg.defaultDiffRoomAttenuation;
    if (cfg.defaultDiffRoomVolume) diffRoomVolume = cfg.defaultDiffRoomVolume;
    if (cfg.defaultRange) range = cfg.defaultRange;
    if (cfg.defaultVideoSize) videoSize = cfg.defaultVideoSize;
    filter = cfg.enableFilterByDefault ?? false;
    initialized = true;
  }

  $: canInteract = perms.interact && players.length > 0;
  $: canPlay = canInteract && selectedHandle !== "" && customUrl !== "";

  async function onPlayerChange() {
    if (!selectedHandle || selectedHandle === "scaleform") return;
    try {
      const resp = await sendNui("setMediaPlayerDefaults", {
        handle: parseInt(selectedHandle),
      });
      const d = await resp.json();
      if (d.label !== undefined) saveLabel = d.label || "";
      if (d.filter !== undefined) filter = d.filter;
      if (d.volume) volume = d.volume;
      else volume = 100;
      if (d.range) range = d.range;
      if (d.attenuation) {
        sameRoomAttenuation = d.attenuation.sameRoom;
        diffRoomAttenuation = d.attenuation.diffRoom;
      }
      if (d.diffRoomVolume) diffRoomVolume = d.diffRoomVolume;
      if (d.isVehicle !== undefined) isVehicle = d.isVehicle;
      if (d.scaleform) {
        try {
          const sf =
            typeof d.scaleform === "string"
              ? JSON.parse(d.scaleform)
              : d.scaleform;
          scaleformEnabled = true;
          scaleformName = sf.name || "";
          scaleformPosX = sf.position?.x ?? 0;
          scaleformPosY = sf.position?.y ?? 0;
          scaleformPosZ = sf.position?.z ?? 0;
          scaleformRotX = sf.rotation?.x ?? 0;
          scaleformRotY = sf.rotation?.y ?? 0;
          scaleformRotZ = sf.rotation?.z ?? 0;
          scaleformScaleX = sf.scale?.x ?? 0;
          scaleformScaleY = sf.scale?.y ?? 0;
          scaleformScaleZ = sf.scale?.z ?? 0;
          scaleformAttached = sf.attached ?? false;
        } catch {}
      } else {
        scaleformEnabled = false;
      }
    } catch {}
  }

  function getScaleform(standaloneScaleform = false) {
    if (!scaleformEnabled && !standaloneScaleform) return undefined;
    return {
      name: scaleformName || null,
      position: {
        x: parseFloat(scaleformPosX) || 0,
        y: parseFloat(scaleformPosY) || 0,
        z: parseFloat(scaleformPosZ) || 0,
      },
      rotation: {
        x: parseFloat(scaleformRotX) || 0,
        y: parseFloat(scaleformRotY) || 0,
        z: parseFloat(scaleformRotZ) || 0,
      },
      scale: {
        x: parseFloat(scaleformScaleX) || 0,
        y: parseFloat(scaleformScaleY) || 0,
        z: parseFloat(scaleformScaleZ) || 0,
      },
      standalone: standaloneScaleform,
      attached: scaleformAttached,
    };
  }

  function play() {
    if (!canPlay) return;
    loading.set(true);
    const selectedPlayer = players.find((p) => p.handle == selectedHandle);
    const standaloneScaleform =
      selectedHandle === "scaleform" ||
      (selectedPlayer?.standaloneScaleform ?? false);
    const handle = standaloneScaleform ? null : parseInt(selectedHandle);

    const vis = visualization || null;

    sendNui("play", {
      handle,
      options: {
        url: customUrl,
        volume: parseInt(volume) || 100,
        offset,
        loop,
        filter: vis ? false : filter,
        locked,
        video: vis ? true : video,
        videoSize: parseInt(videoSize) || cfg.defaultVideoSize,
        muted,
        attenuation: {
          sameRoom: parseFloat(sameRoomAttenuation),
          diffRoom: parseFloat(diffRoomAttenuation),
        },
        diffRoomVolume: parseFloat(diffRoomVolume),
        range: parseFloat(range),
        visualization: vis,
        isVehicle,
        scaleform: getScaleform(standaloneScaleform),
      },
    });
  }

  function onKey(e) {
    if (e.key === "Enter") play();
  }

  let uiEl;

  function makeDraggable(element, handle) {
    if (!element || !handle) return;
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;

    handle.addEventListener("mousedown", startDrag);

    function startDrag(e) {
      if (e.target.closest("button, input, select")) return;
      e.preventDefault();

      const cs = window.getComputedStyle(element);
      if (cs.transform && cs.transform !== "none") {
        const rect = element.getBoundingClientRect();
        element.style.transform = "none";
        element.style.top = rect.top + "px";
        element.style.left = rect.left + "px";
      }

      pos3 = e.clientX;
      pos4 = e.clientY;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }

    function onMove(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = element.offsetTop - pos2 + "px";
      element.style.left = element.offsetLeft - pos1 + "px";
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      // Save position
      localStorage.setItem(
        "pmms-ui-pos",
        JSON.stringify({
          top: element.style.top,
          left: element.style.left,
        }),
      );
    }
  }

  onMount(() => {
    // Load position
    const savedPos = localStorage.getItem("pmms-ui-pos");
    if (savedPos && uiEl) {
      try {
        const pos = JSON.parse(savedPos);
        uiEl.style.top = pos.top;
        uiEl.style.left = pos.left;
        uiEl.style.transform = "none";
      } catch (e) {
        localStorage.removeItem("pmms-ui-pos");
      }
    }

    const header = uiEl?.querySelector(".panel-header");
    if (uiEl && header) makeDraggable(uiEl, header);

    uiEl
      ?.querySelectorAll(".drag-icon-handle")
      .forEach((icon) => makeDraggable(uiEl, icon));

    function onMsg(e) {
      if (e.data?.type === "restoreUiPosition") restorePosition();
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  });

  function restorePosition() {
    if (!uiEl) return;
    uiEl.style.top = "50vh";
    uiEl.style.left = "50vw";
    uiEl.style.transform = "translate(-50%, -50%)";
    localStorage.removeItem("pmms-ui-pos");
  }
</script>

<div id="pmms-ui" bind:this={uiEl}>
  {#if activePlayers.length > 0}
    <div class="active-players-container">
      {#each activePlayers as mp (mp.handle)}
        <ActivePlayerCard player={mp} {selectedHandle} />
      {/each}
    </div>
  {/if}

  <div class="main-panel">
    <div class="panel-header">
      <span class="panel-title">{$t('panel_title')}</span>
      {#if $loading}
        <span class="loading-dot"></span>
      {/if}
      <button
        class="btn-close"
        on:click={() => dispatch("close")}
        use:tooltip={$t('close')}
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    {#if view === "basic"}
      <div class="view-basic">
        <div class="form-row">
          <select
            class="input-modern"
            bind:value={selectedHandle}
            on:change={onPlayerChange}
            disabled={!canInteract || $loading}
          >
            <option value="">{$t('select_player')}</option>
            {#each players as p}
              <option value={p.handle}>
                {p.active ? "● " : ""}{p.label || p.handle} ({Math.floor(
                  p.distance,
                )}m)
              </option>
            {/each}
          </select>
        </div>

        {#if perms.customUrl}
          <div class="form-row">
            <input
              class="input-modern"
              type="text"
              bind:value={customUrl}
              on:keydown={onKey}
              placeholder={$t('url_placeholder')}
              disabled={!canInteract || $loading}
            />
          </div>
        {/if}

        <div class="footer-row">
          <div class="quick-toggles">
            <div class="toggle-wrap">
              <input
                id="toggle-loop"
                type="checkbox"
                bind:checked={loop}
                disabled={!canInteract || $loading}
              />
              <label
                for="toggle-loop"
                use:tooltip={$t('loop')}
                class:disabled={!canInteract || $loading}
              >
                <i class="fas fa-redo"></i>
              </label>
            </div>

            {#if perms.customUrl}
              <div class="toggle-wrap">
                <input
                  id="toggle-filter"
                  type="checkbox"
                  bind:checked={filter}
                  disabled={!canInteract || $loading}
                />
                <label
                  for="toggle-filter"
                  use:tooltip={$t('radio_filter')}
                  class:disabled={!canInteract || $loading}
                >
                  <i class="fas fa-filter"></i>
                </label>
              </div>
            {/if}

            <div class="toggle-wrap">
              <input
                id="toggle-muted"
                type="checkbox"
                bind:checked={muted}
                disabled={!canInteract || $loading}
              />
              <label
                for="toggle-muted"
                use:tooltip={$t('mute')}
                class:disabled={!canInteract || $loading}
              >
                <i class="fas fa-volume-mute"></i>
              </label>
            </div>

            {#if perms.manage}
              <div class="toggle-wrap">
                <input
                  id="toggle-locked"
                  type="checkbox"
                  bind:checked={locked}
                  disabled={!canInteract || $loading}
                />
                <label
                  for="toggle-locked"
                  use:tooltip={$t('lock')}
                  class:disabled={!canInteract || $loading}
                >
                  <i class="fas fa-lock"></i>
                </label>
              </div>
            {/if}

            {#if rdr}
              <div class="toggle-wrap">
                <input
                  id="toggle-video"
                  type="checkbox"
                  bind:checked={video}
                  disabled={!canInteract || $loading}
                />
                <label
                  for="toggle-video"
                  use:tooltip={$t('video')}
                  class:disabled={!canInteract || $loading}
                >
                  <i class="fas fa-video"></i>
                </label>
              </div>
            {/if}
          </div>

          <button
            class="btn-secondary"
            on:click={() => (view = "advanced")}
            disabled={$loading}
            use:tooltip={$t('advanced_settings')}
          >
            <i class="fas fa-cog"></i>
          </button>

          <button
            class="btn-primary"
            disabled={!canPlay || $loading}
            on:click={play}
          >
            <i class="fas fa-play"></i>
            <span class="ml-sm">{$t('play_btn')}</span>
          </button>

          <div class="spacer"></div>

          <div class="drag-icon-handle drag-icon" use:tooltip={$t('move')}>
            <i class="fas fa-up-down-left-right"></i>
          </div>
        </div>
      </div>
    {:else}
      <AdvancedPanel
        handle={selectedHandle}
        bind:offset
        bind:filter
        bind:sameRoomAttenuation
        bind:diffRoomAttenuation
        bind:diffRoomVolume
        bind:range
        bind:volume
        bind:isVehicle
        bind:locked
        bind:video
        bind:videoSize
        bind:visualization
        bind:saveLabel
        bind:scaleformEnabled
        bind:scaleformName
        bind:scaleformPosX
        bind:scaleformPosY
        bind:scaleformPosZ
        bind:scaleformRotX
        bind:scaleformRotY
        bind:scaleformRotZ
        bind:scaleformScaleX
        bind:scaleformScaleY
        bind:scaleformScaleZ
        bind:scaleformAttached
        on:back={() => (view = "basic")}
        on:restorePosition={restorePosition}
      />
    {/if}
  </div>

  <div class="volume-bar">
    <i class="fas fa-headphones vol-icon"></i>
    <div class="vol-slider-wrap">
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={$baseVolume}
        on:input={(e) =>
          sendNui("setBaseVolume", { volume: parseInt(e.target.value) })}
      />
    </div>
    <div class="vol-value">{$baseVolume}%</div>
  </div>
</div>

<style>
  #pmms-ui {
    position: absolute;
    top: 50vh;
    left: 50vw;
    transform: translate(-50%, -50%);
    width: 32vw;
    display: flex;
    flex-direction: column;
    gap: 1vh;
    pointer-events: auto;
    font-family: "Lato", sans-serif;
    color: white;
    user-select: none;
  }

  .active-players-container {
    display: flex;
    flex-direction: column;
    gap: 0.8vh;
    max-height: 25vh;
    overflow-y: auto;
  }
  .active-players-container::-webkit-scrollbar {
    width: 4px;
  }
  .active-players-container::-webkit-scrollbar-track {
    background: transparent;
  }
  .active-players-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  .main-panel {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 5px;
    padding: 1.2vh 1vw;
    display: flex;
    flex-direction: column;
    gap: 1.2vh;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: grab;
  }
  .panel-header:active {
    cursor: grabbing;
  }

  .panel-title {
    font-size: 1.1vh;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1vw;
    color: rgba(255, 255, 255, 0.7);
  }

  .loading-dot {
    width: 0.8vh;
    height: 0.8vh;
    background: #5e6cb6;
    border-radius: 50%;
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .btn-close {
    width: 2.4vh;
    height: 2.4vh;
    font-size: 1.2vh;
    color: rgba(255, 255, 255, 0.4);
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition:
      color 0.2s,
      background 0.2s;
    font-family: inherit;
  }
  .btn-close:hover {
    color: #ff5252;
    background: rgba(255, 255, 255, 0.05);
  }

  .view-basic {
    display: flex;
    flex-direction: column;
    gap: 1.2vh;
  }

  .form-row {
    display: flex;
    width: 100%;
  }

  .input-modern {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    border: none;
    border-radius: 5px;
    padding: 1vh 0.8vw;
    font-size: 1.5vh;
    color: white;
    font-family: "Lato", sans-serif;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    transition: border-color 0.2s;
  }
  .input-modern::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  .input-modern:focus {
    border-color: #5e6cb6;
    background: rgba(0, 0, 0, 0.5);
  }
  .input-modern:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .input-modern option {
    background: #111;
  }

  .footer-row {
    display: flex;
    align-items: center;
    gap: 0.8vw;
  }

  .quick-toggles {
    display: flex;
    gap: 0.5vw;
  }

  .toggle-wrap {
    position: relative;
  }
  .toggle-wrap input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .toggle-wrap label {
    width: 3.8vh;
    height: 3.8vh;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 1.3vh;
    transition:
      background 0.2s,
      border-color 0.2s,
      color 0.2s;
  }
  .toggle-wrap input:checked + label {
    background: #5e6cb6;
    border-color: #5e6cb6;
    color: white;
  }
  .toggle-wrap label.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 5px;
    color: white;
    font-family: inherit;
    cursor: pointer;
    padding: 0 1vw;
    height: 3.8vh;
    font-size: 1.3vh;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .btn-primary {
    background: #5e6cb6;
    border: none;
    border-radius: 5px;
    color: white;
    font-family: "Lato", sans-serif;
    font-weight: 700;
    font-size: 1.4vh;
    cursor: pointer;
    padding: 0 1.5vw;
    height: 3.8vh;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .btn-primary:hover:not(:disabled) {
    background: #7a89d6;
  }
  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ml-sm {
    margin-left: 0.4vw;
  }
  .spacer {
    flex: 1;
  }

  .drag-icon {
    width: 4.5vh;
    height: 4.5vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: grab;
    opacity: 0.5;
    transition:
      opacity 0.2s,
      background 0.2s;
    border-radius: 50%;
    font-size: 1.6vh;
  }
  .drag-icon:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.05);
  }
  .drag-icon:active {
    cursor: grabbing;
  }

  .volume-bar {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 5px;
    padding: 1vh 1.4vw;
    display: flex;
    align-items: center;
    gap: 1.2vw;
  }

  .vol-icon {
    color: white;
    font-size: 1.8vh;
    flex-shrink: 0;
  }

  .vol-slider-wrap {
    flex: 1;
    display: flex;
    align-items: center;
  }
  .vol-slider-wrap input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    background: transparent;
    outline: none;
    cursor: pointer;
  }
  .vol-slider-wrap input[type="range"]::-webkit-slider-runnable-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }
  .vol-slider-wrap input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    margin-top: -6px;
  }

  .vol-value {
    font-size: 1.5vh;
    color: white;
    font-weight: 700;
    min-width: 3vw;
    text-align: right;
    flex-shrink: 0;
  }
</style>

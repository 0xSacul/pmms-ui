<script>
  import { createEventDispatcher } from "svelte";
  import { sendNui } from "../lib/nui.js";
  import {
    config,
    permissions,
    statusOpen,
    loading,
    activeMediaPlayers,
  } from "../lib/stores.js";
  import { tooltip } from "../lib/tooltip.js";
  import { t } from "../lib/locale.js";

  const dispatch = createEventDispatcher();

  export let handle = "";

  export let offset = "00:00:00";
  export let filter = false;
  export let sameRoomAttenuation = 4.0;
  export let diffRoomAttenuation = 6.0;
  export let diffRoomVolume = 0.25;
  export let range = 50;
  export let volume = 100;
  export let isVehicle = false;
  export let locked = false;
  export let video = false;
  export let videoSize = 30;
  export let visualization = "";
  export let saveLabel = "";

  export let scaleformEnabled = false;
  export let scaleformName = "pmms_texture_renderer";
  export let scaleformPosX = 0;
  export let scaleformPosY = 0;
  export let scaleformPosZ = 0;
  export let scaleformRotX = 0;
  export let scaleformRotY = 0;
  export let scaleformRotZ = 0;
  export let scaleformScaleX = 0.1;
  export let scaleformScaleY = 0.05;
  export let scaleformScaleZ = 0;
  export let scaleformAttached = false;

  $: cfg = $config;
  $: perms = $permissions;

  let showSave = false;
  let showDelete = false;
  let newModelMode = false;
  let saveModel = "";
  let saveRenderTarget = "";

  function getScaleformPayload() {
    if (!scaleformEnabled) return undefined;
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
      standalone: handle === "scaleform",
      attached: scaleformAttached,
    };
  }

  function doSave(method) {
    if (!handle) return;
    loading.set(true);
    sendNui("save", {
      handle: currentHandle,
      method,
      model: method === "add-new" ? saveModel || null : undefined,
      renderTarget: method === "add-new" ? saveRenderTarget || null : undefined,
      label: saveLabel,
      filter,
      volume: parseInt(volume),
      attenuation: {
        sameRoom: parseFloat(sameRoomAttenuation),
        diffRoom: parseFloat(diffRoomAttenuation),
      },
      diffRoomVolume: parseFloat(diffRoomVolume),
      range: parseFloat(range),
      isVehicle,
      scaleform: getScaleformPayload(),
    });
    showSave = false;
  }

  function doDelete(method) {
    if (!handle) return;
    loading.set(true);
    sendNui("delete", { handle: currentHandle, method });
    showDelete = false;
  }

  function fix() {
    loading.set(true);
    sendNui("fix", {});
  }
  function revert() {
    loading.set(true);
    sendNui("revertSettings", {});
  }
  function restorePos() {
    dispatch("restorePosition");
  }
  function toggleStatus() {
    sendNui("toggleStatus", {});
  }

  async function useSelfCoords() {
    loading.set(true);
    try {
      const resp = await sendNui("getScaleformSettingsFromMyPosition");
      const d = await resp.json();
      const data = typeof d === "string" ? JSON.parse(d) : d;
      if (data.position) {
        scaleformPosX = data.position.x;
        scaleformPosY = data.position.y;
        scaleformPosZ = data.position.z;
      }
      if (data.rotation) {
        scaleformRotX = data.rotation.x;
        scaleformRotY = data.rotation.y;
        scaleformRotZ = data.rotation.z;
      }
      scaleformAttached = false;
    } catch {}
  }

  async function useEntityCoords() {
    if (!handle) return;
    loading.set(true);
    try {
      const resp = await sendNui("getScaleformSettingsFromEntity", {
        handle: currentHandle,
      });
      const d = await resp.json();
      const data = typeof d === "string" ? JSON.parse(d) : d;
      if (data.position) {
        scaleformPosX = data.position.x;
        scaleformPosY = data.position.y;
        scaleformPosZ = data.position.z;
      }
      if (data.rotation) {
        scaleformRotX = data.rotation.x;
        scaleformRotY = data.rotation.y;
        scaleformRotZ = data.rotation.z;
      }
      scaleformAttached = false;
    } catch {}
  }

  function handleWheel(e) {
    if (e.target.disabled) return;
    e.preventDefault();
    const step = parseFloat(e.target.step) || 1;
    const min = parseFloat(e.target.min);
    const max = parseFloat(e.target.max);
    let val = parseFloat(e.target.value) || 0;

    if (e.deltaY < 0) val += step;
    else val -= step;

    if (!isNaN(min)) val = Math.max(min, val);
    if (!isNaN(max)) val = Math.min(max, val);

    // Update the input value and fire input event to trigger Svelte's binding
    e.target.value = val;
    e.target.dispatchEvent(new Event("input"));
  }

  // Real-time updates
  $: currentHandle = (() => {
    const h = parseInt(handle);
    if (!isNaN(h)) return h;
    if (handle === "scaleform") {
      // Find the first active standalone scaleform to update it in real-time
      const activeSf = $activeMediaPlayers.find((p) => p.info?.scaleform?.standalone);
      if (activeSf) return activeSf.handle;
    }
    return handle;
  })();

  $: if (handle && volume !== undefined) {
    sendNui("setVolume", {
      handle: currentHandle,
      volume: parseInt(volume) || 0,
    });
  }
  $: if (handle && range !== undefined) {
    sendNui("setRange", {
      handle: currentHandle,
      range: parseFloat(range) || 0,
    });
  }
  $: if (handle && sameRoomAttenuation !== undefined && diffRoomAttenuation !== undefined) {
    sendNui("setAttenuation", {
      handle: currentHandle,
      sameRoom: parseFloat(sameRoomAttenuation) || 0,
      diffRoom: parseFloat(diffRoomAttenuation) || 0,
    });
  }
  $: if (handle && diffRoomVolume !== undefined) {
    sendNui("setDiffRoomVolume", {
      handle: currentHandle,
      diffRoomVolume: parseFloat(diffRoomVolume) || 0,
    });
  }
  $: if (handle && isVehicle !== undefined) {
    sendNui("setIsVehicle", { handle: currentHandle, isVehicle: !!isVehicle });
  }
  $: if (
    handle &&
    scaleformEnabled &&
    (scaleformName ||
      scaleformPosX ||
      scaleformPosY ||
      scaleformPosZ ||
      scaleformRotX ||
      scaleformRotY ||
      scaleformRotZ ||
      scaleformScaleX ||
      scaleformScaleY ||
      scaleformScaleZ ||
      scaleformAttached !== undefined)
  ) {
    const payload = getScaleformPayload();
    if (payload) {
      sendNui("setScaleform", { handle: currentHandle, scaleform: payload });
    }
  }
</script>

<div class="advanced-view">
  <div class="view-header">
    <button
      class="btn-back"
      on:click={() => dispatch("back")}
      disabled={$loading}
      use:tooltip={$t('back')}
    >
      <i class="fas fa-arrow-left"></i>
    </button>
    <span class="view-title">{$t('adv_title')}</span>
  </div>

  <div class="adv-form">
    <div class="adv-section" class:disabled={!handle}>
      <span class="section-label">{$t('section_playback')}</span>
      <div class="adv-row">
        <div class="adv-field">
          <i class="fas fa-clock" use:tooltip={$t('tooltip_offset')}></i>
          <input
            class="input-sm"
            type="text"
            bind:value={offset}
            placeholder="00:00:00"
            use:tooltip={$t('tooltip_offset_short')}
            disabled={!handle || $loading}
          />
        </div>
        <div class="adv-field">
          <i class="fas fa-volume-up" use:tooltip={$t('tooltip_volume')}></i>
          <input
            class="input-sm"
            type="number"
            bind:value={volume}
            min="0"
            max="100"
            step="5"
            disabled={!handle || $loading}
            on:wheel|preventDefault={handleWheel}
            use:tooltip={$t('tooltip_volume')}
          />
        </div>
        <div class="adv-field">
          <i class="fas fa-walking" use:tooltip={$t('tooltip_range')}></i>
          <input
            class="input-sm"
            type="number"
            bind:value={range}
            min="5"
            max={cfg.maxRange}
            step="5"
            disabled={!handle || $loading}
            on:wheel|preventDefault={handleWheel}
            use:tooltip={$t('tooltip_range_short')}
          />
        </div>
      </div>
    </div>

    <div class="adv-section" class:disabled={!handle}>
      <span class="section-label">{$t('section_attenuation')}</span>
      <div class="adv-row">
        <div class="adv-field" use:tooltip={$t('tooltip_same_room')}>
          <i class="fas fa-door-closed"></i>
          <input
            class="input-sm"
            type="number"
            bind:value={sameRoomAttenuation}
            min="0"
            max="10"
            step="0.1"
            disabled={!handle || $loading}
            on:wheel|preventDefault={handleWheel}
          />
        </div>
        <div class="adv-field" use:tooltip={$t('tooltip_diff_room')}>
          <i class="fas fa-door-open"></i>
          <input
            class="input-sm"
            type="number"
            bind:value={diffRoomAttenuation}
            min="0"
            max="10"
            step="0.1"
            disabled={!handle || $loading}
            on:wheel|preventDefault={handleWheel}
          />
        </div>
        <div class="adv-field" use:tooltip={$t('tooltip_diff_room_vol')}>
          <i class="fas fa-volume-down"></i>
          <input
            class="input-sm"
            type="number"
            bind:value={diffRoomVolume}
            min="0"
            max="1"
            step="0.01"
            disabled={!handle || $loading}
            on:wheel|preventDefault={handleWheel}
          />
        </div>
      </div>
    </div>

    <div class="adv-section" class:disabled={!handle}>
      <span class="section-label">{$t('section_options')}</span>
      <div class="adv-row">
        <div class="toggle-row-mini">
          <div class="toggle-mini">
            <input
              id="adv-filter"
              type="checkbox"
              bind:checked={filter}
              disabled={!handle || $loading}
            />
            <label
              for="adv-filter"
              use:tooltip={$t('radio_filter')}
              class:disabled={!handle || $loading}><i class="fas fa-filter"></i></label
            >
          </div>
          <div class="toggle-mini">
            <input
              id="adv-locked"
              type="checkbox"
              bind:checked={locked}
              disabled={!handle || !perms.manage}
            />
            <label for="adv-locked" use:tooltip={$t('lock')} class:disabled={!handle || !perms.manage}
              ><i class="fas fa-lock"></i></label
            >
          </div>
          <div class="toggle-mini">
            <input id="adv-vehicle" type="checkbox" bind:checked={isVehicle} disabled={!handle} />
            <label for="adv-vehicle" use:tooltip={$t('tooltip_vehicle_mode')} class:disabled={!handle}
              ><i class="fas fa-car"></i></label
            >
          </div>
          <div class="toggle-mini">
            <input
              id="adv-video"
              type="checkbox"
              bind:checked={video}
              disabled={!handle || $loading}
            />
            <label for="adv-video" use:tooltip={$t('video')} class:disabled={!handle || $loading}
              ><i class="fas fa-video"></i></label
            >
          </div>
        </div>

        {#if video}
          <div class="adv-field" use:tooltip={$t('video_size')}>
            <i class="fas fa-expand"></i>
            <input
              class="input-sm"
              type="number"
              bind:value={videoSize}
              min="5"
              max="200"
              step="5"
              disabled={!handle || $loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
        {/if}

        <div class="adv-field flex-grow">
          <i class="fas fa-signal" use:tooltip={$t('visualization')}></i>
          <select
            class="input-sm"
            bind:value={visualization}
            disabled={!handle || $loading}
          >
            <option value="">{$t('no_visualization')}</option>
            {#each Object.entries(cfg.audioVisualizations ?? {}) as [key, val]}
              <option value={key}>{val.name}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <div class="adv-section">
      <div class="section-label-row">
        <span class="section-label">{$t('section_scaleform')}</span>
        <div class="toggle-mini inline">
          <input
            id="adv-scaleform"
            type="checkbox"
            bind:checked={scaleformEnabled}
            disabled={$loading}
          />
          <label
            for="adv-scaleform"
            use:tooltip={$t('tooltip_enable_scaleform')}
            class:disabled={$loading}><i class="fas fa-film"></i></label
          >
        </div>
      </div>

      {#if scaleformEnabled}
        <div class="adv-row">
          <div class="adv-field flex-grow">
            <i class="fas fa-tag" use:tooltip={$t('tooltip_scaleform_name')}></i>
            <input
              class="input-sm"
              type="text"
              bind:value={scaleformName}
              placeholder={cfg.defaultScaleformName || "pmms_texture_renderer"}
              disabled={$loading}
            />
          </div>
          <div class="toggle-mini">
            <button
              class="btn-mini"
              on:click={useSelfCoords}
              disabled={$loading}
              use:tooltip={$t('tooltip_use_my_pos')}
            >
              <i class="fas fa-street-view"></i>
            </button>
          </div>
          <div class="toggle-mini">
            <button
              class="btn-mini"
              on:click={useEntityCoords}
              disabled={$loading}
              use:tooltip={$t('tooltip_use_entity_pos')}
            >
              <i class="fas fa-cube"></i>
            </button>
          </div>
          <div class="toggle-mini">
            <input
              id="adv-sf-attached"
              type="checkbox"
              bind:checked={scaleformAttached}
              disabled={$loading}
            />
            <label
              for="adv-sf-attached"
              use:tooltip={$t('tooltip_attached')}
              class:disabled={$loading}><i class="fas fa-link"></i></label
            >
          </div>
        </div>

        <div class="adv-row">
          <span class="axis-label">Pos</span>
          <div class="adv-field">
            <span class="axis-tag">X</span>
            <input
              class="input-sm"
              type="number"
              bind:value={scaleformPosX}
              step="0.01"
              disabled={$loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
          <div class="adv-field">
            <span class="axis-tag">Y</span>
            <input
              class="input-sm"
              type="number"
              bind:value={scaleformPosY}
              step="0.01"
              disabled={$loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
          <div class="adv-field">
            <span class="axis-tag">Z</span>
            <input
              class="input-sm"
              type="number"
              bind:value={scaleformPosZ}
              step="0.01"
              disabled={$loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
        </div>

        <div class="adv-row">
          <span class="axis-label">Rot</span>
          <div class="adv-field">
            <span class="axis-tag">X</span>
            <input
              class="input-sm"
              type="number"
              bind:value={scaleformRotX}
              step="0.1"
              disabled={$loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
          <div class="adv-field">
            <span class="axis-tag">Y</span>
            <input
              class="input-sm"
              type="number"
              bind:value={scaleformRotY}
              step="0.1"
              disabled={$loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
          <div class="adv-field">
            <span class="axis-tag">Z</span>
            <input
              class="input-sm"
              type="number"
              bind:value={scaleformRotZ}
              step="0.1"
              disabled={$loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
        </div>

        <div class="adv-row">
          <span class="axis-label">{$t('scale_label')}</span>
          <div class="adv-field">
            <span class="axis-tag">X</span>
            <input
              class="input-sm"
              type="number"
              bind:value={scaleformScaleX}
              step="0.01"
              disabled={$loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
          <div class="adv-field">
            <span class="axis-tag">Y</span>
            <input
              class="input-sm"
              type="number"
              bind:value={scaleformScaleY}
              step="0.01"
              disabled={$loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
          <div class="adv-field">
            <span class="axis-tag">Z</span>
            <input
              class="input-sm"
              type="number"
              bind:value={scaleformScaleZ}
              step="0.01"
              disabled={$loading}
              on:wheel|preventDefault={handleWheel}
            />
          </div>
        </div>
      {/if}
    </div>

    {#if perms.manage}
      <div class="adv-section">
        <span class="section-label">{$t('section_save')}</span>
        <div class="adv-field flex-grow">
          <i class="fas fa-tag" use:tooltip={$t('tooltip_label')}></i>
          <input
            class="input-sm"
            type="text"
            bind:value={saveLabel}
            placeholder={$t('label_placeholder')}
            disabled={$loading}
          />
        </div>

        {#if showSave}
          <div class="dialog-box">
            <span class="dialog-label">{$t('save_method_title')}</span>
            <div class="dialog-btns">
              <button
                class="btn-dialog"
                on:click={() => doSave("server-model")}
                disabled={$loading}
              >
                <i class="fas fa-cube"></i> {$t('save_server_model')}
              </button>
              <button
                class="btn-dialog"
                on:click={() => doSave("server-entity")}
                disabled={$loading}
              >
                <i class="fas fa-server"></i> {$t('save_server_entity')}
              </button>
              <button
                class="btn-dialog"
                on:click={() => {
                  newModelMode = true;
                  showSave = false;
                }}
              >
                <i class="fas fa-plus"></i> {$t('save_new')}
              </button>
              <button
                class="btn-dialog cancel"
                on:click={() => (showSave = false)}
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        {/if}

        {#if newModelMode}
          <div class="dialog-box">
            <span class="dialog-label">{$t('new_model_title')}</span>
            <div class="adv-field flex-grow" style="margin-bottom:0.4vh">
              <i class="fas fa-cube"></i>
              <input
                class="input-sm"
                type="text"
                bind:value={saveModel}
                placeholder={$t('model_placeholder')}
                disabled={$loading}
              />
            </div>
            <div class="adv-field flex-grow" style="margin-bottom:0.4vh">
              <i class="fas fa-crosshairs"></i>
              <input
                class="input-sm"
                type="text"
                bind:value={saveRenderTarget}
                placeholder="Render target..."
                disabled={$loading}
              />
            </div>
            <div class="dialog-btns">
              <button class="btn-dialog" on:click={() => doSave("add-new")}>
                <i class="fas fa-save"></i> {$t('save_btn')}
              </button>
              <button
                class="btn-dialog cancel"
                on:click={() => {
                  newModelMode = false;
                }}
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        {/if}

        {#if showDelete}
          <div class="dialog-box">
            <span class="dialog-label">{$t('delete_by_title')}</span>
            <div class="dialog-btns">
              <button
                class="btn-dialog danger"
                on:click={() => doDelete("server-model")}
              >
                <i class="fas fa-cube"></i> {$t('delete_model')}
              </button>
              <button
                class="btn-dialog danger"
                on:click={() => doDelete("server-entity")}
              >
                <i class="fas fa-server"></i> {$t('delete_entity')}
              </button>
              <button
                class="btn-dialog cancel"
                on:click={() => (showDelete = false)}
                disabled={$loading}
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="adv-actions">
      {#if perms.manage}
        <button
          class="btn-action"
          use:tooltip={$t('tooltip_save')}
          on:click={() => {
            showDelete = false;
            newModelMode = false;
            showSave = !showSave;
          }}
          disabled={!handle || $loading}
        >
          <i class="fas fa-save"></i>
        </button>
        <button
          class="btn-action"
          use:tooltip={$t('tooltip_delete')}
          on:click={() => {
            showSave = false;
            newModelMode = false;
            showDelete = !showDelete;
          }}
          disabled={!handle}
        >
          <i class="fas fa-trash-alt"></i>
        </button>
      {/if}
      <button
        class="btn-action"
        on:click={revert}
        use:tooltip={$t('tooltip_revert')}
      >
        <i class="fas fa-undo"></i>
      </button>
      <button class="btn-action" on:click={fix} use:tooltip={$t('tooltip_fix')}>
        <i class="fas fa-wrench"></i>
      </button>
      <button
        class="btn-action"
        class:active={$statusOpen}
        on:click={toggleStatus}
        use:tooltip={$t('tooltip_toggle_status')}
      >
        <i class="fas fa-bars"></i>
      </button>
      <button
        class="btn-action"
        on:click={restorePos}
        use:tooltip={$t('tooltip_restore_pos')}
      >
        <i class="fas fa-window-restore"></i>
      </button>

      <div class="spacer"></div>

      <div class="drag-icon drag-icon-handle" use:tooltip={$t('move')}>
        <i class="fas fa-up-down-left-right"></i>
      </div>
    </div>
  </div>
</div>

<style>
  .advanced-view {
    display: flex;
    flex-direction: column;
    gap: 1.2vh;
  }

  .view-header {
    display: flex;
    align-items: center;
    gap: 0.6vw;
    margin-bottom: 0.2vh;
  }

  .view-title {
    font-weight: 700;
    font-size: 1.4vh;
    text-transform: uppercase;
    letter-spacing: 0.05vw;
    color: white;
  }

  .btn-back {
    width: 3.2vh;
    height: 3.2vh;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2vh;
    transition: background 0.2s;
    flex-shrink: 0;
    font-family: inherit;
  }
  .btn-back:hover {
    background: #5e6cb6;
  }

  .adv-form {
    display: flex;
    flex-direction: column;
    gap: 1.2vh;
  }

  .adv-section.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .adv-section {
    display: flex;
    flex-direction: column;
    gap: 0.6vh;
  }

  .section-label {
    font-size: 1.1vh;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .section-label-row {
    display: flex;
    align-items: center;
    gap: 0.5vw;
  }

  .adv-row {
    display: flex;
    gap: 0.6vw;
    align-items: center;
  }

  .adv-field {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5vw;
    background: rgba(0, 0, 0, 0.3);
    padding: 0.5vh 0.5vw;
    border-radius: 3px;
    border: none;
    min-width: 0;
  }
  .adv-field i {
    color: white;
    font-size: 1.2vh;
    opacity: 0.7;
    flex-shrink: 0;
  }
  .flex-grow {
    flex-grow: 1;
  }

  .axis-label {
    font-size: 1vh;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    flex-shrink: 0;
    width: 2vw;
    text-align: right;
    font-weight: 700;
  }

  .axis-tag {
    font-size: 1vh;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 700;
    flex-shrink: 0;
  }

  .input-sm {
    width: 100%;
    background: transparent;
    border: none;
    color: white;
    font-family: "Lato", sans-serif;
    font-size: 1.3vh;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    min-width: 0;
  }
  .input-sm option {
    background: #111;
  }
  .input-sm::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .toggle-row-mini {
    display: flex;
    gap: 0.4vw;
  }

  .toggle-mini {
    position: relative;
  }
  .toggle-mini.inline {
    display: inline-flex;
  }

  .toggle-mini input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .toggle-mini label {
    width: 3.2vh;
    height: 3.2vh;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 1.2vh;
    transition:
      background 0.2s,
      border-color 0.2s;
  }
  .toggle-mini input:checked + label {
    background: #5e6cb6;
    border-color: #5e6cb6;
    color: white;
  }
  .toggle-mini input:disabled + label {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-mini {
    width: 3.2vh;
    height: 3.2vh;
    background: rgba(0, 0, 0, 0.3);
    border: none;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 1.2vh;
    transition:
      background 0.2s,
      border-color 0.2s,
      color 0.2s;
    font-family: inherit;
  }
  .btn-mini:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .dialog-box {
    background: rgba(0, 0, 0, 0.4);
    border: none;
    border-radius: 3px;
    padding: 0.6vh 0.6vw;
    display: flex;
    flex-direction: column;
    gap: 0.5vh;
  }

  .dialog-label {
    font-size: 1.1vh;
    color: rgba(255, 255, 255, 0.5);
  }

  .dialog-btns {
    display: flex;
    gap: 0.4vw;
    flex-wrap: wrap;
  }

  .btn-dialog {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 3px;
    color: white;
    font-family: "Lato", sans-serif;
    font-size: 1.2vh;
    padding: 0.4vh 0.6vw;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3vw;
    transition: background 0.15s;
  }
  .btn-dialog:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  .btn-dialog.danger {
    color: #ff5252;
  }
  .btn-dialog.danger:hover {
    background: rgba(255, 82, 82, 0.2);
  }
  .btn-dialog.cancel {
    color: rgba(255, 255, 255, 0.4);
  }

  .adv-actions {
    display: flex;
    gap: 0.4vw;
    align-items: center;
  }

  .btn-action {
    flex: 1;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 3px;
    color: white;
    font-family: "Lato", sans-serif;
    font-size: 1.2vh;
    padding: 0.6vh;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .btn-action:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }
  .btn-action.active {
    background: #5e6cb6;
  }
  .btn-action:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .spacer {
    flex: 1;
  }

  .drag-icon {
    width: 4vh;
    height: 4vh;
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
    font-size: 1.4vh;
  }
  .drag-icon:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.05);
  }
  .drag-icon:active {
    cursor: grabbing;
  }
</style>

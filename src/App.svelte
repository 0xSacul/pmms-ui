<script>
  import { onMount } from "svelte";
  import CoreUI from "./components/CoreUI.svelte";
  import StatusBar from "./components/StatusBar.svelte";
  import Notifications from "./components/Notifications.svelte";
  import Tooltip from "./components/Tooltip.svelte";
  import { sendNui, onNuiEvent } from "./lib/nui.js";
  import { loadLocale } from "./lib/locale.js";
  import {
    uiOpen,
    statusOpen,
    activeMediaPlayers,
    usableMediaPlayers,
    presets,
    permissions,
    maxDiscoveryDistance,
    config,
    isRDR,
    loading,
    pushNotification,
    baseVolume,
  } from "./lib/stores.js";
  import {
    engineInit,
    enginePlay,
    engineStop,
    engineUpdate,
    engineReset,
    configureEngine,
  } from "./lib/engine.js";
  const IS_DEV = import.meta.env.DEV;

  onMount(async () => {
    loadLocale();

    try {
      const resp = await sendNui("startup", {});
      const d = await resp.json();

      isRDR.set(d.isRDR ?? false);
      config.set({
        defaultSameRoomAttenuation: d.defaultSameRoomAttenuation ?? 4.0,
        defaultDiffRoomAttenuation: d.defaultDiffRoomAttenuation ?? 6.0,
        defaultDiffRoomVolume: d.defaultDiffRoomVolume ?? 0.25,
        defaultRange: d.defaultRange ?? 50,
        maxRange: d.maxRange ?? 200,
        defaultVideoSize: d.defaultVideoSize ?? 30,
        defaultScaleformName: d.defaultScaleformName ?? "pmms_texture_renderer",
        enableFilterByDefault: d.enableFilterByDefault ?? false,
        audioVisualizations: d.audioVisualizations ?? {},
        tooltipsEnabled: d.tooltipsEnabled ?? true,
      });

      configureEngine({
        isRDR: d.isRDR,
        currentServerEndpoint: d.currentServerEndpoint,
        audioVisualizations: d.audioVisualizations,
      });
    } catch (e) {
      console.warn("[PMMS] startup failed:", e);
    }

    onNuiEvent("init", (d) => engineInit(d));
    onNuiEvent("play", (d) => enginePlay(d.handle));
    onNuiEvent("stop", (d) => engineStop(d.handle));
    onNuiEvent("update", (d) => engineUpdate(d));
    onNuiEvent("reset", () => engineReset());

    onNuiEvent("showUi", () => uiOpen.set(true));
    onNuiEvent("hideUi", () => uiOpen.set(false));

    onNuiEvent("toggleStatus", () => statusOpen.update((v) => !v));

    onNuiEvent("updateUi", (d) => {
      const p =
        d.permissions && !Array.isArray(d.permissions) ? d.permissions : {};

      activeMediaPlayers.set(JSON.parse(d.activeMediaPlayers ?? "[]"));
      usableMediaPlayers.set(JSON.parse(d.usableMediaPlayers ?? "[]"));
      presets.set(JSON.parse(d.presets ?? "{}"));
      permissions.set({
        interact: !!p.interact,
        anyEntity: !!p.anyEntity,
        customUrl: !!p.customUrl,
        anyUrl: !!p.anyUrl,
        manage: !!p.manage,
      });
      maxDiscoveryDistance.set(d.maxDiscoveryDistance ?? 30);
      baseVolume.set(d.baseVolume);

      loading.set(false);
    });

    onNuiEvent("showNotification", (d) => {
      if (d.args) pushNotification(d.args);
    });

    if (IS_DEV) {
      const { startMock } = await import("./lib/mock.js");
      startMock();
      document.body.style.backgroundColor = "#272727";
    }
  });

  function closeUi() {
    uiOpen.set(false);
    sendNui("closeUi", {});
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && $uiOpen) closeUi();
  }

  let loadingTimeout;
  $: if ($loading) {
    if (loadingTimeout) clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
      loading.set(false);
    }, 5000);
  } else if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<Tooltip />
<Notifications />

{#if $uiOpen}
  <CoreUI on:close={closeUi} />
{/if}

{#if $statusOpen}
  <StatusBar />
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
    -webkit-user-select: none;
    user-select: none;
    outline: none;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    background: transparent;
    font-family: "Lato", sans-serif;
    color: white;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  :global(#app) {
    width: 100%;
    height: 100%;
  }

  :global(.pmms-player) {
    position: absolute;
    transform: translate(-50%, -100%);
    opacity: 0.9;
    pointer-events: none;
  }

  :global(::-webkit-scrollbar) {
    width: 4px;
  }
  :global(::-webkit-scrollbar-track) {
    background: transparent;
  }
  :global(::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.4);
  }
</style>

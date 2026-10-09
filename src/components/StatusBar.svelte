<script>
  import { onDestroy } from "svelte";
  import { activeMediaPlayers } from "../lib/stores.js";
  import { sendNui } from "../lib/nui.js";
  import { timeToString, getPlayer } from "../lib/engine.js";

  $: nearest =
    $activeMediaPlayers.find(
      (p) =>
        p.distance >= 0 && (p.info.range === 0 || p.distance <= p.info.range),
    ) ?? null;

  $: p = nearest?.info ?? null;

  let currentTime = 0;
  let timer;

  $: if (p) {
    if (!timer) {
      timer = setInterval(() => {
        if (!nearest) return;
        const el = getPlayer(nearest.handle);
        if (el) currentTime = el.currentTime;
        else currentTime = nearest.info.offset ?? 0;
      }, 500);
    }
  } else {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

{#if nearest}
  <div class="status-bar">
    <span class="status-title">{p.title.slice(0, 40)}</span>
    {#if p.duration}
      <span class="status-time"
        >{timeToString(currentTime)} / {timeToString(p.duration)}</span
      >
    {/if}
    <button
      disabled={!nearest.canInteract || !p.duration}
      on:click={() => sendNui("pause", { handle: nearest.handle })}
      ><i class="fas {p.paused ? 'fa-play' : 'fa-pause'}"></i></button
    >
    <button
      disabled={!nearest.canInteract}
      on:click={() => sendNui("stop", { handle: nearest.handle })}
      ><i class="fas fa-stop"></i></button
    >
  </div>
{/if}

<style>
  .status-bar {
    position: fixed;
    bottom: 4.5%;
    right: 1%;
    display: flex;
    align-items: center;
    gap: 0.8vw;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 5px;
    padding: 0.6vh 0.8vw;
    z-index: 50;
    font-family: "Lato", sans-serif;
    color: white;
  }

  .status-title {
    font-size: 1.3vh;
    color: rgba(255, 255, 255, 0.9);
  }

  .status-time {
    font-family: monospace;
    font-size: 1.1vh;
    color: rgba(255, 255, 255, 0.6);
  }

  button {
    appearance: none;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-family: inherit;
    cursor: pointer;
    width: 2.4vh;
    height: 2.4vh;
    font-size: 1.1vh;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: background 0.2s;
  }
  button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }
  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>

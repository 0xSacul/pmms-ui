<script>
  import { fade } from "svelte/transition";
  import { tooltipStore } from "../lib/tooltip.js";
  import { uiOpen } from "../lib/stores.js";

  $: store = $tooltipStore;

  // Offset so the cursor doesn't cover the tooltip
  const OFFSET_X = 15;
  const OFFSET_Y = 15;
</script>

{#if $uiOpen && store.visible && store.text}
  <div
    class="custom-tooltip"
    role="tooltip"
    in:fade={{ duration: 150 }}
    out:fade={{ duration: 100 }}
    style="left: {store.x + OFFSET_X}px; top: {store.y + OFFSET_Y}px;"
  >
    {@html store.text}
  </div>
{/if}

<style>
  .custom-tooltip {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.5);
    color: #e0e0e0;
    padding: 0.6vh 0.8vw;
    border-radius: 4px;
    font-size: 1.15vh;
    font-weight: 500;
    letter-spacing: 0.02vw;
    font-family: inherit;
    line-height: 1.4;
    white-space: pre-wrap;
    max-width: 25vw;
  }

  :global(.custom-tooltip .tooltip-title) {
    font-weight: 800;
    font-size: 1.25vh;
    color: #5e6cb6;
    margin-bottom: 0.3vh;
    text-transform: uppercase;
  }

  :global(.custom-tooltip .tooltip-para) {
    margin-top: 0.3vh;
    color: #cccccc;
    width: max-content;
    max-width: 25vw;
    font-weight: 400;
  }

  :global(.custom-tooltip .literal) {
    background: rgba(255, 255, 255, 0.1);
    padding: 0 0.4vw;
    border-radius: 2px;
    font-family: monospace;
    color: #ffffff;
  }
</style>

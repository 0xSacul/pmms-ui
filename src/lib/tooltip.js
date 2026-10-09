import { writable } from "svelte/store";
import { uiOpen, config } from "./stores.js";

export const tooltipStore = writable({
  visible: false,
  text: "",
  x: 0,
  y: 0,
});

// Only the current trigger may update or dismiss the shared tooltip.
let activeTooltip;

export function tooltip(node, text) {
  let timer;
  let isHovered = false;
  let uiVisible = false;
  let tipsEnabled = false;
  let x = 0;
  let y = 0;

  function handleMouseLeave() {
    isHovered = false;
    clearTimeout(timer);
    timer = undefined;
    if (activeTooltip?.node === node) {
      activeTooltip = undefined;
      tooltipStore.set({ visible: false, text: "", x: 0, y: 0 });
    }
  }

  // Closing the NUI need not emit mouseleave before Svelte removes the trigger.
  const unsubscribeUi = uiOpen.subscribe((open) => {
    uiVisible = open;
    if (!open) handleMouseLeave();
  });
  const unsubscribeConfig = config.subscribe((settings) => {
    tipsEnabled = settings.tooltipsEnabled;
    if (!tipsEnabled) handleMouseLeave();
  });

  function handleMouseEnter(e) {
    if (!text || !uiVisible || !tipsEnabled) return;
    activeTooltip?.hide();
    activeTooltip = { node, hide: handleMouseLeave };
    isHovered = true;
    x = e.clientX;
    y = e.clientY;
    timer = setTimeout(() => {
      if (!isHovered || !uiVisible || !tipsEnabled || !node.isConnected) return;
      tooltipStore.set({
        visible: true,
        text,
        x,
        y,
      });
    }, 300); // 300ms delay to prevent flickering on fast hovers
  }

  function handleMouseMove(e) {
    if (isHovered) {
      x = e.clientX;
      y = e.clientY;
      tooltipStore.update((state) => ({
        ...state,
        x,
        y,
      }));
    }
  }

  node.addEventListener("mouseenter", handleMouseEnter);
  node.addEventListener("mousemove", handleMouseMove);
  node.addEventListener("mouseleave", handleMouseLeave);

  return {
    update(newText) {
      text = newText;
      if (isHovered) {
        if (!newText) {
          handleMouseLeave();
        } else {
          tooltipStore.update((state) => ({
            ...state,
            text: newText,
          }));
        }
      }
    },
    destroy() {
      handleMouseLeave();
      unsubscribeUi();
      unsubscribeConfig();
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mousemove", handleMouseMove);
      node.removeEventListener("mouseleave", handleMouseLeave);
    },
  };
}

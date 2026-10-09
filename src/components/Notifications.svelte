<script>
  import { notifications } from '../lib/stores.js';
</script>

<div class="notif-container">
  {#each $notifications as n (n.id)}
    <div class="notif">
      {#if n.title}<div class="notif-title">{n.title}</div>{/if}
      {#if n.text}
        <div class="notif-text" style={n.color ? `color:${n.color}` : ''}>{n.text}</div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .notif-container {
    position: fixed;
    top: 0;
    right: 0;
    width: 15vw;
    padding: 1vh 1vw;
    z-index: 9999;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 0.5vh;
  }

  .notif {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 5px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(10px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .notif-title {
    padding: 0.5vh 0.5vw;
    font-size: 1.2vh;
    font-weight: 700;
    color: white;
    background: rgba(255, 255, 255, 0.05);
  }

  .notif-text {
    padding: 0.5vh 0.5vw;
    font-size: 1.1vh;
    color: rgba(255, 255, 255, 0.7);
  }
</style>

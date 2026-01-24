<script>
  import { createEventDispatcher } from "svelte";

  export let onDelete = () => {};
  export let position = { y: 0 };
  export let closing = false;

  const dispatch = createEventDispatcher();

  const handleDeleteClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Start closing animation first
    closing = true;
    // Call delete callback immediately to start note deletion animation
    onDelete();
    // Dispatch close event after animation
    setTimeout(() => {
      dispatch("close");
    }, 200); // Match animation duration
  };

  const handleBackdropClick = (event) => {
    // Stop propagation to prevent clicks from reaching items behind
    event.stopPropagation();
    event.preventDefault();
    // Start closing animation
    closing = true;
    // Dispatch close event after animation
    setTimeout(() => {
      dispatch("close");
    }, 200); // Match animation duration
  };
</script>

<!-- Backdrop to prevent clicks from reaching items behind -->
<div
  class="backdrop-overlay fixed inset-0 z-[100] bg-black"
  class:closing
  on:click={handleBackdropClick}
  on:touchend={handleBackdropClick}
  on:mousedown={handleBackdropClick}
  on:contextmenu={(e) => e.preventDefault()}
  role="presentation"
  aria-hidden="true"
  style="pointer-events: auto;"
></div>

<div
  class="app-menu-content animated-div bg-white flex flex-col text-black font-[300] pl-4 pt-4 pb-4 gap-4 z-[101] fixed w-full left-0 right-0"
  class:closing
  role="menu"
  aria-label="App context menu"
  style="pointer-events: auto; top: {position.y}px;"
  on:click|stopPropagation
  on:touchend|stopPropagation
  on:mousedown|stopPropagation
  on:contextmenu={(e) => e.preventDefault()}
>
  <button
    class="override-touch-controls"
    on:click={handleDeleteClick}
    on:touchend={handleDeleteClick}
    on:contextmenu={(e) => e.preventDefault()}
    on:selectstart={(e) => e.preventDefault()}
    role="menuitem">delete</button
  >
</div>

<style>
  .backdrop-overlay {
    animation: fadeIn 0.3s ease-in forwards;
    opacity: 0;
  }

  .backdrop-overlay.closing {
    animation: fadeOut 0.2s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 0.5;
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 0.5;
    }
    to {
      opacity: 0;
    }
  }

  .animated-div {
    animation: expand 0.5s ease-in forwards;
    overflow: hidden;
    max-height: 0;
  }

  .animated-div.closing {
    animation: collapse 0.2s ease-out forwards;
  }

  @keyframes expand {
    from {
      max-height: 0;
      padding-top: 0;
      padding-bottom: 0;
    }
    to {
      max-height: 200px; /* Adjust this value based on your content */
      padding-top: 1rem;
      padding-bottom: 2rem;
    }
  }

  @keyframes collapse {
    0% {
      max-height: 200px;
      padding-top: 1rem;
      padding-bottom: 2rem;
    }
    100% {
      max-height: 0;
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .override-touch-controls {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }

  .override-touch-controls:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
</style>

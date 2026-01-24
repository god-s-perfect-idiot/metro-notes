<script>
  import { onMount, onDestroy } from "svelte";
  import { textColorClassStore } from "../utils/theme.js";
  import { activePanel } from "../store/activePanel.js";

  export let panels = []; // Array of { title, panelContent, panelProps? }

  $: textClass = $textColorClassStore;

  let containerRef;
  let scrollContainerRef;
  let titleBarRef;
  let titleButtonRefs = [];
  let currentIndex = 0;
  let isTransitioning = false;
  let touchStartX = null;
  let touchStartY = null;
  let touchStartTime = null;
  let scrollLeft = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;

  // Ensure we have panels
  $: if (panels.length === 0) {
    panels = [];
  }

  // Normalize index for circular navigation
  function normalizeIndex(index) {
    if (panels.length === 0) return 0;
    return ((index % panels.length) + panels.length) % panels.length;
  }

  // Scroll to panel with smooth animation
  function scrollToPanel(index, smooth = true, allowMultiple = false) {
    if (isTransitioning || panels.length === 0) return;

    let targetIndex = normalizeIndex(index);

    // If not allowing multiple panel changes, clamp to only 1 panel away
    if (!allowMultiple) {
      const diff = targetIndex - currentIndex;
      // Handle wrap-around case
      if (Math.abs(diff) > panels.length / 2) {
        // Wrap around the shorter way
        if (diff > 0) {
          targetIndex = currentIndex - 1;
        } else {
          targetIndex = currentIndex + 1;
        }
      } else {
        // Clamp to max 1 panel change
        if (diff > 1) {
          targetIndex = currentIndex + 1;
        } else if (diff < -1) {
          targetIndex = currentIndex - 1;
        }
      }
      targetIndex = normalizeIndex(targetIndex);
    }

    if (targetIndex === currentIndex && !isDragging) return;

    isTransitioning = true;
    currentIndex = targetIndex;

    if (scrollContainerRef) {
      const panelWidth = scrollContainerRef.clientWidth;
      const targetScroll = targetIndex * panelWidth;

      scrollContainerRef.scrollTo({
        left: targetScroll,
        behavior: smooth ? "smooth" : "auto",
      });

      // Update title bar scroll to show peek of next section
      updateTitleBarScroll(targetIndex);

      // Reset transition flag after animation
      setTimeout(
        () => {
          isTransitioning = false;
        },
        smooth ? 400 : 0,
      );
    }
  }

  // Update title bar scroll to show active title at the left
  function updateTitleBarScroll(activeIndex) {
    if (!titleBarRef || !titleButtonRefs[activeIndex]) return;

    const activeButton = titleButtonRefs[activeIndex];
    const titleBarRect = titleBarRef.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    // Calculate the scroll position needed to align the active title at the left
    // Account for the title bar's padding (1rem = 16px)
    const currentScroll = titleBarRef.scrollLeft;
    const buttonOffsetLeft = activeButton.offsetLeft;
    const targetScroll = buttonOffsetLeft - 16; // 16px for the 1rem padding

    // Only scroll if the button is not already at the left edge
    if (Math.abs(titleBarRef.scrollLeft - targetScroll) > 1) {
      titleBarRef.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  }

  // Track previous index to only update when it actually changes
  let previousIndex = -1;

  // Reactive statement to update title bar scroll when currentIndex changes
  $: if (
    currentIndex !== previousIndex &&
    currentIndex !== undefined &&
    titleBarRef
  ) {
    previousIndex = currentIndex;
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      updateTitleBarScroll(currentIndex);
    }, 50); // Small delay to ensure button refs are ready
  }

  // Update active panel store when currentIndex changes
  $: if (currentIndex !== undefined) {
    activePanel.set(currentIndex);
  }

  // Handle title click
  function handleTitleClick(index) {
    if (isTransitioning) return;
    // Allow direct navigation when clicking titles (allowMultiple = true)
    scrollToPanel(index, true, true);
  }

  // Handle touch start for swipe detection
  function handleTouchStart(e) {
    if (isTransitioning) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isDragging = false;

    if (scrollContainerRef) {
      dragStartX = e.touches[0].clientX;
      dragStartScrollLeft = scrollContainerRef.scrollLeft;
    }
  }

  // Handle touch move
  function handleTouchMove(e) {
    if (touchStartX === null || touchStartY === null || isTransitioning) return;

    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);

    // If horizontal movement is significant, enable dragging (lowered threshold)
    if (deltaX > 5 && deltaX > deltaY) {
      isDragging = true;

      if (scrollContainerRef) {
        const diff = e.touches[0].clientX - dragStartX;
        scrollContainerRef.scrollLeft = dragStartScrollLeft - diff;
      }
    }
  }

  // Handle touch end - determine if swipe or tap
  function handleTouchEnd(e) {
    if (touchStartX === null || touchStartY === null || isTransitioning) {
      touchStartX = null;
      touchStartY = null;
      touchStartTime = null;
      isDragging = false;
      return;
    }

    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
    const touchDuration = Date.now() - touchStartTime;
    const swipeThreshold = 30; // Lowered from 50 to make swiping easier

    // If dragging, handle scroll position
    if (isDragging && scrollContainerRef) {
      const panelWidth = scrollContainerRef.clientWidth;
      const currentScroll = scrollContainerRef.scrollLeft;
      const currentPanel = Math.round(currentScroll / panelWidth);

      // Determine direction based on scroll position
      const scrollDiff = currentScroll - currentPanel * panelWidth;

      if (Math.abs(scrollDiff) > panelWidth * 0.2) {
        // Swipe was significant, move to next/prev panel (only 1 panel at a time)
        if (scrollDiff > 0) {
          scrollToPanel(currentPanel + 1, true, false);
        } else {
          scrollToPanel(currentPanel - 1, true, false);
        }
      } else {
        // Snap back to current panel
        scrollToPanel(currentPanel, true, false);
      }
    } else if (
      Math.abs(deltaX) > swipeThreshold &&
      deltaX > deltaY &&
      touchDuration < 500
    ) {
      // Quick swipe gesture (only 1 panel at a time)
      if (deltaX > 0) {
        // Swipe right - go to previous panel
        scrollToPanel(currentIndex - 1, true, false);
      } else {
        // Swipe left - go to next panel
        scrollToPanel(currentIndex + 1, true, false);
      }
    }

    // Reset touch tracking
    touchStartX = null;
    touchStartY = null;
    touchStartTime = null;
    isDragging = false;
  }

  // Handle scroll event to update current index
  function handleScroll() {
    if (isTransitioning || !scrollContainerRef) return;

    const panelWidth = scrollContainerRef.clientWidth;
    const scrollLeft = scrollContainerRef.scrollLeft;
    const newIndex = Math.round(scrollLeft / panelWidth);

    // Handle endless circular navigation
    if (newIndex !== currentIndex) {
      if (newIndex < 0) {
        // Scrolled past first panel, wrap to last (only if dragging, otherwise clamp)
        if (isDragging) {
          const lastIndex = panels.length - 1;
          setTimeout(() => {
            scrollToPanel(lastIndex, false, false);
          }, 0);
        } else {
          // Snap back to first panel
          setTimeout(() => {
            scrollToPanel(0, false, false);
          }, 0);
        }
      } else if (newIndex >= panels.length) {
        // Scrolled past last panel, wrap to first (only if dragging, otherwise clamp)
        if (isDragging) {
          setTimeout(() => {
            scrollToPanel(0, false, false);
          }, 0);
        } else {
          // Snap back to last panel
          const lastIndex = panels.length - 1;
          setTimeout(() => {
            scrollToPanel(lastIndex, false, false);
          }, 0);
        }
      } else {
        const normalizedNewIndex = normalizeIndex(newIndex);
        // Only update if it's within 1 panel of current
        const diff = Math.abs(normalizedNewIndex - currentIndex);
        if (
          normalizedNewIndex !== currentIndex &&
          (diff === 1 || diff === panels.length - 1)
        ) {
          currentIndex = normalizedNewIndex;
          // Title bar scroll will be updated by reactive statement
        }
      }
    }
  }

  // Handle mouse drag for desktop
  function handleMouseDown(e) {
    if (isTransitioning) return;
    isDragging = true;
    dragStartX = e.clientX;
    if (scrollContainerRef) {
      dragStartScrollLeft = scrollContainerRef.scrollLeft;
    }
    e.preventDefault();
  }

  function handleMouseMove(e) {
    if (!isDragging || !scrollContainerRef || isTransitioning) return;
    const diff = e.clientX - dragStartX;
    scrollContainerRef.scrollLeft = dragStartScrollLeft - diff;
  }

  function handleMouseUp(e) {
    if (!isDragging || !scrollContainerRef) return;

    const panelWidth = scrollContainerRef.clientWidth;
    const currentScroll = scrollContainerRef.scrollLeft;
    const currentPanel = Math.round(currentScroll / panelWidth);
    const scrollDiff = currentScroll - currentPanel * panelWidth;

    if (Math.abs(scrollDiff) > panelWidth * 0.2) {
      // Only move 1 panel at a time
      if (scrollDiff > 0) {
        scrollToPanel(currentPanel + 1, true, false);
      } else {
        scrollToPanel(currentPanel - 1, true, false);
      }
    } else {
      scrollToPanel(currentPanel, true, false);
    }

    isDragging = false;
  }

  onMount(() => {
    // Initialize scroll position
    if (scrollContainerRef) {
      scrollToPanel(0, false);
    }
    // Initialize title bar scroll for first panel
    if (titleBarRef && titleButtonRefs[0]) {
      setTimeout(() => {
        updateTitleBarScroll(0);
      }, 100);
    }

    // Prevent manual scrolling on title bar
    if (titleBarRef) {
      let lastProgrammaticScroll = 0;

      // Store scroll position before programmatic scroll
      const originalScrollTo = titleBarRef.scrollTo;
      titleBarRef.scrollTo = function (...args) {
        lastProgrammaticScroll = Date.now();
        originalScrollTo.apply(this, args);
      };

      // Prevent user-initiated scrolling
      titleBarRef.addEventListener(
        "scroll",
        (e) => {
          const now = Date.now();
          // If scroll happened more than 50ms after last programmatic scroll, it's user-initiated
          if (now - lastProgrammaticScroll > 50) {
            // Reset to correct position
            updateTitleBarScroll(currentIndex);
          }
        },
        { passive: true },
      );

      // Prevent touch scrolling on title bar
      titleBarRef.addEventListener(
        "touchmove",
        (e) => {
          // Only prevent if touching the title bar itself, not buttons
          if (
            e.target === titleBarRef ||
            (titleBarRef.contains(e.target) &&
              !e.target.closest(".title-button"))
          ) {
            e.preventDefault();
          }
        },
        { passive: false },
      );
    }
  });

  // Cleanup mouse events
  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
  });

  // Add global mouse listeners when dragging starts
  $: if (isDragging && typeof window !== "undefined") {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }
</script>

<div class="multi-panel-container" bind:this={containerRef}>
  <!-- Title Navigation Bar -->
  <div
    class="title-bar"
    bind:this={titleBarRef}
    on:wheel|preventDefault
    on:scroll|stopPropagation
  >
    <div class="title-scroll-container">
      {#each panels as panel, index (index)}
        <button
          class="title-button"
          class:active={currentIndex === index}
          class:inactive={currentIndex !== index}
          on:click={() => handleTitleClick(index)}
          bind:this={titleButtonRefs[index]}
        >
          <span class="title-text">{panel.title}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Panel Content Container -->
  <div
    class="panel-scroll-container"
    bind:this={scrollContainerRef}
    on:scroll={handleScroll}
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
    on:mousedown={handleMouseDown}
  >
    {#each panels as panel, index (index)}
      <div class="panel-item">
        {#if typeof panel.panelContent === "string"}
          {@html panel.panelContent}
        {:else}
          <svelte:component
            this={panel.panelContent}
            {...panel.panelProps || {}}
          />
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .multi-panel-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .title-bar {
    width: 100%;
    padding: 0 1rem;
    /* padding-top: 0.5rem; */
    padding-right: 0; /* Allow peek on right */
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    /* Show a bit of the next title peeking */
    padding-right: 2rem;
    /* Disable manual scrolling - only allow programmatic scrolling */
    overscroll-behavior-x: none;
    touch-action: pan-y; /* Allow vertical scrolling but prevent horizontal */
  }

  .title-bar::-webkit-scrollbar {
    display: none;
  }

  .title-scroll-container {
    display: flex;
    gap: 2rem;
    align-items: center;
    min-width: min-content;
    padding-right: 100vw; /* Large padding so last title can scroll to left edge */
  }

  .title-button {
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.3s ease;
    white-space: nowrap;
    display: flex;
    align-items: center;
  }

  .title-text {
    font-size: 3.75rem; /* text-6xl equivalent */
    font-weight: 200;
    transition: color 0.3s ease;
  }

  .title-button.active .title-text {
    color: white;
  }

  .title-button.inactive .title-text {
    color: #4f4f4f; /* grey */
  }

  .panel-scroll-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-behavior: smooth;
  }

  .panel-scroll-container::-webkit-scrollbar {
    display: none;
  }

  .panel-item {
    flex: 0 0 100%;
    width: 100%;
    height: 100%;
    scroll-snap-align: start;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }

  /* Prevent text selection during drag */
  .panel-scroll-container:active {
    user-select: none;
    -webkit-user-select: none;
  }
</style>

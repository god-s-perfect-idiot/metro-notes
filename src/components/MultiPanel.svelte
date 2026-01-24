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
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let isProgrammaticScroll = false;

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
    isProgrammaticScroll = true;
    currentIndex = targetIndex;

    if (scrollContainerRef) {
      const panelWidth = scrollContainerRef.clientWidth;
      const targetScroll = targetIndex * panelWidth;

      // Temporarily disable scroll snap during programmatic scroll
      scrollContainerRef.style.scrollSnapType = "none";

      scrollContainerRef.scrollTo({
        left: targetScroll,
        behavior: smooth ? "smooth" : "auto",
      });

      // Update title bar scroll to show peek of next section
      updateTitleBarScroll(targetIndex);

      // Reset flags after animation
      const duration = smooth ? 400 : 0;
      setTimeout(() => {
        isTransitioning = false;
        isProgrammaticScroll = false;
        // Re-enable scroll snap after transition
        if (scrollContainerRef) {
          scrollContainerRef.style.scrollSnapType = "x mandatory";
        }
      }, duration);
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

  // Handle touch start
  function handleTouchStart(e) {
    if (isTransitioning) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isDragging = false;

    if (scrollContainerRef) {
      dragStartX = e.touches[0].clientX;
      dragStartScrollLeft = scrollContainerRef.scrollLeft;
      // Disable scroll snap and smooth scrolling during drag for 1:1 panning
      scrollContainerRef.style.scrollSnapType = "none";
      scrollContainerRef.style.scrollBehavior = "auto";
    }
  }

  // Handle touch move - natural panning under finger
  function handleTouchMove(e) {
    if (touchStartX === null || touchStartY === null || isTransitioning) return;

    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);

    // If horizontal movement is significant, enable dragging
    if (deltaX > 5 && deltaX > deltaY) {
      if (!isDragging) {
        isDragging = true;
      }

      if (scrollContainerRef) {
        // Natural panning: when finger moves right, content moves right (scrollLeft decreases)
        const diff = e.touches[0].clientX - dragStartX;
        const newScrollLeft = dragStartScrollLeft - diff;

        // Allow peeking of next/prev page by allowing slight overscroll
        const panelWidth = scrollContainerRef.clientWidth;
        const minScroll = -panelWidth * 0.1; // Allow 10% peek of previous panel
        const maxScroll = (panels.length - 1) * panelWidth + panelWidth * 0.1; // Allow 10% peek of next panel

        // Directly set scroll position for 1:1 panning feel
        scrollContainerRef.scrollLeft = Math.max(
          minScroll,
          Math.min(maxScroll, newScrollLeft),
        );
      }

      // Prevent default to avoid scrolling the page
      e.preventDefault();
    }
  }

  // Handle touch end - check if 40% threshold is met
  function handleTouchEnd(e) {
    if (touchStartX === null || touchStartY === null) {
      resetDrag();
      return;
    }

    if (isDragging && scrollContainerRef) {
      const panelWidth = scrollContainerRef.clientWidth;
      const currentScroll = scrollContainerRef.scrollLeft;
      const currentPanel = Math.round(currentScroll / panelWidth);
      const normalizedPanel = Math.max(
        0,
        Math.min(panels.length - 1, currentPanel),
      );

      // Calculate how far we've scrolled from the panel center
      const panelCenter = normalizedPanel * panelWidth;
      const scrollDiff = currentScroll - panelCenter;
      const dragPercentage = Math.abs(scrollDiff) / panelWidth;

      // If drag is more than 40%, switch to next/prev page
      if (dragPercentage > 0.4) {
        if (scrollDiff > 0) {
          // Dragged right, go to next panel
          scrollToPanel(normalizedPanel + 1, true, false);
        } else {
          // Dragged left, go to previous panel
          scrollToPanel(normalizedPanel - 1, true, false);
        }
      } else {
        // Snap back to current panel
        scrollToPanel(normalizedPanel, true, false);
      }
    }

    resetDrag();
  }

  function resetDrag() {
    touchStartX = null;
    touchStartY = null;
    isDragging = false;
    if (scrollContainerRef) {
      scrollContainerRef.style.scrollSnapType = "x mandatory";
      scrollContainerRef.style.scrollBehavior = "smooth";
    }
  }

  // Handle scroll event to update current index
  function handleScroll() {
    // Ignore scroll events during programmatic scrolling or transitions
    if (
      isProgrammaticScroll ||
      isTransitioning ||
      !scrollContainerRef ||
      isDragging
    ) {
      return;
    }

    const panelWidth = scrollContainerRef.clientWidth;
    if (panelWidth === 0) return;

    const scrollLeft = scrollContainerRef.scrollLeft;
    const newIndex = Math.round(scrollLeft / panelWidth);
    const clampedIndex = Math.max(0, Math.min(panels.length - 1, newIndex));

    // Only update if index actually changed
    if (
      clampedIndex !== currentIndex &&
      clampedIndex >= 0 &&
      clampedIndex < panels.length
    ) {
      currentIndex = clampedIndex;
    }
  }

  // Handle mouse drag for desktop (same logic as touch)
  function handleMouseDown(e) {
    if (isTransitioning) return;
    isDragging = true;
    dragStartX = e.clientX;
    if (scrollContainerRef) {
      dragStartScrollLeft = scrollContainerRef.scrollLeft;
      scrollContainerRef.style.scrollSnapType = "none";
      scrollContainerRef.style.scrollBehavior = "auto";
    }
    e.preventDefault();
  }

  function handleMouseMove(e) {
    if (!isDragging || !scrollContainerRef || isTransitioning) return;

    // Natural panning: when mouse moves right, content moves right (scrollLeft decreases)
    const diff = e.clientX - dragStartX;
    const newScrollLeft = dragStartScrollLeft - diff;

    // Allow peeking of next/prev page
    const panelWidth = scrollContainerRef.clientWidth;
    const minScroll = -panelWidth * 0.1; // Allow 10% peek of previous panel
    const maxScroll = (panels.length - 1) * panelWidth + panelWidth * 0.1; // Allow 10% peek of next panel

    // Directly set scroll position for 1:1 panning feel
    scrollContainerRef.scrollLeft = Math.max(
      minScroll,
      Math.min(maxScroll, newScrollLeft),
    );
  }

  function handleMouseUp(e) {
    if (!isDragging || !scrollContainerRef) {
      if (scrollContainerRef) {
        scrollContainerRef.style.scrollSnapType = "x mandatory";
      }
      return;
    }

    const panelWidth = scrollContainerRef.clientWidth;
    const currentScroll = scrollContainerRef.scrollLeft;
    const currentPanel = Math.round(currentScroll / panelWidth);
    const normalizedPanel = Math.max(
      0,
      Math.min(panels.length - 1, currentPanel),
    );

    // Calculate drag percentage
    const panelCenter = normalizedPanel * panelWidth;
    const scrollDiff = currentScroll - panelCenter;
    const dragPercentage = Math.abs(scrollDiff) / panelWidth;

    // If drag is more than 40%, switch to next/prev page
    if (dragPercentage > 0.4) {
      if (scrollDiff > 0) {
        scrollToPanel(normalizedPanel + 1, true, false);
      } else {
        scrollToPanel(normalizedPanel - 1, true, false);
      }
    } else {
      scrollToPanel(normalizedPanel, true, false);
    }

    scrollContainerRef.style.scrollSnapType = "x mandatory";
    scrollContainerRef.style.scrollBehavior = "smooth";
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
  <!-- svelte-ignore a11y-non-interactive-element -->
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div
    class="panel-scroll-container"
    bind:this={scrollContainerRef}
    role="application"
    aria-label="Panel navigation"
    tabindex="0"
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

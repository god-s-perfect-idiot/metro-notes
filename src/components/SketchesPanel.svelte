<script>
  import { router } from "../lib/router.js";
  import { sketches, sketchesStore } from "../store/sketches.js";
  import {
    openMenu,
    closeMenu,
    setMenuClosing,
    menuState,
  } from "../store/menu.js";

  $: menu = $menuState;
  $: showMenu = menu.showMenu;
  $: selectedNote = menu.selectedNote;
  $: menuPosition = menu.menuPosition;
  $: menuClosing = menu.menuClosing;

  $: sketchesList = $sketches;

  let tappedSketchId = null;
  let touchStartY = null;
  let touchStartX = null;
  let isScrolling = false;
  let touchStartTime = null;
  let longPressTimer = null;
  let deletingSketchId = null;

  function handleTouchStart(e, sketch) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    isScrolling = false;

    // Clear any existing long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    // Set up long press timer (500ms)
    longPressTimer = setTimeout(() => {
      // Get the vertical position of the touch
      const touchY = e.touches[0].clientY;
      const menuHeight = 60; // Approximate menu height
      const padding = 10;

      let y = touchY;

      // Adjust if too close to edges
      if (y < padding) {
        y = padding;
      } else if (y > window.innerHeight - menuHeight - padding) {
        y = window.innerHeight - menuHeight - padding;
      }

      longPressTimer = null;

      // Open menu via store, passing delete handler
      openMenu(sketch, { y }, handleDeleteSketch);
    }, 500);
  }

  function handleTouchMove(e) {
    if (touchStartY === null || touchStartX === null) return;

    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);

    // If movement is significant, user is scrolling
    if (deltaY > 10 || deltaX > 10) {
      isScrolling = true;
      // Cancel long press if scrolling
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  }

  function handleTouchEnd(e, sketch) {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (touchStartY === null || touchStartX === null) return;

    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
    const touchDuration = Date.now() - touchStartTime;

    // If menu is showing, don't trigger tap
    if (showMenu) {
      // Reset touch tracking
      touchStartY = null;
      touchStartX = null;
      touchStartTime = null;
      isScrolling = false;
      return;
    }

    // Only trigger tap if:
    // 1. Not scrolling (movement < 10px)
    // 2. Touch duration < 300ms (quick tap)
    if (!isScrolling && deltaY < 10 && deltaX < 10 && touchDuration < 300) {
      handleSketchTap(sketch);
    }

    // Reset touch tracking
    touchStartY = null;
    touchStartX = null;
    touchStartTime = null;
    isScrolling = false;
  }

  function handleDeleteSketch() {
    if (selectedNote) {
      const sketchIdToDelete = selectedNote.id;
      // Trigger menu closing animation first
      setMenuClosing(true);

      // Wait for menu to collapse completely (200ms), then start sketch deletion animation
      setTimeout(() => {
        // Mark sketch as deleting to trigger animation
        deletingSketchId = sketchIdToDelete;

        // Delete sketch after deletion animation completes (300ms)
        setTimeout(() => {
          sketchesStore.deleteSketch(sketchIdToDelete);
          deletingSketchId = null;
          closeMenu();
        }, 300); // Match deletion animation duration
      }, 200); // Wait for menu collapse to complete
    }
  }

  function handleMenuClose() {
    // Reset touch tracking to prevent sketch from opening
    touchStartY = null;
    touchStartX = null;
    touchStartTime = null;
    isScrolling = false;

    // Close menu via store
    closeMenu();
  }

  // Expose delete handler for parent
  export function triggerDelete() {
    handleDeleteSketch();
  }

  function handleSketchTap(sketch) {
    // Don't open sketch if menu is showing
    if (showMenu) {
      return;
    }

    const sketchId = sketch.id;
    tappedSketchId = sketchId;

    // Reset after animation completes and navigate to edit page
    setTimeout(() => {
      tappedSketchId = null;
      // Navigate to edit page
      router.goto(`/sketches/${sketch.id}`);
    }, 200);
  }

  function formatMonthHeader(monthKey) {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);

    // Always format as "Month Year"
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  function getMonthKey(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`; // YYYY-MM format
  }

  // Group sketches by month
  $: groupedSketches = (() => {
    const groups = {};
    sketchesList.forEach((sketch) => {
      const monthKey = getMonthKey(sketch.createdAt);
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(sketch);
    });

    // Convert to array and sort by month (most recent first)
    return Object.entries(groups)
      .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
      .map(([monthKey, sketches]) => ({
        monthKey,
        monthHeader: formatMonthHeader(monthKey),
        sketches: sketches.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
      }));
  })();
</script>

<div
  class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
  on:contextmenu={(e) => {
    if (showMenu) {
      e.preventDefault();
    }
  }}
>
  {#if sketchesList.length > 0}
    {#each groupedSketches as group (group.monthKey)}
      <div class="flex flex-col gap-3">
        <h2 class="text-lg font-[300] tracking-wide text-[#ffd84f]">
          {group.monthHeader}
        </h2>
        <div class="grid grid-cols-2 gap-4">
          {#each group.sketches as sketch (sketch.id)}
            <div
              class="flex flex-col gap-2 w-full min-w-0 sketch-item text-left"
              class:tapped={tappedSketchId === sketch.id}
              class:menu-open={showMenu}
              class:menu-selected={showMenu &&
                selectedNote &&
                selectedNote.id === sketch.id}
              class:deleting={deletingSketchId === sketch.id}
            >
              <button
                class="flex flex-col min-w-0 items-start overflow-hidden w-full sketch-button"
                disabled={showMenu}
                on:click={(e) => {
                  if (showMenu) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  handleSketchTap(sketch);
                }}
                on:touchstart={(e) => {
                  if (showMenu) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  handleTouchStart(e, sketch);
                }}
                on:touchmove={handleTouchMove}
                on:touchend={(e) => {
                  if (showMenu) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Reset touch tracking when menu is open
                    touchStartY = null;
                    touchStartX = null;
                    touchStartTime = null;
                    isScrolling = false;
                    return;
                  }
                  handleTouchEnd(e, sketch);
                }}
                on:contextmenu={(e) => e.preventDefault()}
                on:selectstart={(e) => e.preventDefault()}
              >
                {#if sketch.imageData}
                  <img
                    src={sketch.imageData}
                    alt="Sketch"
                    class="w-full object-cover aspect-square sketch-image"
                    style="background-color: #1a1a1a;"
                  />
                {:else}
                  <div
                    class="w-full aspect-square bg-gray-800 flex items-center justify-center sketch-image"
                  >
                    <span class="text-gray-500 text-sm">Empty sketch</span>
                  </div>
                {/if}
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {:else}
    <div class="text-start py-4">
      <span class="text-xl justify-start flex font-[300]">
        Wow. Such empty. You can add a sketch by tapping the plus button below.
      </span>
    </div>
  {/if}
</div>

<style>
  .sketch-item {
    transition: transform 0.2s ease-out;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    overflow: visible;
  }

  .sketch-item.tapped {
    transform: translate(2px, 2px);
  }

  .sketch-item.menu-selected {
    transform: scale(1.05);
  }

  .sketch-item.menu-selected .sketch-image {
    border: 3px solid #ffd84f;
    transition:
      border 0.2s ease-out,
      transform 0.2s ease-out;
  }

  .sketch-image {
    transition:
      border 0.2s ease-out,
      transform 0.2s ease-out;
    border: 3px solid transparent;
  }

  .sketch-item.menu-open button {
    pointer-events: none;
  }

  .sketch-item.deleting {
    animation: shrinkDelete 0.3s ease-out forwards;
    opacity: 1;
  }

  @keyframes shrinkDelete {
    from {
      max-height: 300px;
      margin-bottom: 1rem;
      padding-top: 0;
      padding-bottom: 0;
      opacity: 1;
    }
    to {
      max-height: 0;
      margin-bottom: 0;
      padding-top: 0;
      padding-bottom: 0;
      opacity: 0;
    }
  }
</style>

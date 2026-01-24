<script>
  import { router } from "../lib/router.js";
  import { notes } from "../store/notes.js";
  import { textColorClassStore, accentColorStore } from "../utils/theme.js";
  import Icon from "@iconify/svelte";

  export let isExiting = false;
  export let isEntering = false;

  $: textClass = $textColorClassStore;
  $: accentColor = $accentColorStore;
  $: notesList = $notes;

  let tappedNoteId = null;
  let touchStartY = null;
  let touchStartX = null;
  let isScrolling = false;
  let touchStartTime = null;

  function handleTouchStart(e, note) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    isScrolling = false;
  }

  function handleTouchMove(e) {
    if (touchStartY === null || touchStartX === null) return;

    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);

    // If movement is significant, user is scrolling
    if (deltaY > 10 || deltaX > 10) {
      isScrolling = true;
    }
  }

  function handleTouchEnd(e, note) {
    if (touchStartY === null || touchStartX === null) return;

    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
    const touchDuration = Date.now() - touchStartTime;

    // Only trigger tap if:
    // 1. Not scrolling (movement < 10px)
    // 2. Touch duration < 300ms (quick tap)
    if (!isScrolling && deltaY < 10 && deltaX < 10 && touchDuration < 300) {
      handleNoteTap(note);
    }

    // Reset touch tracking
    touchStartY = null;
    touchStartX = null;
    touchStartTime = null;
    isScrolling = false;
  }

  function handleNoteTap(note) {
    const noteId = note.id;
    tappedNoteId = noteId;

    // Reset after animation completes and navigate to edit page
    setTimeout(() => {
      tappedNoteId = null;
      // Navigate to edit page
      router.goto(`/notes/${note.id}`);
    }, 200);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  // Group notes by month
  $: groupedNotes = (() => {
    const groups = {};
    notesList.forEach((note) => {
      const monthKey = getMonthKey(note.createdAt);
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(note);
    });

    // Convert to array and sort by month (most recent first)
    return Object.entries(groups)
      .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
      .map(([monthKey, notes]) => ({
        monthKey,
        monthHeader: formatMonthHeader(monthKey),
        notes: notes.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        ),
      }));
  })();

  function stripHtml(html) {
    if (!html) return "";
    // Create a temporary div to parse HTML
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    // Get text content, preserving line breaks
    return tmp.textContent || tmp.innerText || "";
  }

  function getPreviewContent(html) {
    if (!html) return "";
    const text = stripHtml(html);
    // Limit to first 100 characters for preview
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  }
</script>

<div class="page-holder h-full">
  <div
    class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
    class:page-exit={isExiting}
    class:page-entering={isEntering}
  >
    <span class="text-base font-[500] h-fit px-4 uppercase mt-2"
      >metro notes</span
    >
    <span class="text-6xl font-[200] h-auto py-1 px-4">all notes</span>
    <div
      class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
    >
      {#if notesList.length > 0}
        {#each groupedNotes as group (group.monthKey)}
          <div class="flex flex-col gap-3">
            <h2 class="text-lg font-[300] tracking-wide text-[#ffd84f]">
              {group.monthHeader}
            </h2>
            <div class="flex flex-col gap-4">
              {#each group.notes as note (note.id)}
                <div
                  class="flex flex-col gap-2 w-full min-w-0 note-item text-left"
                  class:tapped={tappedNoteId === note.id}
                >
                  <button
                    class="flex flex-col min-w-0 items-start overflow-hidden"
                    on:click={() => {
                      handleNoteTap(note);
                    }}
                    on:touchstart={(e) => handleTouchStart(e, note)}
                    on:touchmove={handleTouchMove}
                    on:touchend={(e) => handleTouchEnd(e, note)}
                  >
                    <span
                      class="text-2xl text-left font-[300] truncate w-full"
                      title={note.title}
                    >
                      {note.title}
                    </span>
                    {#if note.content}
                      <span
                        class="text-[#919191] text-left text-sm font-[300] line-clamp-2 w-full"
                        title={stripHtml(note.content)}
                      >
                        {getPreviewContent(note.content)}
                      </span>
                    {/if}
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-center py-12">
          <Icon
            icon="mdi:note-outline"
            width="64"
            height="64"
            class="text-gray-500 mb-4"
          />
          <h3 class="text-xl font-semibold mb-2 justify-start flex font-[300]">
            No Notes Found
          </h3>
          <p
            class="text-gray-400 font-[300] justify-start flex text-left text-lg"
          >
            Create your first note to get started.
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .note-item {
    transition: transform 0.1s ease-out;
  }

  .note-item.tapped {
    transform: translate(2px, 2px);
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>

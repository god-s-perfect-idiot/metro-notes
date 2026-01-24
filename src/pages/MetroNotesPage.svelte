<script>
  import { router } from '../lib/router.js';
  import { notes } from '../store/notes.js';
  import { textColorClassStore, accentColorStore } from '../utils/theme.js';
  import Icon from '@iconify/svelte';

  export let isExiting = false;
  export let isEntering = false;

  $: textClass = $textColorClassStore;
  $: accentColor = $accentColorStore;
  $: notesList = $notes;

  let tappedNoteId = null;

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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Get recent notes (last 10)
  $: recentNotes = notesList.slice(0, 10);

  function stripHtml(html) {
    if (!html) return '';
    // Create a temporary div to parse HTML
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Get text content, preserving line breaks
    return tmp.textContent || tmp.innerText || '';
  }

  function getPreviewContent(html) {
    if (!html) return '';
    const text = stripHtml(html);
    // Limit to first 100 characters for preview
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }
</script>

<div class="page-holder h-full">
  <div
    class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
    class:page-exit={isExiting}
    class:page-entering={isEntering}
  >
  <span class="text-base font-[500] h-fit px-4 uppercase mt-2">metro notes</span>
  <span class="text-6xl font-[200] h-auto py-1 px-4">all notes</span>
  <div
    class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
  >
    {#if notesList.length > 0}
      {#each recentNotes as note (note.id)}
        <button
          class="flex flex-col gap-2 w-full min-w-0 note-item text-left"
          class:tapped={tappedNoteId === note.id}
          on:click={() => {
            handleNoteTap(note);
          }}
          on:touchstart={() => handleNoteTap(note)}
        >
          <div class="flex flex-col min-w-0 flex-1 items-start overflow-hidden">
            <span
              class="text-2xl text-left font-[300] truncate w-full"
              title={note.title}
            >
              {note.title}
            </span>
            {#if note.content}
              <span
                class="text-gray-400 text-left text-base font-[300] line-clamp-2 w-full"
                title={stripHtml(note.content)}
              >
                {getPreviewContent(note.content)}
              </span>
            {/if}
            <span
              class="text-gray-500 text-left text-sm font-[300] truncate w-full mt-1"
            >
              {formatDate(note.updatedAt)}
            </span>
          </div>
        </button>
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
    padding: 0.5rem 0;
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


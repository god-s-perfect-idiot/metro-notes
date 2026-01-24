<script>
  import { onMount } from "svelte";
  import { currentRoute, router } from "../lib/router.js";
  import { notesStore, notes } from "../store/notes.js";
  import { textColorClassStore, accentColorStore } from "../utils/theme.js";
  import { addToast } from "../store/toast.js";
  import { backButtonInBottomBarStore } from "../store/settings.js";
  import Icon from "@iconify/svelte";
  import RichTextEditor from "../components/RichTextEditor.svelte";

  export let isExiting = false;
  export let isEntering = false;

  let noteTitle = "";
  let noteContent = "";
  let isSaving = false;
  let noteId = null;
  let isEditing = false;
  let richTextEditorRef = null;

  $: backButtonInBottomBar = $backButtonInBottomBarStore;

  $: route = $currentRoute;
  $: {
    // Extract note ID from route like /notes/123
    const match = route.match(/^\/notes\/(.+)$/);
    const newNoteId = match && match[1] !== "new" ? match[1] : null;
    const newIsEditing = !!newNoteId;
    
    // Only update if note ID changed
    if (newNoteId !== noteId) {
      noteId = newNoteId;
      isEditing = newIsEditing;
      
      // Load note data when editing
      if (newIsEditing && newNoteId) {
        // Get current notes state
        let note = null;
        notesStore.notes.subscribe(noteList => {
          note = noteList.find(n => n.id === newNoteId);
        })();
        if (note) {
          noteTitle = note.title;
          noteContent = note.content;
        }
      } else {
        // Reset form when creating new note
        noteTitle = "";
        noteContent = "";
      }
    }
  }

  // Expose save function to parent
  export function save() {
    handleSave();
  }

  // Expose insertCheckbox function to parent
  export function insertCheckbox(checked = false) {
    if (richTextEditorRef && richTextEditorRef.insertCheckbox) {
      richTextEditorRef.insertCheckbox(checked);
    }
  }

  function handleSave() {
    // Strip HTML tags for validation (check if there's actual content)
    const textContent = noteContent.replace(/<[^>]*>/g, '').trim();
    if (!noteTitle.trim() && !textContent) {
      addToast("Please enter a title or content for your note", "error");
      return;
    }

    isSaving = true;
    
    if (isEditing && noteId) {
      // Update existing note
      notesStore.updateNote(noteId, {
        title: noteTitle.trim() || "Untitled Note",
        content: noteContent
      });
      addToast("Note updated", "success");
    } else {
      // Create new note
      notesStore.createNote(
        noteTitle.trim() || "Untitled Note",
        noteContent
      );
      addToast("Note created", "success");
    }

    // Navigate back to all notes page
    setTimeout(() => {
      router.goto("/");
    }, 100);
  }

  function handleContentInput(e) {
    noteContent = e.detail;
  }

  function handleCancel() {
    router.goto("/");
  }
</script>

<div class="page-holder h-full">
  <div
    class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
    class:page-exit={isExiting}
    class:page-entering={isEntering}
  >
  <div class="flex items-center gap-2 h-fit px-4 uppercase mt-2">
    {#if !backButtonInBottomBar}
      <button
        on:click={() => router.goto("/")}
        class="flex items-center justify-center"
        aria-label="Back to all notes"
      >
        <Icon icon="ion:chevron-back-sharp" width="20" height="20" strokeWidth="2" />
      </button>
    {/if}
    <span class="text-base font-[500]">metro notes</span>
  </div>
  <div
    class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
  >
    <!-- Title Input -->
    <div class="flex flex-col gap-2">
      <input
        type="text"
        bind:value={noteTitle}
        placeholder="Note title..."
        class="text-white bg-transparent w-full pb-3 text-3xl font-[300] outline-none border-b-2 border-gray-400"
      />
    </div>

    <!-- Content Rich Text Editor -->
    <div class="flex flex-col gap-2 flex-1">
      <RichTextEditor
        bind:this={richTextEditorRef}
        value={noteContent}
        placeholder="Start writing..."
        on:input={handleContentInput}
        className="text-white bg-transparent w-full py-3 text-lg font-[300] flex-1"
      />
    </div>

  </div>
  </div>
</div>

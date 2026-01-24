<script>
  import MultiPanel from "../components/MultiPanel.svelte";
  import NotesPanel from "../components/NotesPanel.svelte";
  import SketchesPanel from "../components/SketchesPanel.svelte";
  import SettingsPanel from "../components/SettingsPanel.svelte";
  import AppMenu from "../components/AppMenu.svelte";
  import { menuState, closeMenu, triggerDelete } from "../store/menu.js";

  export let isExiting = false;
  export let isEntering = false;

  $: menu = $menuState;
  $: showMenu = menu.showMenu;
  $: selectedNote = menu.selectedNote;
  $: menuPosition = menu.menuPosition;
  $: menuClosing = menu.menuClosing;

  function handleDeleteNote() {
    triggerDelete();
  }

  function handleMenuClose() {
    closeMenu();
  }

  // Define panels for MultiPanel
  $: panels = [
    {
      title: "all notes",
      panelContent: NotesPanel,
    },
    {
      title: "sketches",
      panelContent: SketchesPanel,
    },
    {
      title: "settings",
      panelContent: SettingsPanel,
    },
  ];
</script>

<div class="page-holder h-full">
  <div
    class="flex flex-col w-full font-[400] h-screen page overflow-x-hidden"
    class:page-exit={isExiting}
    class:page-entering={isEntering}
    role="application"
    on:contextmenu={(e) => {
      if (showMenu) {
        e.preventDefault();
      }
    }}
  >
    <span class="text-base font-[500] h-fit px-4 uppercase mt-2"
      >metro notes</span
    >
    <MultiPanel {panels} />
  </div>

  <!-- App Menu for long press -->
  {#if showMenu}
    <div
      role="dialog"
      aria-label="Note context menu"
      on:contextmenu={(e) => e.preventDefault()}
      style="position: fixed; inset: 0; z-index: 99;"
    >
      <AppMenu
        onDelete={handleDeleteNote}
        on:close={handleMenuClose}
        position={menuPosition}
        closing={menuClosing}
      />
    </div>
  {/if}
</div>

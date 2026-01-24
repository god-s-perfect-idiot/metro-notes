<script>
  import Switch from "./Switch.svelte";
  import { backButtonInBottomBarStore } from "../store/settings.js";

  $: backButtonInBottomBar = $backButtonInBottomBarStore;

  function handleBackButtonToggle(value) {
    backButtonInBottomBarStore.set(value);
  }
</script>

<div
  class="flex flex-col gap-4 pb-20 mt-4 overflow-y-auto overflow-x-hidden px-4 h-full"
>
  <div class="text-start py-4">
    <span class="text-xl justify-start flex font-[300] text-[#ffd84f]">
      display
    </span>
    <div class="flex flex-col gap-4 mt-4">
      <Switch
        title="Back button in bottom bar"
        value={backButtonInBottomBar}
        onToggle={handleBackButtonToggle}
        description={backButtonInBottomBar
          ? "Show the navigation back button in the bottom bar."
          : "Show the back button at the top"}
      />
    </div>
  </div>

  <div class="text-start py-4">
    <span class="text-xl justify-start flex font-[300] text-[#ffd84f]">
      about
    </span>
    <div class="flex flex-col gap-1 mt-4">
      <span class="text-base font-[300]">Metro Notes</span>
      <span class="text-sm font-[300] text-[#a1a1a1]">v1.0.0</span>
    </div>
  </div>
</div>

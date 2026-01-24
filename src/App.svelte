<script>
  import { onMount } from "svelte";
  import { currentRoute, router } from "./lib/router.js";
  import MetroNotesPage from "./pages/MetroNotesPage.svelte";
  import NewNotePage from "./pages/NewNotePage.svelte";
  import NewSketchPage from "./pages/NewSketchPage.svelte";
  import BottomControls from "./components/BottomControls.svelte";
  import Notifier from "./components/Notifier.svelte";
  import Icon from "@iconify/svelte";
  import { bottomBarExpanded, bottomBarUnmounting } from "./store/bottomBar.js";
  import { backButtonInBottomBarStore } from "./store/settings.js";
  import { activePanel } from "./store/activePanel.js";
  import {
    StatusBar as CapacitorStatusBar,
    Style,
  } from "@capacitor/status-bar";

  let route = "/";
  let isExiting = false;
  let newNotePageRef = null;
  let newSketchPageRef = null;
  let isEntering = false;
  let isInitialLoad = true;
  let exitingRoute = null;
  let enteringRoute = null;

  $: route = $currentRoute;
  // Extract pathname for route matching (ignore query string and hash)
  $: routePath = route.split("?")[0].split("#")[0];
  $: console.log("📍 Current route:", route);

  // Track page exit animation
  let previousRoute = route;
  let isExitingBottomBar = false;
  let shouldShowNewBottomBar = true;

  $: {
    const prevRoutePath = previousRoute.split("?")[0].split("#")[0];
    if (prevRoutePath !== routePath) {
      // Skip animation only if previousRoute is empty (very first render)
      if (previousRoute === "" || prevRoutePath === routePath) {
        // Very first render - no animation, just update previousRoute
        previousRoute = route;
      } else {
        // Set which routes are exiting and entering
        exitingRoute = previousRoute;
        enteringRoute = route;

        // Trigger exit animation for the previous page
        isExiting = true;
        // Don't set entering yet - wait for exit animation to complete
        isEntering = false;

        // After exit animation completes (200ms), start entry animation
        setTimeout(() => {
          isExiting = false;
          exitingRoute = null;
          // Now trigger entry animation for new page
          isEntering = true;
          // Reset entering after entry animation completes (another 200ms)
          setTimeout(() => {
            isEntering = false;
            enteringRoute = null;
          }, 200);
        }, 200);

        // Handle bottom bar exit animation
        bottomBarExpanded.set(false);

        const hadBottomBar =
          prevRoutePath === "/" ||
          prevRoutePath === "/notes/new" ||
          (prevRoutePath.startsWith("/notes/") &&
            prevRoutePath !== "/notes/new") ||
          prevRoutePath === "/sketches/new" ||
          (prevRoutePath.startsWith("/sketches/") &&
            prevRoutePath !== "/sketches/new");
        const hasBottomBar = shouldShowBottomBar;

        if (hadBottomBar && !hasBottomBar) {
          // We're leaving a route with bottom bar, trigger exit animation
          isExitingBottomBar = true;
          bottomBarUnmounting.set(true);
          setTimeout(() => {
            isExitingBottomBar = false;
            bottomBarUnmounting.set(false);
          }, 300);
        } else if (!hadBottomBar && hasBottomBar) {
          // We're entering a route with bottom bar, it will creep in
          // The BottomControls component will handle the entry animation
        } else if (hadBottomBar && hasBottomBar) {
          // We're navigating between routes with bottom bars
          // Creep out, then creep back in with button animation
          shouldShowNewBottomBar = false;
          isExitingBottomBar = true;
          bottomBarUnmounting.set(true);
          // After old bar finishes creeping out (300ms), show new bar
          setTimeout(() => {
            isExitingBottomBar = false;
            bottomBarUnmounting.set(false);
            // Delay showing new bar slightly to ensure old one is completely gone
            setTimeout(() => {
              shouldShowNewBottomBar = true;
            }, 50);
          }, 300);
        } else {
          // No bottom bar change, or entering/leaving without bottom bar
          shouldShowNewBottomBar = true;
        }

        previousRoute = route;
      }
    }
  }

  $: shouldShowBottomBar =
    routePath === "/" ||
    routePath === "/notes/new" ||
    (routePath.startsWith("/notes/") && routePath !== "/notes/new") ||
    routePath === "/sketches/new" ||
    (routePath.startsWith("/sketches/") && routePath !== "/sketches/new");
  $: isExpanded = $bottomBarExpanded;
  $: isUnmounting = $bottomBarUnmounting;

  // Determine which buttons to show based on route
  $: isNoteEditRoute =
    routePath.startsWith("/notes/") && routePath !== "/notes/new";
  $: isSketchEditRoute =
    routePath.startsWith("/sketches/") && routePath !== "/sketches/new";
  $: backButtonInBottomBar = $backButtonInBottomBarStore;
  $: currentActivePanel = $activePanel;
  $: bottomBarButtons = getButtonsForRoute(
    routePath,
    isNoteEditRoute,
    isSketchEditRoute,
    backButtonInBottomBar,
    currentActivePanel,
  );

  function getButtonsForRoute(
    path,
    isNoteEdit,
    isSketchEdit,
    showBackInBottomBar,
    activePanelIndex,
  ) {
    if (path === "/notes/new" || isNoteEdit) {
      // Checklist and Save buttons for note editing
      const buttons = [];

      // Only add back button if setting is enabled
      if (showBackInBottomBar) {
        buttons.push({
          icon: "subway:left-arrow",
          text: "back",
          action: () => router.goto("/"),
          ariaLabel: "Back to all notes",
        });
      }

      buttons.push(
        {
          icon: "mdi:checkbox-marked-outline",
          text: "checklist",
          action: () => {
            if (newNotePageRef && newNotePageRef.insertCheckbox) {
              newNotePageRef.insertCheckbox(false);
            }
          },
          ariaLabel: "Insert checklist item",
        },
        {
          icon: "tdesign:save-filled",
          text: "save",
          action: () => {
            if (newNotePageRef && newNotePageRef.save) {
              newNotePageRef.save();
            }
          },
          ariaLabel: "Save note",
        },
      );

      return buttons;
    } else if (path === "/sketches/new" || isSketchEdit) {
      // Save button for sketch editing
      const buttons = [];

      // Only add back button if setting is enabled
      if (showBackInBottomBar) {
        buttons.push({
          icon: "subway:left-arrow",
          text: "back",
          action: () => router.goto("/"),
          ariaLabel: "Back to all sketches",
        });
      }

      buttons.push({
        icon: "tdesign:save-filled",
        text: "save",
        action: () => {
          if (newSketchPageRef && newSketchPageRef.save) {
            newSketchPageRef.save();
          }
        },
        ariaLabel: "Save sketch",
      });

      return buttons;
    } else {
      // Plus button for home page - check which panel is active
      // activePanelIndex: 0 = all notes, 1 = sketches, 2 = settings
      if (activePanelIndex === 1) {
        // Sketches panel is active
        return [
          {
            icon: "rivet-icons:plus",
            text: "sketch",
            action: () => router.goto("/sketches/new"),
            ariaLabel: "Create sketch",
          },
        ];
      } else {
        // Notes panel is active (default)
        return [
          {
            icon: "rivet-icons:plus",
            text: "new",
            action: () => router.goto("/notes/new"),
            ariaLabel: "Create note",
          },
        ];
      }
    }
  }

  function handleToggle(event) {
    bottomBarExpanded.set(event.detail.expanded);
  }

  // Helper function to setup system status bar (always show, non-fullscreen)
  async function setupStatusBar() {
    if (typeof window === "undefined" || !window.Capacitor) return;
    try {
      // Check if StatusBar plugin is available
      if (
        !CapacitorStatusBar ||
        typeof CapacitorStatusBar.show !== "function"
      ) {
        return;
      }
      // Show system status bar (non-fullscreen mode)
      await CapacitorStatusBar.setOverlaysWebView({ overlay: false });
      await CapacitorStatusBar.setStyle({ style: Style.Light });
      await CapacitorStatusBar.show();
    } catch (error) {
      // StatusBar API not available (running in browser or plugin not implemented)
      // Silently ignore - this is expected when running in browser
      if (error.message && error.message.includes("not implemented")) {
        // Expected error when running in browser, don't log
        return;
      }
      // Only log unexpected errors
      console.warn("StatusBar setup warning:", error.message);
    }
  }

  onMount(() => {
    // Setup status bar (non-fullscreen)
    setupStatusBar();

    // Handle initial URL
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const initialPath = path || "/";
      // Set initial route and previousRoute without animation
      previousRoute = initialPath;
      router.goto(initialPath);
    }
  });
</script>

<main class="w-full h-full relative">
  <!-- Main Content -->
  <div class="w-full h-full content-container relative">
    <!-- All Notes Page -->
    {#if routePath === "/" || routePath === "" || (isExiting && exitingRoute && (exitingRoute
          .split("?")[0]
          .split("#")[0] === "/" || exitingRoute
            .split("?")[0]
            .split("#")[0] === ""))}
      <MetroNotesPage
        isExiting={isExiting &&
          exitingRoute &&
          (exitingRoute.split("?")[0].split("#")[0] === "/" ||
            exitingRoute.split("?")[0].split("#")[0] === "")}
        isEntering={isEntering &&
          enteringRoute &&
          (enteringRoute.split("?")[0].split("#")[0] === "/" ||
            enteringRoute.split("?")[0].split("#")[0] === "")}
      />
    {/if}
    <!-- New Note Page or Edit Note Page -->
    {#if routePath === "/notes/new" || (isExiting && exitingRoute === "/notes/new") || (routePath.startsWith("/notes/") && routePath !== "/notes/new") || (isExiting && exitingRoute && exitingRoute.startsWith("/notes/") && exitingRoute !== "/notes/new")}
      <NewNotePage
        bind:this={newNotePageRef}
        isExiting={isExiting &&
          (exitingRoute === "/notes/new" ||
            (exitingRoute &&
              exitingRoute.startsWith("/notes/") &&
              exitingRoute !== "/notes/new"))}
        isEntering={isEntering &&
          (enteringRoute === "/notes/new" ||
            (enteringRoute &&
              enteringRoute.startsWith("/notes/") &&
              enteringRoute !== "/notes/new"))}
      />
    {/if}
    <!-- New Sketch Page or Edit Sketch Page -->
    {#if routePath === "/sketches/new" || (isExiting && exitingRoute === "/sketches/new") || (routePath.startsWith("/sketches/") && routePath !== "/sketches/new") || (isExiting && exitingRoute && exitingRoute.startsWith("/sketches/") && exitingRoute !== "/sketches/new")}
      <NewSketchPage
        bind:this={newSketchPageRef}
        isExiting={isExiting &&
          (exitingRoute === "/sketches/new" ||
            (exitingRoute &&
              exitingRoute.startsWith("/sketches/") &&
              exitingRoute !== "/sketches/new"))}
        isEntering={isEntering &&
          (enteringRoute === "/sketches/new" ||
            (enteringRoute &&
              enteringRoute.startsWith("/sketches/") &&
              enteringRoute !== "/sketches/new"))}
      />
    {/if}
  </div>

  <!-- Bottom Bar -->
  <!-- When navigating between bottom bars, show exiting bar with no buttons, then show new bar -->
  {#if shouldShowBottomBar || isExitingBottomBar}
    {#if (shouldShowBottomBar && shouldShowNewBottomBar) || isExitingBottomBar}
      <BottomControls
        expanded={isExpanded}
        unmounting={isUnmounting ||
          (isExitingBottomBar && !shouldShowNewBottomBar)}
        buttons={isExitingBottomBar && !shouldShowNewBottomBar
          ? []
          : bottomBarButtons}
        isEntering={shouldShowBottomBar &&
          shouldShowNewBottomBar &&
          !isExitingBottomBar}
        on:toggle={handleToggle}
      />
    {/if}
  {/if}

  <!-- Toast Notifications -->
  <Notifier />
</main>

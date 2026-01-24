<script>
  import { onMount } from "svelte";
  import { currentRoute, router } from "../lib/router.js";
  import { sketchesStore, sketches } from "../store/sketches.js";
  import { addToast } from "../store/toast.js";
  import { backButtonInBottomBarStore } from "../store/settings.js";
  import Icon from "@iconify/svelte";

  export let isExiting = false;
  export let isEntering = false;

  let canvasRef = null;
  let containerRef = null;
  let ctx = null;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let sketchId = null;
  let isEditing = false;
  let isSaving = false;
  let lineWidth = 3;
  let strokeColor = "#ffffff";
  let sketchImageDataToLoad = null; // Store image data to load after canvas is ready
  let imageLoaded = false; // Track if image has been loaded to prevent clearing

  $: backButtonInBottomBar = $backButtonInBottomBarStore;

  $: route = $currentRoute;
  $: {
    // Extract sketch ID from route like /sketches/123
    const match = route.match(/^\/sketches\/(.+)$/);
    const newSketchId = match && match[1] !== "new" ? match[1] : null;
    const newIsEditing = !!newSketchId;

    // Only update if sketch ID changed
    if (newSketchId !== sketchId) {
      sketchId = newSketchId;
      isEditing = newIsEditing;

      // Load sketch data when editing
      if (newIsEditing && newSketchId) {
        // Get current sketches state
        let sketch = null;
        sketchesStore.sketches.subscribe((sketchList) => {
          sketch = sketchList.find((s) => s.id === newSketchId);
        })();
        if (sketch && sketch.imageData) {
          // Store image data to load after canvas is ready
          sketchImageDataToLoad = sketch.imageData;
          imageLoaded = false;
          canvasInitialized = false; // Reset initialization flag to allow setup
          // Try to load immediately if canvas is ready
          if (canvasRef && ctx && canvasRef.width > 0 && canvasRef.height > 0) {
            loadImageToCanvas(sketch.imageData);
            sketchImageDataToLoad = null;
            imageLoaded = true;
            canvasInitialized = true;
          }
        } else {
          sketchImageDataToLoad = null;
          imageLoaded = false;
          canvasInitialized = false;
        }
      } else {
        // Clear canvas when creating new sketch
        sketchImageDataToLoad = null;
        imageLoaded = false;
        canvasInitialized = false;
        if (canvasRef && ctx) {
          clearCanvas();
        }
      }
    }
  }

  // Track if canvas has been initialized to prevent multiple setups
  let canvasInitialized = false;

  // Watch for when both canvas and container are ready
  $: if (canvasRef && containerRef && !canvasInitialized) {
    if (!ctx) {
      ctx = canvasRef.getContext("2d");
    }
    // Wait for container to have proper dimensions before setting up canvas
    const checkAndSetup = () => {
      if (containerRef && canvasRef && ctx && !canvasInitialized) {
        const rect = containerRef.getBoundingClientRect();
        // Check for reasonable dimensions (at least 200px wide to avoid initial incorrect sizing)
        // Also check that width is close to window width (within 50px) to ensure layout is complete
        const minWidth = 200;
        const expectedWidth = window.innerWidth;
        const widthDiff = Math.abs(rect.width - expectedWidth);

        if (rect.width >= minWidth && rect.height > 0 && widthDiff < 50) {
          // Check if canvas needs initialization or resizing
          const dpr = window.devicePixelRatio || 1;
          const currentCanvasDisplayWidth = canvasRef.width / dpr;
          const sizeMismatch =
            Math.abs(currentCanvasDisplayWidth - rect.width) > 10;

          // Setup if canvas hasn't been initialized, or if size doesn't match container
          if (canvasRef.width === 0 || canvasRef.height === 0 || sizeMismatch) {
            // If we have image data to load, don't clear background
            const shouldClearBackground = !sketchImageDataToLoad;
            setupCanvas(shouldClearBackground);
            canvasInitialized = true;

            // If setupCanvas didn't load the image (maybe it wasn't ready), try loading now
            if (
              sketchImageDataToLoad &&
              canvasRef.width > 0 &&
              canvasRef.height > 0
            ) {
              // Wait a bit for setupCanvas to complete, then load image
              setTimeout(() => {
                if (sketchImageDataToLoad && canvasRef && ctx) {
                  loadImageToCanvas(sketchImageDataToLoad);
                  sketchImageDataToLoad = null;
                }
              }, 50);
            }
          } else if (
            sketchImageDataToLoad &&
            canvasRef.width > 0 &&
            canvasRef.height > 0
          ) {
            // Canvas is already initialized, just load the image without resizing
            loadImageToCanvas(sketchImageDataToLoad);
            sketchImageDataToLoad = null;
            canvasInitialized = true;
          } else if (canvasRef.width > 0 && canvasRef.height > 0) {
            // Canvas is already initialized and sized correctly
            canvasInitialized = true;
          }
        } else {
          // Container not properly sized yet, try again
          requestAnimationFrame(checkAndSetup);
        }
      }
    };
    // Use multiple frames to ensure layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(checkAndSetup);
    });
  }

  onMount(() => {
    // Setup ResizeObserver to watch container size changes
    let resizeObserver = null;

    const setupResizeObserver = () => {
      if (containerRef && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver((entries) => {
          if (canvasRef && ctx && entries.length > 0) {
            const entry = entries[0];
            const { width, height } = entry.contentRect;

            // Only update if dimensions are valid and different from current canvas size
            if (width > 200 && height > 0) {
              const dpr = window.devicePixelRatio || 1;
              const currentCanvasDisplayWidth = canvasRef.width / dpr;

              // Update canvas if size changed significantly (more than 50px difference)
              // Only resize if there's a significant size change to avoid unnecessary clears
              // And only if canvas is initialized
              if (
                Math.abs(currentCanvasDisplayWidth - width) > 50 &&
                canvasInitialized
              ) {
                setupCanvas(false);
              }
            }
          }
        });
        resizeObserver.observe(containerRef);
      }
    };

    // Try to setup immediately, or wait a bit if containerRef isn't ready yet
    if (containerRef) {
      setupResizeObserver();
    } else {
      // Wait for containerRef to be available
      setTimeout(setupResizeObserver, 100);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  });

  function setupCanvas(clearBackground = true) {
    if (!canvasRef || !ctx) return;

    // If image is already loaded and we're not supposed to clear, and canvas is already sized, don't reset
    // This prevents clearing when drawing, but allows initial setup when loading a sketch
    if (
      imageLoaded &&
      !clearBackground &&
      canvasRef.width > 0 &&
      canvasRef.height > 0 &&
      !sketchImageDataToLoad // Don't skip if we still have sketch data to load
    ) {
      // Just ensure drawing styles are set, don't reset canvas
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      return;
    }

    // Store current content if we're resizing or if we have sketch data to preserve
    let currentImageData = null;
    if (!clearBackground) {
      if (canvasRef.width > 0 && canvasRef.height > 0) {
        // Canvas already has content, preserve it
        const currentData = canvasRef.toDataURL("image/png");
        if (currentData.length > 22) {
          // "data:image/png;base64," is 22 chars, so if longer, there's content
          currentImageData = currentData;
        } else if (sketchImageDataToLoad) {
          // No content yet, use sketch data to load
          currentImageData = sketchImageDataToLoad;
        }
      } else if (sketchImageDataToLoad) {
        // Canvas not initialized yet, but we have sketch data to load
        currentImageData = sketchImageDataToLoad;
      }
    }

    // Get container dimensions - prefer containerRef, fallback to parentElement
    let displayWidth, displayHeight;
    const container = containerRef || canvasRef.parentElement;

    if (container) {
      const rect = container.getBoundingClientRect();
      displayWidth = rect.width;
      displayHeight = rect.height;

      // If container has no dimensions or suspiciously small dimensions, don't proceed
      // Check that width is reasonable (at least 200px and close to window width)
      if (displayWidth === 0 || displayHeight === 0 || displayWidth < 200) {
        return;
      }

      // If width is way off from window width, the container might not be laid out yet
      const expectedWidth = window.innerWidth;
      if (Math.abs(displayWidth - expectedWidth) > 100) {
        return;
      }
    } else {
      // Fallback to window size
      displayWidth = window.innerWidth;
      displayHeight = window.innerHeight;
    }

    // Get device pixel ratio for high-DPI displays
    const dpr = window.devicePixelRatio || 1;

    // Set canvas internal size (accounting for device pixel ratio)
    canvasRef.width = displayWidth * dpr;
    canvasRef.height = displayHeight * dpr;

    // Set canvas CSS size to match display size
    canvasRef.style.width = displayWidth + "px";
    canvasRef.style.height = displayHeight + "px";

    // Reset transform and scale the context to account for device pixel ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(dpr, dpr);

    // Fill canvas with black background only if requested
    if (clearBackground) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    } else if (currentImageData) {
      // Restore previous content after resize or load sketch image
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        if (currentImageData === sketchImageDataToLoad) {
          sketchImageDataToLoad = null;
        }
        imageLoaded = true; // Mark as loaded
      };
      img.onerror = () => {
        console.error("Failed to load sketch image");
        // Fill with black if image fails to load
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, displayWidth, displayHeight);
      };
      img.src = currentImageData;
    } else if (
      sketchImageDataToLoad &&
      canvasRef.width > 0 &&
      canvasRef.height > 0
    ) {
      // Fallback: if we have sketch data but currentImageData wasn't set, load it now
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        sketchImageDataToLoad = null;
        imageLoaded = true;
      };
      img.onerror = () => {
        console.error("Failed to load sketch image");
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, displayWidth, displayHeight);
      };
      img.src = sketchImageDataToLoad;
    }

    // Set drawing styles
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function loadImageToCanvas(imageData) {
    if (!canvasRef || !ctx || !imageData) return;

    // Don't call setupCanvas here - it should already be set up
    // setupCanvas would clear the canvas, which we don't want when loading an existing sketch

    const img = new Image();
    img.onload = () => {
      // Get display dimensions (not internal canvas dimensions)
      const container = containerRef || canvasRef.parentElement;
      let displayWidth, displayHeight;
      if (container) {
        const rect = container.getBoundingClientRect();
        displayWidth = rect.width;
        displayHeight = rect.height;
      } else {
        displayWidth = window.innerWidth;
        displayHeight = window.innerHeight;
      }

      // Draw the image, scaling to fit canvas display size
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      // Re-apply stroke style after loading image
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Mark image as loaded
      imageLoaded = true;
    };
    img.src = imageData;
  }

  function clearCanvas() {
    if (!canvasRef || !ctx) return;

    // Get display dimensions (not internal canvas dimensions)
    const container = containerRef || canvasRef.parentElement;
    let displayWidth, displayHeight;
    if (container) {
      const rect = container.getBoundingClientRect();
      displayWidth = rect.width;
      displayHeight = rect.height;
    } else {
      displayWidth = window.innerWidth;
      displayHeight = window.innerHeight;
    }

    // Fill with black background instead of clearing
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    // Re-apply stroke style
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function getTouchPos(e) {
    const rect = canvasRef.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches) {
      // Touch end/cancel event
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getTouchPos(e);
    lastX = pos.x;
    lastY = pos.y;
  }

  function draw(e) {
    if (!isDrawing || !ctx) return;
    e.preventDefault();

    const pos = getTouchPos(e);

    // Ensure stroke style is set before drawing
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDrawing(e) {
    if (isDrawing) {
      e.preventDefault();
      isDrawing = false;
    }
  }

  // Expose save function to parent
  export function save() {
    handleSave();
  }

  function handleSave() {
    if (!canvasRef) {
      addToast("Canvas not ready", "error");
      return;
    }

    isSaving = true;

    // Get image data from canvas
    const imageData = canvasRef.toDataURL("image/png");

    if (isEditing && sketchId) {
      // Update existing sketch
      sketchesStore.updateSketch(sketchId, {
        imageData: imageData,
      });
      addToast("Sketch updated", "success");
    } else {
      // Create new sketch
      sketchesStore.createSketch(imageData);
      addToast("Sketch created", "success");
    }

    // Navigate back to all sketches page
    setTimeout(() => {
      router.goto("/");
    }, 100);
  }

  function handleCancel() {
    router.goto("/");
  }

  // Handle window resize
  function handleResize() {
    if (canvasRef && ctx) {
      // Don't clear background on resize, preserve content
      setupCanvas(false);
    }
  }

  onMount(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });
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
          aria-label="Back to all sketches"
        >
          <Icon
            icon="ion:chevron-back-sharp"
            width="20"
            height="20"
            strokeWidth="2"
          />
        </button>
      {/if}
      <span class="text-base font-[500]">metro notes</span>
    </div>
    <div
      class="flex-1 relative overflow-hidden min-h-0"
      bind:this={containerRef}
    >
      <canvas
        bind:this={canvasRef}
        class="absolute inset-0 touch-none"
        style="display: block; width: 100%; height: 100%;"
        on:touchstart={startDrawing}
        on:touchmove={draw}
        on:touchend={stopDrawing}
        on:touchcancel={stopDrawing}
        on:mousedown={startDrawing}
        on:mousemove={draw}
        on:mouseup={stopDrawing}
        on:mouseleave={stopDrawing}
      ></canvas>
    </div>
  </div>
</div>

<style>
  canvas {
    background-color: #000000;
    cursor: crosshair;
  }
</style>

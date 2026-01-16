<script>
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { backgroundThemeStore, textColorClassStore } from '../utils/theme.js';

	export let expanded = false;
	export let unmounting = false;
	export let buttons = [];
	export let isEntering = false;

	const dispatch = createEventDispatcher();
	
	let isMounted = false;
	let internalIsEntering = false;
	let buttonsAnimate = false;
	let shouldAnimateButtons = false;
	
	$: backgroundTheme = $backgroundThemeStore;
	$: textClass = $textColorClassStore;
	// Invert: use #dedede in light mode, dark gray in dark mode
	$: bottomBarBg = backgroundTheme === 'light' ? '#dedede' : '#1f1f1f';

	// Track previous unmounting state to detect when bottom bar re-enters
	let wasUnmounting = false;

	// When unmounting, set up for button animation on re-entry
	$: if (unmounting) {
		// Reset button animation when unmounting
		buttonsAnimate = false;
		shouldAnimateButtons = false;
		internalIsEntering = false;
		wasUnmounting = true;
	}

	// When unmounting finishes, immediately prepare for button animation
	// This must happen BEFORE isEntering becomes true to prevent flash
	$: if (!unmounting && wasUnmounting) {
		// Set shouldAnimateButtons immediately so buttons are hidden before they render
		shouldAnimateButtons = true;
		buttonsAnimate = false;
		wasUnmounting = false;
	}

	// When bottom bar enters after unmounting, trigger creep-in and button animation
	$: if (isEntering && !unmounting && isMounted && shouldAnimateButtons) {
		internalIsEntering = true;
		
		// After creep-in animation completes (300ms), animate buttons
		setTimeout(() => {
			buttonsAnimate = true;
			internalIsEntering = false;
		}, 300);
	}

	// Reset shouldAnimateButtons when not entering after unmount
	$: if (!isEntering && !unmounting && isMounted && !wasUnmounting && shouldAnimateButtons) {
		shouldAnimateButtons = false;
		buttonsAnimate = false;
	}

	onMount(() => {
		internalIsEntering = true;
		// Add a small delay to ensure the initial state is properly set
		setTimeout(() => {
			isMounted = true;
			// Remove entering animation after it completes (only on initial mount)
			if (!isEntering) {
				setTimeout(() => {
					internalIsEntering = false;
				}, 300);
			}
		}, 100);
	});

	function toggleExpanded() {
		// Dispatch event to parent instead of managing local state
		dispatch('toggle', { expanded: !expanded });
	}
</script>

<div class="fixed bottom-0 left-0 right-0 z-50 bottom-bar-wrapper" class:entering={internalIsEntering || (isEntering && isMounted)} class:exiting={unmounting} style="background-color: {bottomBarBg};">
	<!-- Toggle Button (Always visible) -->
	<div class="right-4 absolute top-0 z-10">
		<button
			on:click={toggleExpanded}
			class="{textClass} transition-colors duration-200 leading-none font-[600] cursor-pointer flex items-center justify-center"
			aria-label="Toggle bottom controls"
		>
			<Icon icon="mdi:dots-horizontal" width="32" height="32" />
		</button>
	</div>
	<!-- Bottom Controls Bar -->
	<div
		class="bottom-bar-container overflow-hidden flex justify-center items-center"
		class:initial={!isMounted}
		class:mounted={isMounted && !expanded && !unmounting}
		class:expanded={isMounted && expanded && !unmounting}
		class:unmounting={unmounting}
		data-expanded={expanded}
		data-classes="collapsed:{!expanded} expanded:{expanded}"
	>
		<!-- Content Container -->
		<div class="px-4 w-full flex justify-center items-center h-full">
			<!-- Buttons Container -->
			<div class="flex gap-12 items-center justify-center w-full h-full">
				{#each buttons as button}
					<div
						class="flex flex-col justify-center items-center transition-all duration-300 ease-in-out button-wrapper"
						class:btn-animate={shouldAnimateButtons}
						class:gap-2={expanded}
						class:gap-0={!expanded}
						class:animate={buttonsAnimate}
					>
						<button
							class="flex items-center justify-center border border-white rounded-full !border-2 p-2 font-bold shrink-0"
							on:click={button.action}
							aria-label={button.ariaLabel}
						>
							<Icon icon={button.icon} width="18" height="18" strokeWidth="2" />
						</button>
						<span 
							class="text-xs font-[400] transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden block"
							class:opacity-0={!expanded}
							class:opacity-100={expanded}
							class:max-h-0={!expanded}
							class:max-h-6={expanded}
						>{button.text}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
    .bottom-bar-container {
        transition: height 0.3s ease-in-out, min-height 0.3s ease-in-out, max-height 0.3s ease-in-out, visibility 0s linear 0.3s;
        height: 0px;
        overflow: hidden;
        visibility: hidden;
    }
    
    .bottom-bar-container.initial {
        height: 0px !important;
        visibility: hidden !important;
        transition: height 0.3s ease-in-out, visibility 0s linear 0.3s;
    }
    
    .bottom-bar-container.mounted {
        height: 60px;
        min-height: 60px;
        max-height: 60px;
        visibility: visible;
        transition: height 0.3s ease-in-out, min-height 0.3s ease-in-out, max-height 0.3s ease-in-out, visibility 0s linear 0s;
    }
    
    .bottom-bar-container.expanded {
        height: 80px;
        min-height: 80px;
        max-height: 80px;
        visibility: visible;
        transition: height 0.3s ease-in-out, min-height 0.3s ease-in-out, max-height 0.3s ease-in-out, visibility 0s linear 0s;
    }

    .bottom-bar-container.unmounting {
        height: 0px !important;
        visibility: hidden !important;
        transition: height 0.3s ease-in-out, visibility 0s linear 0.3s;
    }

    .bottom-bar-wrapper {
        min-height: 60px;
    }
    
    .bottom-bar-wrapper.entering {
        animation: bottomBarCreepIn 0.3s ease-out forwards;
    }
    
    .bottom-bar-wrapper.exiting {
        animation: bottomBarCreepOut 0.3s ease-out forwards;
    }
    
    @keyframes bottomBarCreepIn {
        from {
            transform: translateY(100%);
        }
        to {
            transform: translateY(0);
        }
    }
    
    @keyframes bottomBarCreepOut {
        from {
            transform: translateY(0);
        }
        to {
            transform: translateY(100%);
        }
    }

    .button-wrapper {
        will-change: transform, opacity;
    }

    /* Ensure buttons with btn-animate are hidden immediately when not animating */
    .button-wrapper.btn-animate:not(.animate) {
        opacity: 0 !important;
        transform: translateY(120%) !important;
        transition: none !important;
    }
</style>
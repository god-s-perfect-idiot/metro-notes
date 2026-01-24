<script>
  import { onMount, createEventDispatcher } from 'svelte';

  export let value = '';
  export let placeholder = 'Start writing...';
  export let className = '';

  const dispatch = createEventDispatcher();
  let editorElement;
  let isComposing = false;

  $: if (editorElement && !isComposing && editorElement.innerHTML !== value) {
    // Only update if the value changed externally
    const currentContent = editorElement.innerHTML;
    if (currentContent !== value) {
      editorElement.innerHTML = value || '';
      attachCheckboxListeners();
    }
  }

  function handleInput() {
    if (!editorElement) return;
    isComposing = false;
    const html = editorElement.innerHTML;
    value = html;
    dispatch('input', html);
  }

  function handleCompositionStart() {
    isComposing = true;
  }

  function handleCompositionEnd() {
    isComposing = false;
    handleInput();
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  }

  export function insertCheckbox(checked = false) {
    if (!editorElement) return;
    
    const selection = window.getSelection();
    let range;
    
    // Check if editor was already focused before we focus it
    const wasEditorFocused = document.activeElement === editorElement;
    
    // Check if selection is within the editor
    let hasValidSelection = false;
    if (wasEditorFocused && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      const isInEditor = editorElement.contains(currentRange.commonAncestorContainer);
      
      if (isInEditor) {
        range = currentRange;
        hasValidSelection = true;
      }
    }
    
    // Focus the editor
    editorElement.focus();
    
    // If we didn't have a valid selection (editor wasn't focused), create range at end of editor
    if (!hasValidSelection) {
      range = document.createRange();
      range.selectNodeContents(editorElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'rich-text-checkbox';
    checkbox.addEventListener('change', handleInput);
    checkbox.checked = checked;
    
    const label = document.createElement('span');
    label.className = 'rich-text-checkbox-label';
    label.contentEditable = 'true';
    
    const containerDiv = document.createElement('div');
    containerDiv.className = 'rich-text-checkbox-container';
    containerDiv.appendChild(checkbox);
    containerDiv.appendChild(label);
    
    // Insert checkbox at cursor position
    range.deleteContents();
    range.insertNode(containerDiv);
    
    // Move cursor to label
    const newRange = document.createRange();
    newRange.setStart(label, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    handleInput();
  }

  function handleClick(e) {
    // Handle checkbox clicks
    if (e.target.type === 'checkbox') {
      handleInput();
    }
  }

  function handleContextMenu(e) {
    e.preventDefault();
    return false;
  }

  function handleSelectStart(e) {
    // Allow selection only when actively editing (focused)
    if (document.activeElement !== editorElement) {
      e.preventDefault();
      return false;
    }
  }

  function attachCheckboxListeners() {
    if (!editorElement) return;
    const checkboxes = editorElement.querySelectorAll('.rich-text-checkbox');
    checkboxes.forEach(checkbox => {
      // Remove existing listeners and add new one
      const newCheckbox = checkbox.cloneNode(true);
      newCheckbox.addEventListener('change', handleInput);
      checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    });
  }

  onMount(() => {
    if (editorElement) {
      editorElement.innerHTML = value || '';
      attachCheckboxListeners();
    }
  });

</script>

<div
  bind:this={editorElement}
  contenteditable="true"
  class="rich-text-editor {className}"
  on:input={handleInput}
  on:paste={handlePaste}
  on:click={handleClick}
  on:contextmenu={handleContextMenu}
  on:selectstart={handleSelectStart}
  on:compositionstart={handleCompositionStart}
  on:compositionend={handleCompositionEnd}
  data-placeholder={placeholder}
  role="textbox"
  aria-multiline="true"
></div>

<style>
  .rich-text-editor {
    min-height: 100px;
    outline: none;
    word-wrap: break-word;
    white-space: pre-wrap;
    display: block;
  }
  
  .rich-text-editor.flex-1 {
    flex: 1 1 0%;
  }

  .rich-text-editor:empty:before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
  }

  .rich-text-checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.25rem 0;
  }

  .rich-text-checkbox {
    cursor: pointer;
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    accent-color: currentColor;
  }

  .rich-text-checkbox-label {
    flex: 1;
    min-width: 0;
  }

  .rich-text-checkbox-label:focus {
    outline: none;
  }
</style>


<template>
  <div ref="editorContainer" class="border border-gray-300 rounded"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, type PropType } from 'vue';
import { EditorView } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell'; // Import shell mode for bash
import { turtle } from 'codemirror-lang-turtle';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  contentType: {
    type: String as PropType<string | null>,
    default: null,
  },
  language: { // Add language prop
    type: String as PropType<'bash' | 'turtle' | null>,
    default: null,
  },
});

const editorContainer = ref<HTMLElement | null>(null);
let editorView: EditorView | null = null;

const setupEditor = () => {
  if (editorView) {
    editorView.destroy();
    editorView = null;
  }

  if (editorContainer.value && props.modelValue !== null) {
    let languageExtension: Extension[] = [];
    // Prioritize language prop
    if (props.language === 'bash') {
      languageExtension = [StreamLanguage.define(shell)];
    } else if (props.language === 'turtle' || props.contentType?.includes('text/turtle') || props.contentType?.includes('application/n-triples')) {
      languageExtension = [turtle()];
    }
    // Add other languages here if needed

    const startState = EditorState.create({
      doc: props.modelValue,
      extensions: [
        EditorView.lineWrapping,
        EditorView.editable.of(false),
        ...languageExtension,
      ],
    });

    editorView = new EditorView({
      state: startState,
      parent: editorContainer.value,
    });
    console.log('Read-only CodeMirror instance created/updated.');
  } else {
    console.log('Read-only editor container not ready or no text results.');
  }
};

watch(() => props.modelValue, () => {
  setupEditor();
});

// Watch both modelValue and language/contentType
watch([() => props.modelValue, () => props.language, () => props.contentType], () => {
  setupEditor();
});

onMounted(() => {
  setupEditor();
});

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy();
    editorView = null;
  }
});
</script>

<template>
  <div class="quick-notes-editor">
    <MdEditor
      v-model="content"
      :type="editorType"
      :editorId="editorId"
      @onChange="handleChange"
      :toolbars="toolbars"
      :preview="isPreviewOnly"
    >
      <template #defToolbars>
        <NormalToolbar title="预览切换" @onClick="togglePreviewMode">
          <template #trigger>
            <button>
              {{ isPreviewOnly ? '编辑模式' : '预览模式' }}
            </button>
          </template>
        </NormalToolbar>
      </template>
    </MdEditor>
    <MdPreview v-if="isPreviewOnly" :modelValue="content" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'
import { MdEditor, MdPreview, NormalToolbar, ToolbarNames, config } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import 'md-editor-v3/lib/preview.css'

const props = defineProps({
  initialContent: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['content-changed'])

const editorId = 'quick-notes-editor'
const content = ref(props.initialContent)
const isPreviewOnly = ref(false)

config({
  iconfontType: 'class'
})

const toolbars: (ToolbarNames | number)[] = [
  'bold',
  'underline',
  'title',
  'unorderedList',
  'orderedList',
  '-',
  0,
  'preview',
  'katex',
]

const handleChange = (value: string) => {
  emit('content-changed', value)
}

const togglePreviewMode = () => {
  isPreviewOnly.value = !isPreviewOnly.value
}

const editorType = ref('markdown')

watch(() => props.initialContent, (newValue) => {
  content.value = newValue
})
</script>

<style scoped>
.quick-notes-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.md-editor) {
  height: 100% !important;
  display: flex;
  flex-direction: column;
}

:deep(.md-editor-toolbar) {
  padding: 0;
}

:deep(.md-editor-content) {
  flex: 1;
  padding: 0 !important;
}

:deep(.md-editor-input) {
  padding: 0 !important;
}

:deep(.md-editor-preview) {
  padding: 0 !important;
}

.md-preview {
  height: 100%;
  overflow-y: auto;
  padding: 0;
}
</style>

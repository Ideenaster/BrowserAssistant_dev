<template>
    <div class="quick-notes-container">
        <div class="sidebar" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
            <div class="sidebar-content" v-show="!isSidebarCollapsed">
                <DirectoryTree @node-selected="handleNodeSelected" />
            </div>
            <div class="sidebar-toggle" @click="toggleSidebar">
                <el-icon v-if="isSidebarCollapsed"><ArrowRight /></el-icon>
                <el-icon v-else><ArrowLeft /></el-icon>
            </div>
        </div>
        <div class="main-content">
            <Editor :initialContent="currentContent" @content-changed="handleContentChanged" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import DirectoryTree from './DirectoryTree.vue'
import Editor from './Editor.vue'

const currentContent = ref('')
const currentNode = ref<any>(null)
const isSidebarCollapsed = ref(false)

const handleNodeSelected = (node: any) => {
    currentNode.value = node
    currentContent.value = node.content || ''
}

const handleContentChanged = (newContent: string) => {
    if (currentNode.value) {
        currentNode.value.content = newContent
        saveTreeData()
    }
}

const saveTreeData = () => {
    const treeData = JSON.parse(localStorage.getItem('directoryTreeData') || '[]')
    updateNodeContent(treeData, currentNode.value)
    localStorage.setItem('directoryTreeData', JSON.stringify(treeData))
}

const updateNodeContent = (nodes: any[], targetNode: any) => {
    for (const node of nodes) {
        if (node.id === targetNode.id) {
            node.content = targetNode.content
            return true
        }
        if (node.children && updateNodeContent(node.children, targetNode)) {
            return true
        }
    }
    return false
}

const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
}

onMounted(() => {
    const lastEditedNode = JSON.parse(localStorage.getItem('lastEditedNode') || 'null')
    if (lastEditedNode) {
        handleNodeSelected(lastEditedNode)
    }
})

</script>

<style scoped>
.quick-notes-container {
    display: flex;
    height: 100vh;
    width: 100%;
    overflow: hidden; /* 添加这行 */
}

.sidebar {
    width: 170px;
    border-right: 1px solid #e0e0e0;
    transition: width 0.3s;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0; /* 修改这行 */
    margin: 0; /* 添加这行 */
}

.sidebar-collapsed {
    width: 20px;
}

.sidebar-content {
    flex: 1;
    overflow: auto;
}

.sidebar-toggle {
    position: absolute;
    top: 10px;
    right: 5px;
    cursor: pointer;
    z-index: 1;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;
    overflow: hidden; /* 修改这行 */
}
</style>





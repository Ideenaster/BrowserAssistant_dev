<template>
  <div class="directory-tree-container">
    <el-scrollbar>
      <div class="directory-tree">
        <el-button @click="addRootNode" size="small" style="margin-bottom: 0px;margin-top: 0px;">新建根目录</el-button>
        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="defaultProps"
          @node-click="handleNodeClick"
          node-key="id"
        >
          <template #default="{ node, data }">
            <div class="custom-tree-node">
              <span class="node-label">
                <el-icon style="margin-right: 4px;">
                  <Folder v-if="data.type === 'directory'" />
                  <Document v-else />
                </el-icon>
                {{ node.label }}
              </span>
              <el-dropdown trigger="click">
                <el-button size="small" style="padding: 2px 4px;font-size:15px;">
                  <el-icon><More /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <template v-if="data.type === 'directory'">
                      <el-dropdown-item @click="appendNode(data)">添加子目录</el-dropdown-item>
                      <el-dropdown-item @click="addMdFile(data)">添加Markdown文件</el-dropdown-item>
                      <el-dropdown-item @click="editNode(node, data)">编辑</el-dropdown-item>
                      <el-dropdown-item @click="removeNode(node, data)">删除</el-dropdown-item>
                    </template>
                    <template v-else>
                      <el-dropdown-item @click="editNode(node, data)">编辑</el-dropdown-item>
                      <el-dropdown-item @click="removeNode(node, data)">删除</el-dropdown-item>
                    </template>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-tree>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { More, Folder, Document } from '@element-plus/icons-vue'
import { ref, onMounted } from 'vue'
import { ElTree, ElMessageBox, ElMessage } from 'element-plus'

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  type: 'directory' | 'file';
  content?: string;
}

const emit = defineEmits(['node-selected'])

const treeRef = ref<InstanceType<typeof ElTree>>()
const treeData = ref<TreeNode[]>([])

const defaultProps = {
  children: 'children',
  label: 'label'
}

const handleNodeClick = (data: TreeNode) => {
  if (data.type === 'file') {
    emit('node-selected', data)
  }
}

const loadTreeData = () => {
  const storedData = localStorage.getItem('directoryTreeData')
  if (storedData) {
    treeData.value = JSON.parse(storedData)
  } else {
    treeData.value = [] // 初始化为空数组，而不是默认的根目录
  }
}

const saveTreeData = () => {
  localStorage.setItem('directoryTreeData', JSON.stringify(treeData.value))
}

const validateNodeName = (name: string, parent: TreeNode | null, type: 'directory' | 'file'): boolean => {
  if (!name.trim()) {
    ElMessage.error('名称不能为空')
    return false
  }

  const siblings = parent ? parent.children : treeData.value
  const exists = siblings?.some(node => 
    node.label === name && node.type === type
  )
  
  if (exists) {
    ElMessage.error(`该${type === 'directory' ? '目录' : '文件'}名称已存在`)
    return false
  }
  
  return true
}

const appendNode = (data: TreeNode) => {
  ElMessageBox.prompt('请输入目录名称', '新建目录', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(({ value }) => {
    if (!validateNodeName(value, data, 'directory')) {
      return Promise.reject()
    }
    const newChild: TreeNode = { 
      id: Date.now().toString(), 
      label: value, 
      children: [],
      type: 'directory'
    }
    if (!data.children) {
      data.children = []
    }
    data.children.push(newChild)
    saveTreeData()
  }).catch(() => {
    ElMessage.info('取消新建目录')
  })
}

const editNode = (node: any, data: TreeNode) => {
  const actionText = data.type === 'directory' ? '目录' : 'Markdown文件'
  ElMessageBox.prompt(`请输入新的${actionText}名称`, `编辑${actionText}`, {
    inputValue: data.label,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(({ value }) => {
    if (!validateNodeName(value, node.parent.data, data.type)) {
      return Promise.reject()
    }
    data.label = value
    saveTreeData()
  }).catch(() => {
    ElMessage.info('取消编辑')
  })
}

const removeNode = (node: any, data: TreeNode) => {
  const actionText = data.type === 'directory' ? '目录' : 'Markdown文件'
  ElMessageBox.confirm(`确定要删除该${actionText}吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const parent = node.parent
    const children = parent.data.children || parent.data
    const index = children.findIndex((d: TreeNode) => d.id === data.id)
    children.splice(index, 1)
    saveTreeData()
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

const addRootNode = () => {
  ElMessageBox.prompt('请输入根目录名称', '新建根目录', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(({ value }) => {
    if (!validateNodeName(value, null, 'directory')) {
      return Promise.reject()
    }
    const newRoot: TreeNode = { 
      id: Date.now().toString(), 
      label: value, 
      children: [],
      type: 'directory'
    }
    treeData.value.push(newRoot)
    saveTreeData()
  }).catch(() => {
    ElMessage.info('取消新建根目录')
  })
}

const addMdFile = (data: TreeNode) => {
  ElMessageBox.prompt('请输入Markdown文件名称', '新建Markdown文件', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(({ value }) => {
    if (!validateNodeName(value, data, 'file')) {
      return Promise.reject()
    }
    const newFile: TreeNode = { 
      id: Date.now().toString(), 
      label: value, 
      type: 'file',
      content: ''
    }
    if (!data.children) {
      data.children = []
    }
    data.children.push(newFile)
    saveTreeData()
  }).catch(() => {
    ElMessage.info('取消新建Markdown文件')
  })
}

onMounted(() => {
  loadTreeData()
})
</script>

<style scoped>
.directory-tree-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

.directory-tree {
  min-width: 170px;
  padding: 0;
  margin: 0;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 4px;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 2px;
}

.el-dropdown-link {
  cursor: pointer;
  color: #409EFF;
  white-space: nowrap;
}

:deep(.el-tree) {
  width: 100%;
  padding: 0;
  padding-left: 0px;
}

:deep(.el-tree-node__content) {
  height: auto;
  padding: 0px;
  padding-left: 4px !important;
}

:deep(.el-tree-node) {
  white-space: nowrap;
}

:deep(.el-tree > .el-tree-node:first-child .el-tree-node__content) {
  padding-top: 0;
}

:deep(.el-scrollbar__wrap) {
  overflow-x: auto;
}

:deep(.el-tree-node__children) {
  padding-left: 8px;
}

:deep(.el-tree-node__expand-icon) {
  padding: 4px;
}

.el-dropdown .el-button {
  padding: 1px 2px;
  font-size: 12px;
}
</style>

<template>
    <el-container class="main-container">
        <el-aside width="130px">
            <el-menu default-active="/health" class="el-menu-vertical" router>
                <el-menu-item index="/health">
                    <el-icon>
                        <Monitor/>
                    </el-icon>
                    <span>健康使用</span>
                </el-menu-item>
                <el-menu-item index="/notes">
                    <el-icon>
                        <Memo />
                    </el-icon>
                    <span>快捷笔记</span>
                </el-menu-item>
                <el-menu-item index="/timer">
                    <el-icon>
                        <Timer />
                    </el-icon>
                    <span>计时器</span>
                </el-menu-item>
                <el-menu-item index="/personal">
                    <el-icon>
                        <User />
                    </el-icon>
                    <span>个人空间</span>
                </el-menu-item>
            </el-menu>
        </el-aside>
        <el-main>
            <router-view :key="routeKey"></router-view>
        </el-main>
    </el-container>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const routeKey = computed(() => route.path)
</script>

<style scoped>
.main-container {
    width: 700px;
    height: 430px;
    padding: 0;
    display: flex;
}

.el-menu-vertical {
    height: 100%;
}

.el-main {
    padding: 5px;
    height: 100%;
    overflow: hidden;
}

:deep(.el-main > div) {
    height: 100%;
}
</style>

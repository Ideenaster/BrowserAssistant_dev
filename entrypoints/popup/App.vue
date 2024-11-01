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
                <el-menu-item index="/focus">
                    <el-icon>
                        <User />
                    </el-icon>
                    <span>专注模式</span>
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
}

.el-menu-vertical {
    height: 100%;
}
</style>

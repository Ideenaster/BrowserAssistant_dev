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
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const routeKey = computed(() => route.path)

onMounted(() => {
  // 添加全局消息监听
  browser.runtime.onMessage.addListener((message: { type: string }) => {
    if (message.type === 'SWITCH_TO_TIMER') {
      router.push('/timer');
      console.log('切换到计时器页面');
    }
  });
});
</script>

<style scoped>
.main-container {
    width: 750px;
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

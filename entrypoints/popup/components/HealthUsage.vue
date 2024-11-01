<template>
  <div>
    <!-- 切换按钮 -->
    <div>
      <button @click="switchMode('stats')" :class="{ active: currentMode === 'stats' }">统计信息</button>
      <button @click="switchMode('focus')" :class="{ active: currentMode === 'focus' }">专注模式</button>
    </div>

    <!-- 统计信息部分 -->
    <StatsInfo v-if="currentMode === 'stats'" />

    <!-- 专注模式部分 -->
    <FocusMode v-else-if="currentMode === 'focus'" />
  </div>
</template>

<script>
// 引入子组件
import StatsInfo from './StatsInfo.vue';
import FocusMode from './FocusMode.vue';

export default {
  components: {
    StatsInfo,
    FocusMode,
  },
  data() {
    return {
      currentMode: 'stats', // 当前模式，默认为统计信息
    };
  },
  methods: {
    // 切换模式
    switchMode(mode) {
      this.currentMode = mode;
    },
  },
};
</script>

<style scoped>
button {
  margin: 5px;
  padding: 10px;
  font-size: 12px;
}

button.active {
  background-color: #007bff;
  color: white;
}
</style>
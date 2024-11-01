<template>
    <div>
        <h1>计时器</h1>
        <div>{{ formattedTime }}</div>
        <button @click="startTimer" :disabled="isRunning">开始</button>
        <button @click="stopTimer" :disabled="!isRunning">停止</button>
        <button @click="resetTimer">重置</button>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const time = ref(0)
const isRunning = ref(false)
let interval: NodeJS.Timeout | null = null;

const formattedTime = computed(() => {
    const minutes = Math.floor(time.value / 60)
    const seconds = time.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

const startTimer = () => {
    if (!isRunning.value) {
        isRunning.value = true
        interval = setInterval(() => {
            time.value++
        }, 1000)
    }
}

const stopTimer = () => {
    if (isRunning.value) {
        isRunning.value = false
        if (interval) {
            clearInterval(interval)
        }
    }
}

const resetTimer = () => {
    stopTimer()
    time.value = 0
}
</script>



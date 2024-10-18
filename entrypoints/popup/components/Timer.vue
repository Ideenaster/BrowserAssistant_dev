<template>
    <el-container class="timer-container">
      <el-header>
        <h1>计时器</h1>
        <div>当前时间: {{ currentTime }}</div>
      </el-header>
      <el-main>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>计时器</span>
                </div>
              </template>
              <div>计时: {{ formattedTime }}</div>
              <el-button-group>
                <el-button type="primary" @click="startTimer" :disabled="isRunning">开始</el-button>
                <el-button type="warning" @click="stopTimer" :disabled="!isRunning">停止</el-button>
                <el-button type="danger" @click="resetTimer">重置</el-button>
              </el-button-group>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>闹钟设置</span>
                </div>
              </template>
              <el-form>
                <el-form-item label="设置闹钟">
                  <el-time-picker v-model="alarmTimeInput" format="HH:mm" placeholder="选择时间" />
                  <el-button type="primary" @click="setAlarm" :disabled="!alarmTimeInput">设置闹钟</el-button>
                </el-form-item>
                <el-form-item label="闹钟列表" v-if="alarms.length">
                  <el-table :data="alarms" style="width: 100%">
                    <el-table-column prop="time" label="时间" width="120">
                      <template #default="scope">
                        {{ formatAlarmTime(scope.row.time) }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="date" label="日期" width="130">
                      <template #default="scope">
                        {{ formatAlarmDate(scope.row.time) }}
                      </template>
                    </el-table-column>
                    <el-table-column fixed="right" label="操作" width="20">
                      <template #default="scope">
                        <el-button type="danger" @click="removeAlarm(scope.$index)" size="small">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-form-item>
                <el-form-item label="选择闹钟铃声">
                  <el-select v-model="selectedAlarmId">
                    <el-option
                      v-for="sound in alarmSounds"
                      :key="sound.id"
                      :label="sound.name"
                      :value="sound.id"
                    >
                      <span>{{ sound.name }}</span>
                      <el-button
                        v-if="sound.id !== defaultAlarm.id"
                        type="danger"
                        size="small"
                        @click.stop="removeAlarmSound(sound.id)"
                      >
                        删除
                      </el-button>
                    </el-option>
                  </el-select>
                  <el-button @click="testAlarmSound(selectedAlarmId)" type="primary" size="small">测试铃声</el-button>
                </el-form-item>
                <el-form-item label="添加闹钟音频">
                  <el-input v-model="newAlarmPath" placeholder="请输入音频文件路径"></el-input>
                  <el-button type="primary" @click="addAlarmSound">添加</el-button>
                </el-form-item>
                <el-form-item>
                  <el-button @click="resetAudio" :disabled="selectedAlarmId === defaultAlarm.id">重置为默认</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
      <el-footer>
        <el-dialog v-model="isAlarm" title="闹钟响了！" width="30%" center>
          <span>时间到了！</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button type="primary" @click="stopAlarm">关闭提醒</el-button>
            </span>
          </template>
        </el-dialog>
      </el-footer>
    </el-container>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  
  interface AlarmSound {
    id: number;
    name: string;
    path: string;
    time: string;
    triggered: boolean;
  }
  
  const isRunning = ref(false)
  const timerInterval = ref<number | null>(null)
  const timerStart = ref<number | null>(null)
  const savedTime = ref<number>(0)
  const currentTime = ref('')
  const alarmTimeInput = ref<string | Date>('')
  const alarms = ref<AlarmSound[]>([])
  
  const defaultAlarm: AlarmSound = {
    id: -1,
    name: '默认闹钟',
    path: '/path/to/default/alarm.mp3',
    time: '',
    triggered: false
  }
  
  const alarmSounds = ref<AlarmSound[]>([defaultAlarm])
  const selectedAlarmId = ref<number>(defaultAlarm.id)
  const currentAlarmSrc = computed(() => {
    const sound = alarmSounds.value.find(sound => sound.id === selectedAlarmId.value)
    return sound ? sound.path : defaultAlarm.path
  })
  
  const isAlarm = ref(false)
  
  const formattedTime = computed(() => {
    const t = savedTime.value
    const h = Math.floor(t / 3600)
    const m = Math.floor((t % 3600) / 60)
    const s = t % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  })
  
  const updateCurrentTime = () => {
    const now = new Date()
    currentTime.value = now.toLocaleString('zh-CN')
    alarms.value.forEach((a: AlarmSound) => {
      const alarmTime = new Date(a.time)
      if(alarmTime <= now && !a.triggered){
        a.triggered = true
        triggerAlarm()
        saveAlarms()
      }
    })
  }
  
  const triggerAlarm = async () => {
    isAlarm.value = true
    const audioSrc = await loadAudioBlob(currentAlarmSrc.value)
    const audio = new Audio(audioSrc)
    audio.play()
  }
  
  const startTimer = () => {
    if(!isRunning.value){
      isRunning.value = true
      timerStart.value = Date.now()
      timerInterval.value = window.setInterval(() => {
        savedTime.value++
      }, 1000)
      saveAll()
    }
  }
  
  const stopTimer = () => {
    if(isRunning.value){
      isRunning.value = false
      if(timerInterval.value){
        clearInterval(timerInterval.value)
        timerInterval.value = null
      }
      if(timerStart.value !== null){
        timerStart.value = null
      }
      saveAll()
    }
  }
  
  const resetTimer = () => {
    stopTimer()
    savedTime.value = 0
    localStorage.setItem('savedTime','0')
  }
  
  const setAlarm = () => {
    if (alarmTimeInput.value && alarmTimeInput.value instanceof Date) {
      const now = new Date()
      const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmTimeInput.value.getHours(), alarmTimeInput.value.getMinutes())
      
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1) // 如果时间已过，设置为明天
      }
      
      const newAlarm: AlarmSound = {
        id: Date.now(),
        name: `闹钟 ${alarms.value.length + 1}`,
        path: currentAlarmSrc.value,
        time: alarmTime.toISOString(),
        triggered: false
      }
      
      alarms.value.push(newAlarm)
      saveAlarms()
      alarmTimeInput.value = ""
      ElMessage.success('闹钟设置成功')
    } else {
      ElMessage.error('请选择有效的闹钟时间')
    }
  }
  
  const removeAlarm = (i: number) => {
    alarms.value.splice(i,1)
    saveAlarms()
    ElMessage.success('闹钟删除成功')
  }
  
  const stopAlarm = () => {
    isAlarm.value = false
  }
  
  const handleFileChange = (file: any) => {
    if(file.raw.type.startsWith('audio/')){
      const newSound: AlarmSound = {
        id: Date.now(),
        name: file.name,
        path: file.raw.name, // 存储文件名而不是 blob URL
        time: '',
        triggered: false
      }
      alarmSounds.value.push(newSound)
      selectedAlarmId.value = newSound.id
      saveAlarmSounds()
      ElMessage.success('音频文件添加成功')
    } else {
      ElMessage.error('请选择音频文件')
    }
  }
  
  const resetAudio = () => {
    selectedAlarmId.value = defaultAlarm.id
    saveAlarmSounds()
    ElMessage.success('已重置为默认铃声')
  }
  
  const saveAlarms = () => {
    localStorage.setItem('alarms', JSON.stringify(alarms.value))
  }
  
  const loadAlarms = () => {
    const s = localStorage.getItem('alarms')
    if(s){
      alarms.value = JSON.parse(s) as AlarmSound[]
    }
  }
  
  const saveAlarmSounds = () => {
    localStorage.setItem('alarmSounds', JSON.stringify(alarmSounds.value))
    localStorage.setItem('selectedAlarmId', JSON.stringify(selectedAlarmId.value))
  }
  
  const loadAlarmSounds = () => {
    const ss = localStorage.getItem('alarmSounds')
    if (ss) {
      const parsedSounds = JSON.parse(ss)
      if (Array.isArray(parsedSounds) && parsedSounds.length > 0) {
        alarmSounds.value = parsedSounds
      } else {
        alarmSounds.value = [defaultAlarm]
      }
    } else {
      alarmSounds.value = [defaultAlarm]
    }
    
    const sai = localStorage.getItem('selectedAlarmId')
    if (sai) {
      selectedAlarmId.value = JSON.parse(sai)
    } else {
      selectedAlarmId.value = defaultAlarm.id
    }
  }
  
  const loadTimer = () => {
    const ir = localStorage.getItem('isRunning')
    const st = localStorage.getItem('savedTime')
    const ts = localStorage.getItem('timerStart')
    if(st){
      savedTime.value = parseInt(st,10)
    }
    if(ir === 'true' && ts){
      const elapsed = Math.floor((Date.now() - parseInt(ts,10))/1000)
      savedTime.value += elapsed
      isRunning.value = true
      timerStart.value = Date.now()
      timerInterval.value = window.setInterval(() => {
        savedTime.value++
      }, 1000)
    }
  }
  
  const saveAll = () => {
    if(isRunning.value && timerStart.value !== null){
      localStorage.setItem('timerStart', timerStart.value.toString())
      localStorage.setItem('isRunning','true')
    } else {
      localStorage.setItem('isRunning','false')
      localStorage.removeItem('timerStart')
    }
    localStorage.setItem('savedTime', savedTime.value.toString())
  }
  
  let clockInterval: number
  
  onMounted(() => {
    loadAlarmSounds()
    loadAlarms()
    loadTimer()
    updateCurrentTime()
    clockInterval = window.setInterval(updateCurrentTime, 1000)
  })
  
  onUnmounted(() => {
    if(timerInterval.value) clearInterval(timerInterval.value)
    if(clockInterval) clearInterval(clockInterval)
    saveAll()
  })
  
  watch(selectedAlarmId, () => {
    // 当选择的闹钟铃声改变时，可以在这里添加一些逻辑
  })
  
  const formatAlarmTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  const formatAlarmDate = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  
  const testAlarmSound = async (id: number) => {
    const sound = alarmSounds.value.find(s => s.id === id)
    if (sound) {
      const audioSrc = await loadAudioBlob(sound.path)
      const audio = new Audio(audioSrc)
      console.log('当前闹钟铃声列表:', alarmSounds.value);
      audio.onerror = () => {
        ElMessage.error('音频加载失败，请检查文件')
      }
      audio.oncanplaythrough = () => {
        audio.play()
        setTimeout(() => audio.pause(), 2000) // 播放2秒
      }
    }
  }
  
  const removeAlarmSound = (id: number) => {
    const index = alarmSounds.value.findIndex(sound => sound.id === id)
    if (index !== -1) {
      alarmSounds.value.splice(index, 1)
      if (selectedAlarmId.value === id) {
        selectedAlarmId.value = defaultAlarm.id
      }
      saveAlarmSounds()
      ElMessage.success('闹钟铃声删除成功')
    }
  }
  
  const newAlarmPath = ref('')
  
  const addAlarmSound = () => {
    if (newAlarmPath.value) {
      const newSound: AlarmSound = {
        id: Date.now(),
        name: newAlarmPath.value.split('/').pop() || '新闹钟铃声',
        path: newAlarmPath.value,
        time: '',
        triggered: false
      }
      alarmSounds.value.push(newSound)
      selectedAlarmId.value = newSound.id
      saveAlarmSounds()
      newAlarmPath.value = ''
      ElMessage.success('音频文件路径添加成功')
    } else {
      ElMessage.error('请输入有效的音频文件路径')
    }
  }
  
  const loadAudioBlob = async (path: string): Promise<string> => {
    if (path === defaultAlarm.path) {
      return path; // 如果是默认闹钟，直接返回路径
    }
    try {
      // 这里我们假设路径是一个有效的URL或者是一个相对于当前页面的路径
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error('无法加载音频文件');
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('加载音频文件失败:', error);
      ElMessage.error('无法加载音频文件，请检查路径是否正确');
      return defaultAlarm.path; // 如果加载失败，返回默认闹钟路径
    }
  }
  </script>
  
  <style scoped>
  .timer-container {
    font-family: Arial, sans-serif;
    max-height: 100vh;
    overflow-y: auto;
  }
  
  .el-header, .el-footer {
    background-color: #B3C0D1;
    color: #333;
    text-align: center;
    line-height: 60px;
  }
  
  .el-main {
    background-color: #E9EEF3;
    color: #333;
    text-align: center;
    padding: 20px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .el-button-group {
    margin-top: 20px;
  }
  
  .el-form-item {
    margin-bottom: 20px;
  }
  
  .el-table {
    margin-top: 10px;
  }
  
  .el-table .el-button {
    padding: 5px 10px;
  }
  
  .el-select-dropdown__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  </style>

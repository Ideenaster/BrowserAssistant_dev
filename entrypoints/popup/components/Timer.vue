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
      </el-row>
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="12">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>倒计时</span>
                </div>
              </template>
              <div>剩余时间: {{ formattedCountdown }}</div>
              <el-button-group>
                <el-button type="primary" @click="startCountdown" :disabled="countdownRunning">开始</el-button>
                <el-button type="warning" @click="stopCountdown" :disabled="!countdownRunning">停止</el-button>
                <el-button type="danger" @click="resetCountdown">重置</el-button>
              </el-button-group>
              <el-form>
                <el-form-item label="设置倒计时">
                  <el-time-picker v-model="countdownTime" format="HH:mm:ss" value-format="HH:mm:ss" placeholder="选择时间" style="width: 150px; margin-right: 10px;"></el-time-picker>
                  <el-button type="primary" @click="setCountdown">设置</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>
        
        <el-col :span="12"style="margin-top: -182.5px;" >
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
              <el-form-item label="闹钟描述">
                <el-input v-model="alarmDescriptionInput" placeholder="输入闹钟描述"></el-input>
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
                  <el-table-column prop="description" label="描述" width="200">
                    <template #default="scope">
                      {{ scope.row.description || '无' }}
                    </template>
                  </el-table-column>
                  <el-table-column fixed="right" label="操作" width="60">
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
                <el-upload
                  accept="audio/*"
                  :auto-upload="false"
                  :on-change="handleFileChange"
                  :show-file-list="false"
                >
                  <el-button type="primary">选择音频文件</el-button>
                </el-upload>
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
        <span>{{ currentTriggeredAlarm?.description || '时间到了！' }}</span>
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
import defaultAlarmAudio from '@/assets/default-alarm.mp3'
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { useRouter } from 'vue-router'

interface AlarmSound {
  id: number;
  name: string;
  description?: string; // 新增描述字段
  audioData: Blob;
  time: string;
  triggered: boolean;
}

interface WorldClock {
  city: string;
  timezone: string;
  time: string;
  hours: number;
  minutes: number;
  seconds: number;
}
const worldClocks = ref<WorldClock[]>([
  { city: '北京', timezone: 'Asia/Shanghai', time: '', hours: 0, minutes: 0, seconds: 0 },
  { city: '莫斯科', timezone: 'Europe/Moscow', time: '', hours: 0, minutes: 0, seconds: 0 },
  { city: '洛杉矶', timezone: 'America/Los_Angeles', time: '', hours: 0, minutes: 0, seconds: 0 },
  { city: '东京', timezone: 'Asia/Tokyo', time: '', hours: 0, minutes: 0, seconds: 0 },
  { city: '巴黎', timezone: 'Europe/Paris', time: '', hours: 0, minutes: 0, seconds: 0 },
  { city: '纽约', timezone: 'America/New_York', time: '', hours: 0, minutes: 0, seconds: 0 },
]);
const updateWorldClocks = () => {
  const now = new Date();
  worldClocks.value.forEach(clock => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: clock.timezone,
    };
    const timeString = now.toLocaleTimeString('zh-CN', options);
    clock.time = timeString;
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    clock.hours = hours % 12;
    clock.minutes = minutes;
    clock.seconds = seconds;
  });
};

const countdownTime = ref<string>('00:01:00')
watch(countdownTime, () => {
  saveAll()
})
const countdownRemaining = ref<number>(60)
const countdownRunning = ref(false)
let countdownInterval: number | null = null
const countdownTargetTime = ref<number | null>(null)
  
const formattedCountdown = computed(() => {
  const t = countdownRemaining.value
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const startCountdown = () => {
  if(countdownRemaining.value > 0 && !countdownInterval){
    if(!countdownTargetTime.value){
      countdownTargetTime.value = Date.now() + countdownRemaining.value * 1000
    }
    countdownRunning.value = true
    countdownInterval = window.setInterval(() => {
      const remaining = Math.floor((countdownTargetTime.value! - Date.now()) / 1000)
      countdownRemaining.value = remaining > 0 ? remaining : 0
      if(countdownRemaining.value <= 0){
        stopCountdown()
        ElMessage.success('倒计时完成')
        triggerAlarm()
      }
    }, 1000)
    saveAll()
  }
}
const stopCountdown = () => {
  if(countdownRunning.value){
    countdownRunning.value = false
    if(countdownInterval !== null){
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    countdownTargetTime.value = null // 清除目标时间
    saveAll()
  }
}

const resetCountdown = () => {
  stopCountdown()
  const [h, m, s] = countdownTime.value.split(':').map(Number)
  countdownRemaining.value = h * 3600 + m * 60 + s
  countdownTargetTime.value = Date.now() + countdownRemaining.value * 1000
  localStorage.setItem('countdownTargetTime', countdownTargetTime.value.toString())
  countdownRunning.value = true
  startCountdown()
  stopCountdown()
  saveAll()
}

const setCountdown = () => {
  const [h, m, s] = countdownTime.value.split(':').map(Number)
  countdownRemaining.value = h * 3600 + m * 60 + s
  countdownTargetTime.value = Date.now() + countdownRemaining.value * 1000
  ElMessage.success('倒计时设置成功')
  saveAll()
}


const loadCountdown = () => {
  const ct = localStorage.getItem('countdownTime') // 添加此行
  if(ct){
    countdownTime.value = ct // 添加此行
  }

  const cr = localStorage.getItem('countdownRunning')
  countdownRunning.value = cr === 'true'
  
  const ctt = localStorage.getItem('countdownTargetTime')
  if(ctt && countdownRunning.value){
    countdownTargetTime.value = parseInt(ctt,10)
    const remaining = Math.floor((countdownTargetTime.value - Date.now()) / 1000)
    countdownRemaining.value = remaining > 0 ? remaining : 0
    if(remaining > 0){
      startCountdown()
    } else {
      countdownRunning.value = false
      saveAll()
    }
  }
  
  //const ci = localStorage.getItem('countdownInput')
  //if(ci){
    //countdownInput.value = JSON.parse(ci)
  //}
}

const isRunning = ref(false)
const timerInterval = ref<number | null>(null)
const timerStart = ref<number | null>(null)
const savedTime = ref<number>(0)
const currentTime = ref('')
const alarmTimeInput = ref<string | Date>('')
const alarms = ref<AlarmSound[]>([])
const alarmDescriptionInput = ref<string>('')

const defaultAlarm: AlarmSound = {
  id: -1,
  name: '默认闹钟',
  audioData: new Blob([defaultAlarmAudio], { type: 'audio/mpeg' }),
  time: '',
  triggered: false
}

const alarmSounds = ref<AlarmSound[]>([defaultAlarm])
const selectedAlarmId = ref<number>(defaultAlarm.id)
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

const currentTriggeredAlarm = ref<AlarmSound | null>(null)
const triggerAlarm = async () => {
  isAlarm.value = true
  const alarm = alarms.value.find(a => a.triggered)
  if(alarm){
    currentTriggeredAlarm.value = alarm
  }
  const audioSrc = await loadAudioBlob(selectedAlarmId.value)
  const audio = new Audio(audioSrc)
  audio.play()
  ElMessage({
    message: alarm?.description || '时间到了！',
    type: 'warning',
    duration: 5000
  })
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

const setAlarm = async () => {
  if (alarmTimeInput.value && alarmTimeInput.value instanceof Date) {
    const now = new Date()
    const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
      alarmTimeInput.value.getHours(), alarmTimeInput.value.getMinutes())
    
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1)
    }
    
    const newAlarm: AlarmSound = {
      id: Date.now(),
      name: `闹钟 ${alarms.value.length + 1}`,
      description: alarmDescriptionInput.value, // 添加描述
      audioData: alarmSounds.value.find(sound => sound.id === selectedAlarmId.value)?.audioData || defaultAlarm.audioData,
      time: alarmTime.toISOString(),
      triggered: false
    }
    
    alarms.value.push(newAlarm)
    await saveAlarms()
    // 同步到 background
    await browser.runtime.sendMessage({ 
      type: 'SET_ALARMS', 
      alarms: alarms.value.map(a => ({
        id: a.id,
        time: a.time,
        triggered: a.triggered
      }))
    });
    
    alarmTimeInput.value = ""
    alarmDescriptionInput.value = ""
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
  isAlarm.value = false;
  // 通知 background 停止播放音频
  currentTriggeredAlarm.value = null
  browser.runtime.sendMessage({ type: 'STOP_ALARM' });
};

const handleFileChange = async (file: any) => {
  if(file.raw.type.startsWith('audio/')){
    try {
      const arrayBuffer = await file.raw.arrayBuffer();
      const newSound: AlarmSound = {
        id: Date.now(),
        name: file.name,
        audioData: new Blob([arrayBuffer], {type: file.raw.type}),
        time: '',
        triggered: false
      }
      await saveAlarmSound(newSound)
      alarmSounds.value.push(newSound)
      selectedAlarmId.value = newSound.id
      localStorage.setItem('selectedAlarmId', JSON.stringify(selectedAlarmId.value))
      ElMessage.success('音频文件添加成功')
    } catch (error) {
      console.error('添加音频文件失败:', error);
      ElMessage.error('无法添加音频文件，请重试');
    }
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

interface MyDB extends DBSchema {
  alarmSounds: {
    key: number;
    value: AlarmSound;
    indexes: { 'by-name': string };
  };
}

let db: IDBPDatabase<MyDB>;

const initDB = async () => {
  db = await openDB<MyDB>('TimerDB', 1, {
    upgrade(db) {
      const store = db.createObjectStore('alarmSounds', {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('by-name', 'name');
    },
  });
};

const loadAlarmSounds = async () => {
  await initDB();
  const sounds = await db.getAll('alarmSounds');
  if (sounds.length > 0) {
    alarmSounds.value = sounds;
  } else {
    alarmSounds.value = [defaultAlarm];
    await db.add('alarmSounds', defaultAlarm);
  }
  
  const sai = localStorage.getItem('selectedAlarmId');
  if (sai) {
    selectedAlarmId.value = JSON.parse(sai);
  } else {
    selectedAlarmId.value = defaultAlarm.id;
  }
};

const saveAlarmSound = async (sound: AlarmSound) => {
  await db.put('alarmSounds', sound);
};

const removeAlarmSound = async (id: number) => {
  const index = alarmSounds.value.findIndex(sound => sound.id === id);
  if (index !== -1) {
    await db.delete('alarmSounds', id);
    alarmSounds.value.splice(index, 1);
    if (selectedAlarmId.value === id) {
      selectedAlarmId.value = defaultAlarm.id;
    }
    localStorage.setItem('selectedAlarmId', JSON.stringify(selectedAlarmId.value));
    ElMessage.success('闹钟铃声删除成功');
  }
};

const addAlarmSound = async () => {
  if (newAlarmPath.value) {
    try {
      const response = await fetch(newAlarmPath.value);
      const blob = await response.blob();
      const newSound: AlarmSound = {
        id: Date.now(),
        name: newAlarmPath.value.split('/').pop() || '新闹钟铃声',
        audioData: blob,
        time: '',
        triggered: false
      };
      await saveAlarmSound(newSound);
      alarmSounds.value.push(newSound);
      selectedAlarmId.value = newSound.id;
      localStorage.setItem('selectedAlarmId', JSON.stringify(selectedAlarmId.value));
      newAlarmPath.value = '';
      ElMessage.success('音频文件添加成功');
    } catch (error) {
      console.error('添加音频文件失败:', error);
      ElMessage.error('无法添加音频文件，请检查路径是否正确');
    }
  } else {
    ElMessage.error('请输入有效的音频文件路径');
  }
};

const loadAudioBlob = async (id: number): Promise<string> => {
  if (id === defaultAlarm.id) {
    return URL.createObjectURL(new Blob([defaultAlarm.audioData]));
  }
  try {
    const sound = await db.get('alarmSounds', id);
    if (sound && sound.audioData) {
      // 确保 audioData 是 Blob 对象
      const blob = sound.audioData instanceof Blob ? sound.audioData : new Blob([sound.audioData]);
      return URL.createObjectURL(blob);
    }
    throw new Error('音频文件不存在');
  } catch (error) {
    console.error('加载音频文件失败:', error);
    ElMessage.error('无法加载音频文件，请检查是否存在');
    return URL.createObjectURL(new Blob([defaultAlarm.audioData]));
  }
};

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

  localStorage.setItem('countdownRunning', countdownRunning.value.toString())
  localStorage.setItem('countdownTime', countdownTime.value) // 添加此行
  if(countdownTargetTime.value){
    localStorage.setItem('countdownTargetTime', countdownTargetTime.value.toString())
  } else {
    localStorage.removeItem('countdownTargetTime')
  }
}

let clockInterval: number

const initDefaultAlarm = async () => {
  try {
    const response = await fetch(defaultAlarmAudio);
    const arrayBuffer = await response.arrayBuffer();
    defaultAlarm.audioData = new Blob([arrayBuffer], { type: 'audio/mpeg' });
  } catch (error) {
    console.error('加载默认闹钟音频失败:', error);
    ElMessage.error('无法加载默认闹钟音频');
  }
}

const router = useRouter()

onMounted(async () => {
  await initDefaultAlarm();
  await loadAlarmSounds();
  loadAlarms();
  loadTimer();
  loadCountdown(); // 添加加载倒计时
  if(countdownRunning.value && countdownRemaining.value > 0){
    startCountdown()
  }
  updateCurrentTime();
  clockInterval = window.setInterval(updateCurrentTime, 1000);
  
  // 从 background 加载闹钟数据
  const backgroundAlarms = await browser.runtime.sendMessage({ type: 'GET_ALARMS' });
  if (backgroundAlarms) {
    alarms.value = mergeAlarms(alarms.value, backgroundAlarms);
  }
  updateWorldClocks();
  clockInterval = window.setInterval(updateWorldClocks, 1000);
  
  // // 监听来自 background 的消息
  // browser.runtime.onMessage.addListener((message: { type: string }) => {
  //   if (message.type === 'TRIGGER_ALARM') {
  //     triggerAlarm();
  //   }
  // });
  
  // // 如果是通过通知打开的 popup，自动触发闹钟
  // const url = new URL(window.location.href);
  // if (url.searchParams.get('alarm') === 'true') {
  //   triggerAlarm();
  // }
})

onUnmounted(() => {
  if(timerInterval.value) clearInterval(timerInterval.value)
  if(clockInterval) clearInterval(clockInterval)
  if(countdownInterval){
    clearInterval(countdownInterval)
    countdownInterval = null
  }
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
    try {
      const audioSrc = await loadAudioBlob(id)
      const audio = new Audio(audioSrc)
      console.log('当前闹钟铃声列表:', alarmSounds.value);
      audio.onerror = (e) => {
        console.error('音频加载失败:', e);
        ElMessage.error('音频加载失败，请检查文件')
      }
      audio.oncanplaythrough = () => {
        audio.play()
        setTimeout(() => audio.pause(), 2000) // 播放2秒
      }
    } catch (error) {
      console.error('测试闹钟铃声失败:', error);
      ElMessage.error('无法测试闹钟铃声，请重试');
    }
  }
}

const newAlarmPath = ref('')

// 添加合并闹钟数据的函数
const mergeAlarms = (localAlarms: AlarmSound[], backgroundAlarms: any[]) => {
  // 使用 Map 来存储合并后的闹钟，以 id 为键
  const mergedMap = new Map();
  
  // 先添加本地闹钟
  localAlarms.forEach(alarm => mergedMap.set(alarm.id, alarm));
  
  // 合并 background 闹钟
  backgroundAlarms.forEach(bAlarm => {
    const localAlarm = mergedMap.get(bAlarm.id);
    if (localAlarm) {
      // 更新触发状态
      localAlarm.triggered = bAlarm.triggered;
    }
  });
  
  return Array.from(mergedMap.values());
};
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
.world-clock {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 改为左对齐 */
  justify-content: center;
  padding: 5px; /* 减小内边距 */
  width: 100%; /* 确保宽度为100%以居中对齐 */
  box-sizing: border-box; /* 包括内边距在内 */
}
.world-clock div {
  font-size: 11px;
}
.world-clock > div:first-child {
  margin-bottom: -5px; /* 增加城市名称与钟表之间的间距 */
  margin-left: 10px; /* 向右移动城市名称 */
}

.world-clock .analog-clock {
  margin-left: -10px; /* 向左移动钟表 */
}
.clock-icon {
  width: 50px;
  height: 50px;
  margin-bottom: 10px;
}
.analog-clock {
  width: 60px; /* 缩小宽度 */
  height: 60px; /* 缩小高度 */
  border: 2px solid #333;
  border-radius: 50%;
  position: relative;
  margin: 10px auto 10px 0; /* 修改左边距为0，移除自动水平居中 */
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}
.clock-face {
  position: relative;
  width: 100%;
  height: 100%;
  /* 移除 transform 属性 */
}

.clock-face::after {
  content: '';
  width: 4px;
  height: 4px;
  background: #333;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hand {
  width: 50%;
  height: 2px;
  background: #333;
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: 0% 50%; /* 修改 transform-origin 为左端 */
  transition: transform 0.5s ease-in-out;
}

.hour-hand {
  width: 35%;
  background: #000;
}

.minute-hand {
  width: 45%;
  background: #555;
}

.second-hand {
  width: 50%;
  background: red;
}
</style>


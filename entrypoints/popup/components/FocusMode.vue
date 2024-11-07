<template>
  <el-container class="focus-container">
    <el-main>
    <h2>专注模式</h2>

    <!-- 黑名单输入 -->
    <el-form>
      <el-form-item label="添加黑名单域名">
        <el-input v-model="newDomain" placeholder="输入域名"></el-input>
        <el-button @click="addDomainToBlacklist" type="primary">添加</el-button>
      </el-form-item>

      <!-- 显示黑名单 -->
      <el-form-item label="黑名单">
        <el-tag
          v-for="(domain, index) in blacklist"
          :key="index"
          closable
          @close="removeDomainFromBlacklist(index)"
        >
          {{ domain }}
        </el-tag>
      </el-form-item>

      <!-- 设置专注时长 -->
      <el-form-item label="设置专注时长 (分钟)">
        <el-input-number v-model="focusDuration" :min="1" :max="120"></el-input-number>
      </el-form-item>

      <!-- 开始专注模式按钮 -->
      <el-form-item>
        <el-button type="success" @click="startFocusMode">
          开始专注模式
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 历史记录 -->
    <h3>专注模式历史记录</h3>
    
    <el-table :data="formattedFocusHistory">
<el-table-column prop="formattedStartTime" label="开始时间" width="180"></el-table-column>
<el-table-column prop="duration" label="持续时长 (分钟)" width="180"></el-table-column>
<!-- <el-table-column prop="violations" label="是否访问黑名单网站" width="180"></el-table-column> -->
</el-table>

    <!-- 提示框 -->
    <el-dialog
      title="专注模式结束"
      :visible.sync="focusEndDialogVisible"
      width="30%"
    >
      <p>恭喜你完成了专注模式！</p>
      <p>你成功专注了 {{ focusDuration }} 分钟。</p>
      <el-button type="primary" @click="focusEndDialogVisible = false">确定</el-button>
    </el-dialog>

    <!-- 警告框 -->
    <el-message-box
      v-if="showViolationWarning"
      title="警告"
      type="warning"
      :visible.sync="showViolationWarning"
      message="你正在访问一个被禁止的网站！请继续保持专注。"
    >
      <el-button type="primary" @click="showViolationWarning = false">确定</el-button>
    </el-message-box>
  </el-main>
  </el-container>
</template>

 <script lang="ts">
 import { defineComponent, ref, onMounted } from 'vue';
 
 export default defineComponent({
   name: 'FocusMode',
   setup() {
     const DB_NAME = 'FocusModeDB';
     const DB_VERSION = 1;
     let db: IDBDatabase;
 
     const newDomain = ref('');
     const blacklist = ref<string[]>([]);
     const focusDuration = ref(25);
     const focusHistory = ref<any[]>([]);
     const focusEndDialogVisible = ref(false);
     const showViolationWarning = ref(false);
     const isFocusModeActive = ref(false);
     const violations = ref(false);
     let timer: number | null = null;
 
     async function openDB(): Promise<IDBDatabase> {
       return new Promise((resolve, reject) => {
         const request = indexedDB.open(DB_NAME, DB_VERSION);
 
         request.onerror = (event) => {
           console.error("IndexedDB error:", event);
           reject("Error opening database");
         };
 
         request.onsuccess = (event) => {
           db = (event.target as IDBOpenDBRequest).result;
           resolve(db);
         };
 
         request.onupgradeneeded = (event) => {
           db = (event.target as IDBOpenDBRequest).result;
           if (!db.objectStoreNames.contains('settings')) {
             db.createObjectStore('settings');
           }
           if (!db.objectStoreNames.contains('focusHistory')) {
             db.createObjectStore('focusHistory', { keyPath: 'startTime' });
           }
         };
       });
     }
 
     async function getData(storeName: string, key: string): Promise<any> {
       await openDB();
       return new Promise((resolve, reject) => {
         const transaction = db.transaction([storeName], 'readonly');
         const store = transaction.objectStore(storeName);
         const request = store.get(key);
 
         request.onerror = () => reject(request.error);
         request.onsuccess = () => {
           const result = request.result;
           resolve(result ? JSON.parse(result) : null);
         };
       });
     }
        function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
      const formattedFocusHistory = computed(() => {
    return focusHistory.value.map(entry => ({
      ...entry,
      formattedStartTime: formatDate(entry.startTime)
    }));
  });
     async function setData(storeName: string, key: string, value: any): Promise<void> {
       await openDB();
       return new Promise((resolve, reject) => {
         const transaction = db.transaction([storeName], 'readwrite');
         const store = transaction.objectStore(storeName);
         const request = store.put(JSON.stringify(value), key);
 
         request.onerror = () => reject(request.error);
         request.onsuccess = () => resolve();
       });
     }
 
     const loadData = async () => {
       try {
         blacklist.value = await getData('settings', 'blacklist') || [];
         focusHistory.value = await getData('settings', 'focusHistory') || [];
         isFocusModeActive.value = await getData('settings', 'isFocusModeActive') || false;
         focusDuration.value = await getData('settings', 'focusDuration') || 25;
         console.log('数据加载完成:', { blacklist: blacklist.value, focusHistory: focusHistory.value, isFocusModeActive: isFocusModeActive.value, focusDuration: focusDuration.value });
       } catch (error) {
         console.error('加载数据时出错:', error);
       }
     };
     
     const addDomainToBlacklist = async () => {
       if (newDomain.value) {
         try {
           blacklist.value.push(newDomain.value);
           await setData('settings', 'blacklist', blacklist.value);
           chrome.runtime.sendMessage({ action: 'updateBlacklist', blacklist: blacklist.value });
           newDomain.value = '';
         } catch (error) {
           console.error('添加域名到黑名单时出错:', error);
         }
       }
     };
 
     const removeDomainFromBlacklist = async (index: number) => {
       try {
         blacklist.value.splice(index, 1);
         await setData('settings', 'blacklist', blacklist.value);
         chrome.runtime.sendMessage({ action: 'updateBlacklist', blacklist: blacklist.value });
       } catch (error) {
         console.error('从黑名单移除域名时出错:', error);
       }
     };
 
     const startFocusMode = async () => {
    if (isFocusModeActive.value) {
      alert('专注模式已经在进行中');
      return;
    }

    try {
      isFocusModeActive.value = true;
      violations.value = false;
      const startTime = new Date().toISOString();

      const newHistoryEntry = {
        startTime,
        duration: focusDuration.value,
        violations: '否',
      };
      focusHistory.value.push(newHistoryEntry);
      console.log(focusDuration.value)
      await setData('settings', 'focusHistory', focusHistory.value);
      await setData('settings', 'isFocusModeActive', isFocusModeActive.value);
      await setData('settings', 'focusDuration', focusDuration.value);
      
      chrome.runtime.sendMessage({ 
        action: 'startFocusMode', 
        focusDuration: focusDuration.value,
        blacklist: blacklist.value
      });

      // 移除本地计时器
      // timer = window.setTimeout(() => {
      //   endFocusMode();
      // }, focusDuration.value * 60 * 1000);
    } catch (error) {
      console.error('开始专注模式时出错:', error);
      isFocusModeActive.value = false;
    }
  };
 
     const endFocusMode = async () => {
       try {
         isFocusModeActive.value = false;
        console.log('进入endFocusMode函数')
        //  if (timer !== null) {
        //    window.clearTimeout(timer);
        //    timer = null;
        //  }
 
        //  chrome.runtime.sendMessage({ action: 'endFocusMode' });
 
         const lastEntry = focusHistory.value[focusHistory.value.length - 1];
         if (lastEntry) {
           lastEntry.violations = violations.value ? '是' : '否';
         }
         console.log(isFocusModeActive.value)
         await setData('settings', 'focusHistory', focusHistory.value);
         await setData('settings', 'isFocusModeActive', isFocusModeActive.value);
         await setData('settings', 'focusDuration', null);
         console.log(isFocusModeActive.value)
         focusEndDialogVisible.value = true;
       } catch (error) {
         console.error('结束专注模式时出错:', error);
       }
     };
  
  onMounted(() => {
  loadData();
    // 添加消息监听器
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'focusModeEnded') {
        console.log("收到专注模式结束的消息")
        endFocusMode();
      }
    });
  });
 
     return {
       newDomain,
       blacklist,
       focusDuration,
       focusHistory,
       formattedFocusHistory,
       focusEndDialogVisible,
       showViolationWarning,
       isFocusModeActive,
       violations,
       addDomainToBlacklist,
       removeDomainFromBlacklist,
       startFocusMode,
       endFocusMode,
     }; 
   },
 });
 </script>
 
<!-- 添加一个按钮获取focus状态，点击这个按钮可以发一个message到back，back在发一个信息到vue，然后显示出来，
主要就是专注模式还剩多少时间，还有是否处在专注模式 -->
 
<style scoped>
.focus-mode {
  padding: 20px;
}

.blacklist-manager,
.focus-control,
.focus-history {
  margin-bottom: 20px;
}

.el-button {
  margin-top: 10px;
}
</style>

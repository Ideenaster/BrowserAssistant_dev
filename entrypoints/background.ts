// 添加Chrome扩展API的类型定义

interface TabTimeData {
  [tabId: number]: {
    url: string;
    startTime: number;
    totalTime: number;
  };
}

interface AlarmInfo {
  id: number;
  time: string;
  triggered: boolean;
}

// 为事件监听器添加类型
interface TabActiveInfo {
  tabId: number;
  windowId: number;
}

interface TabChangeInfo {
  status?: string;
  url?: string;
}

interface ChromeWindow {
  id?: number;
  state?: string;
}

const tabTimeData: TabTimeData = {};
let activeTabId: number | null = null;
let activeStartTime: number | null = null;
let isMinimized = false; // 标识窗口是否最小化

// 定时器间隔（例如，每分钟更新一次）
const updateInterval = 3000; // 3秒

// 添加必要的接口定义
interface StorageResult {
  tabTimeData?: TabTimeData;
}

interface RuntimeMessage {
  action: string;
  blacklist?: string[];
  focusDuration?: number;
  type?: string;
  alarms?: AlarmInfo[];
}

interface RuntimeSender {
  tab?: chrome.tabs.Tab;
  id?: string;
}

// 修改初始化数据的方式
chrome.storage.local.get('tabTimeData', (result: StorageResult) => {
  if (result.tabTimeData) {
    Object.assign(tabTimeData, result.tabTimeData);
    console.log('从存储中加载的数据:', tabTimeData);
  } else {
    console.log('没有找到存储的数据，使用空对象初始化');
  }
});

// 修改更新函数，添加更多日志
function updateActiveTabTime() {
  if (activeTabId !== null && activeStartTime !== null) {
    const currentTime = Date.now();
    const timeSpent = currentTime - activeStartTime;
    console.log('当前活动标签页:', activeTabId);
    console.log('计算的时间间隔:', timeSpent);
    
    // 确保对象存在
    if (!tabTimeData[activeTabId]) {
      tabTimeData[activeTabId] = {
        url: '',  // 将在后续更新
        startTime: currentTime,
        totalTime: 0
      };
    }
    
    // 更新总时间
    tabTimeData[activeTabId].totalTime += timeSpent;
    console.log('更新后的数据:', tabTimeData);
    activeStartTime = currentTime;

    // 立即保存到存储
    chrome.storage.local.set({ tabTimeData });
  } else {
    console.log('没有活动标签页或开始时间');
  }
}

export default defineBackground(() => {
  // 定时更新活动标签页的数据
  setInterval(() => {
    if (!isMinimized) {
      console.log('updateActiveTabTime');
      updateActiveTabTime();
    }
  }, updateInterval);

  // 监听标签页激活事件
  chrome.tabs.onActivated.addListener((activeInfo: TabActiveInfo) => {
    console.log('标签页激活事件触发');
    activeTabId = activeInfo.tabId;
    activeStartTime = Date.now();

    // 获取当前标签页信息并更新URL
    chrome.tabs.get(activeTabId, (tab) => {
      if (tab && tab.url) {
        console.log('更新标签页URL:', tab.url);
        if (!tabTimeData[activeTabId as number]) {
          tabTimeData[activeTabId as number] = {
            url: tab.url,
            startTime: Date.now(),
            totalTime: 0,
          };
        } else {
          // 确保即使是已存在的标签页也更新URL
          tabTimeData[activeTabId as number].url = tab.url;
        }
        // 保存更新后的数据
        chrome.storage.local.set({ tabTimeData });
      }
    });
    updateActiveTabTime();
  });

  // 监听标签页更新事件
  chrome.tabs.onUpdated.addListener((
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) => {
    console.log('标签页更新事件触发', { changeInfo, tab });
    if (changeInfo.url || (changeInfo.status === 'complete' && tab.url)) {
      console.log('更新标签页URL:', tab.url);
      if (!tabTimeData[tabId]) {
        tabTimeData[tabId] = {
          url: tab.url!,
          startTime: Date.now(),
          totalTime: 0,
        };
      } else {
        // 更新已有标签页的URL
        tabTimeData[tabId].url = tab.url!;
      }
      // 保存更新后的数据
      chrome.storage.local.set({ tabTimeData });
    }
  });

  // 监听窗口焦点变化事件
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      updateActiveTabTime();
      activeTabId = null;
    } else if (typeof windowId === 'number') {
      // 确保 windowId 是有效的数字
      chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
        if (tabs.length > 0 && !isMinimized) {
          activeTabId = tabs[0].id || null;
          activeStartTime = Date.now();
        }
      });
    }
  });

  // 监听窗口最小化事件
  chrome.windows.onBoundsChanged.addListener((window: chrome.windows.Window) => {
    if (window && typeof window.id === 'number') {
      chrome.windows.get(window.id, (win) => {
        if (win?.state === 'minimized') {
          updateActiveTabTime(); // 窗口最小化时更新时间
          isMinimized = true;
        } else if (isMinimized) {
          // 窗口恢复时重新计时
          isMinimized = false;
          if (activeTabId !== null) {
            activeStartTime = Date.now();
          }
        }
      });
    }
  });

  // 监听消息事件，返回时间数据
  chrome.runtime.onMessage.addListener((
    message: RuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.action === 'getTabTimeData') {
      sendResponse(tabTimeData);
      console.log('返回的数据:', tabTimeData);
    }
  });

  //----------------------------------------------------------------------------------
  console.log('Hello background!', { id: browser.runtime.id });

  // 存储当前的闹钟列表
  let alarms: AlarmInfo[] = [];

  // 检查闹钟的定时器
  setInterval(checkAlarms, 1000);

  // 监听来自 popup 的消息
  browser.runtime.onMessage.addListener((message: { type: string; alarms?: AlarmInfo[] }) => {
    switch (message.type) {
      case 'SET_ALARMS':
        if (message.alarms) {
          alarms = message.alarms;
        }
        break;
      case 'GET_ALARMS':
        return Promise.resolve(alarms);
    }
  });

  // 检查闹钟
  function checkAlarms() {
    const now = new Date();
    alarms.forEach(alarm => {
      const alarmTime = new Date(alarm.time);
      if (alarmTime <= now && !alarm.triggered) {
        alarm.triggered = true;
        // 触发闹钟
        triggerAlarm();
      }
    });
  }

  // 触发闹钟
  async function triggerAlarm() {
    try {
      // 使用localStorage来传递触发闹钟的信号
      // localStorage.setItem('triggerAlarm', 'true');

      // 打开弹出窗口并切换到计时器页面
      await browser.action.openPopup();
      // 先发送消息切换路由
      await browser.runtime.sendMessage({ type: 'SWITCH_TO_TIMER' });

      // // 等待一小段时间确保组件已挂载
      // await new Promise(resolve => setTimeout(resolve, 500));

      // // 再发送触发闹钟的消息
      // await browser.runtime.sendMessage({ type: 'TRIGGER_ALARM' });
    } catch (error) {
      console.error('触发闹钟失败:', error);
    }
  }
});

// background.ts
let blacklist: string[] = [];
let isFocusModeActive = false;
let focusDuration: number | null = null;
let warningWindowId: number | null = null;
let focusTimer: NodeJS.Timeout | null = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  if (message.action === 'updateBlacklist') {
    blacklist = message.blacklist;
    console.log('黑名单已更新:', blacklist);
  } else if (message.action === 'startFocusMode') {
    isFocusModeActive = true;
    focusDuration = message.focusDuration;
    blacklist = message.blacklist;
    console.log('专注模式启动，持续时间:', focusDuration, '分钟, 黑名单:', blacklist);

    // 设置计时器
    if (focusTimer) {
      clearTimeout(focusTimer);
    }
    if (focusDuration) {
      focusTimer = setTimeout(() => {
        endFocusMode();
      }, focusDuration * 60 * 1000);
    }
  } else if (message.action === 'endFocusMode') {
    endFocusMode();
  }
});

async function endFocusMode() {
  isFocusModeActive = false;
  focusDuration = null;
  console.log('专注模式结束');

  // 清除计时器
  if (focusTimer) {
    clearTimeout(focusTimer);
    focusTimer = null;
  }

  // 确保结束专注模式时关闭警告窗口
  if (warningWindowId !== null) {
    chrome.windows.remove(warningWindowId);
    warningWindowId = null;
  }
   // 打开弹出窗口并切换到计时器页面
   await browser.action.openPopup();

   // 先发送消息切换路由
   await browser.runtime.sendMessage({ type: 'SWITCH_TO_FOCUS' });

   setTimeout(() => {
    // 向Vue组件发送消息
    browser.runtime.sendMessage({ action: 'focusModeEnded' });
  }, 2000); // 等待2秒，你可以根据需要调整这个时间
   

}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Tab updated:', { tabId, changeInfo, tab });
  if (isFocusModeActive && tab.url && changeInfo.status === 'complete') {
    const domain = new URL(tab.url).hostname;
    console.log('Checking domain:', domain);
    
    // 修改这里的判断逻辑
    const isBlacklisted = blacklist.some((blacklistDomain) => {
      // 将域名转换为正则表达式
      const regex = new RegExp(`(^|\\.)${blacklistDomain.replace(/\./g, '\\.')}$`);
      return regex.test(domain);
    });
    
    console.log('Is blacklisted:', isBlacklisted);

    if (isBlacklisted) {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          console.error('Error closing tab:', chrome.runtime.lastError);
        } else {
          console.log('Tab closed successfully');
        }
      });

      // 只在没有警告窗口时创建新窗口
      if (warningWindowId === null) {
        chrome.windows.create({
          url: chrome.runtime.getURL('warning.html'),
          type: 'popup',
          width: 400,
          height: 200
        }, (window) => {
          if (window && window.id !== undefined) {
            warningWindowId = window.id;
            // 设置定时器，5秒后自动关闭警告窗口
            setTimeout(() => {
              if (warningWindowId !== null) {
                chrome.windows.remove(warningWindowId);
                warningWindowId = null;
              }
            }, 5000);
          }
        });
      }
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '专注模式',
        message: '你正在访问一个被禁止的网站！请继续保持专注。',
      });
    }
  }
});
// 监听窗口关闭事件
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === warningWindowId) {
    warningWindowId = null;
  }
});
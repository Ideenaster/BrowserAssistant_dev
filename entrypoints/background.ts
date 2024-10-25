interface AlarmInfo {
  id: number;
  time: string;
  triggered: boolean;
}

export default defineBackground(() => {
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

<template>
  <el-container class="stats-container">
    <el-main class="controls-container">
      <!-- <h2>健康使用 - 统计信息</h2> -->
      <div class="button-group">
        <el-button-group>
          <el-button type="primary" @click="setTimeRange('today')">今天</el-button>
          <el-button type="primary" @click="setTimeRange('7days')">过去7天</el-button>
          <el-button type="primary" @click="setTimeRange('30days')">过去30天</el-button>
        </el-button-group>
      </div>
      <div class="toggle-group">
        <el-button-group>
          <el-button type="primary" @click="toggleStatistic('time')">浏览时长</el-button>
          <el-button type="primary" @click="toggleStatistic('count')">打开次数</el-button>
        </el-button-group>
      </div>
      <div class="switch-group">
        <span>切换视图：</span>
        <el-switch v-model="isChartView" active-text="饼状图" inactive-text="排行榜" @change="updateView"></el-switch>
      </div>
    </el-main>
    <el-main class="chart-container">
      <div id="chart"></div>
    </el-main>
  </el-container>
</template>

<script>
import * as echarts from 'echarts';
import { ElButton, ElButtonGroup, ElContainer, ElMain, ElSwitch } from 'element-plus';

export default {
  components: {
    ElButton,
    ElButtonGroup,
    ElContainer,
    ElMain,
    ElSwitch,
  },
  data() {
    return {
      tabTimeData: {},
      domainUrlMap: {},
      selectedTimeRange: '7days',
      statisticType: 'time',
      isChartView: true,
      domainData: {},
    };
  },
  mounted() {
    this.fetchTabTimeData();
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    fetchTabTimeData() {
      chrome.runtime.sendMessage({ action: 'getTabTimeData' }, (response) => {
        this.tabTimeData = response;
        this.filterDataByTimeRange();
      });
    },
    filterDataByTimeRange() {
      const currentTime = Date.now();
      let startTime;

      if (this.selectedTimeRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startTime = today.getTime();
      } else if (this.selectedTimeRange === '7days') {
        startTime = currentTime - 7 * 24 * 60 * 60 * 1000;
      } else if (this.selectedTimeRange === '30days') {
        startTime = currentTime - 30 * 24 * 60 * 60 * 1000;
      }

      const filteredData = {};
      for (const [tabId, item] of Object.entries(this.tabTimeData)) {
        if (item.startTime >= startTime) {
          filteredData[tabId] = item;
        }
      }

      this.tabTimeData = filteredData;
      this.updateData();
    },
    setTimeRange(range) {
      this.selectedTimeRange = range;
      this.filterDataByTimeRange();
    },
    toggleStatistic(type) {
      this.statisticType = type;
      this.updateData();
    },
    extractMainDomain(url) {
      try {
        const hostname = new URL(url).hostname;
        const domainParts = hostname.split('.').slice(-2);
        return domainParts.join('.');
      } catch (e) {
        return url;
      }
    },
    formatTime(ms) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}分钟${seconds}秒`;
    },
    updateData() {
      this.domainData = {};
      this.domainUrlMap = {};

      Object.values(this.tabTimeData).forEach((item) => {
        const mainDomain = this.extractMainDomain(item.url);

        if (!this.domainData[mainDomain]) {
          this.domainData[mainDomain] = { time: 0, count: 0 };
          this.domainUrlMap[mainDomain] = item.url;
        }

        this.domainData[mainDomain].time += item.totalTime;
        this.domainData[mainDomain].count += 1;
      });

      this.updateView();
    },
    updateView() {
      const chartDom = document.getElementById('chart');
      let myChart = echarts.getInstanceByDom(chartDom);
      if (!myChart) {
        myChart = echarts.init(chartDom);
      }
      myChart.clear();

      myChart.resize();

      if (this.isChartView) {
        this.initPieChart(myChart);
      } else {
        this.initBarChart(myChart);
      }
    },
    initPieChart(myChart) {
      const totalValue = Object.values(this.domainData).reduce(
        (sum, item) => sum + (this.statisticType === 'time' ? item.time : item.count),
        0
      );

      let data = Object.entries(this.domainData)
        .map(([domain, values]) => ({
          name: domain,
          value: this.statisticType === 'time' ? values.time : values.count,
          formattedTime: this.formatTime(values.time),
        }))
        .sort((a, b) => b.value - a.value);

      const otherData = data.slice(7);
      const otherCount = otherData.length;
      const otherValue = otherData.reduce((sum, item) => sum + item.value, 0);

      data = data.slice(0, 7);
      if (otherValue > 0) {
        data.push({
          name: `其他${otherCount}个网址`,
          value: otherValue,
          formattedTime: this.formatTime(otherValue),
        });
      }

      const option = {
        tooltip: {
          trigger: 'item',
          position: function (point, params, dom, rect, size) {
            const [x, y] = point;
            const { contentSize, viewSize } = size;
            const posX = x < viewSize[0] / 2 ? x : x - contentSize[0];
            const posY = y < viewSize[1] / 2 ? y : y - contentSize[1];
            return [posX, posY];
          },
          formatter: (params) => {
            const percentage = ((params.value / totalValue) * 100).toFixed(2);
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${params.name}`;
            return `
              <img src="${faviconUrl}" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;">
              ${params.name}: ${
              this.statisticType === 'time'
                ? params.data.formattedTime
                : params.value + '次'
            } (${percentage}%)`;
          },
        },
        legend: {
          top: '5%',
          left: 'center',
        },
        series: [
          {
            name: this.statisticType === 'time' ? '浏览时间' : '打开次数',
            type: 'pie',
            radius: '50%',
            data: data,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      };

      myChart.setOption(option);

      myChart.on('click', (params) => {
        const domain = params.name;
        const url = this.domainUrlMap[domain];
        if (url) {
          window.open(url, '_blank');
        }
      });
    },
    initBarChart(myChart) {
      const data = Object.entries(this.domainData)
        .map(([domain, values]) => ({
          name: domain,
          value: this.statisticType === 'time' ? values.time / 60000 : values.count,
          formattedTime: this.formatTime(values.time),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
          formatter: (params) => {
            const item = params[0];
            return `${data[item.dataIndex].name}: ${
              this.statisticType === 'time'
                ? data[item.dataIndex].formattedTime
                : item.value + '次'
            }`;
          },
        },
        xAxis: {
          type: 'value',
          boundaryGap: [0, 0.01],
        },
        yAxis: {
          type: 'category',
          data: data.map((_, index) => `TOP${index + 1}`),
        },
        series: [
          {
            type: 'bar',
            data: data.map((item) => item.value),
            itemStyle: {
              color: (params) => {
                const colors = ['#ff6f61', '#6b5b95', '#feb236', '#d64161', '#ff7b25'];
                return colors[params.dataIndex % colors.length];
              },
            },
            label: {
              show: false,
            },
          },
        ],
        legend: {
          data: data.map((item) => item.name),
          formatter: (name) => name,
          top: 'bottom',
        },
      };

      myChart.setOption(option);

      myChart.on('click', (params) => {
        const domain = data[params.dataIndex].name;
        const url = this.domainUrlMap[domain];
        if (url) {
          window.open(url, '_blank');
        }
      });
    },
    handleResize() {
      const chartDom = document.getElementById('chart');
      const myChart = echarts.getInstanceByDom(chartDom);
      if (myChart) {
        myChart.resize();
      }
    }
  },
};
</script>

<!-- <style scoped>
.stats-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.controls-container {
  padding: 15px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.chart-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

#chart {
  width: 100%;
  flex: 1;
  min-height: 400px;
}

.button-group,
.toggle-group,
.switch-group {
  margin-bottom: 10px;
}

h2 {
  margin-bottom: 15px;
  margin-top: 0;
}
</style> -->

<style scoped>
.stats-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.controls-container {
  padding: 10px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
  flex-basis: 30%;
}

.chart-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  flex-basis: 70%;
}

#chart {
  width: 100%;
  min-height: 400px;
  flex: 1;
}

.button-group,
.toggle-group,
.switch-group {
  margin-bottom: 5px;
}

.el-button {
  font-size: 12px; /* 减小字体大小 */
  padding: 6px 12px; /* 减小填充 */
}

h2 {
  margin-bottom: 10px;
  margin-top: 0;
}
</style>
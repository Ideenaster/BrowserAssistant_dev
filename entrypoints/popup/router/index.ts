import { createRouter, createWebHashHistory } from 'vue-router'

import QuickNotes from '../components/QuickNotes/QuickNotes.vue'
import HealthUsage from '../components/StatsInfo.vue'
import Timer from '../components/Timer.vue'
import PersonalSpace from '../components/PersonalSpace.vue'
import FocusMode from '../components/FocusMode.vue'

const routes = [
  { path: '/', redirect: '/health' },
  { path: '/health', component: HealthUsage },
  { path: '/notes', component: QuickNotes },
  { path: '/timer', component: Timer },
  { path: '/focus', component: FocusMode },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
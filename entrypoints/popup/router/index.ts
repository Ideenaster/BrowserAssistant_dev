import { createRouter, createWebHashHistory } from 'vue-router'
import HealthUsage from '../components/HealthUsage/HealthUsage.vue'
import QuickNotes from '../components/QuickNotes/QuickNotes.vue'
import Timer from '../components/Timer.vue'
import PersonalSpace from '../components/PersonalSpace.vue'

const routes = [
  { path: '/', redirect: '/health' },
  { path: '/health', component: HealthUsage },
  { path: '/notes', component: QuickNotes },
  { path: '/timer', component: Timer },
  { path: '/personal', component: PersonalSpace },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
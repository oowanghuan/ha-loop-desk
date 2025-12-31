/**
 * HA Loop Desk - Vue Router 配置
 */

import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue')
  },
  {
    path: '/workspace',
    name: 'Workspace',
    component: () => import('../views/WorkspaceView.vue')
  },
  {
    path: '/workspace/:featureId',
    name: 'WorkspaceFeature',
    component: () => import('../views/WorkspaceView.vue'),
    props: true
  },
  {
    path: '/workspace/:featureId/:phaseId',
    name: 'WorkspacePhase',
    component: () => import('../views/WorkspaceView.vue'),
    props: true
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('../views/ProjectsView.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

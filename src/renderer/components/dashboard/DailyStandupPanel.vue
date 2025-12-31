<script setup lang="ts">
/**
 * DailyStandupPanel - 每日站会面板
 * 显示今日进展、阻塞问题、明日计划
 */
import { ref } from 'vue'
import type { StandupItem, BlockerItem, PlanItem } from '../../types/dashboard.types'

interface Props {
  highlights: StandupItem[]
  blockers: BlockerItem[]
  tomorrow: PlanItem[]
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'feature-click', featureId: string): void
}>()

const collapsed = ref(false)

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="standup-panel" :class="{ 'standup-panel--collapsed': collapsed }">
    <div class="standup-header">
      <div class="standup-title">
        <el-icon size="20"><Avatar /></el-icon>
        <span>AI Project Agent</span>
        <el-tag type="info" size="small">Daily Standup</el-tag>
      </div>
      <div class="standup-actions">
        <el-button text @click="emit('refresh')">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button text @click="collapsed = !collapsed">
          <el-icon>
            <ArrowUp v-if="!collapsed" />
            <ArrowDown v-else />
          </el-icon>
        </el-button>
      </div>
    </div>

    <div v-show="!collapsed" class="standup-content">
      <!-- 今日进展 -->
      <div class="standup-section">
        <div class="section-header">
          <el-icon color="#67c23a"><SuccessFilled /></el-icon>
          <span>今日进展</span>
          <el-badge v-if="highlights.length" :value="highlights.length" type="success" />
        </div>
        <div class="section-content">
          <template v-if="highlights.length">
            <div
              v-for="item in highlights"
              :key="item.featureId"
              class="standup-item"
              @click="emit('feature-click', item.featureId)"
            >
              <span class="item-feature">{{ item.featureName }}</span>
              <span class="item-summary">{{ item.summary }}</span>
            </div>
          </template>
          <div v-else class="no-items">暂无更新</div>
        </div>
      </div>

      <!-- 阻塞问题 -->
      <div class="standup-section">
        <div class="section-header">
          <el-icon color="#f56c6c"><WarningFilled /></el-icon>
          <span>阻塞问题</span>
          <el-badge v-if="blockers.length" :value="blockers.length" type="danger" />
        </div>
        <div class="section-content">
          <template v-if="blockers.length">
            <div
              v-for="item in blockers"
              :key="item.featureId"
              class="standup-item standup-item--blocker"
              @click="emit('feature-click', item.featureId)"
            >
              <div class="item-header">
                <span class="item-feature">{{ item.featureName }}</span>
                <span class="item-since">自 {{ formatDate(item.blockedSince) }}</span>
              </div>
              <span class="item-issue">{{ item.issue }}</span>
            </div>
          </template>
          <div v-else class="no-items no-items--success">
            <el-icon><CircleCheckFilled /></el-icon>
            无阻塞
          </div>
        </div>
      </div>

      <!-- 明日计划 -->
      <div class="standup-section">
        <div class="section-header">
          <el-icon color="#409eff"><Calendar /></el-icon>
          <span>明日计划</span>
          <el-badge v-if="tomorrow.length" :value="tomorrow.length" type="primary" />
        </div>
        <div class="section-content">
          <template v-if="tomorrow.length">
            <div
              v-for="(item, index) in tomorrow"
              :key="index"
              class="standup-item"
              @click="item.featureId && emit('feature-click', item.featureId)"
            >
              <span class="item-plan">{{ item.plan }}</span>
            </div>
          </template>
          <div v-else class="no-items">暂无计划</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.standup-panel {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  margin: 16px 20px;
  color: #ffffff;
  overflow: hidden;
}

.standup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.1);
}

.standup-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.standup-actions {
  display: flex;
  gap: 4px;
}

.standup-actions .el-button {
  color: rgba(255, 255, 255, 0.9);
}

.standup-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.standup-section {
  background: rgba(0, 0, 0, 0.1);
  padding: 12px 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 500;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
}

.standup-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.standup-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.standup-item--blocker {
  border-left: 3px solid #f56c6c;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.item-feature {
  font-weight: 500;
  font-size: 13px;
}

.item-summary,
.item-issue,
.item-plan {
  font-size: 12px;
  opacity: 0.9;
  display: block;
}

.item-since {
  font-size: 11px;
  opacity: 0.7;
}

.no-items {
  text-align: center;
  opacity: 0.7;
  padding: 8px;
  font-size: 13px;
}

.no-items--success {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #67c23a;
  opacity: 1;
}

/* Collapsed state */
.standup-panel--collapsed .standup-content {
  display: none;
}

/* Custom scrollbar */
.section-content::-webkit-scrollbar {
  width: 4px;
}

.section-content::-webkit-scrollbar-track {
  background: transparent;
}

.section-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}
</style>

## 系统连贯性改进方案

### 核心问题

当前 9 个页面是按技术模块切的（M1-M9），彼此之间没有数据流转、没有上下文传递、没有"下一步"引导。用户必须自己记住"传完文件该去哪个页面"。Overview 的 5 步指引只是静态链接，点进去之后就没有任何后续牵引了。

### 目标

让用户只做**一个动作**（上传培养方案），系统自动推进整条链路，每个页面都能感知"当前走到哪了、下一步该干嘛"。

### 主线定义

```
上传材料 → AI 提取节点 → 图谱更新 → 覆盖度诊断 → 改进建议
   M3          M3/M4         M2          M5           M7
```

用户视角只有三步：传文件 → 确认 AI 结果 → 看报告。中间的提取、推断、诊断由系统自动编排。

---

### 改动清单

#### 一、后端：让 pipeline 真正串起来（Qoder 负责）

| # | 改动 | 说明 | 工作量 |
|---|------|------|--------|
| B1 | 上传后自动触发提取 | `POST /resources/upload` 返回后，异步调用 LLM extract 接口，把提取结果写回 resource 的 processingStages | 0.5d |
| B2 | 提取完成 → 自动入图 | 提取出的节点/关系写入 orchestration graph（status=pending_review），触发覆盖度重算 | 0.5d |
| B3 | 新增 `GET /pipeline/status` | 返回当前用户的 pipeline 进度：`{ stage: "extracting"|"reviewing"|"diagnosing"|"done", progress: 0.6, message: "正在提取第3/5页..." }` | 0.5d |
| B4 | 诊断 → 自动生成改进建议 | 覆盖度分析发现 gap 时，自动在 improvements 表插入一条 open 状态的建议 | 0.5d |

关键原则：不改现有接口签名，只加异步后置逻辑 + 一个新查询接口。

#### 二、前端：让用户体验连贯（trea 负责）

| # | 改动 | 说明 | 工作量 |
|---|------|------|--------|
| F1 | 全局 Pipeline 进度条 | AppShell 顶部加一条 Steps 组件（上传→提取→审核→诊断→改进），根据 `/pipeline/status` 高亮当前阶段，点击可跳转对应页面 | 1d |
| F2 | 页面内"下一步"引导 | 每个模块页面底部加一个 contextual banner：Resources 页传完文件后显示"AI 正在提取，去图谱看看→"；Graph 页有新 pending 边时显示"有 3 条关系待审核→"；Diagnostics 页有 gap 时显示"已生成 2 条改进建议→" | 1d |
| F3 | Overview 指引改为动态 | 把现在的静态 5 步卡片改成根据 pipeline/status 渲染：已完成的步骤打勾、当前步骤高亮、未开始的灰显。不再是"教学"，而是"进度" | 0.5d |
| F4 | 上传后留在当前页看进度 | UploadDropzone 上传成功后，不只是 toast，而是在材料表格行内显示实时状态轮询（pending → extracting → extracted），用户不用切页面就能看到进展 | 0.5d |
| F5 | 空状态牵引 | 每个页面在无数据时显示引导："还没有图谱数据，先上传一份培养方案"＋按钮直跳 /resources | 0.5d |

#### 三、联调 & 验收（共同）

| # | 改动 | 说明 |
|---|------|------|
| V1 | 端到端 Demo 脚本 | 准备一份真实培养方案 PDF，跑通：上传 → 看到提取进度 → 图谱出现新节点 → 审核通过 → 诊断报告更新 → 改进建议出现 |
| V2 | 录屏备份 | 答辩前录一屏完整流程，防止现场网络/LLM 不稳 |

---

### 分工边界

```
Qoder（我）：后端 B1-B4 + 前端 API client 层（pipelineClient.ts）
trea：      前端 F1-F5（UI 组件 + 交互逻辑）
共同：      V1-V2 联调验收
```

接口契约（trea 开发时 mock 用）：

```typescript
// GET /api/v1/pipeline/status
interface PipelineStatus {
  stage: 'idle' | 'uploading' | 'extracting' | 'reviewing' | 'diagnosing' | 'done';
  progress: number;        // 0-1
  message: string;         // "正在提取第 3/5 页..."
  pendingReviewCount: number;  // 待审核关系数
  gapCount: number;            // 覆盖缺口数
  suggestionCount: number;     // 改进建议数
  lastUpdated: string;
}
```

trea 可以先用这个类型 mock 数据做 UI，我这边同步把后端实现补上，最后对接。

---

### 优先级排序

如果时间紧（答辩前 5 天），按这个顺序砍：

1. **必做**：F1 进度条 + F2 下一步引导 + B3 pipeline/status 接口 → 最小成本让系统"看起来连贯"
2. **应做**：F4 上传后行内进度 + F3 动态指引 → 让 Demo 有"活"的感觉
3. **可做**：B1/B2 真异步 pipeline + B4 自动建议 → 让系统真的自动跑，不只是看起来
4. **锦上添花**：F5 空状态 → 细节体验

第 1 档一天能做完，答辩就有质的提升。第 3 档需要 LLM key 稳定可用。

---

### 不改什么

- 不动架构（六边形、边界测试、DI 模式都保留）
- 不动现有接口签名（只加新接口）
- 不重写页面（在现有页面上加引导组件）
- 不做 M9 治理模块（disabled 就 disabled）

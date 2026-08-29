# 轨迹：后台回应策略与云端配置规范 v1

> 面向对象：产品、AI/Prompt、后端、数据、隐私与运营人员  
> 产品版本：无社区版 v1  
> 文档状态：初版共识，可作为后台配置和评审基线

## 1. 文档目的

本文件把“自画像的回声”产品哲学转化为可执行的后台规则，明确：

- AI 在什么范围内回应、什么事情不能做；
- 主动提醒如何限频、何时自动暂停；
- 哪些设定可以在云端控制台调整，哪些必须通过代码和安全评审；
- 用户、单条记录、主题和全局设置之间的优先级；
- 数据、模型、Prompt 和策略版本如何追踪、回滚与审计。

后台的目标不是让 AI 更“积极”，而是让回应稳定、克制、可解释，并且不会把陪伴变成监督。

## 2. 核心原则（不可被普通配置覆盖）

1. **用户主动发起优先**：默认只在用户输入后回应，不默认发送主动通知。
2. **回应不是命令**：不使用“必须、应该、你又失败了”等施压语言，不设置连续打卡、完成率或排名。
3. **行动和不行动都合法**：每次回应都可以提供一个最小行动，也必须允许“先记录、不行动、稍后再看”。
4. **不评判反复**：同一主题再次出现，不显示次数、失败或改善率；将其视为会反复回来的长期叙事。
5. **过去不能用来指责现在**：历史记录只能用于用户主动回看或明确授权的关联，不用于证明用户“没有进步”。
6. **默认私密**：记录、媒体和 AI 派生数据默认仅用户可见；云同步与 AI 使用分开授权。
7. **安全优先**：出现自伤、他伤或即时危险迹象时，停止普通任务拆解，转入安全支持流程。
8. **历史不可静默改写**：已经展示或保存的 AI 回复不被后台配置重写；新策略只影响新请求，并保留原版本。

## 3. 后台策略分层与优先级

```text
L0 安全与合规硬规则（代码/模型网关）
  > L1 全局产品策略（云端配置）
  > L2 用户偏好（用户设置）
  > L3 主题/故事策略（用户对某一长期主题的设置）
  > L4 单次对话控制（本轮临时选择）
```

高层策略不能被低层策略突破。例如，用户可以选择“更长的回应”，但不能关闭安全支持；主题可以设置提醒，但不能突破全局频控上限。

### 3.1 配置的可变性

| 层级 | 示例 | 普通后台可调 | 生效方式 |
|---|---|---:|---|
| L0 硬规则 | 危机识别、隐私隔离、禁止诊断 | 否 | 代码发布/安全评审 |
| L1 全局策略 | 默认语气、回复长度、提醒上限 | 是，需审批 | 按指定生效窗口 |
| L2 用户偏好 | 左/右手、是否调用历史、安静模式 | 用户可调 | 立即影响后续请求 |
| L3 主题策略 | 某主题是否提醒、提醒时间 | 用户可调 | 进入调度器后生效 |
| L4 单次控制 | “只听我说”“不要调用过去记录” | 用户可调 | 当前请求有效 |

## 4. 核心数据对象

### 4.1 `user_profile`

```yaml
user_id: string
locale: zh-CN
timezone: Asia/Shanghai
handedness: right        # left | right | unknown
theme_id: string
global_privacy: private   # private | encrypted_sync
ai_media_consent: false
history_recall_consent: false
proactive_reminder_mode: off  # off | user_scheduled | gentle_review
quiet_mode_until: null
created_at: datetime
updated_at: datetime
```

### 4.2 `story_record`

一条用户输入及其生成的“回声”是不可变事件，后续修订以新版本追加。

```yaml
record_id: string
user_id: string
story_id: string
input_type: text             # text | image | audio | video | mixed
raw_asset_refs: [string]
transcript: string|null
user_text: string|null
user_privacy: private        # private | encrypted_sync | local_only
ai_processing_allowed: false
history_recall_allowed: false
user_intent: listen_only     # listen_only | break_down | recall | unspecified
emotion_signal: null         # 仅用于当次安全路由，不作为诊断结论
created_at: datetime
retention_until: datetime|null
```

### 4.3 `ai_response_event`

```yaml
response_id: string
record_id: string
policy_version: string
prompt_version: string
model_id: string
response_mode: reflect       # reflect | break_down | recall | safety_support
content: string
suggested_action: string|null
non_action_option: string|null
source_record_ids: [string]
safety_route: none           # none | support | emergency_guidance
created_at: datetime
```

### 4.4 `story_topic`

用于承载会反复出现的长期叙事，不等同于“问题已解决/未解决”。

```yaml
story_id: string
user_id: string
title: string
topic_label: string|null
record_ids: [string]
reminder_enabled: false
next_reminder_at: datetime|null
reminder_cooldown_until: datetime|null
user_archived: false
created_at: datetime
updated_at: datetime
```

### 4.5 `reminder_event`

```yaml
reminder_id: string
user_id: string
story_id: string|null
source_response_id: string|null
scheduled_at: datetime
sent_at: datetime|null
status: scheduled       # scheduled | sent | opened | snoozed | dismissed | cancelled
copy_version: string
attempt_count: 0
```

## 5. AI 回复策略

### 5.1 默认回复结构

默认短回复由三段组成，顺序固定但可按场景省略：

1. **复述**：说明 AI 听到的处境，不替用户下结论；
2. **最小动作**：一个 1–10 分钟内可完成、可拒绝的动作；
3. **不行动出口**：允许只记录、暂停或稍后返回。

`response_length` 建议枚举：

```yaml
response_length: short   # short | medium；v1 不开放 long
max_chars:
  short: 180
  medium: 420
```

### 5.2 允许调节的回复参数

以下参数可以在云端策略中心调整，但必须经过离线评估和灰度：

```yaml
response_policy:
  tone: warm_plain       # warm_plain | poetic_light | direct_calm
  response_length: short
  max_action_count: 1
  include_non_action_option: true
  include_absurd_option: true
  ask_followup_question: false
  use_history_by_default: false
  media_interpretation: opt_in_only
  mention_long_term_topic: user_requested_only
  judgment_words_blocklist: [必须, 应该, 你又, 失败, 懒惰, 不够努力]
```

以下内容不开放给普通运营直接修改：安全话术、危机路由、隐私授权逻辑、诊断/治疗相关禁用规则。

### 5.3 当次对话控制

用户的临时选择写入请求上下文，不永久改变用户偏好：

```yaml
request_controls:
  mode: listen_only       # listen_only | break_down | recall
  no_history: true
  no_suggestion: true
  language: zh-CN
```

## 6. 提醒策略与频控

### 6.1 默认策略

```yaml
reminder_policy:
  default_mode: off
  daily_cap: 1
  weekly_cap: 3
  same_story_cooldown_days: 7
  ignored_reminder_limit: 2
  quiet_mode_default_hours: 24
  monthly_review: user_opened_only
  yearly_review: user_opened_only
```

### 6.2 发送前检查

提醒只有在以下条件同时满足时才可发送：

- 用户开启了 `user_scheduled` 或 `gentle_review`；
- 当前时间位于用户安静时段之外；
- 未超过日/周上限；
- 同一主题不在冷却期；
- 用户没有连续忽略达到阈值；
- 内容仍然具有隐私授权；
- 不是危机内容的自动追踪。

### 6.3 忽略和暂停规则

- 用户点击“不再提醒”：立即取消该主题未来提醒；
- 连续忽略两次：自动暂停该主题提醒，并在故事页说明原因；
- 用户开启“今天先不提醒”：暂停 24 小时，不改变长期偏好；
- 用户删除或撤回授权：取消关联提醒并清理通知 payload；
- 不因用户情绪反复而增加频次。

## 7. 云端配置的调整窗口

“调整窗口”需要按风险和影响范围分层，不能把所有参数都做成一个即时开关。

### 7.1 即时窗口：0–5 分钟

仅用于保护用户和控制事故：

- 全局关闭主动提醒；
- 全局关闭图片/音频/视频 AI 分析；
- 暂停历史回声调用；
- 将回复切换到最小安全模板；
- 暂停某个模型或 Prompt 版本。

这些是 **kill switch**，可立即生效，必须记录操作者、原因和恢复条件。

### 7.2 请求级窗口：下一次 AI 请求

适合用户偏好和低风险表达变化：

- 回复长度、语气偏好；
- 是否调用历史回声；
- “只听我说 / 帮我拆一步 / 帮我回看过去”；
- 是否允许媒体理解。

用户的单次控制应只影响当前请求；用户设置则从下一次请求开始生效。不要在同一轮生成中途切换策略。

### 7.3 会话级窗口：新会话或新主题开始时

适合需要保持上下文一致性的设置：

- Prompt 模板版本；
- 长期主题识别阈值；
- 回声引用的最大条数和时间范围；
- 结构化回复字段。

已开始的会话固定 `policy_version`，避免用户在一段对话中遇到风格突然变化。

### 7.4 调度级窗口：下一次提醒调度周期

适合频次、冷却和安静时段：

- 每日/每周上限；
- 同主题冷却天数；
- 忽略阈值；
- 安静模式时长；
- 提醒文案版本。

已经发送的通知不追溯修改；尚未发送的任务按最新策略重新校验。

### 7.5 周期级窗口：下一个月报/年报周期

适合聚合和回望：

- 月报/年报的章节结构；
- 主题聚合算法版本；
- 回声引用数量；
- 可视化色彩和排序规则。

已生成的月报/年报保留当时的算法和数据快照，不能因后台改规则而静默变化；如需修订，应生成“修订版”。

## 8. 配置中心字段建议

```yaml
config_key: response_policy.tone
value: warm_plain
scope: global             # global | cohort | user | story
effective_at: datetime
expires_at: datetime|null
policy_version: string
change_reason: string
changed_by: string
approved_by: [string]
rollback_to: string|null
status: draft             # draft | approved | scheduled | active | rolled_back | expired
```

后台界面至少应提供：

- 当前生效值与上一版本对比；
- 预览样例（脱敏测试输入）；
- 影响范围和预计用户数；
- 生效时间、失效时间；
- 灰度比例与目标人群；
- 一键回滚；
- 变更原因、审批人和审计日志。

## 9. 变更流程

低风险文案或色彩参数也应遵循最小流程：

```text
草稿 → 脱敏样例评估 → 安全/隐私检查 → 小流量灰度 → 观察窗口 → 全量或回滚
```

建议灰度观察窗口：

- 回复文案/语气：至少 24 小时；
- 提醒频次：至少 7 天，覆盖一个完整周周期；
- 月报/年报算法：至少完成一轮离线回放；
- 安全规则：不做普通灰度，采用双轨评估和即时回滚。

## 10. 监控指标与反指标

### 10.1 必须监控

- AI 回复生成失败率、延迟和超时率；
- 用户主动选择“只听我说 / 不要建议”的比例；
- 提醒打开、延后、取消和忽略率；
- 连续忽略后自动暂停的比例；
- 历史回声调用率及用户撤回率；
- AI 媒体分析授权率和删除率；
- 安全路由触发率与人工抽检结果。

### 10.2 不作为优化目标

- 连续使用天数；
- 每日打开次数；
- 完成动作数量；
- “解决问题”数量；
- 发送提醒数量。

这些指标容易把产品重新推向 KPI 化，应只作为风险监测，不作为增长目标。

## 11. 隐私、留存与删除

- 原始文字、音频、图片、视频与 AI 派生数据分开存储和授权；
- 默认私密，服务端使用加密存储和传输；
- 通知 payload 不包含敏感原文，只使用中性文案；
- 用户撤回 AI 授权后，停止新处理；历史 AI 派生数据按用户选择删除；
- 用户删除记录时，同时取消相关提醒、索引、缓存和派生数据；
- 导出内容应包含原始记录、AI 回复、策略版本和时间戳，方便用户理解数据如何产生；
- 后台人员默认只能访问脱敏统计，不能浏览用户原文。

## 12. 安全支持路由

当输入出现明显自伤、他伤或即时危险信号时：

1. 暂停普通的行动拆解和主动提醒；
2. 生成简短、直接、不评判的安全确认；
3. 鼓励联系现实中的可信任的人和当地紧急服务；
4. 按地区展示危机热线/急救信息；
5. 不承诺持续监控，不通过通知反复追踪；
6. 记录 `safety_route`、策略版本和处理状态，严格限制访问。

安全支持规则属于 L0，不能由普通运营在云端自由改写。

## 13. v1 验收标准

- 新用户默认不会收到主动提醒；
- 任一主题在 7 天内最多触发一次主动提醒；
- 日上限为 1 条、周上限为 3 条，且不可被普通主题设置突破；
- 连续忽略两次后，该主题自动暂停提醒；
- 用户可在当前请求中关闭建议、历史调用和媒体理解；
- 每次 AI 回复可追溯到 `policy_version`、`prompt_version` 和 `model_id`；
- 后台调整不会重写历史 AI 回复和已生成报告；
- 可在 5 分钟内关闭主动提醒或历史调用；
- 删除或撤回授权会取消未来任务并清理相关派生数据；
- 安全路由不依赖普通运营配置即可正常工作。

## 14. 推荐的 v1 默认配置

```yaml
product:
  name: 轨迹
  metaphor: 自画像的回声
  community: false

response_policy:
  tone: warm_plain
  response_length: short
  max_action_count: 1
  include_non_action_option: true
  include_absurd_option: true
  ask_followup_question: false
  use_history_by_default: false
  media_interpretation: opt_in_only

reminder_policy:
  default_mode: off
  daily_cap: 1
  weekly_cap: 3
  same_story_cooldown_days: 7
  ignored_reminder_limit: 2
  quiet_mode_default_hours: 24
  monthly_review: user_opened_only
  yearly_review: user_opened_only

privacy:
  record_default: private
  ai_consent_separate: true
  notification_payload_sensitive_text: false
  allow_export: true
  allow_delete: true
```

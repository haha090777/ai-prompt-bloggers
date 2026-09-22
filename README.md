# AI 提示词博主合集

提示词星图把 X 上分享 AI 提示词的作者收成一堆头像。页面是浅色、简洁的卡片风：中间一只搜索框，底部是叠在一起的圆形头像。输入自然语言，或点标签，对上的人会从堆里浮上来；清空之后回到堆里。点开头像可以看到名字、简介、标签，以及 `https://x.com/<handle>`。

目录里**多数是公开账号**，另有少数标成「示例」的虚构占位。简介是根据公开介绍概括的，账号内容会变，不代表本人背书。头像优先用 `unavatar.io/x/<handle>`，失败时改用 Dicebear 首字母，再失败就用本地色块，构建不依赖外网图片。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。不配置任何密钥也可以搜索、让头像浮上来、按标签筛选，以及手动改标签、收录博主。没有密钥时，自然语言查询走本地规则，例如「英文博主」「有爆款」「海报提示词」。

生产构建：

```bash
npm run build
npm start
```

## 浏览和筛选

默认是头像堆，不是卡片墙。右上角可以切到「列表视图」。

- 搜索框接受自然语言。占位符会轮换「有爆款」「英文博主」「中文博主」「今天最热」「海报提示词」「UI 设计」。
- 搜索框下面的标签是快捷筛选，可多选。多选时包含任一标签的人都会浮上。「全部」清掉标签。「中文」会写入「中文博主」，只浮上 `locale: "zh"` 的账号。
- 标签和搜索同时存在时，两边都要满足。
- 没对上的人留在堆里，并变淡。
- 配置了 Jev 之后，`POST /api/search` 会把 `{ query, selectedTags, creators }` 交给 Jev，每位博主一道是/否题，概率 ≥ 0.62 才浮上。失败或没有密钥时，仍用本地规则，动画照常发生。

## 数据从哪来

真实账号来自公开的 X 简介、公开档案镜像、GitHub / 个人站互证（2026-09 前后核对）。只收了能确认 handle 的人，没有凭记忆编账号。

英文向（节选）：

- @lloydcreates、@nickfloats、@revelinai、@ciguleva、@dvorahfr、@javilopen：海报 / 视频 / 长片提示
- @RobotCleopatra：视频与长视频
- @godofprompt、@mckaywrigley、@goodside：提示词包、编程与试验
- @skirano：界面与相关提示

中文向（`locale: "zh"`，可用「中文博主」或「中文」芯片筛出）：

- @dotey、@op7418：原本就在名单里
- @lijigang、@vista8、@oran_ge、@xiaohu、@jesselaunz、@Khazix0918、@berryxia：提示词哲学、工具实践、Agent / 快讯
- @ZHO_ZHO_ZHO、@ring_hyacinth、@simonxxoo、@foxshuo、@dingyi：ComfyUI / AI 影像 / 画面提示 / 设计
- @lxfater、@HiTw93、@penny777：独立开发、Claude Code / Agent 技能，以及镜头语言与长视频流程

未编入：@Gorden_Sun（偏纯资讯日报）、@haibun（海辛实际账号是 @ring_hyacinth）、@iamluokai（未能可靠确认 X 主页）、@imxiaohu（官方互证指向 @xiaohu）。

`hot` 和 `locale` 是给「今天最热」「英文博主」「中文博主」用的粗分类，不是实时热度。要改名单，编辑 [`src/data/creators.ts`](src/data/creators.ts)。

## 新增博主

有两种方式。

**写进仓库（所有人都能看到）**

编辑 [`src/data/creators.ts`](src/data/creators.ts)，追加一条：

```ts
{
  id: "seed-yourhandle",
  name: "显示名",
  handle: "yourhandle", // 不含 @，1–15 位字母、数字或下划线
  bio: "一句话介绍这位博主主要分享什么。",
  tags: ["poster"], // poster | video | ui | long_video | code | other，可多个
  sample: true,
  source: "seed",
  locale: "zh", // en | zh，给「英文博主」用
  hot: false, // true 才会被「有爆款」「今天最热」挑中
}
```

标签 id 与页面文案：

| id | 标签 |
| --- | --- |
| `poster` | 海报提示词 |
| `video` | 视频提示词 |
| `ui` | UI 提示词 |
| `long_video` | 长视频提示词 |
| `code` | 代码 |
| `other` | 其他 |

**只保存在当前浏览器**

点右上角「收录」。可以先「用 Jev 分类」，再手动改标签，然后「加入目录」。这类条目存在本机 `localStorage`，换浏览器或清站点数据后会消失，也不会提交到 git。点开头像后的详情里可以「改标签」；样本博主可以「恢复默认」，本地收录的博主可以移除。

## 配置 Jev

Jev 只回答事先写好的是/否问题，并给出 0 到 1 的概率，不生成自由文本。本站把博主简介（和可选示例）放进 state，对每个分类问一道题。**概率 ≥ 0.7 才自动打上该标签**，之后仍可手动改。

noul / boolean 的返回值本身就是「是」的概率，没有另一套 confidence 字段。阈值就加在这个概率上。

密钥放在环境变量里，不要写进代码。可复制 [`.env.example`](.env.example) 为 `.env.local`。

### 方式一：Vercel AI Gateway（优先）

设置 `AI_GATEWAY_API_KEY` 后，`/api/classify` 使用 AI SDK 的 `experimental_evaluate`，模型 id 为 `typesafe-ai/jev`。问题类型是 Gateway / AI SDK 的 `boolean`（对应 Jev 的 noul）。

```bash
AI_GATEWAY_API_KEY=你的密钥
# 可选，默认 typesafe-ai/jev
# AI_GATEWAY_MODEL=typesafe-ai/jev
```

### 方式二：TypeSafe 直连

没有 Gateway 密钥、但设置了 `TYPESAFE_API_KEY` 时，请求会发到 TypeSafe：

`POST https://api.typesafe.ai/v1/systemone`

state 形状与 playground 一致：`{ "message": "博主简介：…" }`。问题类型是 `noul`。密钥在 [console.typesafe.ai](https://console.typesafe.ai) 的 Settings → Keys 创建。

```bash
TYPESAFE_API_KEY=你的密钥
# 可选
# TYPESAFE_MODEL=jev-latest
# TYPESAFE_BASE_URL=https://api.typesafe.ai
```

两个密钥都在时，只用 Gateway。两个都没有时，接口返回明确的 fallback，页面仍可用手动标签。

Jev 以英文为主，中文问题可以提交，但准确率可能低于英文。

## 分类接口

`GET /api/classify` 只报告是否配置了密钥、将使用哪条通路和哪个模型，不返回密钥。

`POST /api/classify`

```bash
curl -s -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{"bio":"每天分享电商海报和主视觉提示词","sampleText":"高级感护肤海报，大面积留白"}'
```

请求体：

```json
{ "bio": "必填，简介", "sampleText": "可选，示例帖或提示词" }
```

配置正确时，响应类似：

```json
{
  "ok": true,
  "provider": "gateway",
  "model": "typesafe-ai/jev",
  "threshold": 0.7,
  "suggestedTags": ["poster"],
  "answers": [
    {
      "questionId": "is_poster_prompts",
      "tag": "poster",
      "label": "海报提示词",
      "probability": 0.91,
      "matched": true
    }
  ]
}
```

未配置密钥时 `ok` 为 `false`，`code` 为 `missing_api_key`，并带有中文说明。上游失败时 HTTP 502，`code` 为 `upstream_error`。

自动提问包括：

- `is_poster_prompts`：是否主要分享海报/平面 AI 提示词
- `is_video_prompts`：是否主要分享短视频 AI 提示词
- `is_ui_prompts`：是否主要分享 UI/界面设计 AI 提示词
- `is_long_video_prompts`：是否主要分享长视频/影视 AI 提示词
- `is_code`：是否主要分享代码/编程相关 AI 提示词或工作流
- `is_other`：是否主要落在以上各类之外

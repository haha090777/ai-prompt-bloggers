# AI 提示词博主合集

提示词星图是一份中文目录：浏览在 X 上分享 AI 提示词的作者，按作品类型筛选，并用 TypeSafe 的决策模型 Jev 给新博主建议标签。

当前仓库里的 19 位博主是**虚构占位样本**，不是真实账号。名字、简介和 `@handle` 都是编的，卡片上的链接只是按用户名打开 `https://x.com/<handle>`。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。不配置任何密钥也可以浏览、搜索、按标签筛选，以及手动改标签、收录博主。

生产构建：

```bash
npm run build
npm start
```

## 浏览和筛选

页面顶部是标签栏：

- 点某个标签，只看带这个标签的博主。
- 可以多选。多选时，**包含任一所选标签**的博主都会出现。因此同时带「海报提示词」和「UI 提示词」的人，点这两个标签里的任意一个都能看到。
- 点「全部」会清掉已选标签。
- 卡片上的标签也可以点，效果和顶栏一样。
- 搜索框匹配显示名、用户名和简介。没有命中时会显示空状态，可一键回到全部。

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

点「收录新博主」。可以先「用 Jev 分类」，再手动改标签，然后「加入目录」。这类条目存在本机 `localStorage`，换浏览器或清站点数据后会消失，也不会提交到 git。卡片上可以「改标签」；样本博主可以「恢复默认」，本地收录的博主可以移除。

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

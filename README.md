<p align="center">
  <img src="assets/social.webp" alt="dsh-xiaomi-tts" width="100%">
</p>

<h1 align="center">dsh-xiaomi-tts</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-xiaomi-tts"><img src="https://img.shields.io/npm/v/dsh-xiaomi-tts.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/dsh-xiaomi-tts"><img src="https://img.shields.io/npm/dm/dsh-xiaomi-tts.svg" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/Xiaomi-MiMo-ff6900?logo=xiaomi&amp;logoColor=white" alt="Xiaomi MiMo">
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&amp;logo=deepseek&amp;logoColor=white" alt="deepseek-harness"></a>
</p>

<p align="center">为 DSH 添加 Xiaomi MiMo 与豆包语音朗读、浏览器本地语音兜底和可选 UI 音效。</p>

> MiMo TTS 当前可能处于限时免费或调整计费阶段，请以 Xiaomi MiMo 官方平台的最新政策为准。

> `4.1.0` 为正式版，使用 npm `latest` 渠道，安装命令：`dsh plugin --profile web add dsh-xiaomi-tts@latest`。需要固定版本时可指定 `dsh-xiaomi-tts@4.1.0`。

## 🎨 预览

<p align="center">
  <a href="https://ppy-web.github.io/dsh-plugin-xiaomi-mimo-tts"><img src="assets/preview-button-zh.svg" alt="在线预览设置页面" width="300" height="64"></a>
</p>

<p align="center">QQ 交流群：<code>1104616387</code> · 扫描海报二维码加群</p>

<table width="100%">
  <tr>
    <td align="center" valign="middle" width="50%"><img src="assets/setting.png" alt="插件设置界面" width="100%"></td>
    <td align="center" valign="middle" width="50%"><img src="assets/image.webp" alt="功能简介与 QQ 群二维码" width="100%"></td>
  </tr>
</table>

## ✨ 功能

- 一键朗读：在助手消息操作栏中提供“朗读”按钮。
- 低延迟播放：`mimo-v2.5-tts` 支持 PCM 流式播放，并在必要时回退到完整音频或浏览器语音。
- 内置与自定义音色：支持官方内置音色，以及 `mimo-v2.5-tts-voicedesign` 音色描述。
- 双服务商：API Key 模块可切换小米 MiMo / 豆包，两家分别保留凭证、模型与音色。
- 豆包双向流式：标准合成 2.0 / 已有复刻音色 2.0，同一条回复持续追加文本、流式输出音频。
- 浏览器本地语音：可选择云端优先、本地优先或关闭本地语音。
- 播放控制：支持 0.5×–2.0× 语速、语音音量、暂停、继续和停止。
- 文本清洗：朗读前移除网址、路径、代码块、表情符号和控制字符等不适合播报的内容。
- 可选音效：提供任务状态和语义化点击音效，默认关闭。
- 插件联动：向其他 DSH 插件暴露可选的 PCM 播放服务。
- 鲸鱼娘 Agent 预设：随插件附带，默认关闭，按需启用。对话、幽默、语境识别、表情包。

## 📋 环境要求

- `@deepseek-ai/dsh` `0.2.1-rc.2`（当前目标版本；兼容 `0.1.7-x` 至 `0.2.x` 版本）
- Node.js 22+
- 使用云端语音需要对应服务商的 API Key；豆包需要开通所选语音资源。
- 豆包持续文本输入需要支持 WebSocket upgrade 注册的 DSH Web Host；反向代理需转发 WebSocket Upgrade。
- [官方 TTS API 文档](https://mimo.mi.com/models/zh-CN/mimo-v2.5-tts)

## 🚀 安装

### 官方安装（desktop/web）（推荐）

打开桌面/web端，进入插件管理面板，搜索 `dsh-xiaomi-tts` 即可安装

### 从 npm 安装（web）

```bash
dsh plugin --profile web add dsh-xiaomi-tts@latest
```

### 从插件市场安装

 ![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg) [插件市场](https://awesome-dsh-plugin.com) 已收录本插件，如你已安装社区的插件市场，可在 **设置 → 插件市场** 中搜索 `xiaomi-mimo-tts`安装。

### 卸载（web）

```bash
dsh plugin --profile web remove dsh-xiaomi-tts
```

## 🐋 首次使用

新安装的默认行为：

- 朗读按钮安装即用（浏览器本地语音）；
- **自动播报默认关闭**；
- **UI 音效默认关闭**；

推荐配置顺序：

1. 在 API Key 模块选择“小米 MiMo”或“豆包语音”。
2. [获取小米 Key](https://platform.xiaomimimo.com/console/api-keys) 或 [获取豆包 Key](https://console.volcengine.com/speech/new/setting/apikeys?projectName=default)，填写后点击 **保存**。
3. 打开“调音台”，选择当前服务商的模型和音色。
4. 在“播报台”试听。Key 草稿需先保存；模型和音色可以在保存前试听。
5. 按需开启自动播报和 UI 音效，再保存。

同一浏览器中打开多个同源 DSH 网页时，由最近聚焦的页面负责音频。切换到另一个 DSH 页面会停止旧页的朗读、试听和提示音，旧回复不会自动补播，需要时可手动点击朗读。切到其他网站或应用时，原页面仍可在后台播放。此协调不跨浏览器、设备或不同域名 / 端口；浏览器禁用本地存储时，仅聚焦的页面播放。

调音台、音效库与播报台使用单开模式的手风琴面板。顶部开关控制音效总开关；音效库面板内的“全部开启 / 仅点击音效 / 仅任务音效”只改变范围，关闭总开关后仍会保留选择。

“播报台”位于音效库下方，可折叠，包含独立的文字试听按钮和播报来源开关：`dsh-pet` 默认关闭；`dsh-whale-musume` 默认开启，控制现有对外语音接口；“提问卡片标题”默认开启，但需同时开启自动播报。提问来源只朗读当前题目标题，首次加载不补播，翻题、提交、关闭卡片或切换会话时取消对应语音，并沿用远程合成与本地语音兜底。

“审批提醒”和“后台任务结果”默认关闭，独立于自动播报，均只观察当前会话。审批处理或撤回后会停止对应语音；后台任务仅在观察到运行状态后播报完成、失败或取消，旧记录不补播。两者沿用语音主开关、页面播放权和忙碌时跳过规则；宿主未提供对应服务时不采集，后台任务结果需要 DSH 的 `jobs` 服务。

## ⚙️ 配置说明

### 服务商与豆包语音

在 API Key 模块切换小米 MiMo / 豆包语音，保存后生效。两家的密钥、模型和音色分别保留；旧配置默认使用小米。

| 豆包模型 | 音色配置 |
| --- | --- |
| 标准合成（`seed-tts-2.0`） | 选择内置音色，或填写标准音色 ID。 |
| 声音复刻（`seed-icl-2.0`） | [创建一个音色](https://console.volcengine.com/speech/new/experience/clone?projectName=default)，将音色 ID 填回插件。 |

小米预置音色、音色设计和豆包标准合成共用一套语音指令组件，在音色选择下方提供 20 个语音指令标签（含粤语、上海话、河南话、北京话、天津话、四川话、陕西话、东北话 8 种方言），包含温柔、欢快、讲故事、争执互怼、悄悄话、害羞期待、沧桑低沉、心碎哭腔及口音等风格。点击填入后可继续编辑，选择“自然表达”清空；两家指令分别保存，切换服务商保留各自内容；试听可使用草稿，保存后用于后续朗读。小米音色设计会同时发送音色描述与语音指令。标签根据[官方示例库](https://docs.volcengine.com/docs/DoubaoVoice/DoubaoTextToSpeech20CapabilityIntroduction?lang=zh)改写，标题旁的信息图标说明效果局限：表现随模型、音色和文本而异，方言、哭腔、悄悄话等不保证准确呈现，两家效果可能不同。浏览器本地语音不应用指令；豆包复刻模式不显示或发送指令。播放语速使用同款提示，说明 0.5×–2.0× 范围、各服务商的生效方式及小米流式调速的音调变化。

豆包需开通对应模型服务，使用新版控制台的 API Key。保存密钥后在“播报台”试听；复刻音色 ID 不能为空。

标准合成选择“自定义音色 ID”后，与声音复刻一样支持历史标签：失焦或按 Enter 记住填写的 ID，点击标签回填。两种模式分别保留最近 10 个不重复的 ID，不显示额外的历史标题。

语速在合成时应用，调整后对下一次合成生效；历史录音保留生成时的语速。

更多音色参见[官方音色列表](https://docs.volcengine.com/docs/DoubaoVoice/Tonelist-1?lang=zh)。

### 小米官方内置音色

`mimo-v2.5-tts` 当前提供：

- 中文女声：`冰糖`、`茉莉`
- 中文男声：`苏打`、`白桦`
- 英文女声：`Mia`、`Chloe`
- 英文男声：`Milo`、`Dean`

### 自定义音色

`mimo-v2.5-tts-voicedesign` 支持从音色描述生成声音。设置面板包含预设模板，也可以手动编辑：

### 浏览器本地语音

- **云端优先**：所选云端服务在音频开始前失败时，尝试浏览器语音。
- **本地优先**：先使用浏览器语音，失败后尝试所选云端服务。
- **关闭本地语音**：只使用所选云端服务，不进行本地兜底。

浏览器音色来自 Web Speech API。是否离线、可用语言和实际声音取决于浏览器、操作系统及其语音服务。

### 朗读范围

- **智能模式**：自动播报优先朗读开头两个语义段；未读内容较多时可能补一句收尾提示。手动朗读播放全文。
- **全文模式**：自动播报和手动朗读都播放全文。
- **首段模式**：自动播报和手动朗读都只播放首个语义段。

小米 PCM 流式合成与语义分段按约 160 个文字字符累计完整句子，建议上限为 240 字；单个长句可以超过上限，结束时不足一段的尾部也会播放。生成中的未完句积累到目标字数后可以先开始 PCM 播放，已排队的文字不会重复合成。历史音频按合成切片保存，同一请求收到的多个 PCM 数据块会合并为一条 WAV。

豆包支持边生成边播放，音频历史按消息保存。已经开始播放后发生错误，不会从头重播或自动切换云端服务。

## 🔌 三方插件联动

![whale-girls](assets/whale-girls.webp)

本插件向其他 DSH 插件提供所选服务商的可选 PCM 流式播放能力，既有服务名称保持兼容：

```ts
ctx.get('xiaomiMimoTts')?.play('欢迎回来')
```

建议通过 `ctx.get()` 动态获取，不要声明为必需注入。插件未安装、未就绪或已关闭时，调用会安全跳过；新播放会中断当前朗读，`stop()` 可主动停止。

需要 TypeScript 类型时：

```ts
import type { XiaomiMimoTtsService } from 'dsh-xiaomi-tts/client-api'

const tts = ctx.get('xiaomiMimoTts') as XiaomiMimoTtsService | undefined
tts?.play('欢迎回来')
```

## 🐳 鲸鱼娘 Agent 预设

鲸鱼娘组件默认关闭。安装后，在「设置 → 插件」打开本插件详情，在「包含的组件」中开启“鲸鱼娘”，随后新建会话时即可在 Agent 预设列表选择她。
默认带一点傲娇、米饭、尾巴和摸鱼梗，也会结合当前语境主动发送本地表情包。
人设和表情包关键词参考了社区维护的 [DeepSeek-chan Meme Pack](https://github.com/the-beating-light-of-the-nail/deepseek-chan-meme-pack)。
插件另附 44 张本地表情包。 [素材清单](skills/whale-girl/memes.json) 记录各图的使用语境。
预设保留文件读写、联网查询、交互提问和对话压缩，用于用户授权的任务与非敏感本地记忆。素材缺失或无法显示时使用纯文字。

## 🔒 隐私与网络访问

- API Key 由 DSH Host 保存，浏览器只读取“是否已配置/格式是否识别”的状态，不读取密钥正文。
- 豆包连接由 Host 代理，文本和音色 ID 只提交给所选服务商，浏览器不会直连豆包或获得上游 Key。
- 浏览器本地语音由 Web Speech API 提供；标记为在线的音色可能把文本交给浏览器、操作系统或其网络语音服务。
- 云端生成的音频自动保存在浏览器的 IndexedDB 中。点击设置底部「音频历史」可查看音频历史；最多保留最近 100 条 / 100 MB，支持试听、下载；
- 流式 PCM 保存为 24 kHz 单声道 WAV；仅保留成功完成的生成请求。Web Speech API 本地语音没有可导出的音频文件。
- 音效核心移植自 [uisfx 0.4.0](https://github.com/romainsimon/uisfx)，遵循 MIT License，详见 `NOTICE`。

## 🛠️ 开发

启动本地 UI Lab 直接渲染 `src/client/settings/card.tsx`：

```bash
pnpm install
pnpm dev
```

常用检查：

```bash
pnpm typecheck
pnpm test
pnpm dev:build
pnpm pack:check
```

- `pnpm build`：正常构建。
- `pnpm profile:check`：验证本机 DSH Web profile 中的安装状态。

Windows 从本地开发链接切换到 npm 包前，请先停止 DSH Web，避免运行中的 Node 进程占用 Junction：

```powershell
.\tools\start\dsh-plugin-reinstall.bat 4.1.0
```

如果是 DSH Desktop profile，只需要卸载残留的本地链接，可在退出 Desktop 后运行：

```powershell
.\tools\start\dsh-plugin-uninstall-local-link.bat desktop
```

## 🤝 推荐

- [dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale#readme) · 鲸鱼娘主题皮肤系列。
- [dsh-whale-musume](https://github.com/Sutera-Diffusus/dsh-whale-musume#readme) · 元气鲸鱼娘桌宠（已支持联动，推荐安装）。
- [dsh-plugin-uisfx](https://github.com/XanthanL/dsh-plugin-uisfx#readme) · 语义化 UI 音效。
- [dsh-dream-skin](https://github.com/RevolutionLA/dsh-dream-skin#readme) · 原生换肤、背景壁纸、强调色和主题包。
- [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) · 一个为 dsh-TUI 生态打造的插件

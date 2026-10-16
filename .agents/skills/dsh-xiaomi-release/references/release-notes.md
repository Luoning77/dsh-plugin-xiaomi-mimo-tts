# 发布说明模板与历史依据

## 依据与适用范围

以下是 2026-10-16 查阅的历史惯例，不是固定的下一版本配置。使用时重新读取目标版本的源码、工作流与发布结果。

| 依据 | 观察到的惯例 |
| --- | --- |
| [v3.0.8](https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts/releases/tag/v3.0.8) | 中文正文；先写插件版本、DSH 兼容范围和开发验证基线，再写更新、验证、安装和 compare 链接；没有上传 tgz 附件 |
| [v3.0.7](https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts/releases/tag/v3.0.7) | 区分兼容范围与开发基线；提供卸载旧版、指定版本重装命令；附带 tgz |
| [v3.0.4-alpha](https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts/releases/tag/v3.0.4-alpha) | 预发布 tag 与标题均保留 `-alpha`；GitHub 标记 Pre-release；安装命令指定完整预发布版本 |
| [v3.0.1](https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts/releases/tag/v3.0.1) | 区分结构化安装检查与浏览器/真实音频人工验证；记录 tgz 已构建且不携带安装生命周期脚本 |

本地核对的 `v3.0.7`、`v3.0.8` 为 annotated tag，`v3.0.4-alpha`、`v3.0.5`、`v3.0.6` 为 lightweight tag。历史不支持“所有 tag 必须同一注释格式”或“每个 Release 必须上传 tgz”的结论。

当前自动发布依据是仓库根目录的 `.github/workflows/release.yml`：`v*` tag push 触发；tag 必须等于包版本加 `v`；预发布 npm 渠道为 `next`，稳定版为 `latest`。它比历史手工操作更能决定现在的发布顺序。

## 中文正文模板

替换所有尖括号变量。章节名与 emoji 可随内容调整；兼容性、安装和验证信息必须真实。只保留与本次发布有关的章节，不补空泛条目。

````markdown
## 📋 版本说明与 DSH 限制

- 插件版本：`dsh-xiaomi-tts@<version>`
- DSH 兼容范围：`<package.json.engines.dsh>`
- 当前开发基线：`@deepseek-ai/dsh <development-version>`
- 实际验证：<本次验证的宿主版本和范围；未验证时如实说明>

## ✨ 更新内容

- <面向使用者的新增能力或行为变化>
- <修复的触发条件与结果>
- <兼容性或升级影响，仅在本次涉及时填写>

## ✅ 发布验证

- <本次实际执行且通过的检查>
- <有必要说明的未验证范围或已知限制>

## 📦 安装

从 npm 安装指定版本：

```bash
dsh plugin --profile web add dsh-xiaomi-tts@<version>
```

完整变更记录：[<previous-tag>...<tag>](https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts/compare/<previous-tag>...<tag>)
````

需要沿用近期 Release 的重装说明时，将安装段改为以下内容；这是提供给用户的命令，不表示发布过程应操作本机 DSH profile：

````markdown
先卸载旧版：

```bash
dsh plugin --profile web remove dsh-xiaomi-tts
```

重新安装：

```bash
dsh plugin --profile web add dsh-xiaomi-tts@<version>
```
````

默认提供指定版本的 npm 安装命令，预发布也直接指定版本，不依赖用户的 npm 默认渠道。仅在确有迁移要求或验证证据时增加“重启 DSH”“清理缓存”等操作，不从旧发布照搬。

若提供 tgz，正文中的文件名必须对应真实上传附件，并注明本地路径安装方式。若没有附件，删除“下载本 Release 附件安装”等承诺。若没有合适的前一个已发布 tag，省略 compare 段，不编造链接。

使用 `gh` 提交多行正文时，把最终内容写入 UTF-8 临时文件并通过 `--notes-file` 传入；不要让 Markdown 反引号、变量或换行经过 shell 字符串求值。用户指定其他语言或格式时，以用户要求为准。

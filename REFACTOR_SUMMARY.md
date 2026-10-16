# 代码结构重构总结

## 重构目标

在不改变功能逻辑和页面效果的前提下,优化代码结构和组织,提升可维护性。

## 重构内容

### 1. 模块化拆分

#### 原结构问题
- `src/index.ts` (842行): 大量重复的资源注册代码
- `src/shared.ts` (862行): 混合了类型定义、常量、文本处理、工具函数等多种职责
- 类型定义分散在各个文件中
- 代码重复度高,难以维护

#### 新模块结构

```
src/
├── constants.ts                    # 路由和常量定义
├── types/                          # 类型定义模块
│   ├── models.ts                  # TTS模型、音色、格式
│   ├── settings.ts                # 设置类型和默认值
│   ├── sound.ts                   # 音效相关类型
│   ├── playback.ts                # 播放相关类型和工具类
│   └── index.ts                   # 统一导出
├── text/                           # 文本处理模块
│   ├── fenced-code.ts            # 代码块检测(原有)
│   ├── normalize.ts              # 文本标准化和标点处理
│   ├── segment.ts                # 文本分段和字符计数
│   ├── scope.ts                  # 播放范围处理
│   ├── version.ts                # 版本比较
│   └── index.ts                  # 统一导出
├── utils/                          # 工具函数模块
│   ├── encoding.ts               # Base64和SSE解析
│   ├── settings.ts               # 设置解析
│   └── index.ts                  # 统一导出
├── host/                           # Host端模块
│   ├── assets.ts                 # 静态资源注册辅助
│   ├── http.ts                   # HTTP工具函数
│   ├── synthesis.ts              # 合成请求处理
│   ├── validation.ts             # 请求验证
│   ├── audio-decode.ts           # 音频解码
│   └── index.ts                  # 统一导出
├── index.ts                        # 主入口(简化后)
├── shared.ts                       # 向后兼容层(重新导出)
└── ...其他文件
```

### 2. 具体优化

#### 2.1 资源注册重构 (`src/host/assets.ts`)

**原代码** (重复模式):
```typescript
ctx.effect(() => ctx.webServer.register({
  kind: 'exact',
  path: TTS_XXX_ASSET_ROUTE,
  handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.setHeader('allow', 'GET, HEAD')
      res.end()
      return
    }
    res.statusCode = 200
    res.setHeader('content-type', 'image/webp')
    // ... 重复的设置
  }
}))
```

**新代码** (工厂函数):
```typescript
registerStaticAsset(ctx, {
  path: TTS_MIMO_LOGO_ASSET_ROUTE,
  data: mimoLogoAsset,
  contentType: 'image/svg+xml',
  description: 'MiMo logo asset',
})

registerStaticAssetMap(ctx, {
  pathPrefix: TTS_VOICE_ASSET_ROUTE,
  assets: voiceAssets,
  contentType: 'image/webp',
  description: 'built-in voice assets',
})
```

消除了 ~300 行重复代码。

#### 2.2 类型定义集中管理

将分散的类型定义统一到 `src/types/` 目录:
- 模型和音色类型 → `models.ts`
- 设置相关类型 → `settings.ts`
- 音效类型 → `sound.ts`
- 播放控制类型 → `playback.ts`

#### 2.3 文本处理模块化

将 `shared.ts` 中的文本处理逻辑拆分到专门的模块:
- 文本标准化 → `text/normalize.ts`
- 文本分段 → `text/segment.ts`
- 播放范围处理 → `text/scope.ts`
- 版本比较 → `text/version.ts`

每个模块职责单一,易于测试和维护。

#### 2.4 Host端模块组织

将主 `index.ts` 中的HTTP处理逻辑提取到专门的模块:
- 静态资源注册 → `host/assets.ts`
- HTTP工具 → `host/http.ts`
- 合成逻辑 → `host/synthesis.ts`
- 请求验证 → `host/validation.ts`
- 音频解码 → `host/audio-decode.ts`

### 3. 向后兼容

`src/shared.ts` 现在作为兼容层,重新导出所有内容:
```typescript
export * from './constants.js'
export * from './types/index.js'
export * from './text/index.js'
export * from './utils/index.js'
```

现有代码无需修改,完全兼容。

## 重构成果

### 代码质量指标

**重构前:**
- `src/index.ts`: 842 行
- `src/shared.ts`: 862 行
- 资源注册代码重复度: 高
- 模块职责: 不清晰

**重构后:**
- 最大文件: `src/text/normalize.ts` (163 行)
- 平均文件大小: ~100 行
- 新增模块: 23 个文件
- 代码重复: 显著减少
- 模块职责: 清晰明确

### 构建和测试

✅ **类型检查**: 通过  
✅ **构建**: 成功  
✅ **测试**: 95/99 通过 (4个已知问题,与重构无关)

### 构建产物

```
lib/index.js                   27.07 kB (与重构前相同)
lib/shared.js                   3.83 kB (大幅减小,现为导出层)
lib/client.js                 753.26 kB (客户端代码不变)
```

## 未来改进建议

1. **Client端重构**: 可以参考同样的模式重构 `src/client/` 目录
2. **状态管理优化**: `src/client/settings/card.tsx` 可以使用 `useReducer` 统一管理 16 个独立状态
3. **Playback协调**: 创建 `PlaybackCoordinator` 统一管理三个播放控制器
4. **测试覆盖**: 为新模块添加单元测试

## 迁移指南

### 对于插件使用者
无需任何更改,完全向后兼容。

### 对于插件开发者
如果直接导入内部模块,建议使用新的模块路径:

**旧写法:**
```typescript
import { prepareTtsText } from './shared.js'
```

**新写法(推荐):**
```typescript
import { prepareTtsText } from './text/index.js'
// 或继续使用 shared.js (兼容层)
import { prepareTtsText } from './shared.js'
```

## 总结

本次重构成功地将庞大的单一文件拆分为职责明确的模块,消除了大量重复代码,提升了代码的可维护性和可测试性,同时保持了完全的向后兼容。项目结构更加清晰,为后续开发和维护奠定了良好基础。

# Aurora Music 架构重构设计文档

## [S1] 问题

当前项目存在以下架构问题：

1. **状态管理混乱** — PlayerProvider 承载了播放、认证、导航、数据缓存全部状态，200+ 行，职责不清
2. **路由无 history** — 纯 state 驱动，无 URL 变化，浏览器前进后退不可用
3. **文件结构扁平** — 所有组件平铺在 sidebar/、main/、player/ 下，功能边界模糊
4. **Server 脱节** — NeteaseCloudMusicApi 和自定义 QR server 未统一代理
5. **大量死代码** — 35 个 API 函数只用了 13 个，5 个 UI 元素纯装饰

## [S2] 方案概览

| 领域 | 方案 |
|------|------|
| 状态管理 | 拆分为 AuthContext / DataContext / PlayerContext 三层 |
| 路由 | react-router-dom v6，支持 URL 导航 |
| 文件结构 | 按 features/ 功能模块分目录 |
| Server | 分离双服务（3000 常规 + 3001 登录），Vite 统一代理 |
| Bug 修复 | 逐项修复 6 个关键 bug |

## [S3] 目录结构

```
src/
├── main.tsx
├── App.tsx                     # Router + Provider 包裹
├── index.css
├── styles/clear-glass.css
├── features/
│   ├── player/                 # 播放器相关
│   │   ├── PlayerControls.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── VolumeControl.tsx
│   │   ├── NowPlaying.tsx
│   │   ├── AlbumCover.tsx
│   │   └── PlaylistPanel.tsx
│   ├── discover/               # 首页
│   │   ├── Banner.tsx
│   │   ├── RecommendSection.tsx
│   │   ├── PlaylistCard.tsx
│   │   ├── PlaylistGrid.tsx
│   │   └── DailyRandom.tsx
│   ├── leaderboard/            # 排行榜
│   │   └── LeaderboardPage.tsx
│   ├── playlist/               # 歌单
│   │   ├── PlaylistsPage.tsx
│   │   └── PlaylistDetailView.tsx
│   ├── library/                # 音乐库
│   │   └── MusicLibrary.tsx
│   ├── search/                 # 搜索
│   │   └── SearchPage.tsx
│   ├── auth/                   # 认证
│   │   ├── LoginModal.tsx
│   │   └── UserInfo.tsx
│   └── settings/               # 设置
│       └── SettingsPage.tsx
├── components/                 # 通用组件
│   ├── Header.tsx
│   ├── SearchBar.tsx
│   └── Sidebar.tsx
├── context/                    # 状态管理
│   ├── AuthContext.tsx
│   ├── DataContext.tsx
│   ├── PlayerContext.tsx
│   └── types.ts
├── services/                   # API
│   ├── api.ts
│   └── auth.ts
├── hooks/                      # 自定义 Hooks
│   ├── useAudioPlayer.ts
│   └── useVolumeDrag.ts
└── layouts/                    # 布局
    └── AppLayout.tsx
```

## [S4] 状态管理拆分

### AuthContext
```typescript
interface AuthContextType {
  user: User | null;
  authState: 'unauth' | 'guest' | 'authed';
  authError: string;
  login: (phone: string, password: string) => Promise<void>;
  qrLogin: () => Promise<void>;
  guestLogin: () => void;
  logout: () => void;
}
```

### DataContext
```typescript
interface DataContextType {
  playlists: Playlist[];
  userPlaylists: Playlist[];
  dailySongs: DailySong[];
  loading: boolean;
}
```

### PlayerContext
```typescript
interface PlayerContextType {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  progress: number;
  volume: number;
  play: (song: Song) => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  setProgress: (p: number) => void;
}
```

## [S5] Server 架构

### 服务 1: NeteaseCloudMusicApi（端口 3000）
- 所有常规 API
- 文件：`server.cjs`

### 服务 2: Auth Server（端口 3001）
- QR 登录专用
- Weapi 加密（绕过风控）
- 文件：`auth-server.cjs`

### Vite 代理
```typescript
proxy: {
  '/api': { target: 'http://localhost:3000', changeOrigin: true, rewrite: path => path.replace(/^\/api/, '') },
  '/auth': { target: 'http://localhost:3001', changeOrigin: true },
}
```

## [S6] 路由设计

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | DiscoverPage | 首页推荐 |
| `/leaderboard` | LeaderboardPage | 排行榜 |
| `/playlists` | PlaylistsPage | 歌单列表 |
| `/playlist/:id` | PlaylistDetailPage | 歌单详情 |
| `/library` | LibraryPage | 音乐库 |
| `/search` | SearchPage | 搜索 |
| `/settings` | SettingsPage | 设置 |

## [S7] Bug 修复清单

1. Sidebar `setSelectedPlaylistId` 未定义 → 从 Context 解构
2. App.tsx 和 PlayerProvider 重复数据获取 → 统一到 DataContext
3. SearchBar 无功能 → 接入 search API
4. Header 前进后退 → react-router useNavigate
5. Prev/Next 按钮 → 实现 queue 切换
6. PlaylistItem 不可点击 → 接入 play(song)

## [S8] 执行顺序

| Step | 任务 | 依赖 |
|------|------|------|
| 1 | 拆分 Context（Auth/Data/Player） | 无 |
| 2 | 调整文件结构（features/ 目录） | Step 1 |
| 3 | 加 react-router-dom | Step 2 |
| 4 | 统一 server（auth-server.cjs） | 无 |
| 5 | 修 bug | Step 1-3 |
| 6 | 补全功能 | Step 1-5 |

# 慈心課程織圖

以 **Eleventy (11ty)** + **Tailwind CSS** + **Pagefind** 製作的**靜態課程展示網站**。  
自動從 **Google Drive 公開資料夾**同步照片／音檔，支援**多課程**、縮圖瀏覽＋**Lightbox**、站內搜尋與**快速篩選**。
- 已套用 Eleventy `pathPrefix`，並在模板使用 `{{ '/path' | url }}` 支援 GitHub Project Pages 子路徑。

> 內容授權：CC BY-NC；含學生照片之素材已取得公開授權。  

## 📋 專案概覽

這是一個專為教育機構設計的靜態課程網站生成器，主要特色：

### 🎯 核心功能
- **多課程管理**: 支援多個課程同時展示，每個課程有獨立的頁面結構
- **多語言支援**: 中英文雙語介面，使用客戶端動態翻譯
- **Google Drive 整合**: 自動同步公開Drive資料夾中的圖片和音檔
- **響應式相簿**: 支援縮圖瀏覽、Lightbox放大、鍵盤導航
- **檔名標籤系統**: 從檔名自動提取標籤，支援中英文標記
- **全文搜索**: 基於Pagefind的站內搜索功能
- **快速篩選**: 相簿頁面的即時關鍵字篩選
- **AI 友善設計**: 文字優先架構，支援 AI 工具分析與學習（NotebookLM、ChatGPT、Claude 等）

### 🛠 技術架構
- **靜態網站生成**: Eleventy (11ty) v3.0
- **樣式框架**: Tailwind CSS + 自定義CSS
- **多語言實作**: 客戶端動態翻譯 + localStorage 偏好記憶
- **搜索引擎**: Pagefind v1.4
- **自動化部署**: GitHub Actions
- **檔案同步**: Google Drive API v3

### 📁 專案結構
```
course-site-starter/
├── .eleventy.js              # Eleventy配置文件
├── package.json              # NPM配置和腳本
├── scripts/
│   └── fetch-drive.mjs       # Google Drive同步腳本
├── public/
│   ├── css/site.css          # 自定義樣式
│   └── js/
│       ├── gallery.js        # 圖片瀏覽功能
│       └── lang-dynamic.js   # 多語言動態翻譯
├── src/
│   ├── _data/                # 數據文件夾
│   │   ├── course-configs/   # 課程配置文件夾
│   │   │   ├── course_2a_nenggao_113_summer.json
│   │   │   ├── course_3a_sunshot_113_summer.json
│   │   │   └── course_template.json  # 新課程模板
│   │   ├── i18n/             # 國際化資料
│   │   │   ├── zh-TW.json    # 繁體中文翻譯
│   │   │   └── en-US.json    # 英文翻譯
│   │   ├── site.json         # 站點基本信息
│   │   ├── locale.js         # 語言配置
│   │   ├── coursesList.js    # 課程列表生成器
│   │   ├── courseValidation.js # 建置時驗證
│   │   └── course-validator.js # 驗證邏輯
│   ├── _includes/            # 模板組件
│   │   ├── layouts/base.njk  # 基礎頁面模板
│   │   └── components/       # 可復用組件
│   ├── courses/              # 課程頁面模板
│   │   ├── index.njk         # 課程列表頁
│   │   ├── home.njk          # 課程主頁
│   │   ├── workbook.njk      # 工作本相簿
│   │   ├── photos.njk        # 照片集
│   │   ├── blackboard.njk    # 黑板畫
│   │   ├── scripts.njk       # 劇本照片
│   │   └── songs.njk         # 歌曲音檔
│   ├── reflections/
│   │   └── index.njk         # 留言交流頁
│   └── index.njk             # 網站首頁
└── .github/workflows/
    └── gh-pages.yml          # 自動部署配置
```

---

## ✨ 功能總覽

- 多課程導覽：課程主頁（課程名稱／簡介／教師介紹）＋六大分頁
  `工作本｜照片集｜黑板畫｜劇本｜歌曲與音檔｜留言與交流`
- **課程索引與篩選系統**：
  - **響應式過濾面板**：桌面版顯示於左側欄，行動版顯示於頁面頂部
  - **課程篩選器**：依年級、領域、教師快速篩選課程
  - **即時搜尋**：文字搜尋功能位於右上角，即時過濾課程內容
  - **一鍵重設**：快速清除所有篩選條件
- Drive 同步腳本：從公開資料夾擷取檔案清單，產生 JSON（可手動覆寫）
- 圖片相簿：縮圖格狀瀏覽、點擊放大、**方向鍵切換**、**ESC 關閉**
- 快速篩選（僅相簿頁）：輸入多個關鍵字（**AND 條件**）即時過濾
- 站內搜尋（Pagefind）：搜尋課程文字內容（首頁／課程頁等）
- 標籤系統：
  - **自動從檔名擷取** `[方括號]`／`【全形】`／`#hashtag`
  - **自動附加課程層級標籤**：年級、學期、主題單元、課程領域
- 音檔播放：直接串流 Google Drive (`uc?export=download&id=...`) 或下載
- 適合 GitHub Pages 發佈（純靜態、無伺服器）

---

## 🗂️ 資料結構（`course_*.json`）

每門課一個 JSON 檔，範例：

```json
{
  "slug": "2a-nenggao-113-summer",
  "metadata": {
    "grade_level": "2",
    "domain_category": "nature",
    "teacher_name": "王琬婷"
  },
  "i18n": {
    "zh-TW": {
      "title": "能高山（班級戲劇）",
      "grade": "二年級 2A 嶺光班",
      "semester": "113 學年度 夏季",
      "unit": "班級戲劇",
      "domain": "自然主課",
      "teacher": "王琬婷",
      "overview": "課程簡介文字。"
    },
    "en-US": {
      "title": "Mt. Nenggao (Class Drama)",
      "grade": "Grade 2, Class 2A Lingguang",
      "semester": "Academic Year 113, Summer",
      "unit": "Class Drama",
      "domain": "Main Lesson - Nature",
      "teacher": "Wang Wan-Ting",
      "overview": "Course overview text."
    }
  },
  "tags": ["戲劇", "黑板畫", "工作本", "歌曲"],
  "drive_folders": {
    "workbook_photos": "FOLDER_ID",
    "blackboard": "FOLDER_ID",
    "photos": "FOLDER_ID",
    "scripts_and_performance": "FOLDER_ID",
    "songs_audio": "FOLDER_ID"
  },
  "google_docs": {
    "course_description": "GOOGLE_DOC_ID",
    "play_script": "GOOGLE_DOC_ID"
  },
  "files": {
    "workbook_photos": [
      { "id": "FILE_ID", "name": "P01【第1週】【螢火蟲】", "tags": ["第1週","螢火蟲","二年級 2A 嶺光班","113 學年度 夏季","班級戲劇","自然主課"] }
    ],
    "blackboard": [ { "id": "FILE_ID", "name": "..." , "tags": ["..."] } ],
    "photos":    [ { "id": "FILE_ID", "name": "..." , "tags": ["..."] } ],
    "scripts_photos": [ { "id": "FILE_ID", "name": "..." , "tags": ["..."] } ],
    "songs": [
      { "title": "不要捉弄", "id": "FILE_ID", "mimeType": "audio/x-m4a" }
    ]
  },
  "overview": "課程簡介文字。"
}
```

**結構重點：**
- `metadata`：用於課程索引頁（`/courses/`）的篩選功能，包含三個**必填**欄位：
  - `grade_level`：年級編號（數字或字串，例如 `"2"`, `"3"`）
  - `domain_category`：領域類別（slug 格式，例如 `"nature-main-lesson"`, `"arts"`）
  - `teacher_name`：教師姓名（slug 格式，例如 `"wang-wan-ting"`）
  - 這些值會被 `course-filters.js` 用於動態生成篩選器選項並執行過濾
- `i18n`：包含所有可翻譯欄位的多語言內容（必須包含 `zh-TW` 和 `en-US`）
  - 所有顯示給使用者的文字都應放在 `i18n` 物件中
  - 範本中使用 `cf()` 巨集來存取多語言欄位
  - **注意**：`metadata` 中的 slug 格式欄位與 `i18n` 中的顯示文字是獨立的
- `drive_folders`：放各分類的 **Google Drive 資料夾 ID**（需設為「知道連結的任何人可檢視」）
- `google_docs`：放課程相關的 **Google Docs 文件 ID**，如課程說明、劇本等（需設為「知道連結的任何人可檢視」）
- `files.*`：執行同步腳本後自動覆寫；**圖片會寫成物件 `{id,name,tags}`**
- 標籤來源：
  - 由檔名自動擷取：`[方括號]`、`【全形】`、`#hashtag`（例如 `P01【第2週】【螢火蟲】.jpg`）
  - 由課程層級自動附加：`grade/semester/unit/domain`
- **音檔**：以 `{title,id,mimeType}` 表示，頁面以 `<audio>` 串流播放

---

## 🔁 Google Drive 同步腳本

### 取得 API Key（只需一次）
1. 到 Google Cloud Console 開啟專案並啟用 **Drive API**。  
2. 建立 **API 金鑰**（不限制）。  
3. 將金鑰設到環境變數 `GOOGLE_API_KEY`。

### 同步腳本工作流程

**腳本執行步驟：**
1. 備份同步前的 `course-configs/course_*.json` → `course_*.json.bak`
2. 從 Drive 抓取檔案清單（圖片、音檔、文件）
3. 覆寫原始 JSON（加入 `files.*` 和 `docs.*` 完整內容）

> **提示**：`.bak` 檔案保存乾淨的課程元數據，提交前務必還原。
> 若圖片無法顯示，請檢查 Drive 檔案/資料夾權限設為「知道連結的任何人可檢視」。

---

## 🌐 多語言支援

本站支援**繁體中文**（預設）與 **English** 雙語介面，採用**客戶端動態翻譯**架構，實現多語言切換。

### 語言切換機制

**頁面右上角語言選單：**
- 顯示當前語言（繁體中文 / English）
- 點擊展開下拉選單選擇語言
- 語言偏好儲存於 `localStorage`

**首頁行為：**
- `/` → 繁體中文（預設）
- `/zh-TW/` → 繁體中文
- `/en-US/` → English
- 自動重定向至使用者偏好語言

**課程頁面行為：**
- 所有課程頁面僅建置一次（繁體中文）
- 若使用者偏好 English，頁面載入時自動翻譯
- 切換語言時重新載入頁面套用新語言
- 偏好設定跨頁面導覽持續生效

### 模板中存取多語言欄位

使用 `cf()` (course field) 巨集確保語言回退正確：

```nunjucks
{% import "macros/i18n.njk" as i18nMacro %}

{# 存取課程標題 #}
{{ i18nMacro.cf(course, 'title', currentLang) }}

{# 存取課程簡介 #}
{{ i18nMacro.cf(course, 'overview', currentLang) }}
```

### 技術實作細節

**翻譯資料來源：**
- **UI 字串**: `src/_data/i18n/{zh-TW,en-US}.json`
- **課程內容**: 各課程 JSON 的 `i18n` 物件
- 內嵌於頁面：
  - `window.__I18N_DATA__` (UI 字串)
  - `data-course-i18n` 屬性 (課程內容)
- 無需額外 API 請求，完全客戶端運作

**效能考量：**
- **零重複**：每個欄位只存在於 `i18n` 物件中一次
- **單一建置**：不產生重複的多語言頁面
- **內聯關鍵腳本**：`<head>` 中僅 < 0.2 KB
- **同步執行**：翻譯在首次渲染前完成
- **CSS 控制可見性**：避免 FOUC（內容閃爍）

### 新增語言

若要新增其他語言（如簡體中文、日文），需修改：

1. **語言配置**（`src/_data/locale.js`）
   ```javascript
   module.exports = {
     default: 'zh-TW',
     available: ['zh-TW', 'en-US', 'ja-JP'],  // 新增語言代碼
     labels: {
       'zh-TW': '繁體中文',
       'en-US': 'English',
       'ja-JP': '日本語'  // 新增語言標籤
     }
   };
   ```

2. **UI 翻譯字串**（`src/_data/i18n/{zh-TW,en-US,ja-JP}.json`）
   ```json
   {
     "site": { "title": "..." },
     "nav": { "home": "ホーム" },
     "course": { "workbook": "..." }
   }
   ```

3. **課程內容翻譯**（各 `src/_data/course-configs/course_*.json`）
   ```json
   {
     "i18n": {
       "zh-TW": { ... },
       "en-US": { ... },
       "ja-JP": {
         "title": "コース名",
         "overview": "..."
       }
     }
   }
   ```

4. **語言頁面**（新增 `src/ja-JP/index.njk`）
   ```nunjucks
   ---
   layout: layouts/base.njk
   permalink: /ja-JP/index.html
   lang: ja-JP
   ---
   ```

5. **翻譯腳本**（`public/js/lang-dynamic.js`）
   - 更新 `htmlLangMap` 映射
   - 新增語言標籤至 `labels` 物件

### 維護注意事項

- **新增 UI 文字**：必須同步加入所有語言的 `i18n/{lang}.json`
- **新增課程欄位**：必須放在 `i18n` 物件內，並提供所有語言版本
- **模板開發**：一律使用 `i18nMacro.cf(course, field, lang)` 存取課程欄位
- **語言切換元件**：`.language-switcher` 會被跳過翻譯
- **自動更新**：標題（`<title>`）與 `html[lang]` 屬性會自動更新
- **測試**：清除 `localStorage` 確認預設行為正確

---

## 🔎 搜尋與篩選

- **Pagefind 站內搜尋**：搜尋頁面文字（首頁／課程主頁等）。
  - **開發模式（npm run dev）**：v9.1 會自動偵測本機 `/pagefind/*` 是否存在；沒有就改用 **CDN**，避免 404/MIME 錯誤。
  - **正式部署**：`npm run deploy` 會建立索引到 `_site/pagefind/*`。

- **相簿快速篩選**（相簿頁右上角輸入框）：
  - 以空白分隔多個關鍵字（AND 條件）
  - 比對範圍：**檔名（name）＋ 標籤（tags）＋ 圖片 Alt**

---

## 🤖 AI 友善設計

本站採用**文字優先架構**，讓 AI 工具（NotebookLM、ChatGPT、Claude 等）能有效分析教學內容：

### 設計原則

| 層面 | 實作方式 | 效益 |
|------|----------|------|
| **語義化 HTML** | `<article>`, `<section>`, 正確標題層級 | 易於解析結構 |
| **結構化資料** | JSON-LD Schema.org (`@type: "Course"`) | 機器理解課程內容 |
| **AI 索引** | `/ai-index.json` - 完整課程目錄 | 程式化存取 |
| **課程摘要** | 每頁 2-3 句簡介 | 快速理解內容 |
| **精確連結** | 內容區塊 ID: `#unit-2-lesson-3` | 精準引用 |
| **更新追蹤** | `/feed.json` - ISO 時間戳 | 偵測內容變更 |
| **使用指南** | `/for-ai.html` - 站台結構說明 | AI 工具入口 |

### AI 可存取的內容

1. **課程資料**（透過公開 URL）
   - 課程名稱、年級、學期、領域
   - 教學目標、課程簡介、教師介紹
   - 工作本、黑板畫、照片等視覺教材描述

2. **結構化資料**（JSON 格式）
   - `/_data/course-configs/course_*.json` - 課程元資料
   - `/ai-index.json` - 完整課程索引
   - `/feed.json` - 更新時間軸

3. **語義標記**
   - Schema.org Course 標準
   - 有意義的圖片 Alt 文字
   - 描述性連結文字

### 使用範例

**NotebookLM:**
1. 上傳網站 URL: `https://yourusername.github.io/course-site-starter/`
2. NotebookLM 會自動爬取所有課程頁面
3. 可詢問：「二年級戲劇課程的教學目標是什麼？」

**ChatGPT/Claude:**
1. 分享特定課程 URL
2. 或上傳 `/ai-index.json` 取得完整結構
3. AI 可分析教學設計、建議改進方向

### 授權與使用規範

- **內容授權**: CC BY-NC（姓名標示-非商業性）
- **學生照片**: 已取得公開授權，僅限教育用途
- **AI 訓練**: 允許用於教育研究，需註明出處
- **商業使用**: 需事前取得書面同意

詳見網站的 `/ai-use.html` 頁面（待建立）。

---

## 🧪 開發與建置

```bash
# 安裝
npm install

# 開發模式（http://localhost:8080）
npm run dev

# 只建置靜態檔（_site）
npm run build

# 建置 + 產生 Pagefind 索引
npm run deploy
```

---

## ☁️ 發佈到 GitHub Pages

兩種做法擇一：

### 方案 A：GitHub Actions 自動部署（建議）
1) 推到 `main`，或在 Actions 中手動 **Run workflow**。
2) 設定 Pages：Settings → Pages → Source = **Branch: gh-pages / Root**。
3) 網址：`https://<你的帳號>.github.io/<repo-name>/`（本 repo 為 `/course-site-starter/`）。

> 若要在 CI 內同步 Drive（可選）：在 repo **Settings → Secrets → Actions** 建立 `GOOGLE_API_KEY`，
> 並解除 workflow 內對 `sync:drive` 步驟的註解。

### 方案 B：本機建置後推到 `gh-pages` 分支
```bash
npm run deploy
git subtree push --prefix _site origin gh-pages
# 設定 Pages Source：gh-pages / 根目錄
```

---

## 🎨 客製化

- 站名／頁尾資訊：`src/_data/site.json`  
- 版頭導覽／Pagefind 載入策略：`src/_includes/layouts/base.njk`（內建動態載入）  
- 主視覺色彩與元件微調：`public/css/site.css`  
- 課程導覽元件：`src/_includes/components/course_nav.njk`  
- 相簿元件：`src/_includes/components/drive.njk`  
- Lightbox 與篩選：`public/js/gallery.js`

---

## 🔐 環境設定與 Git 工作流程

### 環境變數設定

建立 `.env` 檔案（不會被 git 追蹤）：

```bash
# Google Drive API Key for localhost development
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_FORM_ID=your_google_form_id_here

# Environment settings
NODE_ENV=development
ELEVENTY_BASE=/
```

### Git 工作流程

專案 `.gitignore` 已排除：
- `*.bak` - 同步腳本的備份檔案（乾淨課程 JSON）
- `.env*` - 環境變數（API 金鑰）
- `_site/` - 建置輸出

**核心原則：**
- Git 僅追蹤**同步之前的 `course-configs/course_*.json`**（無 Drive 同步內容）
- 同步腳本覆寫 JSON 供本地測試
- `.bak` 保存無同步內容版本供還原

**提交流程：**
```bash
# 測試完成後，還原乾淨版本
cp src/_data/course-configs/*.json.bak src/_data/course-configs/*.json

# 提交
git add .
git commit -m "your message"
git push
```

**GitHub Actions 自動部署：**
- CI 在建置時執行 `npm run sync:drive`（使用 Secrets 中的 API Key）
- 自動同步 Drive 內容並部署到 GitHub Pages

---

## 🧩 新增一門課

### 步驟 1：建立課程 JSON 檔案

使用 `src/_data/course-configs/course_template.json` 作為新課程的起始模板。
複製模板並重新命名（**必須使用 `course_` 開頭**）：

```bash
cp src/_data/course-configs/course_template.json src/_data/course-configs/course_3b_myclass_114_spring.json
```

### 步驟 2：編輯課程元數據

編輯新建的 JSON 檔案，填入以下**必填欄位**。詳細欄位說明請參考「🗂️ 資料結構（`course_*.json`）」章節。

```json
{
  "slug": "3b-myclass-114-spring",           // 網址路徑（小寫、連字號）
  "metadata": {
    "grade_level": "3",                      // 年級編號（數字字串，用於課程索引頁篩選）
    "domain_category": "nature-main-lesson", // 領域類別（slug 格式，用於課程索引頁篩選）
    "teacher_name": "wang-wan-ting"          // 教師姓名（slug 格式，用於課程索引頁篩選）
  },
  "i18n": {
    "zh-TW": {
      "title": "課程名稱",
      "grade": "三年級 3B 班級名稱",
      "semester": "114 學年度 春季",
      "unit": "主題單元",
      "domain": "課程領域",
      "teacher": "教師名稱",
      "overview": "課程簡介文字",
      "learningObjectives": [
        "學習目標 1",
        "學習目標 2"
      ]
    },
    "en-US": {
      "title": "My Course Name",
      "grade": "Grade 3, Class 3B",
      "semester": "Academic Year 114, Spring",
      "unit": "Theme Unit",
      "domain": "Subject Domain",
      "teacher": "Teacher Name",
      "overview": "Course overview text",
      "learningObjectives": [
        "Learning objective 1",
        "Learning objective 2"
      ]
    }
  },
  "tags": ["標籤1", "標籤2"],
  "google_docs": {
    "course_description": "",                // Google Doc ID（可選）
    "play_script": "",
    "story": ""
  },
  "drive_folders": {
    "workbook_photos": "",                   // Drive 資料夾 ID
    "blackboard": "",
    "photos": "",
    "performance": "",
    "songs_audio": ""
  },
  "files": {
    "workbook_pdfs": [],
    "play_scripts": [],
    "sheet_music": []
  },
  "youtube_videos": {
    "play_video": ""                         // YouTube 影片 ID（可選）
  },
  "docs": {}
}
```

**⚠️ 重要：**
- **`metadata` 欄位**：用於課程索引頁的篩選功能（`/courses/`），必須使用 slug 格式。詳細說明請參考「🗂️ 資料結構（`course_*.json`）」章節。
- **`i18n` 欄位**：所有可翻譯欄位（title、grade、overview 等）**必須**放在此物件內。詳細說明請參考「🗂️ 資料結構（`course_*.json`）」章節。
- **區別**：`metadata` 是機器可讀的篩選鍵值，`i18n` 是人類可讀的顯示文字

### 步驟 3：設定 Drive 資料夾權限

將 `drive_folders` 中填入的資料夾設為**「知道連結的任何人可檢視」**：

1. 開啟 Google Drive 資料夾
2. 右鍵 → 共用 → 一般存取權
3. 選擇「知道連結的任何人」+ 「檢視者」

### 步驟 4：同步與測試

```bash
# 同步 Drive 內容
GOOGLE_API_KEY=你的金鑰 npm run sync:drive

# 啟動開發伺服器
npm run dev

# 瀏覽器開啟
# http://localhost:8080/courses/3b-myclass-114-spring/
```

### 步驟 5：提交到 Git

測試完成後，還原乾淨版本並提交：

```bash
# 還原乾淨的課程 JSON
cp src/_data/course-configs/*.json.bak src/_data/course-configs/*.json

# 提交新課程
git add src/_data/course-configs/course_3b_myclass_114_spring.json
git commit -m "feat: add 3B MyClass 114 Spring course"
git push
```

**重要提醒：**
- 檔案名稱必須符合 `course_*.json` 格式
- `slug` 欄位決定網址路徑，必須是唯一值
- 僅提交**乾淨的 JSON**（無 `files.*` 同步內容）
- GitHub Actions 會在部署時自動同步 Drive 內容

---

## 🛠️ 疑難排解

- **Pagefind MIME / 404**（開發模式）：  
  v9.1 已改為**動態載入**，會自動 fallback 到 CDN。若仍有異常，請硬重新整理（Ctrl/Cmd+Shift+R）。
- **Drive 照片無法顯示**：  
  檢查檔案或資料夾是否公開；必要時把圖片改走 `thumbnail`（系統已自動處理）。
- **音檔無法播放**：  
  檢查音檔是否允許公開存取；瀏覽器可能以串流或下載處理（依 MIME 與瀏覽器行為）。
- **同步不到檔案**：  
  確認 `GOOGLE_API_KEY`、Drive API 已啟用、資料夾 ID 正確、未被回收桶或非 shortcut 指向私人檔案。

---

## 📄 授權與版權

- 網站原始碼：MIT（可自由複用）。  
- 內容素材：**CC BY-NC**；含學生之照片已取得授權，不得用於商業用途。  
- 校方聯絡：it@waldorf.ilc.edu.tw

---

## 🧾 指令一覽

```bash
npm install
npm run dev
GOOGLE_API_KEY=xxx npm run sync:drive
npm run build
npm run deploy
```

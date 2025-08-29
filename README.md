# 慈心課程織圖

以 **Eleventy (11ty)** + **Tailwind CSS** + **Pagefind** 製作的**靜態課程展示網站**。  
自動從 **Google Drive 公開資料夾**同步照片／音檔，支援**多課程**、縮圖瀏覽＋**Lightbox**、站內搜尋與**快速篩選**。

> 內容授權：CC BY-NC；含學生照片之素材已取得公開授權。  
> 聯絡：it@waldorf.ilc.edu.tw

---

## ✨ 功能總覽

- 多課程導覽：課程主頁（課程名稱／簡介／教師介紹）＋六大分頁  
  `工作本｜照片集｜黑板畫｜劇本｜歌曲與音檔｜留言與交流`
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

## 🧱 專案架構

```
course-site/
├─ .eleventy.js                    # 11ty 設定
├─ package.json                    # 指令與套件
├─ scripts/
│  └─ fetch-drive.mjs             # Drive 同步腳本（核心）
├─ public/
│  ├─ css/site.css                # 基本樣式（補 Tailwind）
│  └─ js/gallery.js               # Lightbox + 快速篩選
└─ src/
   ├─ _data/
   │  ├─ site.json                # 站名、頁尾、聯絡等
   │  ├─ coursesList.js           # 掃描所有 course_*.json
   │  └─ course_*.json           # 每一門課程的資料（重要）
   ├─ _includes/
   │  ├─ layouts/base.njk         # 版型（Pagefind 動態載入）
   │  └─ components/
   │     ├─ course_nav.njk        # 課程分頁導覽
   │     └─ drive.njk             # 相簿縮圖格／大圖預覽
   ├─ courses/
   │  ├─ index.njk                # 所有課程列表
   │  ├─ home.njk                 # 課程主頁
   │  ├─ workbook.njk             # 工作本（相簿）
   │  ├─ photos.njk               # 照片集（相簿）
   │  ├─ blackboard.njk           # 黑板畫（相簿）
   │  ├─ scripts.njk              # 劇本（相簿）
   │  └─ songs.njk                # 歌曲與音檔（<audio>播放）
   ├─ reflections/
   │  └─ index.njk                # 留言與交流（投搞指引／信箱）
   └─ index.njk                   # 首頁（課程快速導覽）
```

---

## 🗂️ 資料結構（`course_*.json`）

每門課一個 JSON 檔，範例：

```json
{
  "slug": "2a-nenggao-113-summer",
  "title": "能高山（班級戲劇）",
  "grade": "二年級 2A 嶺光班",
  "semester": "113 學年度 夏季",
  "unit": "班級戲劇",
  "domain": "自然主課",
  "teacher": "王琬婷",
  "tags": ["戲劇", "黑板畫", "工作本", "歌曲"],
  "drive_folders": {
    "workbook_photos": "FOLDER_ID",
    "blackboard": "FOLDER_ID",
    "photos": "FOLDER_ID",
    "scripts_and_performance": "FOLDER_ID",
    "songs_audio": "FOLDER_ID"
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

**重點：**
- `drive_folders`：放各分類的 **Google Drive 資料夾 ID**（需設為「知道連結的任何人可檢視」）。  
- `files.*`：執行同步腳本後自動覆寫；**圖片會寫成物件 `{id,name,tags}`**。  
- 標籤來源：
  - 由檔名自動擷取：`[方括號]`、`【全形】`、`#hashtag`（例如 `P01【第2週】【螢火蟲】.jpg`）  
  - 由課程層級自動附加：`grade/semester/unit/domain`
- **音檔**：以 `{title,id,mimeType}` 表示，頁面以 `<audio>` 串流播放。

---

## 🔁 Google Drive 同步腳本

### 取得 API Key（只需一次）
1. 到 Google Cloud Console 開啟專案並啟用 **Drive API**。  
2. 建立 **API 金鑰**（限制為特定 HTTP 來源或 IP）。  
3. 將金鑰設到環境變數 `GOOGLE_API_KEY`。

### 執行同步
```bash
GOOGLE_API_KEY=你的API金鑰 npm run sync:drive
```
腳本會：
- 讀取 `src/_data/course_*.json`
- 依 `drive_folders` 列出所有檔案（支援 **Shortcut** 轉正）
- 篩選：`image/*` → 相簿；`audio/*` → 歌曲與音檔
- 產生 `files.*` 清單（含 `{id,name,tags}`），並備份為 `.bak`

> 若圖片無法顯示，請檢查該檔／資料夾是否公開。部分檔案若 `uc?export=view` 403，系統會改用 `thumbnail` 端點（並內建後備）。

---

## 🔎 搜尋與篩選

- **Pagefind 站內搜尋**：搜尋頁面文字（首頁／課程主頁等）。  
  - **開發模式（npm run dev）**：v9.1 會自動偵測本機 `/pagefind/*` 是否存在；沒有就改用 **CDN**，避免 404/MIME 錯誤。  
  - **正式部署**：`npm run deploy` 會建立索引到 `_site/pagefind/*`。

- **相簿快速篩選**（相簿頁右上角輸入框）：  
  - 以空白分隔多個關鍵字（AND 條件）  
  - 比對範圍：**檔名（name）＋ 標籤（tags）＋ 圖片 Alt**

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
1. 將專案推到 GitHub。  
2. 建立 workflow（已附於 `.github/workflows/gh-pages.yml`）。  
3. 到 **Settings → Pages**，將 **Source** 選擇 **GitHub Actions**。  
4. 推送到 `main`，Actions 會自動 build 並部署至 Pages。

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

## 🧩 新增一門課

1. 複製 `src/_data/course_2a_nenggao_113_summer.json` 為新檔，修改：  
   `slug/title/grade/semester/unit/domain/teacher/drive_folders`  
2. 將對應 Drive 資料夾設為「知道連結的任何人可檢視」。  
3. 執行同步：

```bash
GOOGLE_API_KEY=你的API金鑰 npm run sync:drive
```

4. 在瀏覽器檢視 `/courses/你的-slug/`。

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

# 教學創新與反思

## 目的

本目錄用於存放各課程的**教學創新與教學反思**文件。這些反思文章將成為課程網站的重要組成部分，幫助教師之間分享教學經驗、創新方法和專業洞見。

---

## 檔案結構

採用**單一語言單一檔案**架構，每種語言的反思存放於獨立目錄：

```
src/course-innovations/
├── zh-TW/                           # 繁體中文反思
│   └── {course-slug}.md
├── en-US/                           # 英文反思
│   └── {course-slug}.md
├── README.md                        # 本說明文件
└── _template.md                     # 模板檔案
```

**重要原則：**
- 一個檔案只包含一種語言的內容
- 檔名必須與課程 JSON 的 `slug` 完全一致
- 中文和英文分別存放於 `zh-TW/` 和 `en-US/` 目錄

---

## 開始撰寫

### 步驟 1: 複製模板

```bash
# 中文版
cp _template.md zh-TW/{course-slug}.md

# 英文版
cp _template.md en-US/{course-slug}.md
```

將 `{course-slug}` 替換為您的課程 slug（例如 `2a-nenggao-113-summer`）。

### 步驟 2: 撰寫內容

撰寫該語言的 Markdown 內容：

**中文版範例：**
```markdown
### 教學創新法

在這裡描述您在這門課程中實踐的創新教學方法...

### 學生學習成果和觀察

分享學生的反應、學習成果和您的觀察...
```

**英文版範例：**
```markdown
### Key Innovations

Describe the innovative teaching methods you implemented...

### Student outcomes and Observations

Share student reactions, learning outcomes, and your observations...
```

**支援的 Markdown 語法：**
- 標題: `##`, `###`, `####`
- 粗體: `**文字**`
- 斜體: `*文字*`
- 列表: `- 項目` 或 `1. 項目`
- 連結: `[文字](URL)`
- 區塊引用: `> 引用文字`

**無需 Frontmatter！**所有資訊從檔案路徑和課程 JSON 自動取得：
- 語言：從目錄名稱（`zh-TW` 或 `en-US`）
- Slug：從檔名（`2a-nenggao-113-summer.md`）
- 標題：使用課程 JSON 的 `i18n[lang].title`
- 作者：使用課程 JSON 的 `metadata.teacher_name`
- 發布狀態：檔案存在即為已發布

### 步驟 3: 提交變更

```bash
git add src/course-innovations/zh-TW/{course-slug}.md
git add src/course-innovations/en-US/{course-slug}.md
git commit -m "feat(innovation): add pedagogical innovation for {course-name}"
git push
```

網站重新建置後，您的反思文章將自動出現在該課程的創新頁面。

---

## 驗證反思檔案

在提交前，請執行驗證腳本確保格式正確：

```bash
npm run validate:innovations
```

驗證腳本會檢查：
- ✅ 檔案格式是否正確
- ⚠️ 是否缺少某種語言的翻譯

---

## 更新已發布的反思

1. 直接編輯對應語言目錄中的 `.md` 檔案
2. 執行 `npm run validate:innovations` 檢查
3. 提交變更並推送

---

## 注意事項

1. **檔名必須與課程 slug 一致**: 檔名必須完全符合課程 JSON 的 `slug`（例如 `2a-nenggao-113-summer.md`）。
2. **檔名一致性**: 兩種語言的檔名必須完全相同，只是放在不同目錄。
3. **無需 Frontmatter**: 直接撰寫 Markdown 內容即可，所有元資料從檔案路徑和課程 JSON 取得。
4. **雙語支援**: 建議同時提供中英文版本，但若暫無英文翻譯，系統會自動顯示中文版並提示「English translation coming soon」。
5. **避免超大檔案**: 教學反思應以文字為主，如需引用照片或影片，請連結到課程材料區。
6. **獨立維護**: 每個語言檔案獨立維護，修改一個不會影響另一個。

---

## 技術細節

- **資料載入器**: `/src/_data/courseInnovations.js` 自動讀取 `zh-TW/` 和 `en-US/` 目錄中的所有 `.md` 檔案
- **頁面模板**: `/src/courses/innovation.njk` 根據使用者語言偏好自動選擇對應版本
- **URL 結構**: 每個反思的 URL 為 `/courses/{slug}/innovation/`
- **驗證腳本**: `/scripts/validation/validate-innovations.js` 檢查翻譯完整性

---

## 範例參考

- 中文範例: `zh-TW/2a-nenggao-113-summer.md`
- 英文範例: `en-US/2a-nenggao-113-summer.md`

---

## 常見問題

**Q: 為什麼要分開儲存中英文？**
A: 單一語言單一檔案的架構更符合「簡單」（simple）原則：每個檔案獨立、清晰，易於維護和擴展新語言。

**Q: 為什麼不需要 Frontmatter？**
A: 避免資料重複！所有元資料（作者、標題等）已存在於課程 JSON 中，從檔案路徑即可推斷語言和 slug，無需再次填寫。

**Q: 如果只有中文版怎麼辦？**
A: 沒問題！系統會自動處理，英文使用者會看到中文內容並顯示「English translation coming soon」的提示。

**Q: 標題從哪裡來？**
A: 頁面標題統一使用「教學創新」/「Pedagogical Innovation」，不需要在反思檔案中指定。

**Q: 可以添加第三種語言嗎？**
A: 可以！只需在 `courseInnovations.js` 的 `languages` 陣列中添加新語言代碼（例如 `ja-JP`），並建立對應目錄即可。

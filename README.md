# PHILOSOPHIA — 中西方哲學百科全書

整理東西方哲學家、學派、概念與經典著作，並以共同問題進行中西哲學比較的靜態網站。使用原生 HTML、CSS、JavaScript，可直接部署到 GitHub Pages。

## 檔案結構

```
index.html            首頁（網站介紹、搜尋、分類入口、中西比較）
pages/
  philosophers.html   哲學家列表
  schools.html        哲學學派列表
  concepts.html       哲學概念列表
  works.html          經典著作列表
  comparisons.html    中西比較列表
  detail.html         所有條目的詳細頁（detail.html?type=分類&id=條目id）
css/style.css         全站樣式（含深色模式與手機版）
js/app.js             全站程式（導覽、資料載入、列表、搜尋、詳細頁）
data/*.json           哲學資料，每個分類一個檔案
images/               圖示與圖片
```

## 本機預覽

瀏覽器不允許直接開啟的 HTML 讀取 JSON，請用本機伺服器：

```bash
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

## 部署到 GitHub Pages

將整個資料夾推送到 GitHub 儲存庫，在 Settings → Pages 選擇從 `main` 分支根目錄部署即可。`js/app.js` 會依自身位置推算網站根目錄，因此 `pages/` 內的頁面與部署在子路徑（如 `username.github.io/repo/`）時連結都能正常運作。`pages/` 內的 HTML 以 `../` 引用 `css/`、`js/`、`images/`。

## 新增內容

只需在對應的 `data/*.json` 加入一個物件，列表、搜尋、詳細頁與側欄延伸閱讀都會自動更新，不需修改 HTML 或 JS。

### 共同欄位（所有分類）

| 欄位 | 說明 |
| --- | --- |
| `id` | 英文小寫、以 `-` 連接，全分類內唯一，用於網址 |
| `name` | 繁體中文名稱 |
| `nameOriginal` | 原文或英文名稱 |
| `tradition` | `east`、`west`（比較條目為 `both`） |
| `era` | 時代或時期 |
| `summary` | 一至二句摘要，用於卡片與搜尋 |
| `philosophers` / `schools` / `concepts` / `works` | 相關條目的 `id` 陣列 |
| `tags` | 搜尋用關鍵字 |
| `sources` | 參考資料 `[{ "title": "", "url": "" }]` |

### 各分類專屬欄位

- **哲學家** `philosophers.json`：`years`、`region`、`life`（生平，段落陣列）、`background`（歷史背景，段落陣列）、`ideas`（核心思想 `[{title, text}]`）、`quotes`（`[{text, source}]`，只收錄可查證出處的原文）
- **學派** `schools.json`、**概念** `concepts.json`：`origin`（起源，段落陣列）、`views`（主要觀點 `[{title, text}]`）
- **著作** `works.json`：`background`（作品背景，段落陣列）、`ideas`（主要思想 `[{title, text}]`），`philosophers` 為作者
- **中西比較** `comparisons.json`：`question`（共同問題，段落陣列）、`east` / `west`（`{title, points: []}`）、`similarities`、`differences`（字串陣列）

### 注意事項

- 新增條目時，記得在相關條目的關聯陣列中加入新的 `id`，讓連結雙向可達。
- 中西比較條目會自動顯示在被引用的哲學家、學派、概念、著作側欄中。
- 內容需參考可靠來源，不得編造名言、著作或歷史事件。

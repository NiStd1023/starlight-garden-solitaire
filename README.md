# 星光花園・撲克接龍

在月夜花園裡遊玩的單人撲克接龍遊戲。支援電腦、平板和手機，並可安裝為 PWA。

## 遊戲方式

- 點選未被遮住、與目前牌點數相差 1 的牌，花色不限，A 與 K 可以相接。
- 沒有接法時可從抽牌堆翻一張新牌；抽牌會中斷連擊。
- 每達成 5 連擊可獲得一顆星光百搭（最多持有 3 顆），可讓下一張亮面牌無視點數直接接上。
- 提供提示、復原、重玩本局、新牌局、三款牌背，以及獨立的音樂與音效開關。

## 安裝與離線遊玩

首次連網打開網站並載入完成後，可將遊戲安裝至裝置；遊戲檔案會快取，以供離線使用。

- **iPhone／iPad：** 用 Safari 開啟，點分享按鈕，選「加入主畫面」。
- **Android：** 用 Chrome 開啟，從選單選擇「安裝應用程式」或「加到主畫面」。
- **電腦：** 在 Chrome 或 Edge 網址列按安裝圖示，或由瀏覽器選單安裝。

進行中的牌局、最高分和音效設定保存在目前瀏覽器或安裝的 App 中，不會在不同裝置或瀏覽器間同步。清除瀏覽資料可能會刪除這些紀錄。背景音樂會在首次操作後開始播放。

## 在本機開發

不需要安裝相依套件。以 Python 啟動靜態伺服器：

```bash
python3 -m http.server 8000 --directory dist
```

瀏覽 `http://localhost:8000`。執行遊戲規則測試：

```bash
npm test
```

## 專案結構

- `dist/index.html`：遊戲介面和安裝說明
- `dist/style.css`：手機與桌機版面
- `dist/app.js`：互動、聲音、進度儲存與 PWA 註冊
- `dist/engine.js`：牌局、計分和規則
- `dist/manifest.webmanifest`、`dist/sw.js`、`dist/icons/`：PWA 與離線資源
- `tests/`：核心規則測試
- `.github/workflows/pages.yml`：從 `main` 部署至 GitHub Pages 的工作流程

## 部署 GitHub Pages

在 GitHub 儲存庫的 **Settings → Pages → Build and deployment** 將來源設為 **GitHub Actions**。推送到 `main` 後，工作流程會發布 `dist/`，支援以子路徑存取。GitHub Pages 與其他網站主機各自發布，更新其中一個不會自動更新另一個。

修改快取的資產時，應更新 `dist/sw.js` 裡的快取版本，確保使用者能載入新版本。PWA 安裝與離線功能需要 HTTPS 或 localhost。

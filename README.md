# NexusSim · AI 時代職場高壓模擬器

給香港大學生的 **10 分鐘高壓決策模擬**：在 AI 加速的職場裡，你會被要求「立刻上線一個漂亮的數字」，
但那個數字可能只是 15 份問卷的幻覺。NexusSim 用可重現的時間軸、會施壓的 NPC 與可驗證的文件，
把你**怎麼查證、怎麼頂住壓力、怎麼向上溝通**變成一份可列印的能力認證。

> 首發任務：`nexus-launch-crisis` — NovaTech 的 AI 助理 NovaAssist 2.0 上線前 600 秒。
> 介面與劇本支援 **繁體中文 / English** 雙語，右上角一鍵切換。

---

## 快速開始

```bash
# 1. 安裝依賴
npm install          # 或：pnpm install --node-linker=hoisted

# 2. （可選）設定 DeepSeek 金鑰，沒有也能完整跑完
cp .env.local.example .env.local
# 編輯 .env.local → DEEPSEEK_API_KEY=sk-xxxx
# 或者：直接在網頁右上角「Live AI / 點擊設定 API Key」膠囊貼上金鑰（存在瀏覽器 localStorage）

# 3. 開發模式
npm run dev          # → http://localhost:3000

# 4. 生產建置
npm run build && npm run start
```

沒有金鑰時，系統會自動以 **OFFLINE DEMO** 模式運作：NPC 對話、文件解鎖、評分與報告全部可用，
只有 NPC 的措辭與語意評分改由確定性的 mock 引擎產生。

### AI 金鑰的兩種來源

| 來源 | 設定方式 | 適用情境 |
| --- | --- | --- |
| 伺服器環境變數 | `.env.local` 的 `DEEPSEEK_API_KEY` | 課堂統一部署、不想讓學生碰金鑰 |
| 瀏覽器（每位使用者） | 戰情室頂部膠囊 → `API 設定` 彈窗輸入 Key（可自訂 Base URL / Model） | 學生自備金鑰、多組金鑰輪替、測試不同端點 |

請求時前端以 `x-deepseek-api-key` / `x-deepseek-base-url` / `x-deepseek-model` 標頭傳遞；
後端優先採用標頭金鑰，沒有才回退到環境變數。兩者皆無、或呼叫失敗／逾時（8 秒）時，
自動降級為離線備援回覆並在畫面提示，模擬流程不會中斷。彈窗內建「測試連線」按鈕，
會即時回報連線成功、金鑰無效或伺服器未設定。

### 端到端自檢

```bash
npm run dev                                       # 另開一個終端，預設 http://localhost:3000
node scripts/e2e-check.mjs                        # 69 項 HTTP 檢查（中英雙語、解鎖判定、評分硬上限、升等指南、遺漏步驟、AI 設定 API）
node scripts/e2e-check.mjs http://localhost:4310  # 也可以指定別的埠
```

`scripts/e2e-check.mjs` 會打真實的 HTTP 端點（含 404 與壞 JSON 的錯誤處理），
可以當作改動劇本或評分邏輯後的快速回歸測試。

### 行前導覽與結算頁自檢

```bash
node scripts/ui-guide-check.mjs    # 21 項：導覽自動彈出、倒數暫停、3 步驟、開始後計時、Rubric 開關
node scripts/ui-report-check.mjs   # 20 項：升等指南、遺漏步驟、Rubric 對照表展開與「你目前在此」標記、證書列印範圍
node scripts/ui-submit-check.mjs   # 14 項：矮視窗可完成導覽、未填寫提交有提示、確認面板可點、送出後跳轉報告、行動版流程
node scripts/ui-locale-check.mjs   # 10 項：模擬中途切換中／英，時間軸訊息、事件列、文件標題同步換語言且可逆
```

三者都用 headless Edge 以 CDP 實際點擊驗證，並把截圖寫到 `docs/ui-shots/`。

> **提交簽核的兩道防線**：`ui-submit-check.mjs` 會用真實滑鼠事件點擊「提交簽核並結束模擬」，
> 若按鈕被任何浮層（例如右下角通知）遮擋就會直接失敗——這正是本專案曾經發生的問題，
> 現在通知已改為 `pointer-events-none` 並移到頂部工具列下方。

### 對話介面自檢

```bash
node scripts/ui-ai-check.mjs   # 需先啟動 dev server；會自動開 headless Edge
```

以 CDP 實際操作驗證 25 項互動：AI 狀態膠囊文案與配色、設定彈窗（密碼欄位／眼睛圖示／
測試連線／儲存後轉綠）、快速追問膠囊填入、輸入中指示（三點動畫）、翡翠綠機密附件卡、
點擊附件卡在中央工作台開啟文件，以及清除金鑰後回到離線模式。

### 視覺與版面稽核

```bash
node scripts/ui-audit.mjs     # 需先啟動 dev server
```

用 headless Edge 在 375 / 768 / 1024 / 1440 四種寬度（含英文版）實際渲染三個介面，量測並輸出：

- `document.scrollWidth - innerWidth`（橫向溢出必須為 0）與溢出元素清單
- 是否有以 emoji 當功能圖示（規範要求只用 lucide-react）
- 三張頁面截圖到 `docs/ui-shots/`，另有 `docs/ui-shots/audit.json` 記錄每次量測結果

### 清理快取

Next.js 的 `.next/`（建置與 Turbopack 快取）與 pnpm 的 `.pnpm-store/` 都只是可重建的快取檔：

```bash
npm run clean        # 刪除 .next（請先停掉 dev server）
npm run clean:all    # 連同 .pnpm-store 一併刪除
npm run clean -- --dry-run   # 只看會刪什麼，不真的刪
```

兩者都已在 `.gitignore` 內；刪掉後下次 `dev` / `build` 會自動重建，不影響功能。

---

## 一場模擬的流程

1. **大廳 `/`** — 單一旗艦任務展示（《NovaTech：NovaAssist 2.0 上線簽核風暴》），可先開「查看評分標準 (Rubric)」看完整評分準則。
2. **行前導覽** — 首次進入作戰室時自動彈出 3 步驟導覽（角色任務 → 三欄介面用途 → 四步實戰流程），此時**倒數計時是暫停的**；按下「開始 10 分鐘高壓模擬」才真正開始。頂部的 `操作導覽` 可隨時重看（同樣會暫停計時）。
3. **作戰室 `/simulation/[id]`** — 三欄配置：
   - 左：**通訊頻道**（Marcus 增長總監 / Chloe 數據分析師 / David 法務 / Sarah 副總裁）
   - 中：**文件檢視器**（`doc-exec-deck` 開場即有；`doc-raw-logs`、`doc-legal-memo` 需解鎖）
   - 右：**決策欄** — 簽核、理由、最終決策送出
4. **壓力事件** — 600 秒倒數，中間有主管催逼、法務文件自動送達、副總裁 45 秒限時插問、紅燈警示。
5. **覆盤報告 `/report/[id]`** — 雷達圖、Critical Thinking X-Ray、**升等行動指南**、**遺漏步驟清單**、**透明 Rubric 對照表**、陷阱解析、可列印證書。

### Demo 快速通道（右上角，桌面版）

`+1 分鐘`｜`下一事件`｜`暫停`｜`重置` — 用來在課堂 demo 時跳過等待，事件仍會依時間軸依序觸發。

---

### 中英文雙語（右上角 `中文 | EN` 切換）

整個介面、劇本、NPC 回覆、評語與證書都支援繁體中文與英文兩種版本。

- 語言選擇存在 cookie `nexussim_locale`（一年）+ `localStorage`，重新整理或重開都記得。
- 因為語言由 **Server Component 讀 cookie** 決定，首屏輸出就是正確語言，不會有中英文閃爍。
- 劇本資料分兩份：`src/data/flagshipScenario.ts`（中文）與 `src/data/flagshipScenarioEn.ts`（英文），由 `src/data/scenarios.ts` 依語言選用；英文模式的 NPC 仍聽得懂中文提問（關鍵詞取兩邊聯集），所以學生混用語言也能解鎖文件。
- 文案字典在 `src/lib/copy/`（`common` / `lobby` / `cockpit` / `report`），`en` 的型別是 `typeof zh`，漏譯會在 `tsc` 直接報錯。
- 報告若以另一種語言開啟，會自動用同一份行為遙測重新生成評語（保留原 `verificationId`）。
- **模擬進行中切換語言**：時間軸訊息、動態事件列、VP 緊急彈窗、文件與 KPI 會即時換成新語言（還原草稿後也一樣）；學生自己打的訊息與 AI 回覆屬於對話歷史，保留原語言（翻譯對話反而誤導）。自動化驗證見 `node scripts/ui-locale-check.mjs`。

---

## 核心機制

### 1. 陷阱設計（不是猜謎，是查證）

| 文件 | 陷阱 |
| --- | --- |
| `doc-exec-deck`（開場解鎖） | 92% 滿意度、+35% 留存，小字註明「基於首輪 **15 份**有效回饋問卷統計」 |
| `doc-raw-logs`（需向 Chloe 追問） | 內部 N=15（92% 好評） vs 外部 N=500（48% 好評、41% 幻覺投訴） |
| `doc-legal-memo`（360 秒法務送達） | 業務口頭承諾的退款/降價條款具法律效力，風險敞口 HK$3.69M |

### 2. 行為遙測 → 規則評分（60%）

- `unlockedRawLogs`：是否取得原始數據
- `viewedDocuments` / `contactedNpcs`：是否交叉比對多方來源
- `questionedAuthority`：是否質疑主管提供的數字
- `respondedToVpOnTime`：45 秒限時插問是否回覆
- `finalDecision`：`approve_full` / `delay_retest` / `canary_release`
- `rushedSubmission`、`timeSpentSeconds`、`decisionRationale`

硬規則：未取得原始數據就 `approve_full` → 批判性驗證 **上限 35 分**。

### 3. 語意評分（40%）

DeepSeek 讀取你的決策理由、VP 回覆與對話全文，評估論證品質；無金鑰時由 mock 規則代替。
兩者以 `mergeDimensions()` 合併後加權：

```
overall = 批判性驗證 0.30 + 資訊交叉比對 0.25 + 高壓抗干擾 0.20 + 向上溝通力 0.25
等級：S ≥ 85 ｜ A ≥ 72 ｜ B ≥ 58 ｜ C < 58
```

### 4. 透明 Rubric 與升等診斷

`src/data/scoringRubric.ts` 為 4 個維度各寫了 Level 1–5 的可觀察行為準則（分數帶 0–39 / 40–57 / 58–71 / 72–84 / 85–100），
大廳、行前導覽、作戰室頂部 `評分標準` 按鈕、報告頁都能打開同一份 Rubric，並在你目前所在等級加上「你目前在此」標記。

`src/lib/coachingEngine.ts` 會依你的實際行為軌跡產生：

- `dimensionCoaching`（升等指南）：每維度的 Level 定位、**觀察到的事實證據**，以及「升至下一級該做什麼」的具體話術。
- `missedSteps`（遺漏步驟）：未解鎖原始日誌、未檢視法務備忘錄、未諮詢法務、未質疑主管數字、VP 逾時、未設上線門檻、未提替代方案、未諮詢足夠持份者，逐條說明「為何重要」與「下次怎麼做」。

這些欄位由規則引擎確定性產生，因此 **Live DeepSeek 與離線 mock 都會輸出**，不依賴模型運氣。

### 5. 多輪 AI 角色引擎（左欄通訊）

每位 NPC 都有自己的 system prompt、隱藏資訊庫與立場，每次送出訊息時前端會一併帶上：

- 該頻道最近 10 輪對話（`chatHistory`），所以 AI 記得你前面問過什麼
- 戰情室狀態（`simulationContext`）：剩餘秒數、已解鎖文件、當前壓力值

回覆強制為 JSON：`{"reply": "...", "unlockDocumentId": null | "doc-..."}`。

| NPC | 個性 | 何時才鬆口 |
| --- | --- | --- |
| Marcus（增長總監） | 高壓、不耐煩，一直催你簽核 | 永不解鎖文件（`unlockDocumentId` 永遠 null） |
| Chloe（數據分析師） | 被動、怕得罪 Marcus | 只有被追問樣本數／來源／外部測試／幻覺率時，才交原始日誌 |
| David（法務） | 嚴謹保守 | 問到合規風險時可交合規備忘錄 |
| Sarah（VP） | 極簡、只看風險 | 不回文件，只回覆限時追問 |

解鎖判定有兩層保險：模型語意判定 + 確定性關鍵字（`DATA_INTENT` / `LEGAL_INTENT` regex）。
即使 API 掛掉或逾時降級，關鍵字仍會觸發解鎖，學生不會因為網路問題卡死；
模型回傳的文件 ID 也會被 `sanitizeUnlock()` 過濾（只能解鎖自己那份、已解鎖就不再重複給）。

### 6. 儲存

無帳號、無資料庫。所有東西都在 `localStorage`：

- `nexussim:attempt:<scenarioId>` — 報告用的評估結果
- `nexussim:draft:<scenarioId>` — 進行中的草稿（6 小時 TTL，重新整理不丟）
- `nexussim:candidate-name` — 證書姓名（預設 `Alex Chen`，可於證書上直接改）

---

## 專案結構

```
src/
  app/
    page.tsx                    # 大廳（任務卡、能力四支柱、流程）
    simulation/[id]/page.tsx    # 作戰室（Server Component → <Cockpit />）
    report/[id]/page.tsx        # 報告（Server Component → <ReportView />）
    api/npc-chat/route.ts       # POST：NPC 多輪回覆 + 語意/關鍵字解鎖；GET：模式與金鑰來源探測
    api/evaluate/route.ts       # POST：規則 + 語意 → 完整評估結果
  components/
    cockpit/  TopControlBar · MessengerPane · DocumentPane · DecisionPane · UrgentPopupModal
              ApiSettingsModal · PreSimGuideModal · Cockpit
    report/   CompetencyRadar · CertificateCard · ReportView
    lobby/    LobbyView             # 大廳（Client，讀 locale context）
    shared/   RubricModal            # 透明 4 維度 × 5 等級評分準則（大廳/導覽/戰情室/報告共用）
    ui/       LanguageToggle        # 中文 | EN 切換
  data/       flagshipScenario.ts   # 劇本、NPC、文件、時間軸（中文，唯一內容來源）
              flagshipScenarioEn.ts # 同一劇本的英文版
              scenarios.ts          # 依 locale 選資料 + 中英關鍵詞聯集
              scoringRubric.ts      # Level 1–5 透明評分準則 + 分數帶換算
  lib/        evaluationEngine.ts · coachingEngine.ts · mockFallback.ts · deepseek.ts · aiConfig.ts
              storage.ts · ids.ts · i18n.ts · LocaleProvider.tsx
              copy/  common · lobby · cockpit · report · rubric · guide · index   # 中英文文案字典
  types/      simulation.ts         # 所有型別定義（含 Rubric / DimensionCoaching / MissedStepItem）
scripts/      e2e-check.mjs         # 端到端自檢（中英文共 69 項）
              ui-ai-check.mjs       # 對話介面互動自檢（25 項，headless Edge）
              ui-guide-check.mjs    # 行前導覽 + 倒數暫停 + Rubric 開關（21 項）
              ui-report-check.mjs   # 升等指南 / 遺漏步驟 / Rubric 對照表 / 列印範圍（20 項）
              ui-submit-check.mjs   # 提交簽核按鈕不被遮擋、驗證提示、送出跳轉（14 項）
              ui-locale-check.mjs   # 模擬中途切換中／英的即時一致性（10 項）
              ui-audit.mjs          # 版面/色彩/圖示稽核 + 截圖（headless Edge）
              clean.mjs             # 清快取（.next / .pnpm-store）
docs/ui-shots/                      # ui-audit 與各自檢腳本產出的截圖與 audit.json
```

內容與邏輯分離：想新增任務，只要在 `src/data/flagshipScenario.ts` 加一個 `Scenario`，
時間軸、文件鎖、NPC、決策選項就都能運作。

---

## 設計系統（UI/UX 規範）

三個介面刻意分成兩種視覺語言，讓「決策現場」與「覆盤」在體感上就不同：

| 介面 | 風格 | 底色 / 面板 | 重點色 |
| --- | --- | --- | --- |
| 大廳 `/`、報告 `/report/[id]` | **Institutional Light**（機構級、紙本感） | `#F8FAFC` / `#FFFFFF`，邊框 `#E2E8F0` | 深藍 `#0F172A`、鈷藍 CTA `#2563EB` |
| 作戰室 `/simulation/[id]` | **War-Room Dark**（戰情室、低光） | `#090D16` / `#111622` / `#1E293B`，邊框 `#334155` | 狀態色 藍 `#38BDF8`、綠 `#10B981`、琥珀 `#F59E0B`、紅 `#EF4444` |

- **字體**：標題 Plus Jakarta Sans（display）、內文 Inter、數字/證書編號 JetBrains Mono + `tabular-nums`（`.tabular-telemetry`），中文全數 fallback 到 Noto Sans TC；全部由 `next/font` 自架，無外部 CDN。
- **字級層級（可讀性修正包）**：主要對話氣泡、文件內文、表格內容、決策選項一律 16px（`text-base` + `leading-relaxed`）；次要說明文字 13.5–15px；僅表頭／標籤等密集中繼資訊用 12px，**主內容不得出現 `text-xs`**。作戰室次要文字用 `--color-cockpit-muted` `#CBD5E1`（slate-300），不用 slate-400。
- **數據視覺**：工作文件頂部有「關鍵指標快照」KPI 卡片（`text-2xl xl:text-3xl font-extrabold`），異常數值（如 41% 幻覺率、48% 外部樣本）在表格中以紅色警示膠囊 `bg-red-950/40 text-red-300 border-red-500/40` 呈現，數值欄位一律 `text-base font-bold tabular-telemetry text-white`；倒數計時器 `text-2xl font-extrabold`。
- **設計 token**：集中在 `src/app/globals.css` 的 `@theme`（`canvas` / `surface` / `hair` / `navy` / `cobalt` / `cockpit-*` / `calm|unlocked|warn|critical`），元件只用 token class，不寫死色碼。
- **圖示**：一律 lucide-react，無 emoji 當功能圖示；裝飾性圖示 `aria-hidden`，純圖示按鈕必有 `aria-label`。
- **版面**：作戰室 `h-dvh` 鎖住頁面捲動，三欄 `lg:310/1fr/360`、`xl:350/1fr/410` 各自內部捲動；`<lg` 改成單欄 + 底部三分頁切換。375px 起無橫向溢出。
- **列印**：`@page A4 landscape`，只有 `.print-certificate-only` 的證書會印出，其餘 `.no-print` 全部隱藏。
- **無障礙**：`:focus-visible` 2px 鈷藍外框、`prefers-reduced-motion` 時關閉動畫、狀態不只靠顏色（同時有文字標籤與圖示）。

---

## 技術棧

Next.js 16（App Router, Turbopack）· React 19 · TypeScript · Tailwind CSS v4 ·
Recharts（雷達圖）· lucide-react（圖示）· DeepSeek Chat API（可選）

---

## 給課堂 / Demo 的建議用法

1. 先讓學生**不看提示**跑一次（他們通常會直接簽核）。
2. 印出報告的「陷阱全解析」，對照 `doc-exec-deck` 的小字與 `doc-raw-logs` 的 N=500。
3. 第二次跑時要求：**先向 Chloe 要原始數據 → 再問 Marcus 樣本量 → 最後才給決策**。
4. 比較兩次的分數與雷達圖，重點討論「高壓抗干擾」與「向上溝通力」的落差。

### Presentation Day 建議動線

1. **大廳**：指著旗艦卡片上的四個維度權重與「4 步模擬流程」，說明這是一個完整可玩的系統而不是 mockup。
2. **行前導覽**：刻意讓評審看到「倒數計時暫停中」——先教清楚，再施加壓力。
3. **`評分標準` 按鈕**：打開透明 Rubric，說明「每個分數都有可觀察的行為錨點」。
4. **故意跑一次壞的**（直接簽核）→ 報告頁的**升等指南**與**遺漏步驟**會逐條指出「你漏了什麼、下次怎麼問」。
5. **跑一次好的**（追問 Chloe、看原始日誌、問 David、準時回 VP、選灰度）→ 拿到 S 級與「零關鍵遺漏」徽章。


---

## 授權

僅供教學與課堂 demo 使用。
"# ENTR3100" 

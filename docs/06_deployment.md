# 06. 環境構築・デプロイ手順書

| 項目 | 内容 |
|---|---|
| 版 | 1.0（2026-10-08） |
| リポジトリ | https://github.com/hyemi-kang/periodic-table |
| 公開先（予定） | https://hyemi-kang.github.io/periodic-table/ （**未公開・未確認**。下記 3 章の設定後に有効になる） |

## 1. ローカル開発

### 1.1 前提

| 項目 | 内容 |
|---|---|
| Node.js | 22 系（確認: v22.23.1） |
| npm | 10 系（確認: 10.9.8） |
| ブラウザ | WebGL が使える最新のデスクトップブラウザ |

### 1.2 手順

```bash
git clone https://github.com/hyemi-kang/periodic-table.git
cd periodic-table
npm ci            # 依存関係の導入（package-lock.json に従う）
npm run dev       # 開発サーバー → http://localhost:3000
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー（Turbopack）。ポートが使用中なら `npm run dev -- -p 3100` |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | 型チェック |
| `npm run build` | 本番ビルド。`next.config.ts` の設定により、静的ファイルが `out/` に出力される |

### 1.3 社内ネットワーク（TLS 検査のあるプロキシ）での注意
`npm` が `UNABLE_TO_VERIFY_LEAF_SIGNATURE` で失敗する場合、プロキシが証明書を差し替えている可能性があります。

- **推奨**: Node に OS の証明書ストアを使わせる（社内のルート証明書が入っている場合）。

  ```bash
  # Node 22.15 以降
  NODE_OPTIONS=--use-system-ca npm ci
  ```

- **避けること**: `npm config set strict-ssl false` は、証明書の検証自体をやめるため使わない。

### 1.4 GitHub Pages と同じ条件でローカル確認

```bash
BASE_PATH=/periodic-table npm run build   # out/ を /periodic-table/ 用に生成
# out/ を /periodic-table/ の下で配信するサーバーで確認する
```

- Windows の Git Bash では、`/periodic-table` が Windows のパスに自動変換されてビルドが失敗する。その場合は `MSYS_NO_PATHCONV=1` を付ける。
- `out/` はビルドのたびに作り直される。Git の管理対象外（`.gitignore`）。

## 2. ビルドの仕組み

`next.config.ts` の設定:

| 設定 | 内容 |
|---|---|
| `output: "export"` | 静的ファイルを書き出す（サーバー処理なし） |
| `basePath` / `assetPrefix` | 環境変数 `BASE_PATH` があれば適用。なければルート配信 |
| `images.unoptimized: true` | 画像の最適化にはサーバーが必要なため無効化 |
| `trailingSlash: true` | 各ページを `…/index.html` の形式で出力 |

## 3. GitHub Pages への公開

### 3.1 ワークフロー（`.github/workflows/deploy.yml`）
`master` ブランチへのプッシュ、または手動実行（workflow_dispatch）で動作します。

| ジョブ | 内容 |
|---|---|
| build | チェックアウト → Node 22 → `npm ci` → `npm run lint` → `npm run build`（`BASE_PATH=/<リポジトリ名>`）→ Pages 設定 → `out/` をアーティファクト化 |
| deploy | アーティファクトを GitHub Pages に公開（環境 `github-pages`） |

- 同時に動くのは 1 つだけ（新しいプッシュで、古い実行を取り消す）。
- 権限は `contents: read`、`pages: write`、`id-token: write` のみ。
- 使用するアクションのバージョン: `checkout@v4`、`setup-node@v4`、`configure-pages@v5`、`upload-pages-artifact@v3`、`deploy-pages@v4`。

### 3.2 初回の設定（リポジトリ管理者が 1 回だけ行う）

> **現状**: この設定が未了のため、最初の実行は `configure-pages` で失敗しました（ビルドと lint までは成功）。設定後に再実行すれば公開されます。

1. GitHub のリポジトリ画面で **Settings → Pages** を開く。
2. **Build and deployment → Source** を **GitHub Actions** にする。
3. **Actions** タブで、失敗した実行の **Re-run all jobs**、または「Deploy to GitHub Pages」を **Run workflow**（手動実行）で再実行する。
4. 成功すると、`https://hyemi-kang.github.io/periodic-table/` で公開される。

### 3.3 公開後の確認項目
- トップページに周期表が表示される。
- 元素をクリックして、モーダルと 3D が表示される（ブラウザの開発者ツールのコンソールにエラーがない）。
- リロードしても表示される（静的ファイルのため、リンク切れがないこと）。

### 3.4 ロールバック
問題のあるコミットを `git revert` して `master` にプッシュすると、再度ビルド・公開される。

## 4. 運用上の注意

| 項目 | 内容 |
|---|---|
| 秘密情報 | 使っていない（環境変数・APIキーなし）。サーバー処理もない |
| 個人情報 | 扱わない。アクセス解析も入れていない |
| ライセンス表記 | 元素データの出典（CC BY-SA 3.0）を、画面のフッターに表示している。変更・再配布時は維持する |
| コードのライセンス | 未設定（`LICENSE` なし）。公開前に決める |
| 依存関係の脆弱性 | `npm install` 時に 7 件（中 1、高 6）の報告があった。**内容は未調査**。`npm audit` で確認し、必要に応じて更新する |
| ブラウザの警告 | `THREE.Clock` の非推奨警告は React Three Fiber の内部由来。ライブラリの更新で解消される見込み（動作への影響は確認していない） |
| 開発モードのバッジ | 画面左下の「N」は `npm run dev` のときだけ表示される。本番ビルドでは出ない |

## 5. 保守の手引き

| やりたいこと | 場所 |
|---|---|
| 元素データを直す | `data/elements.json`（出典のライセンスに注意） |
| 元素の色・質感を調整する | `lib/materials.ts`（`SOLID_COLORS`、`OVERRIDES`） |
| 結晶・分子の構造を追加する | `lib/structures.ts`（元素の一覧と、`ALLOTROPES`） |
| 状態の判定、温度範囲、圧力の扱いを変える | `lib/phase.ts`、`lib/physics.ts`（式は [04](04_physics_model.md) 参照） |
| 状態変化の演出を変える | `components/three/PhaseParticles.tsx`、`phaseAnim.ts`（`TRANSITION_SECONDS`） |
| モーダルの開閉を変える | `components/detail/ElementModal.tsx` |

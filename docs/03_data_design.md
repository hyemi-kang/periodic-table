# 03. データ設計書

| 項目 | 内容 |
|---|---|
| 版 | 1.0（2026-10-08） |
| 注意 | 個人情報は扱いません。データはすべて公開された化学データです |

## 1. データの全体像

| データ | 場所 | 種類 | 更新 |
|---|---|---|---|
| 元素データ | `data/elements.json` | 静的 JSON（118 件） | ビルド時に取り込み。実行時の通信なし |
| 派生データ | `lib/*.ts` | 計算で得る値（相のモデル、質感、構造） | 実行時に計算 |

データベース、API、ブラウザへの保存（localStorage など）は**使っていません**。

## 2. 元素データ（`data/elements.json`）

出典の `PeriodicTableJSON.json`（Periodic-Table-JSON、Bowserinator）から、必要な項目だけを残して整形しました。要約（`summary`）は先頭の 1〜2 文に短縮しています。

| 項目 | 型 | 内容 | 欠損 |
|---|---|---|---|
| `name` | 文字列 | 英語名 | なし |
| `symbol` | 文字列 | 元素記号 | なし |
| `number` | 数値 | 原子番号（1〜118） | なし |
| `mass` | 数値 | 原子量（u） | なし |
| `category` | 文字列 | 出典のカテゴリ（14 種類） | なし |
| `xpos`、`ypos` | 数値 | 周期表のグリッド位置（1〜18、1〜10） | なし |
| `period`、`group` | 数値 | 周期、族 | なし |
| `melt`、`boil` | 数値 / null | 融点、沸点（K、1 atm） | あり（下記） |
| `density` | 数値 / null | 密度（g/cm³、気体は常温常圧の値） | 4 元素で欠損 |
| `phase` | 文字列 | 標準状態での状態（Solid / Liquid / Gas） | なし |
| `config` | 文字列 | 電子配置 | なし |
| `shells` | 数値の配列 | 電子殻ごとの電子数 | なし |
| `appearance` | 文字列 / null | 外観の説明 | 32 元素で欠損 |
| `electronegativity` | 数値 / null | 電気陰性度（Pauling） | 18 元素で欠損 |
| `color` | 文字列 / null | CPK 色（# なしの 16 進数） | 9 元素で欠損 |
| `summary` | 文字列 | 要約（英語） | なし |

### 2.1 欠損・特殊なデータ

出典データには、次のような欠損や不整合があり、コードで扱いを決めています（詳細は [04 物理モデル仕様書](04_physics_model.md)）。

| 元素 | 状況 | 扱い |
|---|---|---|
| C（炭素）、As（ヒ素） | 沸点なし。出典の融点は加圧下の値 | 1 atm では昇華する元素として扱う（C: 3915 K、As: 887 K） |
| P（リン） | 沸点なし | 553 K（白リンの値）を補う |
| He（ヘリウム） | 融点は加圧下の値 | 1 atm では固体にならない元素として扱う |
| Fm、Md、No、Lr | 沸点なし | 固体と液体だけを表示 |
| Og | 融点なし、沸点は予測値。出典の状態は「Solid」 | 沸点未満は固体（予測）、それ以上は気体 |
| Db、Sg、Bh、Hs、Mt、Ds、Rg | 融点・沸点とも なし | 出典の状態だけを表示（固体） |
| 原子番号 104 以上 | 物理定数は理論計算 | 画面に † を付け、理論予測値であると注記 |

### 2.2 カテゴリの正規化

出典の 14 種類のカテゴリを、画面用の 10 種類にまとめています（`lib/elements.ts` の `categoryOf`）。

| 画面のカテゴリ | 出典のカテゴリ |
|---|---|
| Alkali metal | alkali metal |
| Alkaline earth | alkaline earth metal |
| Transition metal | transition metal |
| Post-transition | post-transition metal |
| Metalloid | metalloid |
| Nonmetal | diatomic nonmetal、polyatomic nonmetal |
| Noble gas | noble gas |
| Lanthanide | lanthanide |
| Actinide | actinide |
| Unknown | "unknown, …" で始まる 4 種類 |

## 3. 派生データ

| データ | 定義場所 | 内容 |
|---|---|---|
| 相のモデル（`PhaseModel`） | `lib/phase.ts` | 温度帯ごとの状態、使える状態、注記、温度スライダーの上限 `tMax`。圧力ごとに作り直す |
| 質感（`MaterialSpec`） | `lib/materials.ts` | 固体の形、固体・液体の表面（色・金属度・粗さ・透過）、気体の色、発光の有無 |
| 構造（`Structure`） | `lib/structures.ts` | 原子の座標と半径、結合（次数つき）、単位格子の線、結晶かどうか（`lattice`） |

### 3.1 質感の決まり方（`materialFor`）
1. カテゴリごとの既定値から始める。
2. 70 元素について、実際の外観に近い固体の色の表（`SOLID_COLORS`）で色を上書きする。表にない元素（希ガス、多くの非金属、超重元素など）はカテゴリの既定色のまま。
3. 液体の金属色は、固体色を白に 20% 寄せる。
4. 気体の色は、個別の指定がなければ CPK 色を白に 25% 寄せる。
5. 42 元素の手作業の調整（`OVERRIDES`。形、気体の発光色、液体の色など）を最後に重ねる。
6. 粗さに、原子番号から決まる小さな個体差を加える。

> 色と質感は、実物の外観に近づけた**表現**であり、測定値ではありません。

### 3.2 構造データの対象

| 種類 | 元素 |
|---|---|
| BCC | Li、Na、K、Rb、Cs、Ba、V、Cr、Fe、Nb、Mo、Ta、W、Eu、Ra |
| FCC | Ca、Sr、Al、Ni、Cu、Rh、Pd、Ag、Ir、Pt、Au、Pb、Ac、Th、Yb |
| HCP | Be、Mg、Sc、Ti、Co、Zn、Y、Zr、Tc、Ru、Cd、Hf、Re、Os、Tl、Gd、Tb、Dy、Ho、Er、Tm、Lu |
| ダイヤモンド型 | Si、Ge。C はダイヤモンドとグラファイトの 2 種類 |
| 分子 | H₂、N₂、O₂、F₂、Cl₂、Br₂、I₂、P₄、S₈ |
| 鎖 | Se（灰色セレン） |
| 単原子 | He、Ne、Ar、Kr、Xe、Rn |
| 構造データなし | 上記以外（B、Sn、Hg、As、Sb、Bi、Mn、Ga、In、Po、At、多くのランタノイド・アクチノイド、超重元素など） |

- Fe、Ti、Zr、Co、Ca、Sr、Be、Tl、Sc、Hf は、温度で構造が変わる元素として登録している（`ALLOTROPES`）。構造タブは標準状態（298 K）に固定のため、表示するのは 298 K の構造と、その名称（例: α-iron）。
- Sn は、298 K の構造（β-Sn、正方晶）を描いていないため、構造データなしとして扱う。
- La、Pr、Nd、Pm は二重六方最密（ABAC）で、単純な HCP とは異なるため、対象から外している。

## 4. 出典とライセンス

| 出典 | 用途 | ライセンス |
|---|---|---|
| Periodic-Table-JSON（Bowserinator） | 元素データ | CC BY-SA 3.0 |

- 画面のフッターに出典を表示しています。
- 元素データを改変・再配布する場合は、同じ条件（CC BY-SA）で公開する必要があります。
- 本リポジトリのコード自体のライセンスは、**まだ定めていません**（`LICENSE` ファイルなし）。

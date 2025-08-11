# 🏋️ HomeWorkOutApp - 筋トレ記録アプリ

このアプリは、あなたの筋トレを記録・管理する Web アプリケーションです。 在宅ワーカー向けなので LAN 内で Web サーバを立てるために作りました。
Node.js（JavaScript）で作られており、データベースには SQLite を使用しています。

## 📋 このアプリでできること

- � ユーザー管理

  - 新規登録/ログイン/ログアウト
  - セッションベースの認証（express-session、Cookie SameSite=Lax）

- �💪 日次サマリの記録・更新（Upsert）

  - 1 日単位でトレーニング結果を保存します（同日データは上書き更新）
  - 保存できる主な項目（例）:
    - dateKey: その日のキー（YYYY-MM-DD）
    - progress: 進捗メモや気づき
    - bikeDone: 有酸素（バイク）実施有無
    - strengthDone: 筋トレ実施有無
    - hiit: HIIT 実施有無
    - sets: 種目ごとのセット詳細（任意の種目名で、回数/重量などを自由に保持）
    - stretchDone: ストレッチ実施有無
    - stretchParts: 伸ばした部位のメモ
    - note: 自由記述メモ

  送受信データのイメージ:

  ```json
  {
    "dateKey": "2025-08-12",
    "date": "2025-08-12T07:30:00.000Z",
    "progress": "胸の日。重量キープ。",
    "bikeDone": true,
    "strengthDone": true,
    "stretchDone": true,
    "hiit": false,
    "sets": {
      "benchPress": [
        { "set": 1, "reps": 10, "weight": 40 },
        { "set": 2, "reps": 8, "weight": 45 },
        { "set": 3, "reps": 6, "weight": 50 }
      ],
      "fly": [{ "set": 1, "reps": 12, "weight": 10 }]
    },
    "stretchParts": ["胸", "肩"],
    "note": "フォーム意識。"
  }
  ```

- 📊 履歴の参照・検索

  - 一覧取得（新しい日付順）
  - 単日取得 / 単日削除

- �️ データ格納
  - ローカル SQLite（db.sqlite）に保存。バックアップ/持ち運びが容易
  - ユーザーごとにデータを分離（users / logs テーブル）

## 🚀 はじめ方（初心者向け）

重要: Windows での動作安定のため、Node.js は LTS（推奨: 20.x）をご利用ください。Node 22 だと better-sqlite3 のプリビルドが無く、Visual Studio Build Tools を使ったネイティブビルドが必要になり失敗するパターンもあり。（ただし成功するパターンもあり・・詳細不明)

### 必要なもの

このアプリを動かすために、以下をインストールしてください：

1. **Node.js**（推奨: LTS 20.x）

   - [Node.js 公式サイト](https://nodejs.org/)からダウンロード
   - インストール後、コマンドでバージョンを確認：

     ```powershell
     node -v
     npm -v
     ```

   - 両方ともバージョンが表示されれば OK

   nvm（Windows 用 Node バージョン管理）を使うと安全です：

   - nvm-windows のインストール（未導入の場合）

     - 公式: <https://github.com/coreybutler/nvm-windows>
     - winget 例：

       ```powershell
       winget install -e --id CoreyButler.NVMforWindows
       # 端末をいったん閉じて開き直す
       nvm install 20.17.0
       # 利用可能なnodeバージョンを確認
       nvm list
       nvm use 20.17.0
       node -v   # v20.x を確認
       ```

1. **Git**（ソースコードのダウンロード用）
   - [Git 公式サイト](https://git-scm.com/)からダウンロード

---

### ステップ 1: アプリのダウンロード

```powershell
git clone https://github.com/aktsmm/HomeWorkOutApp.git
cd HomeWorkOutApp
```

---

### ステップ 2: 必要なライブラリをインストール

```powershell
# 初回や依存関係の更新時は通常こちらを使用
npm install

# 完全にクリーンな状態から再現したい場合のみ（node_modules フォルダを削除してから）
npm ci
```

💡 **補足**:

- `npm install` は既存環境に合わせて依存関係を整えます
- `npm ci` は`package-lock.json`の内容を完全に再現しますが、既存の`node_modules`は削除されます

---

### ステップ 3: 設定ファイルを作成

```powershell
Copy-Item .env.example .env
```

必要に応じて`.env`を編集してください。

#### 初期ユーザー（デフォルトアカウント）

- 初回起動時、指定ユーザーが存在しない場合は自動作成されます。
- 既定値（デモ用）

  ```properties
  ADMIN_USER=admin
  ADMIN_PASS=password
  SESSION_SECRET=dev_secret
  ```

- 本番/共有環境では、必ず .env で上書きしてください。

  ```properties
  # 例: 強いパスワードとランダムなセッションキーに変更
  ADMIN_USER=your_name
  ADMIN_PASS=use-a-strong-password-here
  SESSION_SECRET=change-this-to-a-long-random-string

  # ポート/ホストの指定（任意）
  APP_PORT=3000
  # ローカルのみ: 127.0.0.1 / 全IF: 0.0.0.0 / IPv6: ::
  HOST=127.0.0.1
  ```

---

### ステップ 4: アプリを起動

```powershell
# 開発モード（ファイル変更で自動再起動）
npm run dev

# または通常モード
npm start
```

※ npm install / npm ci が失敗した場合は、以下の「トラブルシューティング」を参照してください。

必要に応じて（大事）:

- 直前に `git pull` した／依存関係エラー（Cannot find module など）が出る → もう一度 `npm install` を実行してから起動してください。
- Node のバージョンを切り替えた（nvm など）場合も、再度 `npm install` が必要になることがあります。

#### 開発モード（dev）と通常モード（start）の違い

- npm run dev
  - 実体: `node --watch Server.js`
  - ファイル変更を検知して自動再起動します。開発中の素早い反映に最適。
  - 再起動時はセッションが切れる場合があるため、ログインし直しが必要になることがあります。
- npm start
  - 実体: `node Server.js`
  - 自動再起動なし。運用/検証やサービスとしての起動に向きます（PM2 やサービス化と併用する想定）。
- 機能差はありません。用途（開発か運用か）で使い分けてください。

---

### ステップ 5: ブラウザでアクセス

- アドレスバーに以下を入力してアクセス：

  ```text
  http://localhost:3000
  ```

- `0.0.0.0` ではアクセスできません（Windows では無効アドレス扱いになります）

---

## ⚠️ Windows ユーザー向け注意点

- `npm install` 実行時に Visual Studio Build Tools のメッセージが出る場合がありますが、このアプリは C++ ネイティブモジュールを利用していないため無視して構いません
- SQLite はクロスプラットフォーム対応なので、Windows/Mac/Linux すべてで動作します

ただし better-sqlite3 はネイティブアドオンのため、Node 22 などプリビルドが提供されていないバージョンではビルド環境（C++ ツールセットと Windows SDK）が必要です。簡単に動かすには Node 20 LTS をおすすめします。

## 🧰 トラブルシューティング

### 症状: npm ci/npm install で better-sqlite3 のビルドに失敗する

例:

```text
prebuild-install warn install No prebuilt binaries found (target=22.x runtime=node ... platform=win32)
gyp ERR! find VS You need to install the latest version of Visual Studio including the "Desktop development with C++" workload.
```

原因:

- Node 22 など、better-sqlite3 のプリビルドが未提供な Node 版を使っている
- そのため node-gyp がローカルビルドを試みるが、Windows SDK などが不足して失敗

解決策（推奨の順）:

1. Node を LTS 20.x に切り替える（最短）

```powershell
# nvm-windows が入っている前提
nvm install 20.17.0
nvm use 20.17.0
node -v
npm ci   # もしくは npm install
```

1. Node 22 を使い続ける場合（上級者向け）

- Visual Studio 2022 Build Tools を導入し、「C++ によるデスクトップ開発」ワークロードと Windows 10/11 SDK を追加
- 参考: [node-gyp（Windows）手順](https://github.com/nodejs/node-gyp#on-windows)
- その後、必要に応じて次を実行

  ```powershell
  npm config set msvs_version 2022
  npm ci   # もしくは npm install
  ```

インストールに失敗した直後に `npm run dev` を実行すると、`Cannot find package 'express'` のようなエラーになります。先に依存関係のインストールを成功させてから起動してください。

---

## 📁 プロジェクト構成

```text
HomeWorkOutApp/
├── Server.js          # メインのサーバーファイル
├── package.json       # プロジェクトの設定とライブラリ一覧
├── .env.example       # 設定ファイルのテンプレート
├── .env               # 実際の設定ファイル（作成後）
├── public/            # Webページの画面部分
│   ├── index.html     # メインページ
│   ├── login.html     # ログインページ
│   ├── stylesheets/   # デザイン（CSS）
│   └── javascripts/   # 画面の動作（JavaScript）
├── routes/            # サーバーの処理ロジック
└── views/             # ページテンプレート
```

## 🛠️ 開発者向け情報

- **フレームワーク**: Express.js
- **データベース**: SQLite (better-sqlite3)
- **認証**: express-session + bcrypt
- **フロントエンド**: HTML + CSS + JavaScript

## ✅ 動作確認環境

- 最終確認日: 2025-08-12
- OS: Windows 11 24H2（Build 26100）
- Shell: PowerShell 7.5.2
- Node.js: 20.x LTS（nvm-windows で切替）
- npm: 10.x
- 主要ライブラリ（抜粋）:
  - express 4.19.x
  - express-session 1.17.x
  - better-sqlite3 9.4.x
  - sqlite3 5.1.x
  - bcrypt 5.1.x
- ブラウザ: Microsoft Edge / Google Chrome（最新版）

### 備考

- Node 22.x では better-sqlite3 のプリビルドが提供されないケースがあり、Visual Studio Build Tools と Windows SDK が必要になる場合があります。簡単に動かすには Node 20 LTS を推奨します。

## 📄 ライセンス

このプロジェクトは MIT ライセンスで公開されています。詳細は`LICENSE`ファイルをご確認ください。

## 🤝 サポート

問題や質問がある場合は、GitHub の Issues ページでお気軽にお聞かせください！

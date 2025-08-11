# 🏋️ HomeWorkOutApp - 筋力トレーニング記録アプリ

このアプリは、あなたの筋力トレーニングを記録・管理する Web アプリケーションです。 在宅ワーカー向けなので LAN 内で Web サーバを立てるために作りました。
Node.js（JavaScript）で作られており、データベースには SQLite を使用しています。

## 📋 このアプリでできること

- 💪 筋力トレーニングの記録（種目、セット数、回数、重量など）
- 📊 過去のトレーニング履歴の確認
- 🔐 ユーザー認証機能（ログイン・ログアウト）
- 📈 トレーニングの進捗管理

## 🚀 はじめ方（初心者向け）

### 必要なもの

このアプリを動かすために、以下をインストールしてください：

1. **Node.js**（バージョン 18 以上推奨）

   - [Node.js 公式サイト](https://nodejs.org/)からダウンロード
   - インストール後、コマンドでバージョンを確認：
     ```powershell
     node -v
     npm -v
     ```
   - 両方ともバージョンが表示されれば OK

2. **Git**（ソースコードのダウンロード用）
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

---

### ステップ 4: アプリを起動

```powershell
# 開発モード（ファイル変更で自動再起動）
npm run dev

# または通常モード
npm start
```

---

### ステップ 5: ブラウザでアクセス

- アドレスバーに以下を入力してアクセス：
  ```
  http://localhost:3000
  ```
- `0.0.0.0` ではアクセスできません（Windows では無効アドレス扱いになります）

---

## ⚠️ Windows ユーザー向け注意点

- `npm install` 実行時に Visual Studio Build Tools のメッセージが出る場合がありますが、このアプリは C++ ネイティブモジュールを利用していないため無視して構いません
- SQLite はクロスプラットフォーム対応なので、Windows/Mac/Linux すべてで動作します

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

## 📄 ライセンス

このプロジェクトは MIT ライセンスで公開されています。詳細は`LICENSE`ファイルをご確認ください。

## 🤝 サポート

問題や質問がある場合は、GitHub の Issues ページでお気軽にお聞かせください！

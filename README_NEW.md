# 🏋️‍♂️ HomeWorkOutApp

モダンなワークアウト追跡アプリ。日々のエクササイズ記録、進捗管理、ログ保存機能を提供します。

## 🚀 特徴

- **ユーザー認証**: 安全なログイン・新規登録システム
- **進捗追跡**: リアルタイムでワークアウトの進捗を可視化
- **日次ログ**: 毎日の運動記録を保存・管理
- **CSV エクスポート**: データの外部活用が可能
- **レスポンシブデザイン**: モバイル・デスクトップ対応
- **リアルタイムタイマー**: エクササイズタイマー機能

## 🛠️ 技術スタック

- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Frontend**: バニラ JavaScript + モダン CSS
- **Authentication**: bcrypt + express-session
- **Module System**: ES Modules

## 📋 必要条件

- Node.js 18.x 以上
- npm または yarn

## 🔧 インストール・起動

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-username/HomeWorkOutApp.git
cd HomeWorkOutApp
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境設定（オプション）

```bash
cp .env.example .env
# .envファイルを編集して設定をカスタマイズ
```

### 4. サーバー起動

#### 開発モード（自動再起動）

```bash
npm run dev
```

#### 本番モード

```bash
npm start
```

## 🌐 アクセス

サーバー起動後、以下の URL でアクセス可能：

- http://localhost:3000

初期ユーザー:

- **ユーザー ID**: `yamapan`
- **パスワード**: `password123`

## 🗂️ プロジェクト構造

```
HomeWorkOutApp/
├── Server.js              # メインサーバーファイル
├── package.json           # npm設定
├── .env.example          # 環境変数のサンプル
├── README.md             # このファイル
├── public/               # 静的ファイル
│   ├── index.html        # メインページ
│   └── login.html        # ログインページ
└── db.sqlite            # SQLiteデータベース（自動生成）
```

## 🔐 セキュリティ

- パスワードは bcrypt でハッシュ化
- セッション管理による認証
- SQL インジェクション対策済み
- CSRF 対策（Same-Site Cookies）

## 📊 API エンドポイント

### 認証

- `POST /api/register` - 新規ユーザー登録
- `POST /api/login` - ログイン
- `POST /api/logout` - ログアウト
- `GET /api/me` - 現在のユーザー情報

### ログ管理

- `POST /api/logs/upsert` - ログの保存・更新
- `GET /api/logs` - ログ一覧取得
- `GET /api/logs/:dateKey` - 特定日のログ取得
- `DELETE /api/logs/:dateKey` - 特定日のログ削除
- `GET /api/logs/export` - CSV エクスポート

## 🚀 本番環境での運用

### 環境変数設定

```bash
# .env ファイル
APP_PORT=3000
HOST=0.0.0.0
SESSION_SECRET=your_very_secure_random_string_here
ADMIN_USER=your_admin_username
ADMIN_PASS=your_secure_password
```

### プロセス管理

PM2 を使用した運用例：

```bash
npm install -g pm2
pm2 start Server.js --name "workout-app"
pm2 startup
pm2 save
```

## 🛠️ 開発・カスタマイズ

### データベーススキーマ

#### users テーブル

- `id`: ユーザー ID（自動採番）
- `username`: ユーザー名（ユニーク）
- `passhash`: パスワードハッシュ
- `created_at`: 作成日時

#### logs テーブル

- `id`: ログ ID（自動採番）
- `username`: ユーザー名
- `dateKey`: 日付キー（YYYY-MM-DD）
- `dateIso`: ISO 形式日時
- `payload`: JSON 形式ログデータ
- `created_at`: 作成日時
- `updated_at`: 更新日時

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🐛 バグ報告・機能要望

GitHub の Issues ページでお知らせください。

---

**Happy Coding! 💪**

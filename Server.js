import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import Database from "better-sqlite3";

// === 環境設定 ===
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.APP_PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret_bootcamp_2024";
const HOST = process.env.HOST; // オプショナル

// デフォルトユーザー設定
const ADMIN_USER = process.env.ADMIN_USER || "yamapan";
const ADMIN_PASS = process.env.ADMIN_PASS || "yamapan2";

// === データベース設定 ===
const dbPath = path.join(__dirname, "db.sqlite");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    passhash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    dateKey TEXT NOT NULL,
    dateIso TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username, dateKey)
  );
`);

// 既存テーブルにupdated_atカラムを追加（存在しない場合のみ）
try {
  db.exec(
    `ALTER TABLE logs ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`
  );
  console.log(`[DB] updated_atカラムを追加しました`);
} catch (error) {
  // カラムが既に存在する場合は無視
  if (!error.message.includes("duplicate column name")) {
    console.error("[DB] テーブル更新エラー:", error.message);
  }
}

console.log(`[DB] データベース初期化完了: ${dbPath}`);

// === 初期ユーザー作成 ===
async function createInitialUser() {
  const userRow = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(ADMIN_USER);
  if (!userRow) {
    const passhash = await bcrypt.hash(ADMIN_PASS, 12);
    db.prepare("INSERT INTO users(username, passhash) VALUES (?, ?)").run(
      ADMIN_USER,
      passhash
    );
    console.log(`[INIT] 初期ユーザー "${ADMIN_USER}" を作成しました`);
  }
}

await createInitialUser();

// === ユーティリティ関数 ===
function saveDailyLog(username, action, details = {}) {
  const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dateIso = new Date().toISOString();
  const payload = JSON.stringify({
    dateKey,
    date: dateIso,
    action,
    details,
  });

  try {
    // updated_atカラムの存在を確認
    const tableInfo = db.prepare("PRAGMA table_info(logs)").all();
    const hasUpdatedAt = tableInfo.some((col) => col.name === "updated_at");

    if (hasUpdatedAt) {
      db.prepare(
        `
        INSERT INTO logs(username, dateKey, dateIso, payload)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username, dateKey) DO UPDATE SET
          dateIso = excluded.dateIso,
          payload = excluded.payload,
          updated_at = CURRENT_TIMESTAMP
      `
      ).run(username, dateKey, dateIso, payload);
    } else {
      db.prepare(
        `
        INSERT INTO logs(username, dateKey, dateIso, payload)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username, dateKey) DO UPDATE SET
          dateIso = excluded.dateIso,
          payload = excluded.payload
      `
      ).run(username, dateKey, dateIso, payload);
    }
  } catch (error) {
    console.error(`[LOG_ERROR] ${username}のログ保存に失敗:`, error);
  }
}

// === ミドルウェア設定 ===
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    name: "bootcamp.session",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // 本番環境ではtrueに設定
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 24時間
    },
  })
);

// 認証確認ミドルウェア
function requireAuth(req, res, next) {
  if (req.session?.user) {
    return next();
  }
  return res.status(401).json({ error: "認証が必要です" });
}

// リクエストログ（開発用）
app.use((req, res, next) => {
  if (req.url !== "/favicon.ico") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// === 認証API ===

// 新規ユーザー登録
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const uname = typeof username === "string" ? username.trim() : "";

    // バリデーション
    if (!uname || !password) {
      return res.status(400).json({
        error: "ユーザーIDとパスワードを入力してください",
      });
    }

    if (uname.length < 3) {
      return res.status(400).json({
        error: "ユーザーIDは3文字以上で入力してください",
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        error: "パスワードは4文字以上で入力してください",
      });
    }

    // ユーザー名重複チェック
    const existingUser = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(uname);
    if (existingUser) {
      return res.status(409).json({
        error: "このユーザーIDは既に使用されています",
      });
    }

    // ユーザー作成
    const passhash = await bcrypt.hash(password, 12);
    db.prepare("INSERT INTO users(username, passhash) VALUES (?, ?)").run(
      uname,
      passhash
    );

    // 自動ログイン
    req.session.user = { name: uname };
    await new Promise((resolve) => req.session.save(resolve));

    // ログ記録
    saveDailyLog(uname, "register", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    console.log(`[REGISTER] 新規ユーザー登録: "${uname}"`);
    res.json({ ok: true, user: uname });
  } catch (error) {
    console.error("[REGISTER] 登録エラー:", error);
    res.status(500).json({ error: "登録処理中にエラーが発生しました" });
  }
});

// ログイン
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const uname = typeof username === "string" ? username.trim() : "";

    if (!uname || !password) {
      return res.status(400).json({
        error: "ユーザーIDとパスワードを入力してください",
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(uname);
    if (!user) {
      return res.status(401).json({
        error: "ユーザーIDまたはパスワードが正しくありません",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passhash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "ユーザーIDまたはパスワードが正しくありません",
      });
    }

    req.session.user = { name: uname };

    // ログ記録
    saveDailyLog(uname, "login", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    console.log(`[LOGIN] ログイン成功: "${uname}"`);
    res.json({ ok: true, user: uname });
  } catch (error) {
    console.error("[LOGIN] ログインエラー:", error);
    res.status(500).json({ error: "ログイン処理中にエラーが発生しました" });
  }
});

// ログアウト
app.post("/api/logout", (req, res) => {
  const username = req.session?.user?.name;

  req.session.destroy((err) => {
    if (err) {
      console.error("[LOGOUT] セッション削除エラー:", err);
      return res
        .status(500)
        .json({ error: "ログアウト処理中にエラーが発生しました" });
    }

    if (username) {
      console.log(`[LOGOUT] ログアウト: "${username}"`);
    }
    res.json({ ok: true });
  });
});

// 現在のユーザー情報取得
app.get("/api/me", (req, res) => {
  res.json({ user: req.session?.user?.name || null });
});

// === ログAPI ===

// ログエントリの保存・更新
app.post("/api/logs/upsert", requireAuth, (req, res) => {
  try {
    const username = req.session.user.name;
    const entry = req.body || {};

    if (!entry.dateKey) {
      return res.status(400).json({ error: "dateKey が必要です" });
    }

    // progress値が未定義なら0で補完
    if (typeof entry.progress === "undefined") {
      entry.progress = 0;
    }

    const payload = JSON.stringify(entry);
    const dateIso = entry.date || new Date().toISOString();

    // updated_atカラムの存在を確認
    const tableInfo = db.prepare("PRAGMA table_info(logs)").all();
    const hasUpdatedAt = tableInfo.some((col) => col.name === "updated_at");

    if (hasUpdatedAt) {
      db.prepare(
        `
        INSERT INTO logs(username, dateKey, dateIso, payload)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username, dateKey) DO UPDATE SET
          dateIso = excluded.dateIso,
          payload = excluded.payload,
          updated_at = CURRENT_TIMESTAMP
      `
      ).run(username, entry.dateKey, dateIso, payload);
    } else {
      db.prepare(
        `
        INSERT INTO logs(username, dateKey, dateIso, payload)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username, dateKey) DO UPDATE SET
          dateIso = excluded.dateIso,
          payload = excluded.payload
      `
      ).run(username, entry.dateKey, dateIso, payload);
    }

    console.log(
      `[UPSERT] ${username}: ${entry.dateKey} (進捗: ${entry.progress}%)`
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("[UPSERT] エラー:", error);
    res.status(500).json({ error: "ログの保存に失敗しました" });
  }
});

// ログ一覧取得（新しい順）
app.get("/api/logs", requireAuth, (req, res) => {
  try {
    const username = req.session.user.name;
    const rows = db
      .prepare(
        `
      SELECT payload FROM logs 
      WHERE username = ? 
      ORDER BY dateKey DESC
    `
      )
      .all(username);

    // progress値が必ず含まれるように補完
    const logs = rows.map((row) => {
      const obj = JSON.parse(row.payload);
      if (typeof obj.progress === "undefined") {
        obj.progress = 0;
      }
      return obj;
    });

    res.json(logs);
  } catch (error) {
    console.error("[LOGS] 取得エラー:", error);
    res.status(500).json({ error: "ログの取得に失敗しました" });
  }
});

// 特定日のログ取得
app.get("/api/logs/:dateKey", requireAuth, (req, res) => {
  try {
    const username = req.session.user.name;
    const row = db
      .prepare(
        `
      SELECT payload FROM logs 
      WHERE username = ? AND dateKey = ?
    `
      )
      .get(username, req.params.dateKey);

    if (!row) {
      return res
        .status(404)
        .json({ error: "指定された日付のログが見つかりません" });
    }

    const log = JSON.parse(row.payload);
    if (typeof log.progress === "undefined") {
      log.progress = 0;
    }

    res.json(log);
  } catch (error) {
    console.error("[LOG] 単日取得エラー:", error);
    res.status(500).json({ error: "ログの取得に失敗しました" });
  }
});

// 特定日のログ削除
app.delete("/api/logs/:dateKey", requireAuth, (req, res) => {
  try {
    const username = req.session.user.name;
    const result = db
      .prepare(
        `
      DELETE FROM logs 
      WHERE username = ? AND dateKey = ?
    `
      )
      .run(username, req.params.dateKey);

    if (result.changes === 0) {
      return res.status(404).json({ error: "削除対象のログが見つかりません" });
    }

    console.log(`[DELETE] ${username}: ${req.params.dateKey} を削除`);
    res.json({ ok: true });
  } catch (error) {
    console.error("[DELETE] 削除エラー:", error);
    res.status(500).json({ error: "ログの削除に失敗しました" });
  }
});

// CSVエクスポート
app.get("/api/logs/export", requireAuth, (req, res) => {
  try {
    const username = req.session.user.name;
    const rows = db
      .prepare(
        `
      SELECT dateKey, dateIso, payload 
      FROM logs 
      WHERE username = ? 
      ORDER BY dateKey DESC
    `
      )
      .all(username);

    // CSVヘッダー
    let csv = "日付,記録日時,進捗率,アクション,詳細\n";

    for (const row of rows) {
      const payload = JSON.parse(row.payload);
      const progress = payload.progress || 0;
      const action = payload.action || "workout";
      const details = JSON.stringify(payload.details || {}).replace(/"/g, '""');

      csv += `"${row.dateKey}","${row.dateIso}","${progress}%","${action}","${details}"\n`;
    }

    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header(
      "Content-Disposition",
      `attachment; filename="workout_logs_${username}.csv"`
    );
    res.send("\uFEFF" + csv); // BOM付きUTF-8

    console.log(`[EXPORT] ${username}: CSVエクスポート実行`);
  } catch (error) {
    console.error("[EXPORT] CSVエクスポートエラー:", error);
    res.status(500).json({ error: "CSVエクスポートに失敗しました" });
  }
});

// === 静的ファイル・ルーティング ===

// ログインページ
app.get("/login", (req, res) => {
  if (req.session?.user) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// メインページ（認証必須）
app.get("/", (req, res) => {
  if (!req.session?.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 静的ファイル配信
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1d", // キャッシュ1日
    etag: true,
  })
);

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({ error: "ページが見つかりません" });
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ error: "サーバーエラーが発生しました" });
});

// バインド先ホストを環境変数から設定（未設定なら Node のデフォルト動作）
// 例:
// -> ローカルのみ HOST=127.0.0.1
// -> 全インターフェイス HOST=0.0.0.0

// ---- 起動時のアクセス先を分かりやすく出力するヘルパー ----
function formatUrl(address, port, family) {
  // IPv6 アドレスは URL 内で [] で囲む必要がある
  const host = family === "IPv6" ? `[${address}]` : address;
  return `http://${host}:${port}`;
}

// === サーバー起動 ===

function logAccessHints(server, port) {
  const addr = server.address();

  if (typeof addr === "string") {
    console.log(`[SERVER] パイプで起動: ${addr}`);
    return;
  }

  console.log(
    `[SERVER] ${addr.address}:${addr.port} (${addr.family}) で起動中`
  );
  console.log(
    `[SERVER] メインURL: ${formatUrl(addr.address, addr.port, addr.family)}`
  );

  // ローカルネットワークアドレスを取得して表示
  const ifaces = os.networkInterfaces();
  const accessUrls = [];

  for (const [name, addresses] of Object.entries(ifaces)) {
    for (const addr of addresses || []) {
      if (!addr.internal) {
        if (addr.family === "IPv4") {
          accessUrls.push(`  - ${name}: http://${addr.address}:${port}`);
        } else if (addr.family === "IPv6") {
          accessUrls.push(`  - ${name}: http://[${addr.address}]:${port}`);
        }
      }
    }
  }

  console.log("[ACCESS] 利用可能なURL:");
  console.log(`  - ローカル: http://localhost:${port}`);
  console.log(`  - ループバック: http://127.0.0.1:${port}`);

  if (accessUrls.length > 0) {
    console.log("  - ネットワーク:");
    accessUrls.forEach((url) => console.log(url));
  }

  console.log(`[INFO] 初期ユーザー: ${ADMIN_USER} / ${ADMIN_PASS}`);
}

// グレースフルシャットダウン
process.on("SIGINT", () => {
  console.log("\n[SHUTDOWN] サーバーを停止しています...");

  // データベースを閉じる
  try {
    db.close();
    console.log("[SHUTDOWN] データベース接続を閉じました");
  } catch (error) {
    console.error("[SHUTDOWN] データベース切断エラー:", error);
  }

  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[SHUTDOWN] SIGTERM受信、サーバーを停止しています...");
  db.close();
  process.exit(0);
});

// サーバー起動
let server;
if (HOST) {
  server = app.listen(PORT, HOST, () => {
    logAccessHints(server, PORT);
  });
} else {
  server = app.listen(PORT, () => {
    logAccessHints(server, PORT);
  });
}

export default app;

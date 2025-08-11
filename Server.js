import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import bcrypt from "bcrypt"; // ここでは平文比較でもOKだが将来拡張用に
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.APP_PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "password"; // デモ用

// ---- DB 準備（SQLite）----
const db = new Database(path.join(__dirname, "db.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  passhash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  dateKey TEXT NOT NULL,                -- 'YYYY-MM-DD'
  dateIso  TEXT NOT NULL,               -- ISOタイムスタンプ
  payload  TEXT NOT NULL,               -- JSON（一日のサマリ）
  UNIQUE(username, dateKey)
);
`);

// 初回ユーザー（存在しなければ作成）
const userRow = db
  .prepare("SELECT * FROM users WHERE username=?")
  .get(ADMIN_USER);
if (!userRow) {
  const passhash = await bcrypt.hash(ADMIN_PASS, 10);
  db.prepare("INSERT INTO users(username, passhash) VALUES (?,?)").run(
    ADMIN_USER,
    passhash
  );
  console.log(`[INIT] Created user "${ADMIN_USER}"`);
}

// ---- Middlewares ----
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    name: "bootcamp.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 12,
    },
  })
);

// 認証チェック
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// ---- Auth API ----
// 新規ユーザー登録
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res
      .status(400)
      .json({ error: "ユーザーIDとパスワードを入力してください" });

  if (password.length < 4)
    return res
      .status(400)
      .json({ error: "パスワードは4文字以上で入力してください" });

  // ユーザー名の重複チェック
  const existingUser = db
    .prepare("SELECT * FROM users WHERE username=?")
    .get(username);
  if (existingUser)
    return res
      .status(409)
      .json({ error: "このユーザーIDは既に使用されています" });

  try {
    const passhash = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO users(username, passhash) VALUES (?,?)").run(
      username,
      passhash
    );

    // 登録後、自動ログイン
    req.session.user = { name: username };
    res.json({ ok: true, user: username });
    console.log(`[REGISTER] New user created: "${username}"`);
  } catch (error) {
    console.error("[REGISTER] Error:", error);
    res.status(500).json({ error: "登録に失敗しました" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res
      .status(400)
      .json({ error: "ユーザーIDとパスワードを入力してください" });

  const row = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (!row)
    return res
      .status(401)
      .json({ error: "ユーザーIDまたはパスワードが正しくありません" });

  const ok = await bcrypt.compare(password, row.passhash);
  if (!ok)
    return res
      .status(401)
      .json({ error: "ユーザーIDまたはパスワードが正しくありません" });

  req.session.user = { name: username };
  res.json({ ok: true, user: username });
  console.log(`[LOGIN] User logged in: "${username}"`);
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  res.json({ user: req.session?.user?.name || null });
});

// ---- Logs API (日次サマリを保存) ----
// Upsert: 同じ dateKey は上書き
app.post("/api/logs/upsert", requireAuth, (req, res) => {
  const username = req.session.user.name;
  const entry = req.body || {};
  // { dateKey, date, progress, bikeDone, strengthDone, stretchDone, hiit, sets:{...}, stretchParts, note }
  if (!entry.dateKey)
    return res.status(400).json({ error: "dateKey is required" });

  const payload = JSON.stringify(entry);
  const dateIso = entry.date || new Date().toISOString();

  db.prepare(
    `
    INSERT INTO logs(username, dateKey, dateIso, payload)
    VALUES (@username, @dateKey, @dateIso, @payload)
    ON CONFLICT(username, dateKey) DO UPDATE SET
      dateIso=excluded.dateIso,
      payload=excluded.payload
  `
  ).run({ username, dateKey: entry.dateKey, dateIso, payload });

  res.json({ ok: true });
});

// 一覧（新しい順）
app.get("/api/logs", requireAuth, (req, res) => {
  const username = req.session.user.name;
  const rows = db
    .prepare("SELECT payload FROM logs WHERE username=? ORDER BY dateKey DESC")
    .all(username);
  const list = rows.map((r) => JSON.parse(r.payload));
  res.json(list);
});

// 単日取得
app.get("/api/logs/:dateKey", requireAuth, (req, res) => {
  const username = req.session.user.name;
  const row = db
    .prepare("SELECT payload FROM logs WHERE username=? AND dateKey=?")
    .get(username, req.params.dateKey);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(JSON.parse(row.payload));
});

// 単日削除
app.delete("/api/logs/:dateKey", requireAuth, (req, res) => {
  const username = req.session.user.name;
  db.prepare("DELETE FROM logs WHERE username=? AND dateKey=?").run(
    username,
    req.params.dateKey
  );
  res.json({ ok: true });
});

// ---- Static (フロント) ----
// ログインページのルーティング
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// メインページは認証が必要
app.get("/", (req, res) => {
  if (!req.session?.user) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.static(path.join(__dirname, "public")));

// バインド先ホストを環境変数から切り替え可能にする（未設定なら Node のデフォルト動作に従う）
// 例:
//   HOST=127.0.0.1 -> ローカルのみ
//   HOST=0.0.0.0   -> 全インターフェイス（他端末/コンテナからの接続可）
//   HOST=::        -> IPv6 未指定（環境により挙動が異なるため注意）
const HOST = process.env.HOST; // 未設定(undefined)なら host 省略で listen

// 実バインド情報をログするため、server を受け取る
let server;
if (HOST) {
  // ホスト指定あり
  server = app.listen(PORT, HOST, () => {
    const addr = server.address();
    if (typeof addr === "string") {
      console.log(`[BOOT] Server listening on pipe ${addr}`);
    } else {
      console.log(
        `[BOOT] Server listening http://${addr.address}:${addr.port} (${addr.family})`
      );
    }
  });
} else {
  // ホスト未指定（Node のデフォルト: 未指定アドレスにバインド）
  server = app.listen(PORT, () => {
    const addr = server.address();
    if (typeof addr === "string") {
      console.log(`[BOOT] Server listening on pipe ${addr}`);
    } else {
      console.log(
        `[BOOT] Server listening http://${addr.address}:${addr.port} (${addr.family})`
      );
    }
  });
}

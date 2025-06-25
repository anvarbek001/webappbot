/** @format */

const express = require("express");
const { Telegraf } = require("telegraf");
const crypto = require("crypto");
const fs = require("fs");
const cors = require("cors");

// ⚠️ Token endi Render environment'dan olinadi
const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);

const app = express();
app.use(cors());
app.use(express.json());

const TELEGRAM_BOT_SECRET = crypto
  .createHash("sha256")
  .update(botToken)
  .digest();

// 🔐 Telegram initData ni tekshirish
function validateInitData(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    urlParams.delete("hash");

    const dataCheckString = [...urlParams.entries()]
      .map(([key, val]) => `${key}=${val}`)
      .sort()
      .join("\n");

    const hmac = crypto
      .createHmac("sha256", TELEGRAM_BOT_SECRET)
      .update(dataCheckString)
      .digest("hex");

    return hmac === hash;
  } catch (e) {
    return false;
  }
}

// 💾 POST /register — foydalanuvchini saqlash
app.post("/register", (req, res) => {
  const { initData, full_name, age, grade, region, district, phone } = req.body;

  if (!validateInitData(initData)) {
    return res
      .status(403)
      .json({ status: "error", message: "Init data noto‘g‘ri!" });
  }

  const userData = { full_name, age, grade, region, district, phone };

  // ⚠️ Render-da diskga yozish ishlaydi, lekin kichik loyihalarda. Keyinchalik DB ishlatish tavsiya qilinadi.
  const usersFile = "users.json";
  const users = fs.existsSync(usersFile)
    ? JSON.parse(fs.readFileSync(usersFile, "utf8"))
    : [];

  users.push(userData);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

  res.json({ status: "success", message: "✅ Ro'yxatdan o'tdingiz!" });
});

// 🔁 /start orqali WebApp tugmasi
bot.start((ctx) => {
  ctx.reply("Web App ro‘yxatdan o‘tish uchun tugmani bosing", {
    reply_markup: {
      keyboard: [
        [
          {
            text: "📝 Ro‘yxatdan o‘tish",
            web_app: {
              url: "https://biologiyarenessans.vercel.app", // 🔗 Frontend (Vercel) URL
            },
          },
        ],
      ],
      resize_keyboard: true,
    },
  });
});

// 🟢 Bot va serverni ishga tushurish
bot.launch();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server ${PORT}-portda ishlamoqda`));

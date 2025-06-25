/** @format */

const express = require("express");
const { Telegraf } = require("telegraf");
const crypto = require("crypto");
const fs = require("fs");
const cors = require("cors");

const botToken = "8185004649:AAHAbN3MzniWUhKkIUp2xq4R5TCBlivpRfY"; // BotFather'dan token
const bot = new Telegraf(botToken);

const app = express();
app.use(cors());
app.use(express.json());

const TELEGRAM_BOT_TOKEN = botToken;
const TELEGRAM_BOT_SECRET = crypto
  .createHash("sha256")
  .update(TELEGRAM_BOT_TOKEN)
  .digest();

// 🔐 initData ni tekshirish
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

// 💾 Ro'yxatdan o'tish
app.post("/register", (req, res) => {
  const { initData, full_name, age, grade, region, district, phone } = req.body;

  if (!validateInitData(initData)) {
    return res
      .status(403)
      .json({ status: "error", message: "Init data noto‘g‘ri!" });
  }

  const userData = { full_name, age, grade, region, district, phone };

  // Masalan, faylga saqlash (test uchun)
  const users = fs.existsSync("users.json")
    ? JSON.parse(fs.readFileSync("users.json", "utf8"))
    : [];

  users.push(userData);
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  res.json({ status: "success", message: "✅ Ro'yxatdan o'tdingiz!" });
});

// 🔁 Botni ham ishga tushuramiz (ixtiyoriy)
bot.start((ctx) => {
  ctx.reply("Web App ro‘yxatdan o‘tish uchun tugmani bosing", {
    reply_markup: {
      keyboard: [
        [
          {
            text: "📝 Ro‘yxatdan o‘tish",
            web_app: { url: "https://abc1234.ngrok.io" }, // Frontend URL
          },
        ],
      ],
      resize_keyboard: true,
    },
  });
});

bot.launch();
app.listen(3000, () => console.log("✅ Server 3000-portda ishlamoqda"));

/** @format */
require("dotenv").config();
const express = require("express");
const { Telegraf, session } = require("telegraf");
const crypto = require("crypto");
const fs = require("fs");
const cors = require("cors");

const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);
const app = express();

app.use(cors());
app.use(express.json());
bot.use(session());

const TELEGRAM_BOT_SECRET = crypto
  .createHash("sha256")
  .update(botToken)
  .digest();

const ADMIN_PHONES = ["+998940621661", "+998938731809"];
const USED_LINKS = new Set();

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

app.post("/register", (req, res) => {
  const { initData, full_name, age, grade, region, district, phone, ref } =
    req.body;

  if (!validateInitData(initData)) {
    return res
      .status(403)
      .json({ status: "error", message: "Init data noto‘g‘ri!" });
  }

  const users = fs.existsSync("users.json")
    ? JSON.parse(fs.readFileSync("users.json", "utf8"))
    : [];

  if (users.find((u) => u.phone === phone)) {
    return res.json({
      status: "success",
      message: "✅ Siz allaqachon ro'yxatdan o'tgansiz!",
    });
  }

  const userData = {
    full_name,
    age,
    grade,
    region,
    district,
    phone,
    balance: 10,
    ref_by: ref || null,
    is_admin: ADMIN_PHONES.includes(phone),
  };

  users.push(userData);

  if (ref) {
    const refUser = users.find((u) => u.phone === ref || u.chat_id == ref);
    if (refUser) {
      refUser.balance = (refUser.balance || 0) + 1;
    }
  }

  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  res.json({ status: "success", message: "✅ Ro'yxatdan o'tdingiz!" });
});

bot.command("refreshadmin", (ctx) => {
  const users = fs.existsSync("users.json")
    ? JSON.parse(fs.readFileSync("users.json", "utf8"))
    : [];
  let count = 0;
  users.forEach((user) => {
    if (ADMIN_PHONES.includes(user.phone)) {
      user.is_admin = true;
      count++;
    }
  });
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  ctx.reply(`✅ ${count} ta foydalanuvchiga admin huquqi berildi.`);
});

bot.command("webapp", (ctx) => {
  ctx.reply("🔗 Web App orqali ro'yxatdan o'tish:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📝 Ro'yxatdan o'tish",
            web_app: { url: "https://biologiyarenessans-jet.vercel.app/" },
          },
        ],
      ],
    },
  });
});

bot.start((ctx) => {
  ctx.reply("Xush kelibsiz! Quyidagi menyudan foydalaning:", {
    reply_markup: {
      keyboard: [
        ["📚 Kitoblar", "🎥 Video darslar"],
        ["💰 Balansim", "📩 Adminga murojaat"],
      ],
      resize_keyboard: true,
    },
  });
});

bot.hears("🎥 Video darslar", (ctx) => {
  const userId = ctx.from.id;
  if (USED_LINKS.has(userId))
    return ctx.reply("❗ Siz allaqachon kirish havolasini olgansiz.");
  USED_LINKS.add(userId);
  ctx.reply("📹 Video darslar guruhi: https://t.me/joinchat/xxxxx");
});

bot.hears("📚 Kitoblar", (ctx) => {
  const userId = ctx.from.id;
  if (USED_LINKS.has(userId))
    return ctx.reply("❗ Siz allaqachon kirish havolasini olgansiz.");
  USED_LINKS.add(userId);
  ctx.reply("📘 Kitoblar guruhi: https://t.me/joinchat/yyyyy");
});

bot.hears("💰 Balansim", (ctx) => {
  const users = fs.existsSync("users.json")
    ? JSON.parse(fs.readFileSync("users.json", "utf8"))
    : [];
  const user = users.find((u) => u.chat_id == ctx.from.id);
  const balance = user?.balance || 0;
  ctx.reply(`💰 Sizda ${balance} ta RBT token mavjud.`);
});

bot.hears("📩 Adminga murojaat", (ctx) => {
  ctx.reply(
    "✉️ Murojaatingizni shu yerga yozing va adminlar siz bilan tez orada bog'lanadi."
  );
});

// Webhook config
const DOMAIN = "https://webappbot-ozlh.onrender.com";
bot.telegram.setWebhook(`${DOMAIN}/bot${botToken}`);
app.use(bot.webhookCallback(`/bot${botToken}`));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server ${PORT}-portda ishlamoqda`));

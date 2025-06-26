/** @format */
require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");
const crypto = require("crypto");
const fs = require("fs");
const cors = require("cors");

const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);
const app = express();

app.use(cors());
app.use(express.json());

const TELEGRAM_BOT_SECRET = crypto
  .createHash("sha256")
  .update(botToken)
  .digest();

const ADMIN_PHONES = ["+998940621661", "+998938731809"];
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

bot.start((ctx) => {
  const refId = ctx.message.text.split(" ")[1];
  const chatId = ctx.from.id;
  const fullName = `${ctx.from.first_name} ${ctx.from.last_name || ""}`.trim();

  const users = fs.existsSync("users.json")
    ? JSON.parse(fs.readFileSync("users.json", "utf8"))
    : [];

  const isNewUser = !users.find((u) => u.chat_id === chatId);

  if (isNewUser) {
    const newUser = {
      chat_id: chatId,
      full_name: fullName,
      balance: 0,
      ref_by: refId || null,
      is_admin: false,
    };
    users.push(newUser);

    if (refId) {
      const refUser = users.find((u) => u.chat_id == refId);
      if (refUser) {
        refUser.balance = (refUser.balance || 0) + 1;
        ctx.telegram.sendMessage(
          refUser.chat_id,
          "🎉 Sizga 1 RBT token berildi!"
        );
      }
    }

    fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
    ctx.reply("✅ Ro'yxatdan o'tdingiz. /menu buyrug'ini bosing.");
  } else {
    ctx.reply("👋 Qaytib keldingiz. /menu buyrug'ini bosing.");
  }
});

bot.command("menu", (ctx) => {
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  const user = users.find((u) => u.chat_id === ctx.from.id);
  if (!user) return ctx.reply("❗ Ro'yxatdan o'tmagansiz.");

  const baseMenu = [
    ["🧑‍🏫 Online darslar", "🎥 Video darslar"],
    ["📚 Kitoblar", "💰 Balansim"],
    ["➕ Token olish"],
  ];

  if (user.is_admin) {
    baseMenu.push(["📊 Statistika", "➕ Yangi kontent"]);
  }

  ctx.reply("👇 Kerakli bo‘limni tanlang:", {
    reply_markup: {
      keyboard: baseMenu,
      resize_keyboard: true,
    },
  });
});

bot.hears("➕ Token olish", (ctx) => {
  const refLink = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
  ctx.reply(
    `📢 Do‘stlaringizni taklif qiling va token oling:\nUshbu havolani ulashing: ${refLink}`
  );
});

bot.hears("💰 Balansim", (ctx) => {
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  const user = users.find((u) => u.chat_id === ctx.from.id);
  if (!user) return ctx.reply("❗ Ro'yxatdan o'tmagansiz.");
  ctx.reply(`💳 Sizda ${user.balance} RBT mavjud.`);
});

bot.hears("🧑‍🏫 Online darslar", (ctx) => {
  ctx.reply("🧑‍🏫 Online darslar:", {
    reply_markup: {
      keyboard: [["🎁 Bepul darslar", "🔒 Premium darslar"], ["⬅️ Ortga"]],
      resize_keyboard: true,
    },
  });
});

bot.hears("🎁 Bepul darslar", (ctx) => {
  ctx.reply("🎁 Bepul dars: https://youtube.com/example");
});

bot.hears("🔒 Premium darslar", (ctx) => {
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  const user = users.find((u) => u.chat_id === ctx.from.id);
  if (!user) return ctx.reply("❗ Ro'yxatdan o'tmagansiz.");
  if (user.balance < 5)
    return ctx.reply("❌ RBT yetarli emas. Iltimos balansingizni to‘ldiring.");
  user.balance -= 5;
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  ctx.reply("🔒 Premium dars: https://zoom.us/j/xxxxx");
});

bot.hears("🎥 Video darslar", (ctx) => {
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  const user = users.find((u) => u.chat_id === ctx.from.id);
  if (!user) return ctx.reply("❗ Ro'yxatdan o'tmagansiz.");
  if (user.balance < 3) return ctx.reply("❌ RBT yetarli emas.");
  user.balance -= 3;
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  ctx.reply("🎥 Video dars: https://youtube.com/video");
});

bot.hears("📚 Kitoblar", (ctx) => {
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  const user = users.find((u) => u.chat_id === ctx.from.id);
  if (!user) return ctx.reply("❗ Ro'yxatdan o'tmagansiz.");
  if (user.balance < 2) return ctx.reply("❌ RBT yetarli emas.");
  user.balance -= 2;
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  ctx.reply("📚 Kitob: https://example.com/book.pdf");
});

bot.hears("📊 Statistika", (ctx) => {
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  const user = users.find((u) => u.chat_id === ctx.from.id);
  if (!user?.is_admin) return ctx.reply("❌ Siz admin emassiz.");

  const totalUsers = users.length;
  const totalTokens = users.reduce((sum, u) => sum + (u.balance || 0), 0);
  ctx.reply(
    `📊 Statistika:\n👥 Foydalanuvchilar: ${totalUsers}\n💰 Umumiy token: ${totalTokens}`
  );
});

bot.hears("➕ Yangi kontent", (ctx) => {
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  const user = users.find((u) => u.chat_id === ctx.from.id);
  if (!user?.is_admin) return ctx.reply("❌ Siz admin emassiz.");
  ctx.reply(
    "➕ Qaysi turdagi kontent qo‘shmoqchisiz?\n(hozircha faqat statik linklar ishlaydi)"
  );
});

bot.launch();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server ${PORT}-portda ishlamoqda`));

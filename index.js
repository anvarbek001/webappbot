/** @format */
require("dotenv").config();
const express = require("express");
const { Telegraf, Scenes, session } = require("telegraf");
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

// POST /register orqali WebAppdan ro'yxat
app.post("/register", (req, res) => {
  const { initData, full_name, age, grade, region, district, phone } = req.body;

  if (!validateInitData(initData)) {
    return res
      .status(403)
      .json({ status: "error", message: "Init data noto‘g‘ri!" });
  }

  const users = fs.existsSync("users.json")
    ? JSON.parse(fs.readFileSync("users.json", "utf8"))
    : [];

  const exists = users.find((u) => u.phone === phone);
  if (exists) {
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
    balance: 10, // boshlang'ich RBT
  };

  users.push(userData);
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  res.json({ status: "success", message: "✅ Ro'yxatdan o'tdingiz!" });
});

// 👥 Referal orqali start
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

// 🧩 Asosiy menyu
bot.command("menu", (ctx) => {
  ctx.reply("👇 Kerakli bo‘limni tanlang:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🧑‍🏫 Online darslar", callback_data: "online_lessons" }],
        [{ text: "🎥 Video darslar", callback_data: "video_lessons" }],
        [{ text: "📚 Kitoblar", callback_data: "books" }],
        [{ text: "💰 Balansim", callback_data: "balance" }],
        [{ text: "🛠 Adminga murojaat", callback_data: "support" }],
      ],
    },
  });
});

bot.command("referal", (ctx) => {
  const refLink = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
  ctx.reply(`📢 Do‘stlaringizni taklif qiling va token oling:\n${refLink}`);
});

bot.on("callback_query", async (ctx) => {
  const action = ctx.callbackQuery.data;
  const users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  const user = users.find((u) => u.chat_id === ctx.from.id);

  if (!user) return ctx.reply("❗ Ro'yxatdan o'tmagan foydalanuvchi.");

  const save = () =>
    fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  const notEnough = () =>
    ctx.reply("❌ RBT yetarli emas. Iltimos balansingizni to‘ldiring.");

  switch (action) {
    case "online_lessons":
      ctx.reply("🧑‍🏫 Online darslar:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎁 Bepul darslar", callback_data: "free_online" }],
            [
              {
                text: "🔒 Premium darslar (5 RBT)",
                callback_data: "premium_online",
              },
            ],
          ],
        },
      });
      break;

    case "free_online":
      ctx.reply("🎁 Bepul dars: https://youtube.com/example");
      break;

    case "premium_online":
      if (user.balance < 5) return notEnough();
      user.balance -= 5;
      save();
      ctx.reply("🔒 Premium dars: https://zoom.us/j/xxxxx");
      break;

    case "video_lessons":
      if (user.balance < 3) return notEnough();
      user.balance -= 3;
      save();
      ctx.reply("🎥 Video dars: https://youtube.com/video");
      break;

    case "books":
      if (user.balance < 2) return notEnough();
      user.balance -= 2;
      save();
      ctx.reply("📚 Kitob: https://example.com/book.pdf");
      break;

    case "balance":
      ctx.reply(`💰 Sizda ${user.balance} RBT mavjud.`);
      break;

    case "support":
      ctx.reply("🛠 Adminga yozish: @your_admin_username");
      break;
  }

  await ctx.answerCbQuery();
});

bot.launch();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server ${PORT}-portda ishlamoqda`));

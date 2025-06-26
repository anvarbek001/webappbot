/** @format */

const { Telegraf, Scenes, session } = require("telegraf");
const fs = require("fs");

const bot = new Telegraf(process.env.BOT_TOKEN);

// Bosqichlar
const registerWizard = new Scenes.WizardScene(
  "register",
  (ctx) => {
    ctx.reply("👤 Ism va familiyangizni kiriting:");
    ctx.wizard.state.data = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.full_name = ctx.message.text;
    ctx.reply("📅 Yosh (masalan: 18):");
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.age = ctx.message.text;
    ctx.reply("🏫 Sinf:");
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.grade = ctx.message.text;
    ctx.reply("🌍 Viloyat:");
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.region = ctx.message.text;
    ctx.reply("🏙 Tuman:");
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.district = ctx.message.text;
    ctx.reply("📞 Telefon raqam:");
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.phone = ctx.message.text;

    // Saqlash
    const userData = ctx.wizard.state.data;
    const users = fs.existsSync("users.json")
      ? JSON.parse(fs.readFileSync("users.json", "utf8"))
      : [];

    users.push(userData);
    fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

    ctx.reply("✅ Ro'yxatdan muvaffaqiyatli o'tdingiz!");
    return ctx.scene.leave();
  }
);

// Scene va session'ni ulaymiz
const stage = new Scenes.Stage([registerWizard]);
bot.use(session());
bot.use(stage.middleware());

// /start va /register komandasi
bot.start((ctx) =>
  ctx.reply("👋 Salom! Ro‘yxatdan o‘tish uchun /register buyrug‘ini yuboring.")
);
bot.command("register", (ctx) => ctx.scene.enter("register"));

// Ishga tushirish
bot.launch();

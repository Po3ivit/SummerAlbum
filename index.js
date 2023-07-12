import { FormJobs } from './job.js';
import { Mission, Text, User, Mail } from './mongo.js'
import { bot } from './bot.js';
import { Telegraf, Markup, Scenes, session } from 'telegraf';
import { dateMSK, nowStage, nowStageAi, setStart, findActiveMission, sendMessageNow, newMail, stopJob, checkForPormo } from './myfunc.js';
import { addTextToImage } from './sharp.js'
// import { wizardryScene } from './scene.js';
import { Axios } from 'axios';
export const formJobs = new FormJobs()
formJobs.initialize(bot)

class Queue {
    constructor() {
        this.items = [];
        this.processing = false;
    }

    enqueue(element) {
        this.items.push(element);
        if (!this.processing) {
            this.processNext();
        }
    }

    dequeue() {
        return this.items.shift();
    }

    processNext() {
        if (this.isEmpty()) {
            this.processing = false;
            return;
        }

        const element = this.dequeue();
        this.processing = true;
        this.processElement(element);
    }

    processElement(element) {
        // обработка переменной
        console.log("обработка переменной:", element);

        //  логика обработки 

        //  обработка следующей
        this.processNext();
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

const queue = new Queue();


bot.start(async (ctx) => {
    const stage = "start"
    const dbuser = await setStart(ctx, stage)
    const mess = await Text.findOne({ stage: stage })

    if (dbuser) {
        if (dbuser.ban) { }
        if (!dbuser.ban) {
            await ctx.reply(mess.text[1], {
                parse_mode: "HTML", disable_web_page_preview: true,
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("Перейти к заданиям", "mission")],
                    [Markup.button.callback("Играть с Нейросетью", "ai")],
                    [Markup.button.callback("Узнать правила", "rules0")],
                    [Markup.button.callback("Moder", "Moder-00")]])
            })
        }
    }

    if (!dbuser) {
        await ctx.replyWithPhoto({ source: "./assets/images/1.webp" }, {
            caption: mess.text[0],
            parse_mode: "HTML", disable_web_page_preview: true,
            ...Markup.inlineKeyboard([Markup.button.callback("А что ты еще умеешь?", "start")])
        });
    }
})


bot.action('start', async (ctx) => {
    const stage = "start"
    const dbuser = await nowStage(ctx, stage)
    const mess = await Text.findOne({ stage: stage })
    if (dbuser.ban) { }
    if (!dbuser.ban) {

        await ctx.reply(mess.text[1], {
            parse_mode: "HTML", disable_web_page_preview: true,
            ...Markup.inlineKeyboard([
                [Markup.button.callback("Перейти к заданиям", "mission")],
                [Markup.button.callback("Играть с Нейросетью", "ai")],
                [Markup.button.callback("Узнать правила", "rules0")]])
        })
    }
})

bot.action(['rules0', 'rules1'], async (ctx) => {
    const stage = "rules"
    const dbuser = await nowStage(ctx, stage)
    const mess = await Text.findOne({ stage: stage })
    if (dbuser.ban) { }
    if (!dbuser.ban) {
        if (ctx.match[0] == 'rules0') {
            await ctx.reply(mess.text[0])
            await ctx.reply(mess.text[1])
            await ctx.reply(mess.text[2], {
                parse_mode: "HTML",
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("Классно! А подарки будут?", "rules1")]])
            })
        }
        if (ctx.match[0] == 'rules1') {
            await ctx.replyWithPhoto(
                { source: "./assets/images/photo.webp" },
                {
                    caption: mess.text[3],
                    parse_mode: "HTML",
                    ...Markup.inlineKeyboard([[Markup.button.callback("Перейти к заданиям", "mission")],
                    [Markup.button.callback("Играть с Нейросетью", "ai")]])
                })

            // await ctx.replyWithMediaGroup(mess.text[3], {
            //     parse_mode: "HTML",
            //     ...Markup.inlineKeyboard([
            //         [Markup.button.callback("Перейти к заданиям", "mission")],
            //         [Markup.button.callback("Играть с Нейросетью", "ai")]])
            // })
        }
    }
})

bot.action('ai', async (ctx) => {
    const stage = "ai"
    const dbuser = await nowStage(ctx, stage)
    const mess = await Text.findOne({ stage: stage })
    if (dbuser.ban) { }
    if (!dbuser.ban) {
        queue.enqueue(ZNACHENIE)
        await ctx.reply(mess.text[0])
    }
})


bot.action(['mission', 'closed'], async (ctx) => {
    const stage = "mission";
    const dbuser = await nowStage(ctx, stage);
    const mess = await Text.findOne({ stage: stage });
    if (dbuser.ban) { }
    if (!dbuser.ban) {
        const availableMissions = Object.entries(dbuser.missions).filter(([number, mission]) => mission.haveNow && !mission.complete);
        const randomMissions = availableMissions.slice(0, 3);

        if (randomMissions.length < 3) {
            const remainingMissions = Object.entries(dbuser.missions).filter(([number, mission]) => !mission.haveNow && !mission.complete);
            const additionalMissions = remainingMissions.slice(0, 3 - randomMissions.length);
            randomMissions.push(...additionalMissions);
        }

        const buttons = randomMissions.map(async ([number, mission]) => {
            const missionText = await Mission.findOne({ number });
            const button = [Markup.button.callback(missionText.button, `mission_${number}`)];
            dbuser.missions[number].haveNow = true;
            return button;
        });

        const keyboard = Markup.inlineKeyboard(await Promise.all(buttons));
        console.log(keyboard)
        if (ctx.match[0] == 'mission') await ctx.reply(mess.text[0], { parse_mode: "HTML", ...keyboard });
        if (ctx.match[0] == 'closed') await ctx.editMessageText(mess.text[0], { parse_mode: "HTML", ...keyboard });

        await dbuser.markModified('missions');
        await dbuser.save();
    }
});


bot.action([/mission_\d+/, /active_\d+/], async (ctx) => {
    const dbuser = await nowStage(ctx, ctx.match[0])
    const missionNumber = ctx.match[0].split("_")[1]
    const textMission = await Mission.findOne({ number: missionNumber })
    if (dbuser.ban) { }
    if (!dbuser.ban) {
        if (dbuser.missions[missionNumber].modering) {
            const mess = await Text.findOne({ stage: "mission" });
            await ctx.reply(mess.text[3])
        }

        if (!dbuser.missions[missionNumber].modering) {
            if (dbuser.haveActiveMission) {
                const activeMission = await findActiveMission(dbuser)
                if (missionNumber == activeMission) {
                    const missionText = await Mission.findOne({ number: activeMission });
                    await ctx.deleteMessage()
                    ctx.reply("❗️Вы приняли это задание. У вас есть 24 часа, чтобы его выполнить.\n\n" + missionText.text, {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([Markup.button.callback("В меню", "start"), Markup.button.callback("Чит-код", "cheat")])
                    })
                }
                if (missionNumber !== activeMission) {
                    await ctx.reply("Эти задания пока недоступны, потому что вы уже взяли одно на сегодня. Сначала выполните его, а потом сможете приступить к другим.", {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback("Перейти к заданию", `mission_${activeMission}`)]])
                    })
                }

            }
            if (!dbuser.haveActiveMission) {

                if (ctx.match[0].match(/mission_\d+/)) {

                    await ctx.deleteMessage()
                    await ctx.reply(textMission.text, {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([
                            Markup.button.callback("Принять", `active_${missionNumber}`),
                            Markup.button.callback("Назад", "closed"),
                            Markup.button.callback("В меню", 'start')])
                    })
                }
                if (ctx.match[0].match(/active_\d+/)) {
                    console.log(ctx.match[0])
                    await ctx.deleteMessage()
                    await ctx.reply("❗️Вы приняли это задание. У вас есть 24 часа, чтобы его выполнить.\n\n" + textMission.text, {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([
                            Markup.button.callback("Чит-код", "cheat"),
                            Markup.button.callback("В меню", 'start')])

                    })
                    dbuser.text = textMission.text
                    dbuser.haveActiveMission = true;
                    dbuser.missions[missionNumber].active = true;
                    await formJobs.formJob(dbuser.userid)
                    await dbuser.markModified('missions')
                    await dbuser.save()
                }

            }


        }
    }
})


bot.action("cheat", async (ctx) => {
    const stage = "cheat";
    const dbuser = await nowStage(ctx, stage);
    const mess = await Text.findOne({ stage: stage });
    if (dbuser.ban) { }
    if (!dbuser.ban) {
        const activeMission = await findActiveMission(dbuser)
        if (dbuser.haveActiveMission) {
            if (dbuser.cheat && activeMission) {
                await ctx.deleteMessage()
                await ctx.replyWithPhoto(
                    { source: "./assets/images/8.webp" },
                    {
                        caption: mess.text[0],
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback("❌", `mission_${activeMission}`)]])
                    })
            }
            if (!dbuser.cheat && activeMission) {
                await ctx.deleteMessage()
                await ctx.replyWithPhoto(
                    { source: "./assets/images/8.webp" },
                    {
                        caption: mess.text[1],
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback("❌", `mission_${activeMission}`)]])
                    })
            }
        }

    }
})


bot.action("mail-yes", async (ctx) => {
    await new Promise((r) => setTimeout(r, 150))
    const stage = "mailYes"
    const dbuser = await nowStage(ctx, stage)
    const mess = await Text.findOne({ stage: "missionBack" })
    const a = Math.floor(Math.random() * 3)
    if (dbuser.ban) { }
    if (!dbuser.ban) {
        if (!dbuser.haveActiveMission) {
            console.log('disck')
        }

        if (dbuser.haveActiveMission) {
            // const number = dbuser.mail.mission
            // console.log(typeof (dbuser.mail.mission))
            dbuser.missions[dbuser.mail.mission].modering = true
            dbuser.missions[dbuser.mail.mission].active = false
            dbuser.haveActiveMission = false
            dbuser.text = "нет"
            await stopJob(dbuser.userid)
            if (dbuser.mail.text == "cheat") dbuser.cheat -= 1
            await newMail(dbuser.mail)
            dbuser.mail = {}
            //await levelCheck(ctx, dbuser)
            await dbuser.markModified('missions')
            await dbuser.save()
            console.log('disck')
            //const del = await Task.deleteMany({ user_id: user_id })
            // await stopJob(dbuser.userid)
            //console.log()
            await ctx.reply(mess.text[a], {
                parse_mode: "markdown", disable_web_page_preview: true,
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("Перейти к заданиям", "mission")]])
            })
        }

    }
})





bot.on("photo", async (ctx) => {
    const dbuser = await User.findOne({ userid: ctx.message.from.id })
    let fileid = 0
    if (dbuser.ban) { }
    if (!dbuser.ban) {
        console.log(dbuser.stage)
        if (!ctx.message.photo[1].file_id) {
            fileid = ctx.message.photo[0].file_id
        }
        if (ctx.message.photo[1].file_id) {
            fileid = ctx.message.photo[1].file_id
        }

        if (dbuser.stage == "ai") {
            const mess = await Text.findOne({ stage: "ai" })
            try {
                const filePath = await bot.telegram.getFileLink(fileid).then((link) => link.href);
                const text = 'тут текст случайный';
                const outputPath = `./user/${dbuser.userid}/${dbuser.userid}.jpg`;
                // Сохранение исходной картинки
                const originalImagePath = `./user/${dbuser.userid}/original.jpg`;
                await sharp(filePath).toFile(originalImagePath);
                await addTextToImage(originalImagePath, text, outputPath);
                // Отправка результирующего изображения пользователю
                await ctx.replyWithPhoto({ source: outputPath });
            } catch (error) {
                console.error('Ошибка при обработке изображения:', error);
            }
            await ctx.reply(mess.text[1], {
                parse_mode: "HTML",
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("Собирать впечатления", "start")]])
            })
        }
        // if (dbuser.stage == /mission_\d+/) {
        if (dbuser.haveActiveMission && (/mission_\d+/.test(dbuser.stage) || /active_\d+/.test(dbuser.stage))) {
            const mess = await Text.findOne({ stage: "mission" })
            const activeMission = await findActiveMission(dbuser)
            ctx.deleteMessage()
            ////console.log(ctx.message)
            dbuser.mail = {
                fileid: fileid,
                userid: dbuser.userid,
                moder: false,
                text: dbuser.text,
                time: dateMSK(),
                mission: activeMission,
                noTrustModer: true
            }
            await dbuser.save()
            // await ctx.reply(dbuser.text, {
            //     parse_mode: "HTML"
            // })
            await ctx.replyWithPhoto(fileid, {})
            await ctx.reply(mess.text[1], {
                parse_mode: "HTML", ...Markup.inlineKeyboard([
                    [Markup.button.callback("Да", "mail-yes")]])
            })

        }

        if (dbuser.haveActiveMission && dbuser.stage == "cheat" && dbuser.cheat > 0) {
            await ctx.deleteMessage()
            const activeMission = await findActiveMission(dbuser)
            dbuser.mail = {
                fileid,
                userid: dbuser.userid,
                moder: false,
                text: "cheat",
                time: dateMSK(),
                mission: activeMission,
                noTrustModer: true
            }
            await dbuser.save()

            await ctx.replyWithPhoto(fileid, {})
            await ctx.reply("Хотите применить чит-код?", Markup.inlineKeyboard([
                [Markup.button.callback("Отправить", "mail-yes")]]))
        }
    }
})

bot.command("id", async (ctx) => {
    console.log(ctx.update.message.from.id)
    ctx.reply("Ваш ID: " + ctx.update.message.from.id);
})

bot.command("udoli", async (ctx) => {
    const udoli = await User.findOneAndDelete({ userid: ctx.update.message.from.id })
    ctx.reply("/start")
})

bot.command("ball", async (ctx) => {
    const dbuser = await User.findOne({ userid: ctx.update.message.from.id })
    ctx.reply("У тебя " + dbuser.score + " вспышек из 20.")
})
/////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////
//модеры
bot.action("Moder-00", async (ctx) => {
    await new Promise((r) => setTimeout(r, 150))
    const stage = "Moder-00"
    const moder = await nowStage(ctx, stage)
    const content = await Mail.findOne({ moder: false })
    if (!content) ctx.reply("Для вас пока ничего нет)")

    if (content) {
        content.moder = true
        await content.save()
        if (content.text) await ctx.reply(content.text)
        if (!content.text) await ctx.reply("Нет текста")
        await ctx.replyWithPhoto(content.fileid, {})
        moder.mailModer = content._id
        await moder.save()
        await ctx.reply("Все ок?",
            Markup.inlineKeyboard([
                [Markup.button.callback("Да", "Moder-yes")],
                [Markup.button.callback("Нет", "Moder-no")],
                [Markup.button.callback("БАН!", "ban")]]))

    }
})

bot.action("ban", async (ctx) => {
    await new Promise((r) => setTimeout(r, 150))
    const stage = "ban"
    const moder = await nowStage(ctx, stage)
    const content = await Mail.findOne({ _id: moder.mailModer })
    const dbuser = await User.findOne({ userid: content.userid })
    dbuser.ban = true
    await dbuser.save()
    await sendMessageNow(content.userid, 5, content.text)
    await ctx.reply("Следующее?",
        Markup.inlineKeyboard([
            [Markup.button.callback("Да", "Moder-00")],
            [Markup.button.callback("Нет", "start")]]))
})

bot.action("Moder-yes", async (ctx) => {
    await new Promise((r) => setTimeout(r, 150))
    const stage = "ModerYes"
    const moder = await nowStage(ctx, stage)
    const content = await Mail.findOne({ _id: moder.mailModer })
    const dbuser = await User.findOne({ userid: content.userid })
    if (dbuser) {
        if (dbuser.mail.text == "cheat") dbuser.cheat -= 1
        moder.mailModer = "no"
        dbuser.score += 1
        dbuser.missions[content.mission].complete = true
        dbuser.missions[content.mission].modering = false
        dbuser.missions[content.mission].haveNow = false
        content.noTrustModer = false
        await content.save()
        await sendMessageNow(content.userid, 2, content.text)
        await dbuser.markModified('missions')
        await dbuser.save()
        await checkForPormo(dbuser.userid, content.mission)
        moder.mailModer = "no"
        await moder.save()
    }
    await ctx.reply("Следующее?",
        Markup.inlineKeyboard([
            [Markup.button.callback("Да", "Moder-00")],
            [Markup.button.callback("Нет", "start")]]))

})

bot.action("Moder-no", async (ctx) => {
    await new Promise((r) => setTimeout(r, 150))
    const stage = "ModerYes"
    const moder = await nowStage(ctx, stage)
    const content = await Mail.findOne({ _id: moder.mailModer })
    const dbuser = await User.findOne({ userid: content.userid })
    moder.mailModer = "no"
    await moder.save()

    console.log(dbuser.missions[content.mission].modering)
    if (dbuser.missions[content.mission].secondChance) {
        await User.updateOne(
            { userid: dbuser.userid },
            {
                $set: {
                    [`missions.${content.mission}.complete`]: true,
                    [`missions.${content.mission}.haveNow`]: false,
                    [`missions.${content.mission}.modering`]: false
                }
            }
        );

        await sendMessageNow(dbuser.userid, 4, content.text)
        //const content2 = await Mail.deleteOne({ _id: moder.mailModer })
        //console.log(dbuser.missions[content.mission])
        await checkForPormo(dbuser.userid, content.mission)
    }

    if (!dbuser.missions[content.mission].secondChance) {
        await User.updateOne(
            { userid: dbuser.userid },
            {
                $set: {
                    [`missions.${content.mission}.secondChance`]: true,
                    [`missions.${content.mission}.modering`]: false
                }
            }
        );

        await sendMessageNow(dbuser.userid, 3, content.text)
        //const content2 = await Mail.deleteOne({ _id: moder.mailModer })    
        //console.log(dbuser.missions[content.mission])
    }
    content.noTrustModer = false
    await content.save()
    await ctx.reply("Следующее?",
        Markup.inlineKeyboard([
            [Markup.button.callback("Да", "Moder-00")],
            [Markup.button.callback("Нет", "start")]]))

})


bot.catch(err => {
    console.log("Ooops, encountered an error", err);
});
// Запускаем бот
bot.launch()
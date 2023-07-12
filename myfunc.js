import moment from 'moment-timezone'
import { Text, User, Mail, Task, Mission } from './mongo.js'
// import { Telegraf, Markup, Scenes, session } from 'telegraf'
import { bot } from './bot.js';
import { formJobs } from './index.js';
//Время СЕЙЧАС
export const dateMSK = () => {
    return moment.tz(Date.now(), "Europe/Moscow").format('YYYY-MM-DD HH:mm');
};

export async function setStart(ctx, stage) {

    const dbuser = await User.findOne({ userid: ctx.update.message.chat.id })

    if (dbuser) {
        dbuser.stage = stage
        await dbuser.save()
        return dbuser
    }
    console.log(dbuser)
    if (!dbuser) {
        const user = await new User({
            userid: ctx.update.message.chat.id,
            username: ctx.update.message.chat.username,
            admin: false,
            moder: false,
            stage: "start",
            promo: { 1: false, 10: false, 20: false },
            cheat: 3,
            missions: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, {
                haveNow: false,
                complete: false,
                secondChance: false,
                modering: false,
                active: false,
                closed: false
            }])),
            haveActiveMission: false,
            created: dateMSK(),
            score: 0,
            mail: {},
            ban: false,
        })
        await user.save()
        await new Promise(r => setTimeout(r, 600))
        const existingUsers = await User.find({ userid: ctx.update.message.chat.id });

        if (existingUsers.length > 1) {
            // Удаление всех дубликатов, кроме первого
            const duplicateUsers = existingUsers.slice(1);
            await User.deleteMany({ _id: { $in: duplicateUsers.map(user => user._id) } });
        }
    }
}

export async function nowStage(ctx, stage) {
    await ctx.answerCbQuery()
    const dbuser = await User.findOne({ userid: ctx.update.callback_query.from.id })
    dbuser.stage = stage
    await dbuser.save()
    console.log("id:" + ctx.update.callback_query.from.id, "Qback:" + ctx.callbackQuery.data, "stage:" + stage)
    return dbuser
}

export async function nowStageAi(ctx) {
    const dbuser = await User.findOne({ userid: ctx.message.from.id })
    console.log(ctx.update.callback_query.from.id, ctx.callbackQuery.data)
    return dbuser
}

export async function findActiveMission(dbuser) {
    await dbuser
    for (const mission in dbuser.missions) {
        if (dbuser.missions[mission].active) {
            console.log(mission)
            return mission;

        }
    }

    return null;
}


export async function sendMessageNow(userId, i, text) {
    const message = await Text.findOne({ stage: "moder" })
    const a = Math.floor(Math.random() * i)
    // //console.log(message.que.image + i[a])
    if (i == 2) {
        // bot.telegram.sendMessage(userId, text)
        await new Promise((r) => setTimeout(r, 150));
        // bot.telegram.sendMessage(userId, message.text[i])
        const a = Math.floor(Math.random() * 2) + 2
        bot.telegram.sendMediaGroup(userId, [
            {
                media: { source: `./assets/images/${a}.webp` },
                caption: message.text[i],
                type: 'photo',
                disable_web_page_preview: true,
                parse_mode: 'HTML'
            }])
    }

    if (i == 3) {
        // bot.telegram.sendMessage(userId, text)
        await new Promise((r) => setTimeout(r, 150));
        // bot.telegram.sendMessage(userId, message.text[i])
        const a = Math.floor(Math.random() * 2) + 5
        bot.telegram.sendMediaGroup(userId, [
            {
                media: { source: `./assets/images/${a}.webp` },
                caption: message.text[i],
                type: 'photo',
                disable_web_page_preview: true,
                parse_mode: 'HTML'
            }])
    }

    if (i == 4) {
        // bot.telegram.sendMessage(userId, text)
        await new Promise((r) => setTimeout(r, 150));
        // bot.telegram.sendMessage(userId, message.text[i])
        bot.telegram.sendMediaGroup(userId, [
            {
                media: { source: `./assets/images/${i}.webp` },
                caption: message.text[i],
                type: 'photo',
                disable_web_page_preview: true,
                parse_mode: 'HTML'
            }])
    }

    if (i == 5) {
        // bot.telegram.sendMessage(userId, text)
        await new Promise((r) => setTimeout(r, 150));
        // bot.telegram.sendMessage(userId, message.text[i])
        bot.telegram.sendMediaGroup(userId, [
            {
                media: { source: `./assets/images/4.webp` },
                caption: message.text[i],
                type: 'photo',
                disable_web_page_preview: true,
                parse_mode: 'HTML'
            }])
    }

}

export async function newMail(mail) {
    const newMail = new Mail(mail);
    await newMail.save();
    await new Promise((r) => setTimeout(r, 250));
    try {
        const duplicateDocs = await Mail.find({
            time: mail.time,
            userid: mail.userid,
            fileid: mail.fileid
        });

        if (duplicateDocs.length > 1) {
            const idsToDelete = duplicateDocs.slice(1).map(doc => doc._id);
            const deleteResult = await Mail.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`${deleteResult.deletedCount} документ(ов) удалено.`);
        } else {
            console.log('Нет дубликатов для удаления.');
        }
    } catch (error) {
        console.error('Ошибка при удалении дубликатов:', error);
    }
};

export async function findCompleteMission(dbuser) {
    await dbuser
    for (const mission in dbuser.missions) {
        if (dbuser.missions[mission].complete) {
            console.log(mission)
            return mission;

        }
    }

    return null;
}


export async function stopJob(userId) {
    const dick = await Task.find({ userid: userId })
    const context = await formJobs.getContext()
    console.log(context)
    for (const vagina of dick) {
        const { userid, date } = vagina
        const userTime = `${userid}${date}`;
        const job = formJobs.getContext()[userTime];

        if (job) {
            job.stop();
            delete formJobs.getContext()[userTime];
        }
    }
    const deldick = await Task.deleteMany({ userid: userId })
}

export async function checkForPormo(userid, mission) {
    const mess = await Text.findOne({ stage: "promo" })
    const dbuser = await User.findOne({ userid: userid })
    const mathPro = await Text.findOne({ stage: "mathPromo" })

    let sum = 0;
    for (let i in dbuser.missions) {
        if (dbuser.missions[i].complete) {
            sum++;
        }
    }


    if (mission == "5") {
        const text = await Mission.findOne({ number: "5" })
        bot.telegram.sendMessage(userid, text.code, { parse_mode: 'markdown', disable_web_page_preview: true })
        await Text.updateOne({ stage: "mathPromo" }, { $inc: { [`text.${mission}`]: 1 } });
    }
    if (mission == "7") {
        const text = await Mission.findOne({ number: "7" })
        bot.telegram.sendMessage(userid, text.code, { parse_mode: 'markdown', disable_web_page_preview: true })
        await Text.updateOne({ stage: "mathPromo" }, { $inc: { [`text.${mission}`]: 1 } });
    }
    if (mission == "13") {
        const text = await Mission.findOne({ number: "13" })
        bot.telegram.sendMessage(userid, text.code, { parse_mode: 'markdown', disable_web_page_preview: true })
        await Text.updateOne({ stage: "mathPromo" }, { $inc: { [`text.${mission}`]: 1 } });
    }

    if (sum === 1) {
        await Text.updateOne({ stage: "mathPromo" }, { $inc: { [`text.${sum}`]: 1 } });
        bot.telegram.sendMediaGroup(userid, [
            {
                media: { source: `./assets/images/7.webp` },
                caption: mess.text[0],
                type: 'photo',
                parse_mode: 'markdown'
            }])
    } else if (sum === 10) {
        await Text.updateOne({ stage: "mathPromo" }, { $inc: { [`text.${sum}`]: 1 } });
        bot.telegram.sendMediaGroup(userid, [
            {
                media: { source: `./assets/images/7.webp` },
                caption: mess.text[1],
                type: 'photo',
                parse_mode: 'markdown'
            }])
    } else if (sum === 20) {
        await Text.updateOne({ stage: "mathPromo" }, { $inc: { [`text.${sum}`]: 1 } });
        let promik = mess.code[0]
        console.log(promik)
        let text
        if (promik) {
            await Text.updateOne({ stage: "promo" }, { $pop: { 'code': -1 } })
            text = mess.text[2].replace("XXXX", promik)
        }
        if (!promik) {
            bot.telegram.sendMediaGroup(485037677, [
                {
                    media: { source: `./assets/images/7.webp` },
                    caption: "Коды все",
                    type: 'photo',
                    parse_mode: 'markdown'
                }])
        }
        bot.telegram.sendMediaGroup(userid, [
            {
                media: { source: `./assets/images/7.webp` },
                caption: text,
                type: 'photo',
                parse_mode: 'markdown'
            }])
    }
};


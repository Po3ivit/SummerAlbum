import moment from 'moment-timezone';
import { CronJob } from 'cron';
import { User, Task } from './mongo.js'
import { bot } from './bot.js';
import { findActiveMission } from './myfunc.js';

export class FormJobs {
    context;
    tgBot;

    initialize = bot => {
        this.tgBot = bot;
        this.restoreTask()
    }

    getContext = () => {
        return this.context;
    }

    saveTask = async (userId, taskData) => {
        for (const info of taskData) {
            const { date, message, image } = info;
            const task = new Task({
                userid: userId,
                date,
                message,
                image
            })
            task.save()
        }
    }
    createJob = (userId, date, message, image) => {
        const job = new CronJob(
            new Date(date),
            async () => {

                this.tgBot.telegram.sendMediaGroup(userId, [
                    {
                        media: { source: image },
                        caption: message,
                        type: 'photo',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'тест', callback_data: 'start' }]
                            ]
                        }
                    }
                ]);


                job.stop()
                if (image == "./assets/images/4.webp") {
                    console.log(`waht hte fuck`)
                    const ture = await User.findOne({ userid: userId })
                    ture.haveActiveMission = false
                    const activeMission = await findActiveMission(ture)
                    // let oneOfRule
                    // let oneMoreOfRule
                    // if (ture.missions[activeMission].secondChance) {
                    //     oneOfRule = true
                    //     oneMoreOfRule = true
                    // }
                    // if (!ture.missions[activeMission].secondChance) {
                    //     oneOfRule = false
                    //     oneMoreOfRule = true
                    // }
                    ture.missions[activeMission].haveNow = false
                    //ture.missions[activeMission].secondChance = oneMoreOfRule
                    ture.missions[activeMission].complete = true
                    ture.missions[activeMission].active = false
                    ture.haveActiveMission = false
                    await ture.markModified('missions')
                    await ture.save()
                }
                const del = await Task.deleteOne({ date: date })
                console.log("JobDone")
            },

            () => {
            },
            true
        )
        this.context = { ...this.context, [`${userId}${date}`]: job }
        job.start()
    }

    restoreTask = async () => {
        const tasks = await Task.find({});
        console.log('Восстановление задач')
        if (tasks?.length) {
            for (let task of tasks) {
                const { date, message, image, userid } = task;
                if (Date.now() > date) {
                    continue;
                }
                this.createJob(userid, date, message, image)
            }
        }
    }

    formJob = async (userId) => {
        const dateNow = Date.now()
        const taskData = [
            {

                date: dateNow + 1000 * 3600 * 19,
                message: "До конца задания — 210 секунд.",
                image: "./assets/images/14.webp",
                // },
                // {
                //     date: dateNow + 1000 * 60,
                //     // date: dateNow + 1000 * 3600 * 22,
                //     message: "Тик-так. До конца задания — 2 часа.",
                //     image: "./assets/images/cheat.jpg",

                // },
                // {
                //     date: dateNow + 1000 * 120,
                //     // date: dateNow + 1000 * 3600 * 23,
                //     message: "Тик-так. До конца задания — 1 час.",
                //     image: "./assets/images/cheat.jpg",

            },
            {
                date: dateNow + 1000 * 3600 * 24,
                message: "Тик-так! К сожалению, время вышло, и задание сгорело. Вы не сможете поучаствовать в розыгрыше главных призов — смартфонов и планшетов.\n\nНо не опускайте руки и не откладывайте камеру: можно продолжить фоточеллендж и выиграть плёночный фотоаппарат от Самоката.\n\nМожно продолжить игру, выслав ответ на уже принятое задание, или нажать /start и взять новое. ",
                image: "./assets/images/15.webp",

            }
        ]
        await this.saveTask(userId, taskData)
        for (let info of taskData) {
            const { date, message, image } = info;
            this.createJob(userId, date, message, image)
        }
    }
}

import mongoose from 'mongoose';
import session from 'telegraf-session-mongoose'
mongoose.connect('mongodb://localhost/aiBot', { useNewUrlParser: true, useUnifiedTopology: true })

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Ошибка подключения к базе данных:'));
db.once('open', () => {
    console.log('Успешное подключение к базе данных');
});



export const Task = mongoose.model("Task", {
    userid: String,
    date: Number,
    message: String,
    image: String
})

export const Text = mongoose.model("text", {
    stage: String,
    text: Array,
    code: Array
});

export const Mission = mongoose.model("mission", {
    number: String,
    text: String,
    button: String,
    pic: String,
    circle: String,
    code: String

});

export const User = mongoose.model("user", {
    userid: Number,
    username: String,
    admin: Boolean,
    moder: Boolean,
    stage: String,
    promo: Object,
    cheat: Number,
    missions: Object,
    hisMissions: Object,
    haveActiveMission: Boolean,
    created: String,
    score: Number,
    mail: Object,
    text: String,
    mailModer: Object,
    ban: Boolean,
});

export const Mail = mongoose.model("mail", {
    fileid: String,
    userid: Number,
    moder: Boolean,
    text: String,
    time: String,
    mission: Number,
    noTrustModer: Boolean,
})
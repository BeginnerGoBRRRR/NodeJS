let mongoose = require('mongoose')
let menuSchema = new mongoose.Schema({
    text:String,
    url:String,
    order:Number,
    parent:{
        type:mongoose.Types.ObjectId,
        ref:'menu'
    }
},{
    timestamps:true
})
module.exports = mongoose.model('menu',menuSchema)
/*
username: string, unique, required
password: string,required
email: string, required, unique
fullName:string, default: ""
avatarUrl:string, default: ""
status: boolean, default: false
role: Role,
loginCount: int, default:0, min=0
timestamp
*/
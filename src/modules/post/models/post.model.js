const mongoose = require('mongoose');
const mediaSchema = new mongoose.Schema({
    url : {
        type: String,
        required: true,

    },
    type: {
      type: String,
      enum : ["image","video","pdf","doc"],
      required: true  
    },
    uploadedDate : {
        type: Date,
        default: Date.now
    }
})
const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content : {
        type: String,
        required: true,
    },
    media: [mediaSchema],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    comments : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
    
})
module.exports = mongoose.model("Post",postSchema);
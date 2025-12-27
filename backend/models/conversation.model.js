import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }],
    clearedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    chatClearedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    clearedAt: {
        type: Map,
        of: Date,
        default: new Map()
    },
    chatClearedAt: {
        type: Map,
        of: Date,
        default: new Map()
    }
}, {timestamps: true})
export const Conversation = mongoose.model('Conversation', conversationSchema);
import {Conversation} from "../models/conversation.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import {Message} from "../models/message.model.js"
// for chatting
export const sendMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const {textMessage:message} = req.body;
      
        let conversation = await Conversation.findOne({
            participants:{$all:[senderId, receiverId]}
        });
        // establish the conversation if not started yet.
        if(!conversation){
            conversation = await Conversation.create({
                participants:[senderId, receiverId]
            })
        } else {
            // If sender previously cleared/deleted this conversation, restore it for them
            if (conversation.clearedBy && conversation.clearedBy.includes(senderId)) {
                conversation.clearedBy = conversation.clearedBy.filter(id => id.toString() !== senderId.toString());
            }
            if (conversation.chatClearedBy && conversation.chatClearedBy.includes(senderId)) {
                conversation.chatClearedBy = conversation.chatClearedBy.filter(id => id.toString() !== senderId.toString());
            }

            // If receiver previously cleared/deleted this conversation, restore it for them too
            if (conversation.clearedBy && conversation.clearedBy.some(id => id.toString() === receiverId.toString())) {
                conversation.clearedBy = conversation.clearedBy.filter(id => id.toString() !== receiverId.toString());
            }
            if (conversation.chatClearedBy && conversation.chatClearedBy.some(id => id.toString() === receiverId.toString())) {
                conversation.chatClearedBy = conversation.chatClearedBy.filter(id => id.toString() !== receiverId.toString());
            }
        }
        const newMessage = await Message.create({
            senderId,
            receiverId,
            message
        });

        if(newMessage) {
            conversation.messages.push(newMessage._id);
            // Ensure updatedAt is set for proper conversation ordering
            conversation.updatedAt = new Date();
        }

        await Promise.all([conversation.save(), newMessage.save()]);

        // Emit socket events immediately after save for instant delivery
        const receiverSocketId = getReceiverSocketId(receiverId);
        const senderSocketId = getReceiverSocketId(senderId);

        // Send newMessage to receiver
        if(receiverSocketId){
            io.to(receiverSocketId).emit('newMessage', newMessage);
        }

        // Send newMessage to sender (for multi-device support)
        if(senderSocketId){
            io.to(senderSocketId).emit('newMessage', newMessage);
        }

        // Emit updateConversations to both sender and receiver to refresh conversation list
        io.emit('updateConversations');

        return res.status(201).json({
            success:true,
            newMessage
        })
    } catch (error) {
        console.log(error);
    }
}
export const getMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const conversation = await Conversation.findOne({
            participants:{$all: [senderId, receiverId]}
        }).populate({
            path: 'messages',
            options: { sort: { createdAt: 1 } }
        });
        if(!conversation) return res.status(200).json({success:true, messages:[]});

        // If user has deleted this conversation (in clearedBy), don't allow access
        const hasDeletedConversation = conversation.clearedBy && conversation.clearedBy.includes(senderId);
        if (hasDeletedConversation) {
            return res.status(403).json({
                success: false,
                message: 'Conversation not accessible'
            });
        }

        // Filter messages based on clear/delete timestamps
        let filteredMessages = conversation?.messages || [];

        // If user has cleared chat, only show messages after the clear timestamp
        if (conversation.chatClearedAt && conversation.chatClearedAt.has(senderId.toString())) {
            const clearTime = new Date(conversation.chatClearedAt.get(senderId.toString()));
            filteredMessages = filteredMessages.filter(msg => new Date(msg.createdAt) > clearTime);
        }

        // If user has deleted conversation, only show messages after the delete timestamp
        if (conversation.clearedAt && conversation.clearedAt.has(senderId.toString())) {
            const deleteTime = new Date(conversation.clearedAt.get(senderId.toString()));
            filteredMessages = filteredMessages.filter(msg => new Date(msg.createdAt) > deleteTime);
        }

        return res.status(200).json({success:true, messages:filteredMessages});
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({success:false, message:'Error fetching messages'});
    }
}

export const getAllConversations = async (req, res) => {
    try {
        const userId = req.id;
        const conversations = await Conversation.find({
            participants: userId
        })
        .populate({
            path: 'participants',
            select: '-password'
        })
        .populate({
            path: 'messages',
            options: { sort: { createdAt: -1 }, limit: 1 }
        })
        .sort({ updatedAt: -1 });

        // Format conversations: filter out those where user clicked "delete user",
        // but include those where user clicked "clear chat" (show filtered messages)
        const formattedConversations = conversations
            .filter(conv => !conv.clearedBy || !conv.clearedBy.some(id => id.toString() === userId.toString()))
            .map(conv => {
            const otherUser = conv.participants.find(p => p._id.toString() !== userId);
            let lastMessage = conv.messages[0];

            // Filter last message based on user's clear/delete timestamps
            if (conv.chatClearedAt && conv.chatClearedAt.has(userId.toString())) {
                const clearTime = new Date(conv.chatClearedAt.get(userId.toString()));
                const recentMessages = conv.messages.filter(msg => new Date(msg.createdAt) > clearTime);
                lastMessage = recentMessages.length > 0 ? recentMessages[0] : null;
            }

            if (conv.clearedAt && conv.clearedAt.has(userId.toString())) {
                const deleteTime = new Date(conv.clearedAt.get(userId.toString()));
                const recentMessages = conv.messages.filter(msg => new Date(msg.createdAt) > deleteTime);
                lastMessage = recentMessages.length > 0 ? recentMessages[0] : null;
            }

            return {
                _id: conv._id,
                user: otherUser,
                lastMessage: lastMessage?.message || '',
                lastMessageTime: lastMessage?.createdAt || conv.updatedAt,
                updatedAt: conv.updatedAt
            };
        });

        return res.status(200).json({
            success: true,
            conversations: formattedConversations
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching conversations'
        });
    }
}

export const deleteConversation = async (req, res) => {
    try {
        const userId = req.id;
        const conversationId = req.params.id;

        // Find the conversation
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Check if user is participant
        if (!conversation.participants.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this conversation'
            });
        }

        // Soft delete: only remove conversation from current user's view
        // by filtering out on fetch, we'll use clearedBy array
        if (!conversation.clearedBy) {
            conversation.clearedBy = [];
        }

        // Add current user to clearedBy if not already there
        if (!conversation.clearedBy.includes(userId)) {
            conversation.clearedBy.push(userId);
        }

        await conversation.save();

        // Emit socket event to refresh conversations for current user
        io.emit('updateConversations');

        return res.status(200).json({
            success: true,
            message: 'Conversation cleared successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Error clearing conversation'
        });
    }
}

export const clearChat = async (req, res) => {
    try {
        const userId = req.id;
        const otherUserId = req.params.id;

        // Find conversation between current user and the other user
        const conversation = await Conversation.findOne({
            participants: { $all: [userId, otherUserId] }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Add current user to chatClearedBy (keeps conversation visible but shows no messages)
        if (!conversation.chatClearedBy) {
            conversation.chatClearedBy = [];
        }
        if (!conversation.chatClearedBy.includes(userId)) {
            conversation.chatClearedBy.push(userId);
        }

        // Store timestamp of when chat was cleared
        if (!conversation.chatClearedAt) {
            conversation.chatClearedAt = new Map();
        }
        conversation.chatClearedAt.set(userId.toString(), new Date());

        await conversation.save();

        // Emit socket event to refresh conversations for the current user only
        const receiverSocketId = getReceiverSocketId(userId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('updateConversations');
        }

        return res.status(200).json({
            success: true,
            message: 'Chat cleared successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Error clearing chat'
        });
    }
}

export const deleteUser = async (req, res) => {
    try {
        const userId = req.id;
        const otherUserId = req.params.id;

        // Find conversation between current user and the other user
        const conversation = await Conversation.findOne({
            participants: { $all: [userId, otherUserId] }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Add current user to clearedBy (this will hide the conversation from their view)
        if (!conversation.clearedBy) {
            conversation.clearedBy = [];
        }
        if (!conversation.clearedBy.includes(userId)) {
            conversation.clearedBy.push(userId);
        }

        // Store timestamp of when conversation was deleted
        if (!conversation.clearedAt) {
            conversation.clearedAt = new Map();
        }
        conversation.clearedAt.set(userId.toString(), new Date());

        await conversation.save();

        // Emit socket event to refresh conversations for the current user only
        const receiverSocketId = getReceiverSocketId(userId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('updateConversations');
        }

        return res.status(200).json({
            success: true,
            message: 'User removed from conversations successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Error removing user from conversations'
        });
    }
}
import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
    name:"chat",
    initialState:{
        onlineUsers:[],
        messages:[],
        conversations:[]
    },
    reducers:{
        // actions
        setOnlineUsers:(state,action) => {
            state.onlineUsers = action.payload;
        },
        setMessages:(state,action) => {
            // Handle both direct array and functional updates
            if (typeof action.payload === 'function') {
                state.messages = action.payload(state.messages);
            } else {
                state.messages = action.payload;
            }
        },
        setConversations:(state,action) => {
            state.conversations = action.payload;
        },
        // NEW: Add individual message actions
        addMessage: (state, action) => {
            // Check if message already exists (for temp messages)
            const existingIndex = state.messages.findIndex(msg => {
                // Exact match by ID
                if (msg._id === action.payload._id) return true;

                // Match temp message with real message based on content and participants
                if (msg.isTemp &&
                    msg.senderId === action.payload.senderId &&
                    msg.receiverId === action.payload.receiverId &&
                    msg.message === action.payload.message) {
                    // Check if timestamps are close (within 5 seconds)
                    const tempTime = new Date(msg.createdAt).getTime();
                    const realTime = new Date(action.payload.createdAt).getTime();
                    return Math.abs(tempTime - realTime) < 5000; // 5 seconds tolerance
                }

                return false;
            });

            if (existingIndex === -1) {
                state.messages.push(action.payload);
            } else {
                // Replace temp message with real message
                state.messages[existingIndex] = action.payload;
            }
        },
        removeTempMessage: (state, action) => {
            state.messages = state.messages.filter(msg => 
                !(msg.isTemp && msg._id === action.payload)
            );
        },
        // NEW: Update conversation last message
        updateConversationLastMessage: (state, action) => {
            const { userId, lastMessage } = action.payload;
            const convIndex = state.conversations.findIndex(
                conv => conv.user?._id === userId
            );
            
            if (convIndex !== -1) {
                state.conversations[convIndex].lastMessage = lastMessage;
                state.conversations[convIndex].updatedAt = new Date().toISOString();
            }
        },
        // NEW: Remove conversation
        removeConversation: (state, action) => {
            state.conversations = state.conversations.filter(
                conv => conv.user?._id !== action.payload
            );
        },
    }
});
export const {
    setOnlineUsers,
    setMessages,
    setConversations,
    addMessage,
    removeTempMessage,
    updateConversationLastMessage,
    removeConversation
} = chatSlice.actions;
export default chatSlice.reducer;
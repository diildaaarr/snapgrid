import { addMessage, removeTempMessage, updateConversationLastMessage, setConversations } from "@/redux/chatSlice";
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "@/lib/api";

const useGetRTM = () => {
    const dispatch = useDispatch();
    const { socket } = useSelector(store => store.socketio);
    const { selectedUser } = useSelector(store => store.auth);

    const handleNewMessage = useCallback((newMessage) => {
        // Add the real message (this will replace any temp message with the same content)
        dispatch(addMessage(newMessage));
        
        // If this is a message from/to the currently selected user, update conversation
        if (selectedUser && 
            (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id)) {
            dispatch(updateConversationLastMessage({
                userId: newMessage.senderId === selectedUser._id ? newMessage.receiverId : newMessage.senderId,
                lastMessage: newMessage.message
            }));
        }
        
        // Remove any temporary message that matches this message
        if (newMessage.senderId && newMessage.createdAt) {
            // The addMessage reducer already handles replacing temp messages
        }
    }, [dispatch, selectedUser]);

    const handleUpdateConversations = useCallback(async () => {
        // Refetch conversations to update the order
        try {
            const res = await api.get(`/message/conversations`);
            if (res.data.success) {
                // Ensure conversations are sorted by most recent message time
                const sortedConversations = res.data.conversations.sort((a, b) => {
                    const timeA = new Date(a.lastMessageTime || a.updatedAt);
                    const timeB = new Date(b.lastMessageTime || b.updatedAt);
                    return timeB - timeA; // Most recent first
                });
                dispatch(setConversations(sortedConversations));
            }
        } catch (error) {
            console.log(error);
        }
    }, [dispatch]);

    useEffect(() => {
        if (!socket) return;

        socket.on('newMessage', handleNewMessage);
        socket.on('updateConversations', handleUpdateConversations);

        return () => {
            socket.off('newMessage', handleNewMessage);
            socket.off('updateConversations', handleUpdateConversations);
        }
    }, [socket, handleNewMessage, handleUpdateConversations]);
};

export default useGetRTM;
import { setConversations } from "@/redux/chatSlice";
import api from "@/lib/api";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetConversations = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const fetchConversations = async () => {
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
        };

        fetchConversations();
    }, [dispatch]);
};

export default useGetConversations;

import { setConversations } from "@/redux/chatSlice";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetConversations = () => {
    const dispatch = useDispatch();
    
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await axios.get(`https://snapgrid-r8kd.onrender.com/api/v1/message/conversations`, {
                    withCredentials: true
                });
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

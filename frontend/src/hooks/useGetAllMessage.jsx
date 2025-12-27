import { setMessages } from "@/redux/chatSlice";
import { setPosts } from "@/redux/postSlice";
import api from "@/lib/api";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const useGetAllMessage = () => {
    const dispatch = useDispatch();
    const {selectedUser} = useSelector(store=>store.auth);
    useEffect(() => {
        const fetchAllMessage = async () => {
            if (!selectedUser?._id) {
                dispatch(setMessages([]));
                return;
            }

            try {
                const res = await api.get(`/message/all/${selectedUser._id}`);
                if (res.data.success) {
                    dispatch(setMessages(res.data.messages || []));
                }
            } catch (error) {
                console.log(error);
                // Ensure messages is always an array even on error
                dispatch(setMessages([]));
            }
        }
        fetchAllMessage();
    }, [selectedUser, dispatch]);
};
export default useGetAllMessage;
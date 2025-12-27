import { setMessages } from "@/redux/chatSlice";
import { setPosts } from "@/redux/postSlice";
import axios from "axios";
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
                const res = await axios.get(`https://snapgrid-r8kd.onrender.com/api/v1/message/all/${selectedUser._id}`, { withCredentials: true });
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
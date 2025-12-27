import { setSuggestedUsers } from "@/redux/authSlice";
import api from "@/lib/api";
import { useEffect } from "react";
import { useDispatch } from "react-redux";


const useGetSuggestedUsers = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchSuggestedUsers = async () => {
            try {
                // Fetch only 5 users initially
                const res = await api.get('/user/suggested?limit=5');
                if (res.data.success) {
                    dispatch(setSuggestedUsers(res.data.users));
                }
            } catch (error) {
                console.log(error);
            }
        }
        fetchSuggestedUsers();
    }, [dispatch]);
};
export default useGetSuggestedUsers;
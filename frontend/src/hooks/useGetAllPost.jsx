import { setPosts } from "@/redux/postSlice";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";


const useGetAllPost = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchAllPost = async () => {
            try {
                const res = await axios.get('https://snapgrid-r8kd.onrender.com/api/v1/post/all', { withCredentials: true });
                if (res.data.success) { 
                    console.log(res.data.posts);
                    // Sort posts by createdAt in descending order (newest first)
                    const sortedPosts = [...res.data.posts].sort((a, b) => 
                        new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    dispatch(setPosts(sortedPosts));
                }
            } catch (error) {
                console.log(error);
            }
        }
        fetchAllPost();
    }, []);
};
export default useGetAllPost;
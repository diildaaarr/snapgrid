import React, { useEffect, useState } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import axios from 'axios';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthUser } from '@/redux/authSlice';

const Login = () => {
    const [input, setInput] = useState({
        email: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);
    const {user} = useSelector(store=>store.auth);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    }

    const signupHandler = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await axios.post('https://snapgrid-r8kd.onrender.com/api/v1/user/login', input, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            if (res.data.success) {
                dispatch(setAuthUser(res.data.user));
                navigate("/");
                toast.success(res.data.message);
                setInput({
                    email: "",
                    password: ""
                });
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response.data.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(()=>{
        if(user){
            navigate("/");
        }
    },[])
    return (
        <div className='flex items-center w-screen h-screen justify-center px-4 bg-gray-50'>
            <form onSubmit={signupHandler} className='shadow-lg flex flex-col gap-4 sm:gap-5 p-6 sm:p-8 w-full max-w-sm sm:max-w-md bg-white rounded-lg'>
                <div className='my-3 sm:my-4'>
                    <h1 className='text-center font-bold text-xl sm:text-2xl'>snapgrid</h1>
                    <p className='text-xs sm:text-sm text-center text-gray-600 mt-2'>Login to see photos & videos from your friends</p>
                </div>
                <div>
                    <span className='font-medium text-sm sm:text-base'>Email</span>
                    <Input
                        type="email"
                        name="email"
                        value={input.email}
                        onChange={changeEventHandler}
                        className="focus-visible:ring-transparent my-2 h-10 sm:h-11"
                    />
                </div>
                <div>
                    <span className='font-medium text-sm sm:text-base'>Password</span>
                    <Input
                        type="password"
                        name="password"
                        value={input.password}
                        onChange={changeEventHandler}
                        className="focus-visible:ring-transparent my-2 h-10 sm:h-11"
                    />
                </div>
                {
                    loading ? (
                        <Button className='h-10 sm:h-11'>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Please wait
                        </Button>
                    ) : (
                        <Button type='submit' className='h-10 sm:h-11'>Login</Button>
                    )
                }

                <span className='text-center text-sm'>Doesn't have an account? <Link to="/signup" className='text-blue-600 font-medium'>Signup</Link></span>
            </form>
        </div>
    )
}

export default Login
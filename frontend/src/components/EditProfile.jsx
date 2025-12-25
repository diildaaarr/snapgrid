import React, { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import axios from 'axios';
import { Loader2, Camera, User, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setAuthUser } from '@/redux/authSlice';

const EditProfile = () => {
    const imageRef = useRef();
    const { user } = useSelector(store => store.auth);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState({
        profilePhoto: user?.profilePicture,
        profilePhotoPreview: user?.profilePicture,
        bio: user?.bio || '',
        gender: user?.gender || ''
    });
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const fileChangeHandler = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setInput({ ...input, profilePhoto: file, profilePhotoPreview: reader.result });
            };
            reader.readAsDataURL(file);
        }
    }

    const selectChangeHandler = (value) => {
        setInput({ ...input, gender: value });
    }


    const editProfileHandler = async () => {
        console.log(input);
        const formData = new FormData();
        formData.append("bio", input.bio);
        formData.append("gender", input.gender);
        if(input.profilePhoto){
            formData.append("profilePhoto", input.profilePhoto);
        }
        try {
            setLoading(true);
            const res = await axios.post('https://snapgrid-r8kd.onrender.com/api/v1/user/profile/edit', formData,{
                headers:{
                    'Content-Type':'multipart/form-data'
                },
                withCredentials:true
            });
            if(res.data.success){
                const updatedUserData = {
                    ...user,
                    bio:res.data.user?.bio,
                    profilePicture:res.data.user?.profilePicture,
                    gender:res.data.user.gender
                };
                dispatch(setAuthUser(updatedUserData));
                navigate(`/profile/${user?._id}`);
                toast.success(res.data.message);
            }

        } catch (error) {
            console.log(error);
            toast.error(error.response.data.messasge);
        } finally{
            setLoading(false);
        }
    }
    return (
        <div className='flex max-w-3xl mx-auto pl-10'>
            <section className='flex flex-col gap-8 w-full my-8 p-6'>
                <div className='border-b border-gray-200 pb-4'>
                    <h1 className='font-bold text-2xl'>Edit Profile</h1>
                    <p className='text-gray-500 text-sm mt-1'>Update your profile information</p>
                </div>

                {/* Profile Photo Section */}
                <div className='flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-gray-50 rounded-xl border border-gray-200'>
                    <div className='relative flex-shrink-0'>
                        <Avatar className='h-24 w-24 border-4 border-white shadow-lg'>
                            <AvatarImage src={input.profilePhotoPreview || user?.profilePicture} alt="profile" />
                            <AvatarFallback className='text-lg'>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className='absolute bottom-0 right-0 bg-[#0095F6] rounded-full p-2 shadow-md cursor-pointer hover:bg-[#3192d2] transition-colors' onClick={() => imageRef?.current.click()}>
                            <Camera className='w-4 h-4 text-white' />
                        </div>
                    </div>
                    <div className='flex-1'>
                        <h2 className='font-semibold text-lg mb-1'>{user?.username}</h2>
                        <p className='text-gray-600 text-sm mb-4'>{input.bio || 'No bio yet'}</p>
                        <input ref={imageRef} onChange={fileChangeHandler} type='file' accept='image/*' className='hidden' />
                        <Button 
                            onClick={() => imageRef?.current.click()} 
                            variant='outline' 
                            className='border-gray-300 hover:bg-gray-100'
                        >
                            <Camera className='w-4 h-4 mr-2' />
                            Change Profile Photo
                        </Button>
                        <p className='text-xs text-gray-500 mt-2'>JPG, PNG or GIF. Max size of 5MB</p>
                    </div>
                </div>

                {/* Bio Section */}
                <div className='space-y-3'>
                    <Label htmlFor='bio' className='text-base font-semibold flex items-center gap-2'>
                        <FileText className='w-4 h-4' />
                        Bio
                    </Label>
                    <Textarea 
                        id='bio'
                        value={input.bio} 
                        onChange={(e) => setInput({ ...input, bio: e.target.value })} 
                        name='bio' 
                        className="focus-visible:ring-transparent min-h-[100px] resize-none" 
                        placeholder="Tell us about yourself..."
                        maxLength={150}
                    />
                    <p className='text-xs text-gray-500 text-right'>{input.bio?.length || 0}/150</p>
                </div>

                {/* Gender Section */}
                <div className='space-y-3'>
                    <Label htmlFor='gender' className='text-base font-semibold flex items-center gap-2'>
                        <User className='w-4 h-4' />
                        Gender
                    </Label>
                    <Select value={input.gender} onValueChange={selectChangeHandler}>
                        <SelectTrigger id='gender' className="w-full h-11">
                            <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                {/* Action Buttons */}
                <div className='flex justify-end gap-3 pt-4 border-t border-gray-200'>
                    <Button 
                        variant='outline' 
                        onClick={() => navigate(`/profile/${user?._id}`)}
                        className='px-6'
                    >
                        Cancel
                    </Button>
                    {
                        loading ? (
                            <Button className='px-6 bg-[#0095F6] hover:bg-[#3192d2]'>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                Saving...
                            </Button>
                        ) : (
                            <Button 
                                onClick={editProfileHandler} 
                                className='px-6 bg-[#0095F6] hover:bg-[#3192d2] shadow-sm'
                            >
                                Save Changes
                            </Button>
                        )
                    }
                </div>
            </section>
        </div>
    )
}

export default EditProfile
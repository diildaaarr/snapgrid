import React, { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { readFileAsDataURL } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setPosts } from '@/redux/postSlice';

const CreatePost = ({ open, setOpen }) => {
  const imageRef = useRef();
  const [file, setFile] = useState("");
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const {user} = useSelector(store=>store.auth);
  const {posts} = useSelector(store=>store.post);
  const dispatch = useDispatch();

  const fileChangeHandler = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const dataUrl = await readFileAsDataURL(file);
      setImagePreview(dataUrl);
    }
  }

  const createPostHandler = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    const trimmedCaption = caption.trim();
    if (!trimmedCaption) {
      toast.error("Please write a caption for your post");
      return;
    }
    
    if (!file) {
      toast.error("Please select an image");
      return;
    }
    
    // Debug log
    console.log("=== Creating Post ===");
    console.log("Caption:", trimmedCaption);
    console.log("File:", file.name, file.size, "bytes");
    
    const formData = new FormData();
    formData.append("caption", trimmedCaption);
    formData.append("image", file);
    
    // Log FormData contents
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value instanceof File ? 
        `File - ${value.name} (${value.size} bytes)` : 
        `Text - "${value}"`);
    }
    
    try {
      setLoading(true);
      console.log("Sending to backend...");
      
      const res = await axios.post(
        'https://snapgrid-r8kd.onrender.com/api/v1/post/addpost', 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        }
      );
      
      console.log("Backend response:", res.data);
      
      if (res.data.success) {
        dispatch(setPosts([res.data.post, ...posts]));
        toast.success(res.data.message);
        setOpen(false);
        // Reset form
        setCaption("");
        setFile("");
        setImagePreview("");
      }
    } catch (error) {
      console.error("Upload error:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  const handleClose = (isOpen) => {
    if (!isOpen) {
      setOpen(false);
      // Reset form when closing
      setCaption("");
      setFile("");
      setImagePreview("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-[95vw] sm:max-w-lg'>
        <DialogHeader className='text-center font-semibold text-base sm:text-lg'>
          Create New Post
        </DialogHeader>
        <div className='flex gap-2 sm:gap-3 items-center'>
          <Avatar className='w-8 h-8 sm:w-10 sm:h-10'>
            <AvatarImage src={user?.profilePicture} alt="img" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div>
            <h1 className='font-semibold text-xs sm:text-sm'>{user?.username}</h1>
            <span className='text-gray-600 text-xs line-clamp-1'>{user?.bio || "Bio here..."}</span>
          </div>
        </div>
        <Textarea 
          value={caption} 
          onChange={(e) => setCaption(e.target.value)} 
          className="focus-visible:ring-transparent border-none min-h-[80px] sm:min-h-[100px] text-sm" 
          placeholder="Write a caption..." 
          required
        />
        {
          imagePreview && (
            <div className='w-full h-48 sm:h-64 flex items-center justify-center'>
              <img 
                src={imagePreview} 
                alt="preview_img" 
                className='object-contain h-full w-full rounded-md' 
              />
            </div>
          )
        }
        <input 
          ref={imageRef} 
          type='file' 
          className='hidden' 
          onChange={fileChangeHandler}
          accept="image/*"
        />
        <Button 
          onClick={() => imageRef.current.click()} 
          className='w-fit mx-auto bg-[#0095F6] hover:bg-[#258bcf] text-sm'
        >
          {imagePreview ? "Change Image" : "Select from computer"}
        </Button>
        {
          imagePreview && (
            loading ? (
              <Button disabled className='text-sm'>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Please wait
              </Button>
            ) : (
              <Button 
                onClick={createPostHandler} 
                type="submit" 
                className="w-full bg-[#0095F6] hover:bg-[#258bcf] text-sm"
              >
                Post
              </Button>
            )
          )
        }
      </DialogContent>
    </Dialog>
  )
}

export default CreatePost
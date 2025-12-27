import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

export const addNewPost = async (req, res) => {
    try {
        const { caption } = req.body;
        const image = req.file;
        const authorId = req.id;

        console.log("Add new post request received");
        console.log("Caption:", caption);
        console.log("Author ID:", authorId);
        console.log("Image present:", !!image);

        if (!image) {
            console.log('Image upload failed: no image in req.file');
            return res.status(400).json({ message: 'Image required', success: false });
        }

        if (!caption) {
            return res.status(400).json({ 
                message: 'Caption is required', 
                success: false 
            });
        }

        let cloudResponse;
        try {
            console.log("Processing image with Sharp...");
            
            // image upload
            const optimizedImageBuffer = await sharp(image.buffer)
                .resize({ width: 800, height: 800, fit: 'inside' })
                .toFormat('jpeg', { quality: 80 })
                .toBuffer();

            // buffer to data uri
            const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
            console.log("Uploading to Cloudinary...");
            
            // Test Cloudinary configuration first
            console.log("Cloudinary config check - Cloud name:", process.env.CLOUD_NAME);
            
            cloudResponse = await cloudinary.uploader.upload(fileUri, {
                folder: "social-media-posts"
            });
            
            console.log("Cloudinary upload successful:", cloudResponse.secure_url);
        } catch (imgErr) {
            console.log('Image/cloudinary error:', imgErr);
            return res.status(500).json({ 
                message: 'Image upload failed', 
                success: false,
                error: imgErr.message 
            });
        }

        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId
        });
        
        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({ 
            path: 'author', 
            select: 'username profilePicture' 
        });

        return res.status(201).json({
            message: 'New post added',
            post,
            success: true,
        })

    } catch (error) {
        console.error('Add new post error:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            success: false,
            error: error.message 
        });
    }
}

export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.error('Get all posts error:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            success: false 
        });
    }
};

export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({ author: authorId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'author',
                select: 'username profilePicture' 
            })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture' 
                }
            });
        return res.status(200).json({
            posts,
            success: true
        });
    } catch (error) {
        console.log('Get user posts error:', error);
        return res.status(500).json({ 
            message: 'Server error', 
            success: false 
        });
    }
}

export const getPostById = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId)
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });
        
        if (!post) {
            return res.status(404).json({ 
                message: 'Post not found', 
                success: false 
            });
        }

        return res.status(200).json({
            post,
            success: true
        });
    } catch (error) {
        console.log('Get post by id error:', error);
        return res.status(500).json({ 
            message: 'Server error', 
            success: false 
        });
    }
}

export const likePost = async (req, res) => {
    try {
        const likeKrneWalaUserKiId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({
            message: 'Post not found',
            success: false
        });

        // like logic started
        await post.updateOne({ $addToSet: { likes: likeKrneWalaUserKiId } });

        // Get updated likes array
        const updatedPost = await Post.findById(postId);

        // implement socket io for real time notification
        const user = await User.findById(likeKrneWalaUserKiId).select('username profilePicture');

        const postOwnerId = post.author.toString();
        if(postOwnerId !== likeKrneWalaUserKiId){
            // emit a notification event
            const notification = {
                type:'like',
                userId:likeKrneWalaUserKiId,
                userDetails:user,
                postId,
                message:'Your post was liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification', notification);
        }

        return res.status(200).json({
            message:'Post liked',
            success:true,
            likes: updatedPost.likes
        });
    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({
            message: 'Internal server error',
            success: false
        });
    }
}

export const dislikePost = async (req, res) => {
    try {
        const likeKrneWalaUserKiId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({
            message: 'Post not found',
            success: false
        });

        // dislike logic
        await post.updateOne({ $pull: { likes: likeKrneWalaUserKiId } });

        // Get updated likes array
        const updatedPost = await Post.findById(postId);

        // implement socket io for real time notification
        const user = await User.findById(likeKrneWalaUserKiId).select('username profilePicture');
        const postOwnerId = post.author.toString();
        if(postOwnerId !== likeKrneWalaUserKiId){
            // emit a notification event
            const notification = {
                type:'dislike',
                userId:likeKrneWalaUserKiId,
                userDetails:user,
                postId,
                message:'Like removed from your post'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification', notification);
        }

        return res.status(200).json({
            message:'Post disliked',
            success:true,
            likes: updatedPost.likes
        });
    } catch (error) {
        console.error('Dislike post error:', error);
        res.status(500).json({
            message: 'Internal server error',
            success: false
        });
    }
}

export const addComment = async (req,res) =>{
    try {
        const postId = req.params.id;
        const commentKrneWalaUserKiId = req.id;

        const {text} = req.body;

        const post = await Post.findById(postId);

        if(!text) return res.status(400).json({
            message:'text is required', 
            success:false
        });

        const comment = await Comment.create({
            text,
            author:commentKrneWalaUserKiId,
            post:postId
        })

        await comment.populate({
            path:'author',
            select:"username profilePicture"
        });
        
        post.comments.push(comment._id);
        await post.save();

        return res.status(201).json({
            message:'Comment Added',
            comment,
            success:true
        })

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            success: false 
        });
    }
};

export const getCommentsOfPost = async (req,res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({post:postId})
            .populate('author', 'username profilePicture');

        if(!comments) return res.status(404).json({
            message:'No comments found for this post', 
            success:false
        });

        return res.status(200).json({
            success:true,
            comments
        });

    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            success: false 
        });
    }
}

export const deletePost = async (req,res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({
            message:'Post not found', 
            success:false
        });

        // check if the logged-in user is the owner of the post
        if(post.author.toString() !== authorId) return res.status(403).json({
            message:'Unauthorized',
            success: false
        });

        // delete post
        await Post.findByIdAndDelete(postId);

        // remove the post id from the user's post
        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() !== postId);
        await user.save();

        // delete associated comments
        await Comment.deleteMany({post:postId});

        return res.status(200).json({
            success:true,
            message:'Post deleted'
        })

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            success: false 
        });
    }
}

export const bookmarkPost = async (req,res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({
            message:'Post not found', 
            success:false
        });
        
        const user = await User.findById(authorId);
        if(user.bookmarks.includes(post._id)){
            // already bookmarked -> remove from the bookmark
            await user.updateOne({$pull:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({
                type:'unsaved', 
                message:'Post removed from bookmark', 
                success:true
            });

        }else{
            // bookmark krna pdega
            await user.updateOne({$addToSet:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({
                type:'saved', 
                message:'Post bookmarked', 
                success:true
            });
        }

    } catch (error) {
        console.error('Bookmark post error:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            success: false 
        });
    }
}
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "All fields are required",
                success: false,
            });
        }
        
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                message: "Email already exists",
                success: false,
            });
        };
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password: hashedPassword
        });
        
        return res.status(201).json({
            message: "Account created successfully.",
            success: true,
        });
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
                success: false,
            });
        }
        
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password",
                success: false,
            });
        }
        
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Invalid email or password",
                success: false,
            });
        };

        const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });

        // Fix: Better way to populate posts
        const populatedUser = await User.findById(user._id)
            .populate({
                path: 'posts',
                options: { sort: { createdAt: -1 } }
            })
            .select('-password');

        const userResponse = {
            _id: populatedUser._id,
            username: populatedUser.username,
            email: populatedUser.email,
            profilePicture: populatedUser.profilePicture,
            bio: populatedUser.bio,
            followers: populatedUser.followers,
            following: populatedUser.following,
            posts: populatedUser.posts || [],
            bookmarks: populatedUser.bookmarks || []
        };

        return res.cookie('token', token, { 
            httpOnly: true, 
            sameSite: 'strict', 
            maxAge: 1 * 24 * 60 * 60 * 1000 
        }).json({
            message: `Welcome back ${userResponse.username}`,
            success: true,
            user: userResponse
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const logout = async (_, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            message: 'Logged out successfully.',
            success: true
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId)
            .populate({
                path: 'posts',
                options: { sort: { createdAt: -1 } }
            })
            .populate('bookmarks')
            .select('-password');
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            });
        }
        
        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.error("Get profile error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            });
        };
        
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: 'Profile updated.',
            success: true,
            user
        });

    } catch (error) {
        console.error("Edit profile error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 5;
        
        let query = User.find({ _id: { $ne: req.id } }).select("-password");
        
        // If limit is provided and greater than 0, apply it. Otherwise, return all users
        if (limit > 0) {
            query = query.limit(limit);
        }
        
        const suggestedUsers = await query;
        
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.error('Get suggested users error:', error);
        return res.status(500).json({ 
            message: 'Internal server error', 
            success: false 
        });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        
        let users;
        
        if (!query || query.trim() === '') {
            // If no query, return all users sorted by username
            users = await User.find({ 
                _id: { $ne: req.id } // Exclude current user
            })
            .select("-password")
            .sort({ username: 1 }); // Sort alphabetically by username
        } else {
            // If query exists, search by username
            const searchQuery = new RegExp(query, 'i'); // Case-insensitive search
            users = await User.find({ 
                username: searchQuery,
                _id: { $ne: req.id } // Exclude current user
            })
            .select("-password")
            .sort({ username: 1 }); // Sort alphabetically by username
        }
        
        return res.status(200).json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('Search users error:', error);
        return res.status(500).json({ 
            message: 'Internal server error', 
            success: false 
        });
    }
};

export const followOrUnfollow = async (req, res) => {
    try {
        const followerId = req.id; // Current user
        const followingId = req.params.id; // User to follow/unfollow

        console.log("Follow/Unfollow request:");
        console.log("Follower ID:", followerId);
        console.log("Following ID:", followingId);

        if (!followerId) {
            return res.status(401).json({
                message: 'User not authenticated',
                success: false
            });
        }
        
        if (!followingId) {
            return res.status(400).json({
                message: 'No user specified to follow/unfollow',
                success: false
            });
        }
        
        if (followerId === followingId) {
            return res.status(400).json({
                message: 'You cannot follow/unfollow yourself',
                success: false
            });
        }

        const follower = await User.findById(followerId);
        const following = await User.findById(followingId);

        if (!follower || !following) {
            return res.status(404).json({
                message: 'User not found',
                success: false
            });
        }

        // Check if already following - convert to string for comparison
        const isFollowing = follower.following.some(id => id.toString() === followingId.toString());
        
        if (isFollowing) {
            // Unfollow logic
            await Promise.all([
                User.updateOne({ _id: followerId }, { $pull: { following: followingId } }),
                User.updateOne({ _id: followingId }, { $pull: { followers: followerId } }),
            ]);
            
            console.log(`User ${followerId} unfollowed ${followingId}`);
            
            return res.status(200).json({ 
                message: 'Unfollowed successfully', 
                success: true,
                action: 'unfollow'
            });
        } else {
            // Follow logic
            await Promise.all([
                User.updateOne({ _id: followerId }, { $push: { following: followingId } }),
                User.updateOne({ _id: followingId }, { $push: { followers: followerId } }),
            ]);
            
            console.log(`User ${followerId} followed ${followingId}`);
            
            return res.status(200).json({ 
                message: 'Followed successfully', 
                success: true,
                action: 'follow'
            });
        }
    } catch (error) {
        console.error('Follow/Unfollow error:', error);
        return res.status(500).json({ 
            message: 'Internal server error', 
            success: false,
            error: error.message 
        });
    }
}
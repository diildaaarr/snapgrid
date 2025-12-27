import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { getMessage, sendMessage, getAllConversations, deleteConversation, clearChat, deleteUser } from "../controllers/message.controller.js";

const router = express.Router();

router.route('/send/:id').post(isAuthenticated, sendMessage);
router.route('/all/:id').get(isAuthenticated, getMessage);
router.route('/conversations').get(isAuthenticated, getAllConversations);
router.route('/delete/:id').delete(isAuthenticated, deleteConversation);
router.route('/clear-chat/:id').delete(isAuthenticated, clearChat);
router.route('/delete-user/:id').delete(isAuthenticated, deleteUser);
 
export default router;
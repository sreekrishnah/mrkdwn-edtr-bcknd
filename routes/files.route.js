import express from "express";
import { authMiddleware } from "../middlewares/jwt.auth.js";
import { getFiles, createAndUploadFile, updateMarkdownFile, getFileText, DownloadFile, RenameFile, DeleteFile, ToggleFavorite } from "../controllers/files.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getFiles);
router.get("/getfile", authMiddleware, getFileText);
router.post("/create", authMiddleware, createAndUploadFile);
router.put("/update", authMiddleware, updateMarkdownFile);
router.put("/rename", authMiddleware, RenameFile);
router.put("/favorite", authMiddleware, ToggleFavorite);
router.get("/download", authMiddleware, DownloadFile);
router.delete("/delete", authMiddleware, DeleteFile);

export default router;
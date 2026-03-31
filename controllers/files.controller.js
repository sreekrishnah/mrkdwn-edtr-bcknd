import UserFileCollection from "../models/userFile.model.js";
import { getFile, updateFile, uploadFile, renameFile, downloadFile, deleteFile } from "../utils/googleService.js";
import User from "../models/user.model.js"
import { parseFormData } from "../utils/fileParsing.js";
import fs from "fs";

export const getFiles = async( req, res ) =>{
    console.log("STARTED FILE FETCHING API");
    try{
        const { userKey } = req.query;
        const filesCollection = await UserFileCollection.findOne({ userKey });

        if(!filesCollection){
            return res.status(404).json({ message: "Files not found" });
        }

        return res.status(200).json({ message: "success", files: filesCollection.files });
    }catch(err){
        console.log("Error getting files:", err);
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
}

export const getFileText = async( req,res ) => {
    console.log("FILE DATA FETCHING API STARTED");
    try{
        const { fileId } = req.query;

        if (!fileId) {
        return res.status(400).json({ message: "Missing required fields." });
        }

        const file = await UserFileCollection.findOne(
            { "files.driveFileId": fileId }
        );

        if (!file) {
        return res.status(404).json({ message: "File not found" });
        }

        const targetFile = file.files.find(f => f.driveFileId === fileId);
        const isFavorite = targetFile ? targetFile.isFavorite : false;

        const fileData = await getFile(fileId);
        console.log(fileData);
        return res.status(200).json({ 
            message: "success", 
            file: fileData.file, 
            fileName: fileData.fileName,
            isFavorite
        });
    }catch(err){
        console.log("Error getting file data:", err);
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
}

export const createAndUploadFile = async( req,res ) => {
    console.log("FILE CREATION API STARTED");
    try{
        const { fields, files } = await parseFormData(req);
        const userKey = fields.userKey?.[0]; 
        const uploadedFile = files.file?.[0]; 

        console.log(uploadedFile);

        if (!userKey || !uploadedFile) {
        return res.status(400).json({ message: "Missing required fields." });
        }

        const user = await User.findOne({ userKey });
        if(!user){
         return res.status(404).json({ message: "User not found" });   
        }

        const driveResponse = await uploadFile(
            uploadedFile.originalFilename, 
            uploadedFile.filepath,
            user.driveFolderId, 
        );

        const fileData = {
            fileName: uploadedFile.originalFilename,
            driveFileId: driveResponse.id,
            publicUrl: driveResponse.webViewLink,
            uploadedAt: new Date(),
        };

        const update = {
            $push: { files: fileData },
            $setOnInsert: { user: user._id, userKey: user.userKey },
        };

        const options = { upsert: true, new: true };

        await UserFileCollection.findOneAndUpdate({ userKey }, update, options);

        fs.unlink(uploadedFile.filepath, (err) => {
            if (err) console.error("Temp file cleanup failed:", err);
        });

        return res.status(200).json({
            message: "File uploaded and saved successfully.",
            file: driveResponse,
        });

    }catch(err){
        console.log("Error uploading Files", err);
        return res.status(500).json({message:"Internal Server Error", error:err});
    }
}

export const updateMarkdownFile = async( req,res ) => {
    console.log("Started File Update API");
    try{
        const { fields, files } = await parseFormData(req);
        const userKey = fields.userKey?.[0]; 
        const fileId = fields.fileId?.[0];
        const uploadedFile = files.file?.[0];

        if (!fileId || !uploadedFile) {
        return res.status(400).json({ message: "Missing required fields." });
        }

        const user = await User.findOne({ userKey });
        if(!user){
         return res.status(404).json({ message: "User not found" });   
        }

        const driveResponse = await updateFile(
            fileId,
            uploadedFile.filepath,
            uploadedFile.originalFilename,
        )

        const updatedMetadata = await UserFileCollection.findOneAndUpdate(
            { "files.driveFileId": fileId },
            {
                $set: {
                "files.$.fileName": uploadedFile.originalFilename,
                "files.$.updatedAt": new Date(),
                },
            },
            { new: true }
        );

        if (!updatedMetadata) {
            return res.status(404).json({ message: "File record not found in database." });
        }

        fs.unlink(uploadedFile.filepath, (err) => {
            if (err) console.error("Temp file cleanup failed:", err);
        });

        return res.status(200).json({
            message: "File updated successfully",
            driveFile: driveResponse,
            dbFile: updatedMetadata,
        });
    }catch(err){
        console.log("Error updating file", err);
        return res.status(500).json({message:"Internal Server Error", error:err});
    }
}

export const RenameFile = async (req, res) => {
  try {
    const { fileId, newFileName } = req.body;

    const driveResponse = await renameFile(fileId, newFileName);

    const dbResponse = await UserFileCollection.findOneAndUpdate(
      { "files.driveFileId": fileId },
      {
        $set: {
          "files.$.fileName": newFileName,
          "files.$.updatedAt": new Date(),
        },
      },
      { new: true }
    );

    if (!dbResponse) {
      return res.status(404).json({ message: "File not found in DB" });
    }

    return res.status(200).json({
      message: "File renamed successfully",
      driveFile: driveResponse,
      dbFile: dbResponse,
    });
  } catch (err) {
    console.log("Error renaming file", err);
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
};

export const DownloadFile = async( req, res ) => {
    try{
        const { fileId } = req.query;
        const driveResponse = await downloadFile(fileId);
        return res.status(200).json({ message: "File downloaded successfully", driveFile: driveResponse });
    }catch(err){
        console.log("Error downloading file", err);
        return res.status(500).json({message:"Internal Server Error", error:err});
    }
}

export const DeleteFile = async (req, res) => {
    console.log("Deletion API started");
  try {
    console.log("Received Data", req.body);
    const { fileId, userKey } = req.body;

    const driveResponse = await deleteFile(fileId);

    const dbResponse = await UserFileCollection.findOneAndUpdate(
      { userKey },
      {
        $pull: { files: { driveFileId: fileId } },
      },
      { new: true }
    );

    if (!dbResponse) {
      return res.status(404).json({ message: "File not found in DB" });
    }

    return res.status(200).json({
      message: "File deleted successfully",
      driveFile: driveResponse,
      dbFile: dbResponse,
    });
  } catch (err) {
    console.log("Error deleting file", err);
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
};

export const ToggleFavorite = async (req, res) => {
  try {
    const { fileId, isFavorite } = req.body;

    const dbResponse = await UserFileCollection.findOneAndUpdate(
      { "files.driveFileId": fileId },
      {
        $set: {
          "files.$.isFavorite": isFavorite,
          "files.$.updatedAt": new Date(),
        },
      },
      { new: true }
    );

    if (!dbResponse) {
      return res.status(404).json({ message: "File not found in DB" });
    }

    return res.status(200).json({
      message: "Favorite status updated",
      dbFile: dbResponse,
    });
  } catch (err) {
    console.log("Error toggling favorite", err);
    return res.status(500).json({ message: "Internal Server Error", error: err });
  }
};

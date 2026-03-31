import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  driveFileId: {
    type: String,
    required: true,
  },
  publicUrl: {
    type: String,
    required: true,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
   type: Date,
   default: Date.now, 
  }
}, { _id: false }); 

const userFileCollectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true 
  },
    userKey: {
    type: String,
    required: true,
    unique: true,
  },
  files: [fileSchema]
}, { timestamps: true });

export default mongoose.model('UserFileCollection', userFileCollectionSchema);

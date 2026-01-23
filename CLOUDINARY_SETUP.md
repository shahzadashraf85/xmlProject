# Cloudinary Setup for Image Uploads

## 📸 Overview
The Best Buy listing system now supports drag-and-drop image uploads directly to Cloudinary. Images are automatically uploaded when you drag them into the image fields.

## 🔧 Setup Instructions

### Step 1: Create a Cloudinary Account
1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. After logging in, go to your Dashboard

### Step 2: Get Your Credentials
From your Cloudinary Dashboard, you'll need:
- **Cloud Name**: Found at the top of your dashboard
- **Upload Preset**: You need to create this

### Step 3: Create an Upload Preset
1. In Cloudinary Dashboard, go to **Settings** → **Upload**
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Configure:
   - **Preset name**: `bestbuy-products` (or any name you prefer)
   - **Signing Mode**: **Unsigned** (important!)
   - **Folder**: `bestbuy-products` (optional, for organization)
   - **Allowed formats**: `jpg, png, gif, webp`
5. Click **Save**

### Step 4: Add to .env File
Open `/Users/sh/Documents/Laptekexport/.env` and update:

```env
# Cloudinary (for product image uploads)
VITE_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=bestbuy-products
```

Replace `your_actual_cloud_name` with your Cloud Name from Step 2.

### Step 5: Restart Dev Server
```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

## ✨ How It Works

### For Image Fields
Any field with "image" or "img" in its code will automatically show the image upload component:
- `_MP_Source_Image_URL_01_Category_Root_EN` → Image upload
- `_MP_Source_Image_URL_02_Category_Root_EN` → Image upload
- etc.

### Usage
1. **Drag and Drop**: Drag an image file onto the upload area
2. **Click to Upload**: Click the upload area to select a file
3. **Auto-Save**: Image is uploaded to Cloudinary automatically
4. **URL Copied**: The Cloudinary URL is automatically filled into the field
5. **Preview**: See the uploaded image immediately
6. **Edit URL**: You can manually edit the URL if needed
7. **Remove**: Hover over the image and click the X button to remove

### Features
- ✅ Drag and drop support
- ✅ Automatic upload to Cloudinary
- ✅ Image preview
- ✅ Manual URL editing
- ✅ Remove/clear image
- ✅ Loading states
- ✅ Error handling
- ✅ Organized in `bestbuy-products` folder

## 🎯 Example Workflow

1. Edit a Best Buy listing
2. Go to the "Images" tab (or wherever image fields are)
3. Drag your product image onto the first image field
4. Wait for "Image uploaded to Cloudinary!" message
5. See the Cloudinary URL automatically filled
6. Repeat for additional images
7. Click "Save & Verify"

## 🔒 Security Notes

- Upload preset is **unsigned** for easy client-side uploads
- Images are stored in your Cloudinary account
- URLs are public (required for Best Buy)
- Consider setting up transformations in Cloudinary for optimization

## 📊 Cloudinary Free Tier
- 25 GB storage
- 25 GB bandwidth/month
- Perfect for product images

## 🐛 Troubleshooting

**Error: "Cloudinary not configured"**
- Make sure you added the credentials to `.env`
- Restart the dev server after editing `.env`

**Upload fails**
- Check that upload preset is set to "Unsigned"
- Verify your Cloud Name is correct
- Check browser console for detailed errors

**Image doesn't show**
- Verify the URL is accessible
- Check Cloudinary dashboard to see if upload succeeded
- Try manually entering a test URL

## 📝 Notes
- Images are uploaded immediately on drop
- No need to click "Save" before uploading
- Each image field is independent
- Supports PNG, JPG, GIF, WebP formats
- Maximum file size: 10MB (Cloudinary default)

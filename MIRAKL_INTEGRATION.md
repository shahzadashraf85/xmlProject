# Mirakl Best Buy Integration - Messages Feature

## Overview

This integration allows you to view and manage messages from your Mirakl Best Buy seller account directly within the Laptek Systems application.

## Features

- 📧 **View Messages**: Browse all messages from your Mirakl seller account
- 🔍 **Filter Unread**: Toggle to show only unread messages
- 📖 **Mark as Read**: Automatically mark messages as read when opened
- 💬 **Reply to Messages**: Send replies directly from the interface
- 🔄 **Real-time Refresh**: Manually refresh to get the latest messages
- 📊 **Message Details**: View full message content, metadata, and related entities

## Setup Instructions

### 1. Get Your Mirakl API Credentials

1. Log in to your Mirakl Best Buy seller account
2. Navigate to **Settings** → **API Credentials** (or similar section)
3. Generate or copy your API key
4. Note your Mirakl instance URL (e.g., `https://bestbuy-seller.mirakl.net`)

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```bash
# Mirakl API Configuration
VITE_MIRAKL_API_URL=https://your-mirakl-instance.mirakl.net
VITE_MIRAKL_API_KEY=your_mirakl_api_key_here
```

**Important**: Replace the placeholder values with your actual Mirakl credentials.

### 3. Restart the Development Server

After updating your `.env` file, restart the development server:

```bash
npm run dev
```

## Usage

### Accessing Messages

1. Log in to the application
2. Click on **Messages** (📧) in the sidebar
3. The messages page will load automatically

### Viewing Messages

- Click on any message in the left panel to view its details
- Unread messages are highlighted with a blue dot
- Messages are automatically marked as read when opened

### Filtering Messages

- Use the **Unread only** checkbox to filter unread messages
- Click **Refresh** (🔄) to reload messages from the server

### Replying to Messages

1. Select a message from the list
2. Type your reply in the text area at the bottom
3. Click **Send Reply** (📤)
4. The message list will refresh to show the updated conversation

## API Endpoints Used

This integration uses the following Mirakl API endpoints:

- `GET /api/messages` - Fetch messages
- `PUT /api/messages/{id}/read` - Mark message as read
- `POST /api/messages/{id}/reply` - Send a reply

## Troubleshooting

### Error: "Mirakl API credentials not configured"

**Solution**: Make sure you've added `VITE_MIRAKL_API_URL` and `VITE_MIRAKL_API_KEY` to your `.env` file and restarted the dev server.

### Error: "Mirakl API error (401)"

**Solution**: Your API key is invalid or expired. Generate a new API key from your Mirakl seller account.

### Error: "Mirakl API error (403)"

**Solution**: Your API key doesn't have permission to access messages. Check your API key permissions in the Mirakl seller portal.

### Messages not loading

**Solution**: 
1. Check your browser console for errors
2. Verify your Mirakl API URL is correct
3. Ensure your API key has the necessary permissions
4. Check your network connection

## Security Notes

- ⚠️ **Never commit your `.env` file** to version control
- 🔒 API keys are sensitive - keep them secure
- 🔐 The API key is only used in the frontend for this demo; in production, consider using a backend proxy for better security

## API Documentation

For more information about the Mirakl API, refer to:
- [Mirakl API Documentation](https://help.mirakl.net/api-documentation/)
- Your Mirakl seller portal's API documentation section

## Support

If you encounter issues with the Mirakl integration:

1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify your API credentials are correct
4. Contact Mirakl support for API-specific issues

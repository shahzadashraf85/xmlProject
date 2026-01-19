import { useState, useEffect } from 'react';
import { fetchMiraklMessages, markMessageAsRead, replyToMessage, fetchMessageThread, generateAiReply, type MiraklMessage } from '../utils/miraklApi';

export default function Messages() {
    const [messages, setMessages] = useState<MiraklMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<MiraklMessage | null>(null);
    const [messageThread, setMessageThread] = useState<MiraklMessage[]>([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [generatingReply, setGeneratingReply] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
    const [totalCount, setTotalCount] = useState(0);

    // ... (rest of the file until the Reply section)

    async function handleGenerateAiReply() {
        if (!selectedMessage) return;

        setGeneratingReply(true);
        try {
            // Use the thread if available, otherwise just use the selected message
            const initialContext = messageThread.length > 0 ? messageThread : [selectedMessage];
            const suggestedReply = await generateAiReply(initialContext);
            setReplyText(suggestedReply);
        } catch (err) {
            console.error('Error generating reply:', err);
            alert('Failed to generate AI reply. Please try again.');
        } finally {
            setGeneratingReply(false);
        }
    }

    // ... (rendering code)



    useEffect(() => {
        loadMessages();
    }, [activeTab]);

    async function loadMessages() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchMiraklMessages({
                max: 50,
                offset: 0,
                unread_only: activeTab === 'unread',
            });

            // Group messages by order_id to show only one conversation per order
            const allMessages = response.messages || [];
            const uniqueConversationsMap = new Map();

            allMessages.forEach(msg => {
                // Use order_id as key. If not available, fall back to id (legacy)
                const key = msg.order_id || msg.id;

                // CHECK LOCAL STORAGE FOR READ STATUS (Fix for API failure)
                const localReadIds = JSON.parse(localStorage.getItem('mirakl_read_messages') || '[]');
                if (localReadIds.includes(String(msg.id))) {
                    msg.read = true;
                    msg.unread = false;
                }

                // If we haven't seen this order yet, or if this message is newer than the one we have
                if (!uniqueConversationsMap.has(key)) {
                    uniqueConversationsMap.set(key, msg);
                } else {
                    const existingMsg = uniqueConversationsMap.get(key);
                    if (new Date(msg.date_created) > new Date(existingMsg.date_created)) {
                        uniqueConversationsMap.set(key, msg);
                    }
                }
            });

            // Convert map values back to array and sort by date descending
            const uniqueConversations = Array.from(uniqueConversationsMap.values())
                .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());

            // Apply Unread Filter on the processed list (since API might default to returning everything, or local read status changes affect it)
            const finalMessages = activeTab === 'unread'
                ? uniqueConversations.filter(m => m.unread)
                : uniqueConversations;

            setMessages(finalMessages);
            setTotalCount(response.total_count || 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load messages');
            console.error('Error loading messages:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleMessageClick(message: MiraklMessage) {
        setSelectedMessage(message);
        setMessageThread([]);
        setLoadingThread(true);

        // Fetch message thread using order_id if available, otherwise fallback to message id
        const threadId = message.order_id || String(message.id);

        try {
            const threadData = await fetchMessageThread(threadId);
            setMessageThread(threadData.messages || []);
        } catch (err) {
            console.error('Error fetching thread:', err);
            // If thread fetch fails, just show the single message
            setMessageThread([message]);
        } finally {
            setLoadingThread(false);
        }

        // Mark as read if unread
        if (message.unread || !message.read) {
            // Optimistically update UI
            setMessages(prev => prev.map(m =>
                m.id === message.id ? { ...m, unread: false, read: true } : m
            ));

            // SAVE TO LOCAL STORAGE
            const localReadIds = JSON.parse(localStorage.getItem('mirakl_read_messages') || '[]');
            if (!localReadIds.includes(String(message.id))) {
                localReadIds.push(String(message.id));
                localStorage.setItem('mirakl_read_messages', JSON.stringify(localReadIds));
            }

            try {
                await markMessageAsRead(String(message.id));
            } catch (err) {
                console.warn('Failed to mark as read on server:', err);
            }
        }
    }

    async function handleSendReply() {
        if (!selectedMessage || !replyText.trim()) return;

        setSendingReply(true);
        try {
            await replyToMessage(String(selectedMessage.id), replyText);
            setReplyText('');
            alert('Reply sent successfully!');
            // Reload messages to get updated conversation
            await loadMessages();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to send reply');
        } finally {
            setSendingReply(false);
        }
    }

    function formatDate(dateString: string) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }

    return (
        <div className="h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Mirakl Messages</h1>
                        <p className="text-sm text-gray-500 mt-1">Best Buy Seller Messages</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-4">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'all'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveTab('unread')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'unread'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Unread
                            </button>
                        </div>
                        <button
                            onClick={loadMessages}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <span>🔄</span>
                            Refresh
                        </button>
                    </div>
                </div>
                {totalCount > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                        Showing {messages.length} of {totalCount} messages
                    </p>
                )}
            </div>

            <div className="flex h-[calc(100vh-140px)]">
                {/* Left Panel - Messages List */}
                <div className="w-1/4 bg-white border-r border-gray-200 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-gray-500 mt-4">Loading messages...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="p-6">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">⚠️</span>
                                    <div>
                                        <h3 className="font-semibold text-red-900">Error Loading Messages</h3>
                                        <p className="text-sm text-red-700 mt-1">{error}</p>
                                        <button
                                            onClick={loadMessages}
                                            className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                                        >
                                            Try again
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <span className="text-6xl">📭</span>
                                <p className="text-gray-500 mt-4">No messages found</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    onClick={() => handleMessageClick(message)}
                                    className={`p-4 cursor-pointer transition-colors ${selectedMessage?.id === message.id
                                        ? 'bg-blue-50 border-l-4 border-blue-600'
                                        : 'hover:bg-gray-50'
                                        } ${(message.unread || !message.read) ? 'bg-blue-50/30' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {(message.unread || !message.read) && (
                                                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                                )}
                                                <h3 className={`text-sm truncate ${(message.unread || !message.read) ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                                                    }`}>
                                                    {message.subject}
                                                </h3>
                                            </div>

                                            {/* Order and Customer Info */}
                                            <div className="mt-2 space-y-1">
                                                {message.order_id && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-blue-600">📦</span>
                                                        <span className="text-xs text-gray-600">
                                                            Order: <span className="font-medium text-gray-900">{message.order_id}</span>
                                                        </span>
                                                    </div>
                                                )}
                                                {message.from_name && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-green-600">👤</span>
                                                        <span className="text-xs text-gray-600">
                                                            Customer: <span className="font-medium text-gray-900">{message.from_name}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                                {message.body}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-400">
                                                    {formatDate(message.date_created)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Middle Panel - Message Content and Reply */}
                <div className="flex-1 bg-white overflow-y-auto">
                    {selectedMessage ? (
                        <div className="h-full flex flex-col">
                            {/* Message Header */}
                            <div className="border-b border-gray-200 p-6">
                                <h2 className="text-xl font-bold text-gray-900">{selectedMessage.subject}</h2>
                            </div>

                            {/* Message Thread */}
                            <div className="flex-1 p-6 overflow-y-auto">
                                {loadingThread ? (
                                    <div className="flex items-center justify-center h-32">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : messageThread.length > 0 ? (
                                    <div className="space-y-4">
                                        {messageThread.map((msg, idx) => {
                                            const isFromCustomer = msg.from_type === 'CUSTOMER' || msg.from?.type === 'CUSTOMER';
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex ${isFromCustomer ? 'justify-start' : 'justify-end'}`}
                                                >
                                                    <div className={`max-w-[80%] rounded-lg p-4 ${isFromCustomer
                                                        ? 'bg-gray-100 text-gray-900'
                                                        : 'bg-blue-600 text-white'
                                                        }`}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs font-semibold">
                                                                {msg.from_name || msg.from?.type || 'Unknown'}
                                                            </span>
                                                            <span className={`text-xs ${isFromCustomer ? 'text-gray-500' : 'text-blue-100'}`}>
                                                                {formatDate(msg.date_created)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="prose max-w-none">
                                        <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                                            {selectedMessage.body}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reply Section */}
                            <div className="border-t border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-700">Reply</h3>
                                    <button
                                        onClick={handleGenerateAiReply}
                                        disabled={generatingReply}
                                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 text-xs font-medium flex items-center gap-1 transition-colors"
                                    >
                                        {generatingReply ? (
                                            <>
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-700"></div>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <span>✨</span>
                                                Generate AI Reply
                                            </>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply here..."
                                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                                <div className="flex justify-end mt-3">
                                    <button
                                        onClick={handleSendReply}
                                        disabled={!replyText.trim() || sendingReply}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {sendingReply ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <span>📤</span>
                                                Send Reply
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <span className="text-6xl">💬</span>
                                <p className="text-gray-500 mt-4">Select a message to view details</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Order Details Sidebar */}
                <div className="w-1/4 bg-gray-50 border-l border-gray-200 overflow-y-auto">
                    {selectedMessage ? (
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-gray-900 uppercase mb-4">Order Details</h3>

                            <div className="space-y-4">
                                {selectedMessage.order_id && (
                                    <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Order ID</span>
                                        <p className="text-base font-medium text-gray-900">{selectedMessage.order_id}</p>
                                    </div>
                                )}
                                {selectedMessage.commercial_id && (
                                    <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Commercial ID</span>
                                        <p className="text-base font-medium text-gray-900">{selectedMessage.commercial_id}</p>
                                    </div>
                                )}
                                {selectedMessage.from_name && (
                                    <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Customer Name</span>
                                        <p className="text-base font-medium text-gray-900">{selectedMessage.from_name}</p>
                                    </div>
                                )}
                                {selectedMessage.from_type && (
                                    <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Sender Type</span>
                                        <p className="text-base font-medium text-gray-900">{selectedMessage.from_type}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Date</span>
                                    <p className="text-base font-medium text-gray-900">{formatDate(selectedMessage.date_created)}</p>
                                </div>
                                {selectedMessage.to_shop_name && (
                                    <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">To Shop</span>
                                        <p className="text-base font-medium text-gray-900">{selectedMessage.to_shop_name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full p-6">
                            <p className="text-sm text-gray-500 text-center">Select a message to view order details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

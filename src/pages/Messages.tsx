import { useState, useEffect } from 'react';
import { fetchMiraklMessages, markMessageAsRead, replyToMessage, fetchMessageThread, generateAiReply, fetchLocalReadStates, saveLocalReadState, type MiraklMessage } from '../utils/miraklApi';

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

            // SYNC: Fetch Read Statuses from Database
            const allMessageIds = allMessages.map(m => String(m.id));
            const dbReadAndVerified = await fetchLocalReadStates(allMessageIds);

            const uniqueConversationsMap = new Map();

            allMessages.forEach(msg => {
                // Use order_id as key. If not available, fall back to id (legacy)
                const key = msg.order_id || msg.id;

                // CHECK LOCAL STORAGE AND DATABASE
                const localReadIds = JSON.parse(localStorage.getItem('mirakl_read_messages') || '[]');
                const isReadInDb = dbReadAndVerified.includes(String(msg.id));

                if (localReadIds.includes(String(msg.id)) || isReadInDb) {
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

            // SAVE TO DATABASE
            saveLocalReadState(String(message.id));

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

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 text-left">
            {/* LEFT PANEL: Message List */}
            <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col min-w-[300px]">
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">Mirakl Messages</h1>
                    <p className="text-xs text-gray-500 mt-1">Best Buy Seller Messages</p>
                    {totalCount > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                            Showing {messages.length} of {totalCount} messages
                        </p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center">
                            <p className="text-sm text-red-600">{error}</p>
                            <button onClick={loadMessages} className="text-xs text-blue-600 underline mt-2">Try again</button>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <span className="text-4xl block mb-2">📭</span>
                            No messages found
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    onClick={() => handleMessageClick(message)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${selectedMessage?.id === message.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                        } ${(message.unread || !message.read) ? 'bg-blue-50/30' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`text-sm truncate pr-2 ${message.unread || !message.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                            {message.subject}
                                        </h3>
                                        {/* Status Dot */}
                                        {(message.unread || !message.read) && (
                                            <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                                        )}
                                    </div>

                                    {/* Order/Customer Snippet */}
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                        <span className="font-medium text-gray-700">{message.order_id || 'No Order ID'}</span>
                                        <span>•</span>
                                        <span className="truncate max-w-[100px]">{message.from_name || 'Customer'}</span>
                                    </div>

                                    <p className="text-xs text-gray-400 mb-1 line-clamp-1">{message.body}</p>
                                    <span className="text-[10px] text-gray-400">{formatDate(message.date_created)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MIDDLE PANEL: Thread & Reply */}
            <div className="flex-1 bg-white flex flex-col border-r border-gray-200 min-w-[400px]">
                {selectedMessage ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">{selectedMessage.subject}</h2>
                        </div>

                        {/* Thread */}
                        <div className="flex-1 p-6 overflow-y-auto bg-white">
                            {loadingThread ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : messageThread.length > 0 ? (
                                <div className="space-y-6">
                                    {messageThread.map((msg, idx) => {
                                        const isFromCustomer = msg.from_type === 'CUSTOMER' || msg.from?.type === 'CUSTOMER';
                                        return (
                                            <div key={idx} className={`flex ${isFromCustomer ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`max-w-[85%] rounded-lg p-4 shadow-sm ${isFromCustomer ? 'bg-gray-100 text-gray-900' : 'bg-blue-600 text-white'
                                                    }`}>
                                                    <div className="flex items-center gap-2 mb-2 text-xs opacity-80 font-medium">
                                                        <span>{msg.from_name || (isFromCustomer ? 'Customer' : 'You')}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(msg.date_created)}</span>
                                                    </div>
                                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm text-gray-700">
                                    {selectedMessage.body}
                                </div>
                            )}
                        </div>

                        {/* Reply Box */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-semibold text-gray-700">Reply</span>
                                <button
                                    onClick={handleGenerateAiReply}
                                    disabled={generatingReply}
                                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {generatingReply ? 'Generating...' : '✨ AI Suggestion'}
                                </button>
                            </div>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none mb-3"
                                placeholder="Type your reply here..."
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim() || sendingReply}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {sendingReply ? 'Sending...' : 'Send Reply'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <span className="text-6xl block mb-4">💬</span>
                            <p>Select a conversation to start</p>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT PANEL: Details & Controls */}
            <div className="w-[320px] bg-gray-50 border-l border-gray-200 flex flex-col flex-shrink-0">
                {/* CONTROLS HEADER */}
                <div className="p-4 bg-white border-b border-gray-200 flex justify-end gap-3 sticky top-0 z-10">
                    <div className="flex bg-gray-100 p-1 rounded-md">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-3 py-1 text-xs font-medium rounded ${activeTab === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setActiveTab('unread')}
                            className={`px-3 py-1 text-xs font-medium rounded ${activeTab === 'unread' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Unread
                        </button>
                    </div>
                    <button
                        onClick={loadMessages}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                        <span>🔄</span> Refresh
                    </button>
                </div>

                {/* DETAILS */}
                <div className="flex-1 overflow-y-auto p-6">
                    {selectedMessage ? (
                        <div>
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-6">Order Details</h3>
                            <div className="space-y-6">
                                {selectedMessage.order_id && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Order ID</label>
                                        <p className="text-sm font-medium text-gray-900 font-mono select-all bg-white p-2 border rounded border-gray-200">{selectedMessage.order_id}</p>
                                    </div>
                                )}
                                {selectedMessage.commercial_id && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Commercial ID</label>
                                        <p className="text-sm font-medium text-gray-900 font-mono">{selectedMessage.commercial_id}</p>
                                    </div>
                                )}
                                {selectedMessage.from_name && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Customer Name</label>
                                        <p className="text-sm font-medium text-gray-900">{selectedMessage.from_name}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Date</label>
                                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedMessage.date_created)}</p>
                                </div>
                                {selectedMessage.to_shop_name && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">To Shop</label>
                                        <p className="text-sm font-medium text-gray-900">{selectedMessage.to_shop_name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 mt-10 text-xs">
                            Select a message to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

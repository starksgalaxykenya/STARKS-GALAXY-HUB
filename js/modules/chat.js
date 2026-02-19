// Chat module

let currentChannel = 'general';
let unsubscribeMessages = null;

// Load chat channels
async function loadChannels() {
    try {
        const channels = await db.collection('channels')
            .where('company', '==', getCurrentCompany())
            .where('members', 'array-contains', getCurrentUser()?.uid)
            .get();

        const channelsDiv = document.getElementById('chatChannels');
        if (!channelsDiv) return;

        channelsDiv.innerHTML = '';

        // Add default channels if none exist
        if (channels.empty) {
            await createDefaultChannels();
            loadChannels();
            return;
        }

        channels.forEach(doc => {
            const channel = doc.data();
            const unread = channel.unreadCount?.[getCurrentUser()?.uid] || 0;
            
            channelsDiv.innerHTML += `
                <div class="channel-item ${doc.id === currentChannel ? 'active' : ''}" onclick="switchChannel('${doc.id}')">
                    <div class="channel-icon">
                        <i class="fas ${channel.type === 'direct' ? 'fa-user' : 'fa-hashtag'}"></i>
                    </div>
                    <div class="channel-info">
                        <div class="channel-name">${channel.name}</div>
                        <div class="channel-last-message">${channel.lastMessage || 'No messages'}</div>
                    </div>
                    ${unread > 0 ? `<span class="channel-unread">${unread}</span>` : ''}
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading channels:', error);
    }
}

// Create default channels
async function createDefaultChannels() {
    const defaultChannels = [
        { name: 'General', type: 'public' },
        { name: 'Announcements', type: 'public' },
        { name: 'Random', type: 'public' },
        { name: 'Support', type: 'public' }
    ];

    for (const channel of defaultChannels) {
        await db.collection('channels').add({
            name: channel.name,
            type: channel.type,
            company: getCurrentCompany(),
            members: [getCurrentUser()?.uid],
            createdBy: getCurrentUser()?.uid,
            createdAt: new Date(),
            lastMessage: 'No messages yet',
            unreadCount: {}
        });
    }
}

// Switch to a different channel
function switchChannel(channelId) {
    currentChannel = channelId;
    
    // Update active state
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.channel-item').classList.add('active');
    
    // Load messages
    loadMessages(channelId);
    
    // Update channel info
    updateChannelInfo(channelId);
}

// Update channel info header
async function updateChannelInfo(channelId) {
    try {
        const channel = await getDocument('channels', channelId);
        if (!channel) return;
        
        document.getElementById('currentChannelName').textContent = channel.name;
        
        // Get member count
        const members = channel.members || [];
        document.getElementById('channelMemberCount').textContent = `${members.length} members`;
        
        // Update channel icon based on type
        const icon = document.getElementById('currentChannelIcon');
        if (icon) {
            icon.innerHTML = `<i class="fas ${channel.type === 'direct' ? 'fa-user' : 'fa-hashtag'}"></i>`;
        }
        
    } catch (error) {
        console.error('Error updating channel info:', error);
    }
}

// Load messages for a channel
function loadMessages(channelId) {
    // Unsubscribe from previous listener
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }
    
    const messagesDiv = document.getElementById('chatMessages');
    if (!messagesDiv) return;
    
    messagesDiv.innerHTML = '<div class="loading-spinner"></div>';
    
    // Subscribe to messages
    unsubscribeMessages = db.collection('messages')
        .where('channelId', '==', channelId)
        .orderBy('timestamp', 'asc')
        .limit(100)
        .onSnapshot((snapshot) => {
            messagesDiv.innerHTML = '';
            
            snapshot.forEach(doc => {
                const message = doc.data();
                const messageElement = createMessageElement(doc.id, message);
                messagesDiv.appendChild(messageElement);
            });
            
            // Scroll to bottom
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Mark messages as read
            markChannelAsRead(channelId);
            
        }, (error) => {
            console.error('Error loading messages:', error);
            messagesDiv.innerHTML = '<div class="empty-state"><p>Failed to load messages</p></div>';
        });
}

// Create message element
function createMessageElement(messageId, message) {
    const div = document.createElement('div');
    div.className = `message ${message.senderId === getCurrentUser()?.uid ? 'message-own' : ''}`;
    
    const time = message.timestamp?.toDate ? formatTime(message.timestamp.toDate()) : '';
    const isOwn = message.senderId === getCurrentUser()?.uid;
    
    div.innerHTML = `
        ${!isOwn ? `
            <div class="message-avatar" style="background: ${getAvatarColor(message.senderName)}">
                ${(message.senderName || 'U').charAt(0).toUpperCase()}
            </div>
        ` : ''}
        <div class="message-content">
            <div class="message-header">
                ${!isOwn ? `<span class="message-sender">${message.senderName || 'Unknown'}</span>` : ''}
                <span class="message-time">${time}</span>
            </div>
            <div class="message-body">${message.content}</div>
            ${message.attachments ? createAttachmentsHTML(message.attachments) : ''}
            ${message.reactions ? createReactionsHTML(message.reactions) : ''}
        </div>
    `;
    
    return div;
}

// Create attachments HTML
function createAttachmentsHTML(attachments) {
    if (!attachments || attachments.length === 0) return '';
    
    return `
        <div class="message-attachments">
            ${attachments.map(att => `
                <div class="message-attachment" onclick="downloadAttachment('${att.path}')">
                    <i class="fas fa-paperclip"></i> ${att.name}
                </div>
            `).join('')}
        </div>
    `;
}

// Create reactions HTML
function createReactionsHTML(reactions) {
    if (!reactions || reactions.length === 0) return '';
    
    const reactionCounts = {};
    reactions.forEach(r => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });
    
    return `
        <div class="message-reactions">
            ${Object.entries(reactionCounts).map(([emoji, count]) => `
                <span class="message-reaction" onclick="addReaction('${emoji}')">
                    ${emoji} ${count}
                </span>
            `).join('')}
        </div>
    `;
}

// Send message
async function sendMessage() {
    const input = document.getElementById('chatMessageInput');
    const content = input.value.trim();
    
    if (!content || !currentChannel) return;
    
    try {
        const messageData = {
            channelId: currentChannel,
            senderId: getCurrentUser()?.uid,
            senderName: getCurrentUser()?.displayName || getCurrentUser()?.email,
            content: content,
            timestamp: new Date(),
            readBy: [getCurrentUser()?.uid],
            reactions: []
        };
        
        await db.collection('messages').add(messageData);
        
        // Update channel last message
        await db.collection('channels').doc(currentChannel).update({
            lastMessage: content,
            lastMessageTime: new Date()
        });
        
        input.value = '';
        
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message');
    }
}

// Handle enter key in chat input
function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Mark channel as read
async function markChannelAsRead(channelId) {
    try {
        const channelRef = db.collection('channels').doc(channelId);
        await channelRef.update({
            [`unreadCount.${getCurrentUser()?.uid}`]: 0
        });
    } catch (error) {
        console.error('Error marking channel as read:', error);
    }
}

// Attach file to message
function attachFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            showLoading();
            
            // Upload file
            const storageRef = storage.ref(`chat/${Date.now()}_${file.name}`);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            
            // Create message with attachment
            const messageData = {
                channelId: currentChannel,
                senderId: getCurrentUser()?.uid,
                senderName: getCurrentUser()?.displayName || getCurrentUser()?.email,
                content: '',
                attachments: [{
                    name: file.name,
                    path: storageRef.fullPath,
                    url: url,
                    size: file.size,
                    type: file.type
                }],
                timestamp: new Date(),
                readBy: [getCurrentUser()?.uid],
                reactions: []
            };
            
            await db.collection('messages').add(messageData);
            
            hideLoading();
            showSuccess('File uploaded');
            
        } catch (error) {
            hideLoading();
            showError('Failed to upload file');
        }
    };
    input.click();
}

// Add reaction to message
async function addReaction(messageId, emoji) {
    try {
        const messageRef = db.collection('messages').doc(messageId);
        await messageRef.update({
            reactions: firebase.firestore.FieldValue.arrayUnion({
                emoji: emoji,
                userId: getCurrentUser()?.uid
            })
        });
    } catch (error) {
        console.error('Error adding reaction:', error);
    }
}

// Start direct message with user
async function startChat(userId) {
    try {
        // Check if direct message channel already exists
        const channels = await db.collection('channels')
            .where('type', '==', 'direct')
            .where('members', 'array-contains', getCurrentUser()?.uid)
            .get();
        
        let channelId = null;
        
        channels.forEach(doc => {
            const channel = doc.data();
            if (channel.members.includes(userId) && channel.members.length === 2) {
                channelId = doc.id;
            }
        });
        
        if (channelId) {
            // Switch to existing channel
            switchChannel(channelId);
        } else {
            // Create new direct message channel
            const user = await getDocument('users', userId);
            const channelRef = await db.collection('channels').add({
                name: user?.name || 'Direct Message',
                type: 'direct',
                company: getCurrentCompany(),
                members: [getCurrentUser()?.uid, userId],
                createdBy: getCurrentUser()?.uid,
                createdAt: new Date(),
                lastMessage: 'Start a conversation',
                unreadCount: {}
            });
            
            switchChannel(channelRef.id);
        }
        
        // Switch to chat tab
        switchTab('chat');
        
    } catch (error) {
        console.error('Error starting chat:', error);
        showError('Failed to start chat');
    }
}

// Format time
function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
        // Today - show time
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        // This week - show day
        return date.toLocaleDateString([], { weekday: 'short' });
    } else {
        // Older - show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

// Add CSS for chat
const chatStyles = document.createElement('style');
chatStyles.textContent = `
    .channel-unread {
        background: var(--primary);
        color: white;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
    }

    .message-own {
        flex-direction: row-reverse;
    }

    .message-own .message-content {
        align-items: flex-end;
    }

    .message-own .message-body {
        background: var(--primary);
        color: white;
    }

    .message-body {
        background: var(--light);
        padding: 10px 15px;
        border-radius: 18px;
        max-width: 70%;
        word-wrap: break-word;
    }

    .message-reactions {
        display: flex;
        gap: 5px;
        margin-top: 5px;
    }

    .message-reaction {
        background: var(--light);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        cursor: pointer;
    }

    .message-reaction:hover {
        background: #e5e7eb;
    }
`;
document.head.appendChild(chatStyles);

// Export chat functions
window.loadChannels = loadChannels;
window.switchChannel = switchChannel;
window.sendMessage = sendMessage;
window.handleChatKeyPress = handleChatKeyPress;
window.attachFile = attachFile;
window.addReaction = addReaction;
window.startChat = startChat;

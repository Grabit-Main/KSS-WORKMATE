import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import {
  isNotificationSupported,
  getNotificationPermission,
  getNotificationPreferences,
  registerServiceWorker,
  showDesktopNotification
} from '../services/desktopNotificationService';

/**
 * Hook to manage desktop push notifications and real-time alerts for incoming chat messages.
 */
export const useDesktopNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Register service worker if notification permission is already granted
  useEffect(() => {
    if (isNotificationSupported() && getNotificationPermission() === 'granted') {
      registerServiceWorker();
    }
  }, []);

  // Listen for navigation messages from the service worker (when user clicks desktop notification)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_NAVIGATE') {
        const targetUrl = event.data.url || '/collaboration';
        navigate(targetUrl);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [navigate]);

  // Handler for real-time chat messages
  const handleIncomingChatMessage = useCallback((eventData) => {
    if (!eventData || !user) return;

    const currentUserId = String(user.id);
    const senderId = String(eventData.sender_id || eventData.sender?.id || '');

    // 1. DO NOT notify if the message was sent by the currently logged-in user
    if (senderId && senderId === currentUserId) {
      return;
    }

    const prefs = getNotificationPreferences();
    if (!prefs.desktopEnabled) return;

    const chatType = eventData.chat_type || 'direct';
    const isChannel = chatType.startsWith('channel:') || Boolean(eventData.channel_name);
    const isDirect = chatType === 'direct';

    // 2. Check preference flags
    if (isDirect && !prefs.notifyDirect) return;
    if (isChannel && !prefs.notifyChannels) return;

    // 3. Check if the user is actively viewing this exact conversation right now
    const isPageVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
    const isAtCollaboration = locationRef.current.pathname.startsWith('/collaboration');

    // If the browser tab is focused and the user is already on the Collaboration page,
    // we suppress the intrusive desktop system banner
    if (isPageVisible && isAtCollaboration) {
      // In-app chat takes care of active display
      return;
    }

    // 4. Construct Teams-like Notification Title and Message Preview
    const senderName = eventData.sender_name || 
      (eventData.sender ? `${eventData.sender.first_name || ''} ${eventData.sender.last_name || ''}`.trim() : 'Teammate');

    let notificationTitle = `New message from ${senderName}`;
    let navigationUrl = '/collaboration';

    if (isChannel) {
      const channelDisplayName = eventData.channel_name || chatType.replace('channel:', '');
      notificationTitle = `#${channelDisplayName} · ${senderName}`;
      navigationUrl = `/collaboration?channel=${channelDisplayName}`;
    } else if (isDirect) {
      navigationUrl = `/collaboration?user=${senderId}`;
    } else if (eventData.task_id) {
      notificationTitle = `Task Chat · ${senderName}`;
      navigationUrl = `/tasks?taskId=${eventData.task_id}`;
    }

    let messagePreview = eventData.message || '';
    if (!messagePreview && eventData.attachment_url) {
      messagePreview = '📎 Sent an attachment';
    }
    if (messagePreview.length > 120) {
      messagePreview = messagePreview.substring(0, 117) + '...';
    }

    // 5. Trigger Native Desktop Notification + Audio Chime
    showDesktopNotification({
      title: notificationTitle,
      body: messagePreview || 'You have received a new message.',
      icon: '/logo.webp',
      badge: '/favicon.ico',
      tag: `chat-${eventData.id || senderId || Date.now()}`,
      data: {
        url: navigationUrl,
        chatType,
        senderId,
        messageId: eventData.id
      },
      playSound: prefs.soundEnabled,
      onClick: () => {
        window.focus();
        navigate(navigationUrl);
      }
    });
  }, [user, navigate]);

  // Subscribe to real-time chat messages
  useRealtime('chat.new_message', handleIncomingChatMessage);

  return null;
};

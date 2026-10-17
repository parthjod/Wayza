import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../components/ui/Toast';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { groupApi } from '../api/group.api';
import { chatApi } from '../api/chat.api';
import { journeyApi } from '../api/journey.api';
import { fareApi } from '../api/fare.api';
import { reportApi } from '../api/report.api';
import { formatRelativeTime } from '../utils/formatDistance';
import { formatPhone } from '../utils/phone';
import type { Group, ChatMessage as ChatMsg } from '../types';

export default function Chat() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s: any) => s.user);
  const { socket } = useSocket();
  const { showToast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showSharePhoneModal, setShowSharePhoneModal] = useState(false);
  const [showStartJourneyModal, setShowStartJourneyModal] = useState(false);
  const [showEndJourneyModal, setShowEndJourneyModal] = useState(false);
  const [showFareSplitModal, setShowFareSplitModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenuPanel, setShowMenuPanel] = useState(false);

  // Attachment & Image preview state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Fare split state
  const [totalFare, setTotalFare] = useState('');
  const [splitMembers, setSplitMembers] = useState<string[]>([]);
  const [fareSplitResult, setFareSplitResult] = useState<any>(null);

  // Report state
  const [reportUserId, setReportUserId] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const isLeavingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load group data
  useEffect(() => {
    if (!groupId) return;
    loadGroup();
    loadMessages();
  }, [groupId]);

  // Socket events
  useEffect(() => {
    if (!socket || !groupId) return;

    const joinRoom = () => {
      socket.emit('join-room', groupId);
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);

    socket.on('chat:message', (rawMsg: any) => {
      if (rawMsg.groupId === groupId) {
        const normalizedMsg: ChatMsg = {
          id: rawMsg.id || rawMsg.messageId || String(Date.now()),
          senderId: rawMsg.senderId,
          senderName: rawMsg.senderName,
          content: rawMsg.content,
          createdAt: rawMsg.createdAt || new Date().toISOString(),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === normalizedMsg.id)) return prev;
          return [...prev, normalizedMsg];
        });
      }
    });

    socket.on('error', (err: any) => {
      console.error('Socket error:', err);
      showToast(err.message || 'Chat error', 'error');
    });

    socket.on('group:confirmed', () => { if (!isLeavingRef.current) loadGroup(); });
    socket.on('group:phone-shared', () => { if (!isLeavingRef.current) loadGroup(); });
    socket.on('group:member-joined', () => { if (!isLeavingRef.current) loadGroup(); });
    socket.on('group:member-left', (data: any) => {
      if (isLeavingRef.current || data?.userId === user?.id) return;
      loadGroup();
    });
    socket.on('journey:progress', () => { if (!isLeavingRef.current) loadGroup(); });
    socket.on('journey:all-started', () => { if (!isLeavingRef.current) loadGroup(); });
    socket.on('journey:all-ended', () => {
      if (isLeavingRef.current) return;
      loadGroup();
      setShowFareSplitModal(true);
    });
    socket.on('fare:split-submitted', (data: any) => {
      if (isLeavingRef.current) return;
      setFareSplitResult(data);
      setShowFareSplitModal(true);
      loadGroup();
      showToast('Fare split submitted! 🎉', 'success');
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('chat:message');
      socket.off('error');
      socket.off('group:confirmed');
      socket.off('group:phone-shared');
      socket.off('group:member-joined');
      socket.off('group:member-left');
      socket.off('journey:progress');
      socket.off('journey:all-started');
      socket.off('journey:all-ended');
      socket.off('fare:split-submitted');
    };
  }, [socket, groupId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadGroup = async () => {
    if (!groupId || isLeavingRef.current) return;
    try {
      const data = await groupApi.getGroup(groupId);
      if (isLeavingRef.current) return;
      if (data.status === 'DISBANDED') {
        showToast('The group has ended', 'info');
        navigate('/home', { replace: true });
        return;
      }
      setGroup(data);

      // Initialize split members with all member IDs
      if (data.members) {
        setSplitMembers(data.members.map((m) => m.userId));
      }
    } catch (err: any) {
      if (isLeavingRef.current) return;
      if (err.response?.status === 403 || err.response?.status === 404) {
        showToast('You left the group', 'info');
        navigate('/home', { replace: true });
        return;
      }
      showToast('Failed to load group', 'error');
    } finally {
      if (!isLeavingRef.current) {
        setLoading(false);
      }
    }
  };

  const loadMessages = async () => {
    if (!groupId) return;
    try {
      const data = await chatApi.getMessages(groupId);
      setMessages(data.messages.reverse());
      setNextCursor(data.nextCursor);
    } catch {
      // silent
    }
  };

  const loadOlderMessages = async () => {
    if (!groupId || !nextCursor) return;
    try {
      const data = await chatApi.getMessages(groupId, nextCursor);
      setMessages((prev) => [...data.messages.reverse(), ...prev]);
      setNextCursor(data.nextCursor);
    } catch {
      // silent
    }
  };

  const sendMessage = () => {
    const text = messageInput.trim();
    if (!text || !groupId) return;
    if (!socket || !socket.connected) {
      showToast('Connecting to chat server, please wait...', 'info');
      socket?.connect();
      return;
    }
    socket.emit('chat:send-message', { groupId, content: text });
    setMessageInput('');
  };

  const handleConfirmGo = async () => {
    if (!groupId) return;
    try {
      const result = await groupApi.confirmGo(groupId);
      if (result.allConfirmed) {
        showToast('All confirmed! You\'re set to ride together 🚗', 'success');
      } else {
        showToast('Confirmed! Waiting for others...', 'success');
      }
      await loadGroup();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleSharePhone = async () => {
    if (!groupId) return;
    try {
      await groupApi.sharePhone(groupId);
      showToast('Phone number shared', 'success');
      setShowSharePhoneModal(false);
      await loadGroup();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleStartJourney = async () => {
    if (!groupId) return;
    try {
      const result = await journeyApi.start(groupId);
      if (result.allStarted) {
        showToast('Journey started! 🚗', 'success');
      } else {
        showToast('Waiting for others to start...', 'info');
      }
      setShowStartJourneyModal(false);
      await loadGroup();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image too large. Max 5MB.', 'error');
      return;
    }
    setUploadingImage(true);
    setShowAttachMenu(false);
    try {
      showToast('Uploading photo...', 'info');
      await chatApi.uploadImage(groupId, file);
      showToast('Photo sent ✓', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to upload photo', 'error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleShareLiveLocation = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    showToast('Getting live location...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsLink = `📍 My Location: https://maps.google.com/?q=${latitude},${longitude}`;
        if (!socket || !socket.connected) {
          showToast('Connecting to chat server, please wait...', 'info');
          return;
        }
        socket.emit('chat:send-message', { groupId, content: mapsLink });
        showToast('Location shared ✓', 'success');
      },
      (err) => {
        showToast('Unable to get location: ' + err.message, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleEndJourney = async () => {
    if (!groupId) return;
    try {
      const result = await journeyApi.end(groupId);
      if (result.allEnded) {
        showToast('Ride completed! Please split the fare.', 'info');
        setShowFareSplitModal(true);
      } else {
        showToast('You ended your journey. Waiting for co-riders...', 'info');
      }
      setShowEndJourneyModal(false);
      await loadGroup();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleSubmitFare = async () => {
    if (!groupId || !totalFare || splitMembers.length < 2) return;
    try {
      const fareNum = parseFloat(totalFare);
      await fareApi.submit(groupId, fareNum, splitMembers);
      showToast('Fare split submitted! 🎉', 'success');
      setShowFareSplitModal(false);
      navigate('/home', { replace: true });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit fare split', 'error');
    }
  };

  const handleAcknowledgeFare = async () => {
    if (!groupId) return;
    try {
      await fareApi.acknowledge(groupId);
      showToast('Fare split acknowledged ✓', 'success');
      navigate('/home', { replace: true });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to acknowledge fare', 'error');
    }
  };

  const handleSubmitReport = async () => {
    if (!reportUserId) {
      showToast('Please select who you are reporting', 'error');
      return;
    }
    const cleanDesc = reportDescription.trim();
    if (cleanDesc.length < 10) {
      showToast(`Please write at least 10 characters (currently ${cleanDesc.length})`, 'error');
      return;
    }
    setIsSubmittingReport(true);
    try {
      await reportApi.submit(reportUserId, cleanDesc, groupId);
      showToast('Report submitted successfully. We will review it promptly.', 'success');
      setShowReportModal(false);
      setReportUserId('');
      setReportDescription('');
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to submit report';
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId || isLeavingRef.current) return;
    isLeavingRef.current = true;
    try {
      await groupApi.leave(groupId);
    } catch {
      // Ignore error if already removed or group disbanded
    } finally {
      showToast('You left the group', 'info');
      navigate('/home', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="chat-page-shell flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="chat-page-shell flex items-center justify-center">
        <p className="text-white/60">Group not found</p>
      </div>
    );
  }

  const selfMember = group.members.find((m) => m.userId === user?.id);
  const otherMembers = group.members.filter((m) => m.userId !== user?.id);
  const allConfirmed = group.members.every((m) => m.confirmedGoWith);
  const confirmedCount = group.members.filter((m) => m.confirmedGoWith).length;
  const startedCount = group.members.filter((m) => m.startedJourney).length;
  const endedCount = group.members.filter((m) => m.endedJourney).length;
  const otherNames = otherMembers.map((m) => m.fullName).join(' & ');
  const computedSplit = splitMembers.length >= 2 && totalFare
    ? (parseFloat(totalFare) / splitMembers.length).toFixed(2)
    : '0.00';

  return (
    <div className="chat-page-shell">
      {/* Background video — same landscape as Landing page */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="video-bg"
        style={{ opacity: showEndJourneyModal ? 0.72 : 0.80 }}
      >
        <source src="/videos/wayzaLoginVid.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay over background image — lightened when End Journey modal is open */}
      <div className="chat-bg-overlay" style={{ opacity: showEndJourneyModal ? 0 : 1 }} />

      {/* Top Bar */}
      <div className="chat-header">
        <button
          onClick={() => navigate('/home')}
          className="chat-back-btn flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
          aria-label="Go to Home"
        >
          <span>←</span>
          <span className="font-instrument tracking-wider text-xs sm:text-sm font-normal text-white/90">WAYZA</span>
        </button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {otherMembers.slice(0, 2).map((m) => (
            <Avatar key={m.userId} name={m.fullName} imageUrl={m.profilePicUrl} size="sm" className="chat-header-avatar" />
          ))}
          {otherMembers.length > 2 && (
            <span className="text-white/60 text-xs">+{otherMembers.length - 2}</span>
          )}
          <span className="text-white font-semibold text-[15px] truncate leading-none">
            {otherNames || 'Ride Group'}
          </span>
        </div>
        <button
          onClick={() => {
            const next = !showMenuPanel;
            setShowMenuPanel(next);
            if (next) loadGroup();
          }}
          className="chat-menu-btn"
          aria-label="Group menu"
        >
          ⋮
        </button>
      </div>

      {/* Journey banner */}
      {group.status === 'JOURNEY_STARTED' && (
        <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/20 text-center relative z-10">
          <p className="text-green-400 text-xs">🚗 Journey in progress with {otherNames}</p>
        </div>
      )}

      {/* Phone number banners — clean, clear glassmorphism card */}
      {group.status !== 'FORMING' && group.members.some((m) => m.phone && m.userId !== user?.id) && (
        <div className="chat-phone-banner-container">
          {group.members
            .filter((m) => m.phone && m.userId !== user?.id)
            .map((m) => (
              <div key={m.userId} className="chat-phone-pill">
                <div className="chat-phone-pill-left">
                  <div className="chat-phone-pill-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="chat-phone-pill-info">
                    <div className="chat-phone-pill-name">
                      <span>{m.fullName}</span>
                      <span className="chat-phone-pill-tag">Phone</span>
                    </div>
                    <span className="chat-phone-pill-number">{formatPhone(m.phone!)}</span>
                  </div>
                </div>
                <div className="chat-phone-pill-actions">
                  <a
                    href={`tel:${m.phone}`}
                    className="chat-phone-call-btn"
                    title={`Call ${m.fullName}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Call
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(m.phone!);
                      showToast('Phone number copied to clipboard', 'success');
                    }}
                    className="chat-phone-copy-btn"
                    title="Copy number"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="chat-messages-area"
        onScroll={(e) => {
          if ((e.target as HTMLDivElement).scrollTop === 0 && nextCursor) {
            loadOlderMessages();
          }
        }}
      >
        {messages.map((msg) => {
          const isSystemEvent =
            msg.content.endsWith(' joined the group') ||
            msg.content.endsWith(' left the group');

          if (isSystemEvent) {
            const isJoin = msg.content.endsWith(' joined the group');
            return (
              <div key={msg.id} className="flex justify-center my-2.5 px-4 animate-fade-in">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/10 text-white/75 text-xs font-medium tracking-wide shadow-sm">
                  <span className="text-[12px]">{isJoin ? '👋' : '🚪'}</span>
                  <span>{msg.content}</span>
                </div>
              </div>
            );
          }

          const isOwn = msg.senderId === user?.id;
          const sender = group.members.find((m) => m.userId === msg.senderId);
          return (
            <div
              key={msg.id}
              className={`chat-msg-row ${isOwn ? 'chat-msg-row--own' : 'chat-msg-row--other'}`}
            >
              {/* Incoming: show sender avatar */}
              {!isOwn && (
                <div className="chat-msg-avatar-wrap">
                  <Avatar
                    name={sender?.fullName || msg.senderName || ''}
                    imageUrl={sender?.profilePicUrl}
                    size="sm"
                  />
                </div>
              )}
              <div className={`chat-bubble ${isOwn ? 'chat-bubble--own' : 'chat-bubble--other'}`}>
                {!isOwn && group.members.length > 2 && (
                  <p className="text-[10px] font-semibold mb-0.5 opacity-60">{msg.senderName}</p>
                )}
                {msg.content.startsWith('[IMG]') ? (
                  <div className="my-1">
                    <img
                      src={msg.content.replace('[IMG]', '')}
                      alt="Shared attachment"
                      className="max-w-[200px] sm:max-w-[240px] max-h-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 shadow-md transition-opacity"
                      onClick={() => setPreviewImage(msg.content.replace('[IMG]', ''))}
                    />
                  </div>
                ) : msg.content.includes('https://maps.google.com/?q=') ? (
                  <div className="my-1">
                    <p className="text-sm">{msg.content.split('https://')[0]}</p>
                    <a
                      href={`https://${msg.content.split('https://')[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:text-white text-xs font-semibold underline transition-colors"
                    >
                      <span>📍 Open in Google Maps ↗</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words leading-snug">{msg.content}</p>
                )}
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/45' : 'text-white/35'}`}>
                  {formatRelativeTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Actions */}
      <div className="chat-composer">
        {/* Message input row */}
        <div className="chat-input-row relative">
          {/* Attachment / paperclip button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="chat-attach-btn cursor-pointer"
              aria-label="Attach photo or location"
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <Spinner size="sm" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              )}
            </button>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelected}
              className="hidden"
            />

            {/* Attachment popover menu */}
            {showAttachMenu && (
              <div className="absolute bottom-full mb-3 left-0 bg-[#161a26]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[205px] max-w-[calc(100vw-32px)] z-30 animate-fade-in-up">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/90 hover:bg-white/10 active:bg-white/15 flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <span className="font-medium text-[13px] tracking-tight">Photo / Cab Details</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareLiveLocation}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/90 hover:bg-white/10 active:bg-white/15 flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <span className="font-medium text-[13px] tracking-tight">Share Live Location</span>
                </button>
              </div>
            )}
          </div>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Message…"
            className="chat-input"
            maxLength={1000}
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!messageInput.trim()}
            className="chat-send-btn"
            aria-label="Send message"
          >
            {/* Paper plane icon */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        {/* Action buttons */}
        <div className="chat-actions-row">
          {/* Confirmed button */}
          {(group.status === 'FORMING' || group.status === 'CONFIRMED') && (
            <button
              onClick={handleConfirmGo}
              disabled={selfMember?.confirmedGoWith || otherMembers.length === 0}
              className={`chat-action-btn ${selfMember?.confirmedGoWith
                ? 'chat-action-btn--confirmed'
                : otherMembers.length === 0
                  ? 'opacity-50 cursor-not-allowed bg-white/10'
                  : 'chat-go-btn'
                }`}
            >
              {selfMember?.confirmedGoWith
                ? `✓ Confirmed (${confirmedCount}/${group.members.length})`
                : otherMembers.length > 0
                  ? `Go with ${otherNames}`
                  : 'Waiting for members to join…'}
            </button>
          )}

          {/* Share Phone button */}
          {allConfirmed && !selfMember?.sharedPhone && group.status !== 'FORMING' && (
            <button
              onClick={() => setShowSharePhoneModal(true)}
              className="chat-action-btn chat-action-btn--share"
            >
              Share My Number
            </button>
          )}

          {/* Start Journey button */}
          {group.status === 'CONFIRMED' && !selfMember?.startedJourney && (
            <button
              onClick={() => setShowStartJourneyModal(true)}
              className="chat-action-btn chat-action-btn--journey"
            >
              Start Journey ({startedCount}/{group.members.length})
            </button>
          )}

          {/* End Journey button */}
          {group.status === 'JOURNEY_STARTED' && !selfMember?.endedJourney && (
            <button
              onClick={() => setShowEndJourneyModal(true)}
              className="chat-action-btn chat-action-btn--end"
            >
              End Journey ({endedCount}/{group.members.length})
            </button>
          )}
        </div>

        {/* Post-journey report button */}
        {(group.status === 'JOURNEY_ENDED' || group.status === 'SPLIT_DONE') && (
          <button
            onClick={() => {
              if (otherMembers.length > 0 && !reportUserId) {
                setReportUserId(otherMembers[0].userId);
              }
              setShowReportModal(true);
            }}
            className="w-full py-2 text-red-400/80 text-xs hover:text-red-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>⚠️</span> Report an issue
          </button>
        )}
      </div>

      {/* Dynamic Group Menu Panel */}
      {showMenuPanel && (
        <div className="fixed inset-0 z-50" onClick={() => setShowMenuPanel(false)}>
          <div className="group-menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="group-menu-header">
              <span className="group-menu-title">
                👥 Group Members
              </span>
              <span className="group-menu-count-badge">
                {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
              </span>
            </div>

            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-1">
              {group.members.map((m) => {
                const isCurrent = m.userId === user?.id;
                let statusLabel = 'Not confirmed';
                let statusClass = 'group-member-status--pending';

                if (m.endedJourney) {
                  statusLabel = '🏁 Trip ended';
                  statusClass = 'group-member-status--confirmed';
                } else if (m.startedJourney) {
                  statusLabel = '🚗 In journey';
                  statusClass = 'group-member-status--journey';
                } else if (m.confirmedGoWith) {
                  statusLabel = '✓ Confirmed';
                  statusClass = 'group-member-status--confirmed';
                }

                return (
                  <div key={m.userId} className="group-member-item">
                    <Avatar name={m.fullName} imageUrl={m.profilePicUrl} size="sm" />
                    <div className="group-member-info">
                      <div className="group-member-name-row">
                        <span className="group-member-name">{m.fullName}</span>
                        {isCurrent && <span className="group-member-you-badge">You</span>}
                      </div>
                      <p className={`group-member-status ${statusClass}`}>
                        {statusLabel}
                      </p>
                      {m.phone && !isCurrent && (
                        <p className="group-member-phone-sub">
                          📞 {formatPhone(m.phone)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/12 mt-4 pt-3.5 flex flex-col gap-2">
              <button
                onClick={handleLeaveGroup}
                className="w-full text-left text-red-400 hover:text-red-300 text-xs py-2 px-3 rounded-xl bg-red-500/[0.08] hover:bg-red-500/[0.15] border border-red-500/15 transition-all flex items-center gap-2.5 cursor-pointer font-medium active:scale-[0.98]"
              >
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Leave group</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuPanel(false);
                  if (otherMembers.length > 0 && !reportUserId) {
                    setReportUserId(otherMembers[0].userId);
                  }
                  setShowReportModal(true);
                }}
                className="w-full text-left text-amber-400 hover:text-amber-300 text-xs py-2 px-3 rounded-xl bg-amber-500/[0.08] hover:bg-amber-500/[0.15] border border-amber-500/15 transition-all flex items-center gap-2.5 cursor-pointer font-medium active:scale-[0.98]"
              >
                <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Phone Confirmation Modal */}
      <Modal open={showSharePhoneModal} onClose={() => setShowSharePhoneModal(false)} className="chat-share-modal">
        <h3 className="text-[22px] font-instrument text-white mb-3 leading-tight">Share Your Number</h3>
        <p className="text-white/65 text-[14px] leading-relaxed mb-6">
          Sharing your number means {otherNames} will be able to see your number immediately.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSharePhoneModal(false)}
            className="chat-modal-cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSharePhone}
            className="chat-modal-share-btn"
          >
            Share
          </button>
        </div>
      </Modal>

      {/* Start Journey Modal */}
      <Modal open={showStartJourneyModal} onClose={() => setShowStartJourneyModal(false)} className="confirm-journey-modal">
        <h3 className="confirm-journey-heading">Start Journey</h3>
        <p className="confirm-journey-message">
          Starting journey with {otherNames}?
        </p>
        <div className="confirm-journey-actions">
          <button onClick={() => setShowStartJourneyModal(false)} className="confirm-journey-cancel-btn">
            Cancel
          </button>
          <button onClick={handleStartJourney} className="confirm-journey-start-btn">
            Start
          </button>
        </div>
      </Modal>

      {/* End Journey Modal — custom overlay so the landscape background stays visible */}
      {showEndJourneyModal && (
        <div className="end-journey-overlay" onClick={() => setShowEndJourneyModal(false)}>
          <div
            className="end-journey-card animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="end-journey-heading">End Journey</h3>
            <p className="end-journey-message">
              End your journey with {otherNames}?
            </p>
            <div className="end-journey-actions">
              <button onClick={() => setShowEndJourneyModal(false)} className="end-journey-cancel-btn">
                Cancel
              </button>
              <button onClick={handleEndJourney} className="end-journey-end-btn">
                End
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fare Split Modal */}
      <Modal open={showFareSplitModal} onClose={() => setShowFareSplitModal(false)} className="chat-fare-modal">
        {!fareSplitResult && !group.fareSplit ? (
          <>
            <h3 className="fare-modal-heading">Split the Fare</h3>
            <div className="fare-modal-section">
              <label className="fare-modal-label">Total fare (₹)</label>
              <input
                type="number"
                value={totalFare}
                onChange={(e) => setTotalFare(e.target.value)}
                placeholder="0.00"
                className="fare-modal-input"
                min="0"
                step="0.01"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div className="fare-modal-section">
              <label className="fare-modal-label">Split between:</label>
              {group.members.map((m) => (
                <label key={m.userId} className="fare-modal-checkbox-row cursor-pointer">
                  <span className={`fare-modal-checkbox ${splitMembers.includes(m.userId) ? 'fare-modal-checkbox--checked' : ''}`}>
                    {splitMembers.includes(m.userId) && (
                      <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1,5 4.5,8.5 11,1" />
                      </svg>
                    )}
                    <input
                      type="checkbox"
                      checked={splitMembers.includes(m.userId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSplitMembers((prev) => [...prev, m.userId]);
                        } else {
                          setSplitMembers((prev) => prev.filter((id) => id !== m.userId));
                        }
                      }}
                      className="sr-only"
                    />
                  </span>
                  <span className="fare-modal-member-name">{m.fullName}</span>
                </label>
              ))}
            </div>
            <p className="fare-modal-each-pays">
              Each pays: <span className="fare-modal-amount">₹{computedSplit}</span>
            </p>
            <button
              onClick={handleSubmitFare}
              disabled={!totalFare || splitMembers.length < 2}
              className="fare-modal-submit-btn cursor-pointer"
            >
              Submit Split
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFareSplitModal(false);
                if (otherMembers.length > 0 && !reportUserId) {
                  setReportUserId(otherMembers[0].userId);
                }
                setShowReportModal(true);
              }}
              className="fare-modal-report-btn cursor-pointer"
            >
              <span>⚠️</span> Report
            </button>
          </>
        ) : (
          <>
            <h3 className="fare-modal-heading">Fare Split</h3>
            <div className="fare-modal-splits">
              {(fareSplitResult?.splits || group.fareSplit?.participants || []).map((s: any) => (
                <div key={s.userId} className="fare-modal-split-row">
                  <span className="fare-modal-split-name">{s.fullName}</span>
                  <span className="fare-modal-split-amount font-bold text-emerald-400">₹{Number(s.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleAcknowledgeFare}
              className="fare-modal-submit-btn cursor-pointer"
            >
              Acknowledge ✓
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFareSplitModal(false);
                if (otherMembers.length > 0 && !reportUserId) {
                  setReportUserId(otherMembers[0].userId);
                }
                setShowReportModal(true);
              }}
              className="fare-modal-report-btn cursor-pointer"
            >
              <span>⚠️</span> Report
            </button>
          </>
        )}
      </Modal>

      {/* Report Modal — custom overlay so backdrop stays translucent and background is visible */}
      {showReportModal && (
        <div className="report-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div
            className="report-modal-card animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowReportModal(false)}
              className="report-modal-close-btn"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Heading */}
            <h3 className="report-modal-heading">Report an Issue</h3>

            {/* Who are you reporting */}
            <div className="report-modal-section">
              <label className="report-modal-label">Who are you reporting?</label>
              {otherMembers.length === 0 ? (
                <p className="text-white/40 text-xs">No other members in group</p>
              ) : (
                otherMembers.map((m) => (
                  <label key={m.userId} className="report-modal-radio-row">
                    {/* Hidden native radio for accessibility */}
                    <input
                      type="radio"
                      name="reportUser"
                      value={m.userId}
                      checked={reportUserId === m.userId}
                      onChange={(e) => setReportUserId(e.target.value)}
                      className="sr-only"
                    />
                    {/* Custom styled radio */}
                    <span
                      className={`report-modal-radio-dot ${reportUserId === m.userId ? 'report-modal-radio-dot--checked' : ''}`}
                      aria-hidden="true"
                    >
                      {reportUserId === m.userId && (
                        <span className="report-modal-radio-inner" />
                      )}
                    </span>
                    <span className="report-modal-radio-name">{m.fullName}</span>
                  </label>
                ))
              )}
            </div>

            {/* Describe what happened */}
            <div className="report-modal-section">
              <label className="report-modal-label">Describe what happened</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Please describe the issue in detail (at least 10 characters)..."
                className="report-modal-textarea"
                maxLength={2000}
                style={{ fontSize: '16px' }}
              />
              <div className="report-modal-counter">
                <span className={reportDescription.trim().length >= 10 ? 'text-emerald-400 font-medium' : 'text-amber-400/80'}>
                  {reportDescription.trim().length >= 10 ? '✓ Ready to submit' : `${reportDescription.trim().length} / 10 chars minimum`}
                </span>
                <span className="text-white/40">
                  {reportDescription.length}/2000
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmitReport}
              disabled={isSubmittingReport}
              className="report-modal-submit-btn"
            >
              {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

      {/* Image Preview Fullscreen Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

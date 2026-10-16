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
  const [rideFinishedModal, setRideFinishedModal] = useState(false);

  // Attachment & Image preview state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Fare split state
  const [totalFare, setTotalFare] = useState('');
  const [splitMembers, setSplitMembers] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'smart' | 'equal'>('smart');
  const [memberDistances, setMemberDistances] = useState<Record<string, number>>({});
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
      setRideFinishedModal(true);
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 3500);
    });
    socket.on('fare:split-submitted', (data: any) => {
      if (isLeavingRef.current) return;
      setFareSplitResult(data);
      setShowFareSplitModal(false);
      setRideFinishedModal(true);
      loadGroup();
      showToast('Ride ended & Fare split submitted! 🎉', 'success');
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 3500);
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
        setMemberDistances((prev) => {
          const next = { ...prev };
          data.members.forEach((m, idx) => {
            if (!next[m.userId]) {
              next[m.userId] = idx === 0 ? 2.0 : 3.5;
            }
          });
          return next;
        });
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
        showToast('Ride completed! 🎉', 'success');
        setRideFinishedModal(true);
        setTimeout(() => {
          navigate('/home', { replace: true });
        }, 3500);
      } else {
        showToast('Waiting for co-riders to end...', 'info');
      }
      setShowEndJourneyModal(false);
      await loadGroup();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  // Smart split calculation
  const calculateSmartSplits = () => {
    const total = parseFloat(totalFare) || 0;
    if (total <= 0 || splitMembers.length === 0) return {};

    if (splitMode === 'equal') {
      const perPerson = Math.round((total / splitMembers.length) * 100) / 100;
      const res: Record<string, number> = {};
      splitMembers.forEach((id) => (res[id] = perPerson));
      return res;
    }

    const totalDist = splitMembers.reduce((sum, id) => sum + (memberDistances[id] || 1), 0);
    if (totalDist <= 0) return {};

    const res: Record<string, number> = {};
    let allocated = 0;
    splitMembers.forEach((id, index) => {
      if (index === splitMembers.length - 1) {
        res[id] = Math.max(0, Math.round((total - allocated) * 100) / 100);
      } else {
        const share = Math.round((((memberDistances[id] || 1) / totalDist) * total) * 100) / 100;
        res[id] = share;
        allocated += share;
      }
    });
    return res;
  };

  const handleSubmitFare = async () => {
    if (!groupId || !totalFare || splitMembers.length < 2) return;
    try {
      const fareNum = parseFloat(totalFare);
      const computedSplitsMap = calculateSmartSplits();
      const customSplits = splitMembers.map((uid) => ({
        userId: uid,
        amount: computedSplitsMap[uid] ?? Math.round((fareNum / splitMembers.length) * 100) / 100,
      }));

      const result = await fareApi.submit(groupId, fareNum, splitMembers, customSplits);
      setFareSplitResult(result);
      setShowFareSplitModal(false);
      setRideFinishedModal(true);
      showToast('Ride ended & Fare split submitted! 🎉', 'success');
      await loadGroup();

      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 3500);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit fare split', 'error');
    }
  };

  const handleAcknowledgeFare = async () => {
    if (!groupId) return;
    try {
      await fareApi.acknowledge(groupId);
      showToast('Fare split acknowledged ✓', 'success');
      setShowFareSplitModal(false);
      setRideFinishedModal(true);
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 2000);
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
              <div className="absolute bottom-full mb-3 left-0 bg-[#161a26]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[195px] z-30 animate-fade-in-up">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/90 hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <span className="text-base">📷</span>
                  <span>Photo / Cab Details</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareLiveLocation}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/90 hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <span className="text-base">📍</span>
                  <span>Share Live Location</span>
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

          {/* Split Fare button */}
          {(group.status === 'JOURNEY_STARTED' || group.status === 'JOURNEY_ENDED' || group.status === 'CONFIRMED') && (
            <button
              onClick={() => setShowFareSplitModal(true)}
              className="chat-action-btn bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <span>💰</span>
              <span>Split Fare</span>
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

            <div className="border-t border-white/10 mt-3 pt-3 flex flex-col gap-1">
              <button
                onClick={() => {
                  setShowMenuPanel(false);
                  setShowFareSplitModal(true);
                }}
                className="w-full text-left text-emerald-400 text-xs hover:text-emerald-300 py-1.5 px-2 rounded-lg hover:bg-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer font-medium"
              >
                <span>💰</span> Split Fare
              </button>
              <button
                onClick={handleLeaveGroup}
                className="w-full text-left text-red-400/80 text-xs hover:text-red-400 py-1.5 px-2 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <span>🚪</span> Leave group
              </button>
              <button
                onClick={() => {
                  setShowMenuPanel(false);
                  if (otherMembers.length > 0 && !reportUserId) {
                    setReportUserId(otherMembers[0].userId);
                  }
                  setShowReportModal(true);
                }}
                className="w-full text-left text-red-400/80 text-xs hover:text-red-400 py-1.5 px-2 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <span>⚠️</span> Report
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

            {/* Split Mode Selector */}
            <div className="flex rounded-xl bg-white/10 p-1 mb-4 border border-white/10">
              <button
                type="button"
                onClick={() => setSplitMode('smart')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  splitMode === 'smart'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                ⚡ Smart Destination Split
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  splitMode === 'equal'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Equal Split
              </button>
            </div>

            <div className="fare-modal-section">
              <label className="fare-modal-label">Total cab / auto fare (₹)</label>
              <input
                type="number"
                value={totalFare}
                onChange={(e) => setTotalFare(e.target.value)}
                placeholder="e.g. 180"
                className="fare-modal-input"
                min="0"
                step="0.01"
                style={{ fontSize: '16px' }}
              />
            </div>

            {splitMode === 'smart' ? (
              <div className="fare-modal-section">
                <div className="flex items-center justify-between mb-2">
                  <label className="fare-modal-label mb-0">Riders & Travelled Distance</label>
                  <span className="text-[10px] text-blue-300 font-medium">Smart distance split</span>
                </div>
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {group.members.map((m) => {
                    const isSelf = m.userId === user?.id;
                    const splitsMap = calculateSmartSplits();
                    const share = splitsMap[m.userId] || 0;
                    const dist = memberDistances[m.userId] ?? 2.0;
                    const isSelected = splitMembers.includes(m.userId);

                    return (
                      <div
                        key={m.userId}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-white/5 border-white/15'
                            : 'bg-white/[0.02] border-white/5 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label className="flex items-center gap-2 cursor-pointer min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSplitMembers((prev) => [...prev, m.userId]);
                                } else {
                                  setSplitMembers((prev) => prev.filter((id) => id !== m.userId));
                                }
                              }}
                              className="rounded border-white/20 bg-white/10 text-blue-600 focus:ring-0"
                            />
                            <span className="text-xs font-semibold text-white truncate">
                              {m.fullName} {isSelf ? '(You)' : ''}
                            </span>
                          </label>
                          <span className="text-xs font-bold text-emerald-400">
                            ₹{share.toFixed(2)}
                          </span>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-white/50 text-[11px] whitespace-nowrap">Distance:</span>
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="number"
                                min="0.1"
                                max="100"
                                step="0.5"
                                value={dist}
                                onChange={(e) => {
                                  const val = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                                  setMemberDistances((prev) => ({ ...prev, [m.userId]: val }));
                                }}
                                className="w-16 px-2 py-1 bg-white/10 border border-white/15 rounded-lg text-white text-xs font-mono text-center focus:outline-none focus:border-blue-400"
                              />
                              <span className="text-white/40 text-[11px]">km</span>
                              <div className="flex gap-1 ml-auto">
                                {[1, 2, 4, 6].map((kmVal) => (
                                  <button
                                    key={kmVal}
                                    type="button"
                                    onClick={() => setMemberDistances((prev) => ({ ...prev, [m.userId]: kmVal }))}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                      dist === kmVal
                                        ? 'bg-blue-600/80 text-white'
                                        : 'bg-white/5 hover:bg-white/10 text-white/50'
                                    }`}
                                  >
                                    {kmVal}k
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="fare-modal-section">
                <label className="fare-modal-label">Split equally between:</label>
                {group.members.map((m) => (
                  <label key={m.userId} className="fare-modal-checkbox-row">
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
            )}

            <p className="fare-modal-each-pays">
              {splitMode === 'equal' ? (
                <>Each pays: <span className="fare-modal-amount">₹{computedSplit}</span></>
              ) : (
                <>Smart Calculated Total: <span className="fare-modal-amount">₹{totalFare || '0.00'}</span></>
              )}
            </p>

            <button
              onClick={handleSubmitFare}
              disabled={!totalFare || splitMembers.length < 2}
              className="fare-modal-submit-btn cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Submit Split & End Ride</span>
              <span>🏁</span>
            </button>
          </>
        ) : (
          <>
            <h3 className="fare-modal-heading">Fare Split Summary</h3>
            <div className="fare-modal-splits mb-4">
              {(fareSplitResult?.splits || []).map((s: any) => (
                <div key={s.userId} className="fare-modal-split-row">
                  <span className="fare-modal-split-name">{s.fullName}</span>
                  <span className="fare-modal-split-amount font-bold text-emerald-400">₹{s.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleAcknowledgeFare}
              className="fare-modal-submit-btn cursor-pointer"
            >
              Acknowledge & Finish Ride ✓
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
              className="fare-modal-report-btn"
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

      {/* Ride Finished & Redirection Modal */}
      {rideFinishedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="p-6 rounded-3xl bg-[#121622]/95 border border-white/20 text-center max-w-sm w-full shadow-2xl animate-fade-in-up">
            <span className="text-4xl block mb-2">🎉</span>
            <h3 className="text-xl font-instrument text-white mb-1.5">Ride Completed!</h3>
            <p className="text-xs text-white/70 mb-4 leading-relaxed">
              Your ride session has ended. Redirecting to home screen...
            </p>

            {/* Split Breakdown */}
            {(fareSplitResult?.splits || group?.fareSplit?.participants) && (
              <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-2">
                  Fare Split Breakdown
                </p>
                <div className="flex flex-col gap-1.5">
                  {(fareSplitResult?.splits || group?.fareSplit?.participants || []).map((s: any) => {
                    const isSelf = s.userId === user?.id;
                    return (
                      <div key={s.userId} className="flex items-center justify-between text-xs">
                        <span className={`truncate ${isSelf ? 'text-white font-semibold' : 'text-white/70'}`}>
                          {s.fullName || (isSelf ? 'You' : 'Co-rider')}
                        </span>
                        <span className="font-bold text-emerald-400">
                          ₹{Number(s.amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/home', { replace: true })}
                className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wider cursor-pointer transition-all shadow-md active:scale-95"
              >
                Return to Home Now →
              </button>
            </div>
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

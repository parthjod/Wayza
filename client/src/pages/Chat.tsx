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
import { formatDistance, formatRelativeTime } from '../utils/formatDistance';
import { formatPhone } from '../utils/phone';
import type { Group, ChatMessage as ChatMsg, PickupSequenceData } from '../types';

// Helper to compress chat photo client-side before upload (fast upload, fits in NGINX limits)
async function compressChatImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (file.size < 300 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

function getChatImageUrl(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // If it's a legacy URL pointing to the dummy your-cloudfront domain, rewrite to the working local API endpoint
  if (trimmed.includes('your-cloudfront-id.cloudfront.net')) {
    const match = trimmed.match(/\/chat\/([^/]+)\/([^/]+)$/);
    if (match) {
      return `/api/chat/images/${match[1]}/${match[2]}`;
    }
  }
  return trimmed;
}

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
  const [showEndJourneyModal, setShowEndJourneyModal] = useState(false);
  const [showRideCompletedModal, setShowRideCompletedModal] = useState(false);
  const [showFareSplitModal, setShowFareSplitModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenuPanel, setShowMenuPanel] = useState(false);
  const [showPickupSequenceModal, setShowPickupSequenceModal] = useState(false);
  const [pickupSequenceData, setPickupSequenceData] = useState<PickupSequenceData | null>(null);

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

    socket.on('group:confirmed', (data: any) => {
      if (!isLeavingRef.current) {
        loadGroup();
        if (data?.allConfirmed) {
          if (data?.pickupSequence) {
            setPickupSequenceData(data.pickupSequence);
            setShowPickupSequenceModal(true);
          } else if (groupId) {
            // Fetch dynamically if not in payload
            groupApi.getPickupSequence(groupId).then((seq) => {
              setPickupSequenceData(seq);
              setShowPickupSequenceModal(true);
            }).catch(() => {});
          }
        }
      }
    });
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
      setShowRideCompletedModal(true);
    });
    socket.on('fare:split-submitted', (data: any) => {
      if (isLeavingRef.current) return;
      setShowRideCompletedModal(false);
      // Submitter is already being redirected to home
      if (data?.submittedBy && data.submittedBy === user?.id) {
        return;
      }
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

      if (data.status === 'JOURNEY_ENDED' && !data.fareSplit) {
        setShowRideCompletedModal(true);
      } else if (data.status === 'SPLIT_DONE' || data.fareSplit) {
        setShowRideCompletedModal(false);
      }

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
        if (result.pickupSequence) {
          setPickupSequenceData(result.pickupSequence);
          setShowPickupSequenceModal(true);
        } else {
          groupApi.getPickupSequence(groupId).then((seq) => {
            setPickupSequenceData(seq);
            setShowPickupSequenceModal(true);
          }).catch(() => {});
        }
      } else {
        showToast('Confirmed! Waiting for others...', 'success');
      }
      // Auto-start journey immediately upon confirming
      try {
        await journeyApi.start(groupId);
      } catch {
        // Journey start may fail if not all confirmed yet — that's fine
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

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;
    if (file.size > 25 * 1024 * 1024) {
      showToast('Image too large. Max 25MB.', 'error');
      return;
    }
    setUploadingImage(true);
    setShowAttachMenu(false);
    try {
      showToast('Compressing & uploading photo...', 'info');
      const optimized = await compressChatImage(file);
      await chatApi.uploadImage(groupId, optimized);
      showToast('Photo sent ✓', 'success');
    } catch (err: any) {
      console.error('Chat photo upload error:', err);
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
      // Ensure user is marked as started before ending (covers the case where
      // their start call was silently skipped at confirm-time because not all
      // members had confirmed yet)
      try {
        await journeyApi.start(groupId);
      } catch {
        // Already started or other benign error — safe to ignore
      }
      const result = await journeyApi.end(groupId);
      if (result.allEnded) {
        setShowRideCompletedModal(true);
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
      setShowRideCompletedModal(false);
      isLeavingRef.current = true;
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
      setShowFareSplitModal(false);
      setShowRideCompletedModal(false);
      isLeavingRef.current = true;
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
                  <div className="my-1.5">
                    {(() => {
                      const imgUrl = getChatImageUrl(msg.content.replace('[IMG]', ''));
                      return (
                        <div className="relative group/chatimg inline-block overflow-hidden rounded-xl border border-white/10 bg-black/30">
                          <img
                            src={imgUrl}
                            alt="Shared photo"
                            loading="lazy"
                            className="max-w-[210px] sm:max-w-[260px] max-h-[250px] rounded-xl object-cover cursor-pointer hover:opacity-95 transition-all block"
                            onClick={() => setPreviewImage(imgUrl)}
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div
                            className="hidden items-center justify-center p-3 text-center text-xs text-white/60 bg-white/[0.04] rounded-xl flex-col gap-1 cursor-pointer"
                            onClick={() => setPreviewImage(imgUrl)}
                          >
                            <span className="text-base">🖼️</span>
                            <span className="text-[11px] underline">Open image</span>
                          </div>
                        </div>
                      );
                    })()}
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
              accept="image/*,image/jpeg,image/png,image/webp"
              onChange={handleImageSelected}
              className="hidden"
            />

            {/* Attachment popover menu */}
            {showAttachMenu && (
              <div className="chat-attach-menu animate-fade-in-up">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="chat-attach-item group"
                >
                  <div className="chat-attach-icon-wrap bg-blue-500/15 border border-blue-500/30 text-blue-400 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <span className="font-medium text-[13px] tracking-tight text-white/90">Photo</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareLiveLocation}
                  className="chat-attach-item group"
                >
                  <div className="chat-attach-icon-wrap bg-rose-500/15 border border-rose-500/30 text-rose-400 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <span className="font-medium text-[13px] tracking-tight text-white/90">Share Live Location</span>
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
              className={`chat-action-btn w-full min-h-[58px] rounded-full flex flex-col items-center justify-center gap-0.5 px-4 py-2 text-center transition-all duration-200 ${selfMember?.confirmedGoWith
                ? 'chat-action-btn--confirmed'
                : otherMembers.length === 0
                  ? 'opacity-50 cursor-not-allowed bg-white/10'
                  : 'chat-go-btn'
                }`}
            >
              <span className="text-sm font-semibold leading-5">
                {selfMember?.confirmedGoWith
                  ? `✓ Confirmed (${confirmedCount}/${group.members.length})`
                  : otherMembers.length > 0
                    ? `Go with ${otherNames}`
                    : 'Waiting for members to join…'}
              </span>

              {!selfMember?.confirmedGoWith && otherMembers.length > 0 && (
                <span
                  className="text-xs font-normal leading-4 text-white/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/terms';
                  }}
                >
                  By clicking Go, you agree to{' '}
                  <span className="underline underline-offset-2 font-medium">
                    Terms &amp; Liability Policy
                  </span>
                </span>
              )}
            </button>
          )}

          {/* View Pickup Sequence button */}
          {allConfirmed && group.status !== 'FORMING' && (
            <button
              onClick={() => {
                if (pickupSequenceData) {
                  setShowPickupSequenceModal(true);
                } else if (groupId) {
                  groupApi.getPickupSequence(groupId).then((seq) => {
                    setPickupSequenceData(seq);
                    setShowPickupSequenceModal(true);
                  }).catch(() => {
                    showToast('Could not load pickup sequence', 'error');
                  });
                }
              }}
              className="chat-action-btn chat-action-btn--sequence"
            >
              📍 Pickup Sequence
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


          {/* End Journey button — shown once confirmed or journey started */}
          {(group.status === 'CONFIRMED' || group.status === 'JOURNEY_STARTED') && !selfMember?.endedJourney && (
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
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md" onClick={() => setShowMenuPanel(false)}>
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

            <div className="group-menu-divider" />

            <div className="group-menu-actions">
              <button
                onClick={handleLeaveGroup}
                className="group-menu-action-btn group-menu-action-btn--leave"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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
                className="group-menu-action-btn group-menu-action-btn--report"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Report an Issue</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuPanel(false);
                  window.open('/terms', '_blank');
                }}
                className="group-menu-action-btn group-menu-action-btn--terms"
                title="View Wayza Terms of Service & Financial Disclaimers"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Terms & Liability Policy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optimal Pickup Sequence Modal */}
      <Modal
        open={showPickupSequenceModal}
        onClose={() => setShowPickupSequenceModal(false)}
        className="pickup-modal-card"
      >
        {/* Header */}
        <div className="pickup-modal-header">
          <div className="pickup-header-content">
            <span className="pickup-modal-badge">
              <span className="pickup-badge-icon">⚡</span>
              LOWEST COST ROUTE
            </span>

            <h3 className="pickup-modal-title font-instrument">
              Pickup Sequence
            </h3>

            <p className="pickup-modal-subtitle">
              Follow this sequence to ensure the cheapest combined ride fare.
            </p>
          </div>

          <button
            onClick={() => setShowPickupSequenceModal(false)}
            className="pickup-modal-icon-close"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Suggested Booker Banner */}
        {pickupSequenceData?.suggestedBooker && (
          <div className="pickup-booker-banner">
            <div className="pickup-avatar-large">
              <Avatar
                name={pickupSequenceData.suggestedBooker.fullName}
                imageUrl={pickupSequenceData.suggestedBooker.profilePicUrl}
                size="md"
              />
            </div>

            <div className="pickup-booker-info">
              <div className="pickup-booker-labels">
                <span className="pickup-booker-badge">
                  SUGGESTED BOOKER
                </span>

                {pickupSequenceData.suggestedBooker.userId === user?.id && (
                  <span className="pickup-you-badge">
                    You
                  </span>
                )}
              </div>

              <p className="pickup-booker-name">
                {pickupSequenceData.suggestedBooker.fullName}
              </p>

              <p className="pickup-booker-description">
                {pickupSequenceData.suggestedBooker.userId === user?.id
                  ? 'Please book the ride on an external platform in the sequence shown below.'
                  : `Ask ${pickupSequenceData.suggestedBooker.fullName.split(' ')[0]} to book the ride on an external platform in this sequence.`}
              </p>
            </div>
          </div>
        )}

        {/* Pickup Timeline */}
        <div className="pickup-steps-list">
          {pickupSequenceData?.sequence?.map((stop) => {
            const isBooker = stop.order === 1;
            const isUser = stop.userId === user?.id;

            return (
              <div key={stop.userId} className="pickup-step-item">
                {/* Timeline Number and Connector */}
                <div className="pickup-step-left">
                  <div
                    className={`pickup-step-number ${
                      isBooker ? 'pickup-step-number--active' : ''
                    }`}
                  >
                    {stop.order}
                  </div>

                  <div className="pickup-step-connector" />
                </div>

                {/* Pickup Card */}
                <div
                  className={`pickup-step-card ${
                    isBooker ? 'pickup-step-card--first' : ''
                  }`}
                >
                  <div className="pickup-step-details">
                    <div className="pickup-avatar-small">
                      <Avatar
                        name={stop.fullName}
                        imageUrl={stop.profilePicUrl}
                        size="sm"
                      />
                    </div>

                    <div className="pickup-step-info">
                      <div className="pickup-step-title-row">
                        <span className="pickup-step-name">
                          {stop.fullName}
                        </span>

                        {isUser && (
                          <span className="pickup-you-badge">
                            You
                          </span>
                        )}

                        {isBooker && (
                          <span className="pickup-first-badge">
                            1st Pickup
                          </span>
                        )}
                      </div>

                      <p className="pickup-step-description">
                        {isBooker
                          ? 'Start ride / Pickup Point 1'
                          : `Pickup Stop #${stop.order}`}
                      </p>
                    </div>
                  </div>

                  {stop.distanceToNextMeters > 0 && (
                    <span className="pickup-distance">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-3.5 h-3.5">
                        <path
                          d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="10"
                          r="2.5"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      ~{formatDistance(stop.distanceToNextMeters)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Final Destination */}
          <div className="pickup-step-item pickup-destination-item">
            <div className="pickup-step-left">
              <div className="pickup-step-number pickup-step-number--dest">
                🏁
              </div>
            </div>

            <div className="pickup-step-card pickup-destination-card">
              <div className="pickup-destination-info">
                <span className="pickup-destination-label">
                  FINAL DESTINATION
                </span>

                <span className="pickup-destination-name">
                  {pickupSequenceData?.destination?.label || 'Campus'}
                </span>
              </div>

              {pickupSequenceData?.totalDistanceMeters ? (
                <span className="pickup-total-distance">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-3.5 h-3.5">
                    <path
                      d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="10"
                      r="2.5"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Total ~{formatDistance(pickupSequenceData.totalDistanceMeters)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Information Note */}
        <div className="pickup-note-box">
          <span className="pickup-note-icon">💡</span>
          <p>
            <strong>Note:</strong> This is the suggested pickup sequence for least transit cost. Book the ride on an external platform following this order to get the cheapest fare.
          </p>
        </div>

        {/* Bottom Button */}
        <button
          onClick={() => setShowPickupSequenceModal(false)}
          className="pickup-modal-close-btn"
          type="button"
        >
          Got it
        </button>
      </Modal>

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

      {/* Ride Completed Modal — shown when all members end journey */}
      {showRideCompletedModal && (
        <div
          className="ride-completed-overlay"
          onClick={() => setShowRideCompletedModal(false)}
        >
          <div
            className="ride-completed-card animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ride-completed-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Celebration Icon */}
            <div className="ride-completed-icon-wrap">
              <div className="ride-completed-icon">
                🎉
              </div>

              {/* Decorative sparkles */}
              <span className="ride-completed-sparkle sparkle-one">✦</span>
              <span className="ride-completed-sparkle sparkle-two">✦</span>
              <span className="ride-completed-sparkle sparkle-three">✦</span>
              <span className="ride-completed-sparkle sparkle-four">•</span>
              <span className="ride-completed-sparkle sparkle-five">•</span>
            </div>

            {/* Heading */}
            <h3
              id="ride-completed-title"
              className="ride-completed-title font-instrument"
            >
              Ride Completed!
            </h3>

            {/* Description */}
            <p className="ride-completed-description">
              All co-riders have finished their journey. Choose an option below to proceed.
            </p>

            {/* Actions */}
            <div className="ride-completed-actions">
              <button
                type="button"
                onClick={() => {
                  setShowRideCompletedModal(false);
                  setShowFareSplitModal(true);
                }}
                className="ride-completed-split-btn"
              >
                <span className="ride-completed-button-icon">💳</span>
                <span>Split Fare</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRideCompletedModal(false);
                  navigate('/home', { replace: true });
                }}
                className="ride-completed-home-btn"
              >
                <span className="ride-completed-button-icon">🏠</span>
                <span>Return to Home</span>
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
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer select-none animate-fade-in-up"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center text-xl transition-all cursor-pointer border border-white/15"
            aria-label="Close image preview"
          >
            ✕
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}

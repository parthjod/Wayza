import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLocation as useGeoLocation } from '../hooks/useLocation';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../components/ui/Toast';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { FeedbackForm } from '../components/ui/FeedbackForm';
import { discoveryApi } from '../api/discovery.api';
import { groupApi } from '../api/group.api';
import { locationApi } from '../api/location.api';
import { HOME_BG_VIDEO, CAMPUS_POIS, RADIUS_OPTIONS } from '../utils/constants';
import { formatDistance } from '../utils/formatDistance';
import type { NearbyUser, AutocompleteResult } from '../types';

type ViewState = 'booking' | 'discovering' | 'user-detail';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { requestLocation } = useGeoLocation();
  const { socket } = useSocket();
  const { showToast } = useToast();

  const [viewState, setViewState] = useState<ViewState>('booking');
  const [dropLabel, setDropLabel] = useState('');
  const [dropLat, setDropLat] = useState<number | null>(null);
  const [dropLng, setDropLng] = useState<number | null>(null);
  const [dropLocationId, setDropLocationId] = useState<string | null>(null);
  const [radius, setRadius] = useState(1000);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [locationPermissionModal, setLocationPermissionModal] = useState(false);
  const [activeRide, setActiveRide] = useState<any | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<{
    groupId: string;
    inviterId: string;
    inviterName: string;
    inviterPicUrl: string | null;
    dropLocationLabel?: string;
  } | null>(null);
  const [showAllRidersModal, setShowAllRidersModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Check for active ride session on mount
  useEffect(() => {
    groupApi
      .getActive()
      .then((data) => {
        if (data?.activeGroup) {
          setActiveRide(data.activeGroup);
        }
      })
      .catch(() => {});
  }, []);

  // Socket events for discovery and incoming connection requests
  useEffect(() => {
    if (!socket) return;

    socket.on('group:invite-received', (data: any) => {
      setIncomingInvite({
        groupId: data.groupId,
        inviterId: data.inviterId,
        inviterName: data.inviterName || 'A rider',
        inviterPicUrl: data.inviterPicUrl || null,
        dropLocationLabel: data.dropLocationLabel || '',
      });
    });

    socket.on('discovery:user-joined', async () => {
      try {
        const fresh = await discoveryApi.getNearby();
        if (fresh && Array.isArray(fresh.users)) {
          setNearbyUsers(fresh.users);
        }
      } catch {
        // silent
      }
    });

    socket.on('discovery:user-left', (data: { userId: string }) => {
      setNearbyUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    return () => {
      socket.off('group:invite-received');
      socket.off('discovery:user-joined');
      socket.off('discovery:user-left');
    };
  }, [socket]);

  const openHistory = async () => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const data = await groupApi.getHistory();
      setRideHistory(data.rides || []);
    } catch {
      showToast('Failed to load ride history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Autocomplete for custom location
  useEffect(() => {
    if (customLocation.trim().length < 2) {
      setAutocompleteResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const data = await locationApi.autocomplete(customLocation.trim());
        setAutocompleteResults(data.results || []);
      } catch {
        // silent
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [customLocation]);

  const selectDropLocation = (label: string, lat: number, lng: number, id?: string) => {
    setDropLabel(label);
    setDropLat(lat);
    setDropLng(lng);
    setDropLocationId(id || null);
    setShowCustomInput(false);
    setAutocompleteResults([]);
  };

  const executeLocationSearch = async () => {
    setLoading(true);

    try {
      const loc = await requestLocation();
      localStorage.setItem('wayza_location_granted', 'true');

      await discoveryApi.publishLocation({
        lat: loc.lat,
        lng: loc.lng,
        dropLocationId,
        dropLocationCustom: dropLocationId ? null : dropLabel,
        dropLat,
        dropLng,
        searchRadiusMeters: radius,
      });

      const data = await discoveryApi.getNearby();
      setNearbyUsers(data.users);
      setViewState('discovering');

      // Start polling every 30s
      pollingRef.current = setInterval(async () => {
        try {
          const fresh = await discoveryApi.getNearby();
          setNearbyUsers(fresh.users);
        } catch {
          // silent
        }
      }, 30000);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('denied')) {
        localStorage.removeItem('wayza_location_granted');
      }
      showToast(err.message || 'Failed to get location', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = async () => {
    if (!dropLabel || radius === 0) {
      showToast('Select a drop location and radius', 'error');
      return;
    }

    // Check if location permission is already granted
    let hasPermission = false;
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'granted') {
          hasPermission = true;
        }
      }
    } catch {
      // fallback
    }

    if (!hasPermission && localStorage.getItem('wayza_location_granted') === 'true') {
      hasPermission = true;
    }

    if (hasPermission) {
      executeLocationSearch();
    } else {
      setLocationPermissionModal(true);
    }
  };

  const handleLocationGranted = async () => {
    setLocationPermissionModal(false);
    await executeLocationSearch();
  };

  const handleConnect = async (targetUserId: string) => {
    try {
      const result = await groupApi.initiate(targetUserId);
      navigate(`/chat/${result.groupId}`);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to connect', 'error');
    }
  };

  const handleStopBooking = async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    try {
      await discoveryApi.unpublish();
    } catch {
      // silent
    }
    setNearbyUsers([]);
    setViewState('booking');
    setShowDropdown(false);
    showToast('Booking search stopped', 'info');
  };

  const handleLogout = async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    try {
      await discoveryApi.unpublish();
    } catch {
      // silent
    }
    await logout();
    navigate('/', { replace: true });
  };

  // Calculate radial positions for nearby users
  const getUserPosition = (index: number, total: number) => {
    const angle = (360 / Math.max(total, 1)) * index - 90; // Start from top
    const r = window.innerWidth < 640 ? 90 : 140;
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * r,
      y: Math.sin(rad) * r,
    };
  };

  return (
    <div className="relative min-h-screen">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="video-bg"
      >
        <source src={HOME_BG_VIDEO} type="video/mp4" />
      </video>

      {/* Atmospheric Scrim for video contrast */}
      <div className="video-scrim" />

      {/* Very subtle gradient vignette when discovering — keeps background clearly visible */}
      {viewState === 'discovering' && (
        <div className="home-discovering-overlay" />
      )}      {/* Navbar with frosted backdrop so content never collides */}
      <header className="fixed top-0 left-0 right-0 z-40 w-full flex items-center justify-between px-6 sm:px-10 md:px-14 py-3.5 sm:py-4 bg-[#0a0f1d]/75 backdrop-blur-md border-b border-white/[0.08] pointer-events-none transition-all">
        {/* Brand Logo - anchored with balanced margins */}
        <div className="pointer-events-auto select-none flex items-center">
          <span
            onClick={() => {
              if (viewState !== 'booking') handleStopBooking();
              else navigate('/home');
            }}
            className="text-white text-[24px] sm:text-[30px] md:text-[34px] font-instrument tracking-[0.16em] drop-shadow-md leading-none select-none font-normal cursor-pointer hover:opacity-85 transition-opacity"
            title="Wayza Home"
          >
            WAYZA
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 pointer-events-auto">
          {/* Tell us something — feedback button (hidden on mobile, present in avatar dropdown) */}
          <button
            id="feedback-nav-btn"
            onClick={() => setShowFeedback(true)}
            className="feedback-nav-btn hidden md:inline-flex"
            aria-label="Share feedback"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Tell us something
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 cursor-pointer rounded-full ring-2 ring-white/10 hover:ring-white/30 p-0.5 transition-all"
            >
              <Avatar
                name={user?.fullName || ''}
                imageUrl={user?.profilePicUrl}
                size="md"
              />
            </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2.5 wayza-avatar-dropdown animate-fade-in-up">
                  {/* Tell us something (mobile view) */}
                  <button
                    onClick={() => { setShowFeedback(true); setShowDropdown(false); }}
                    className="wayza-avatar-dropdown-item text-white/90 md:hidden"
                  >
                    <svg className="w-[18px] h-[18px] text-white/80 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Tell us something</span>
                  </button>
                  {/* Profile */}
                  <button
                    onClick={() => { navigate('/profile'); setShowDropdown(false); }}
                    className="wayza-avatar-dropdown-item wayza-avatar-dropdown-item--profile"
                  >
                    <svg className="w-[18px] h-[18px] text-white/90 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span>Profile</span>
                  </button>

                  {/* Current Active Ride (if connected) */}
                  {activeRide && (
                    <button
                      onClick={() => { navigate(`/chat/${activeRide.id}`); setShowDropdown(false); }}
                      className="wayza-avatar-dropdown-item text-blue-400 hover:bg-blue-500/10"
                    >
                      <span className="text-base flex-shrink-0">🚗</span>
                      <span className="font-medium text-blue-300">Current Ride</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 ml-auto animate-pulse flex-shrink-0" />
                    </button>
                  )}

                  {/* Last Rides / Ride History */}
                  <button
                    onClick={() => { openHistory(); setShowDropdown(false); }}
                    className="wayza-avatar-dropdown-item text-white/90"
                  >
                    <svg className="w-[18px] h-[18px] text-white/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Last Rides</span>
                  </button>

                  {/* Stop booking */}
                  {viewState === 'discovering' && (
                    <button
                      onClick={handleStopBooking}
                      className="wayza-avatar-dropdown-item wayza-avatar-dropdown-item--stop"
                    >
                      <svg className="w-[18px] h-[18px] text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                      </svg>
                      <span>Stop booking</span>
                    </button>
                  )}

                  {/* Logout */}
                  <button
                    onClick={() => { setShowLogoutConfirm(true); setShowDropdown(false); }}
                    className="wayza-avatar-dropdown-item wayza-avatar-dropdown-item--logout"
                  >
                    <svg className="w-[18px] h-[18px] text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-20 pb-12">
        {viewState === 'booking' && (
          <div className="home-booking-card w-full text-center animate-fade-in-up">
            {/* Active Ride Banner */}
            {activeRide && (
              <div
                onClick={() => navigate(`/chat/${activeRide.id}`)}
                className="w-full mb-4 sm:mb-5 p-3.5 sm:p-4 rounded-2xl bg-blue-500/15 border border-blue-400/35 backdrop-blur-md cursor-pointer hover:bg-blue-500/25 transition-all flex items-center justify-between text-left group shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-lg flex-shrink-0">
                    🚗
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Current Ride in Progress</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    </div>
                    <p className="text-xs text-white/70 truncate max-w-[200px] sm:max-w-xs">
                      With {activeRide.members?.filter((m: any) => m.userId !== user?.id).map((m: any) => m.fullName).join(', ') || 'co-passenger'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-300 group-hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-xl flex-shrink-0">
                  Resume Chat →
                </span>
              </div>
            )}

            <h2 className="text-[clamp(22px,3.8vw,34px)] font-instrument italic text-white mb-4 sm:mb-6 leading-tight select-none">
              Where are you heading?
            </h2>

            {/* Drop location options */}
            <div className="flex flex-col gap-2.5 sm:gap-3 mb-5 sm:mb-6 w-full">
              {CAMPUS_POIS.map((poi: { label: string; lat: number; lng: number }) => (
                <button
                  key={poi.label}
                  onClick={() => selectDropLocation(poi.label, poi.lat, poi.lng)}
                  className={`w-full px-5 py-3 sm:py-3.5 rounded-2xl text-left text-[14px] sm:text-[15px] transition-all flex items-center gap-3.5 cursor-pointer ${dropLabel === poi.label
                    ? 'bg-white text-gray-950 font-semibold border border-white shadow-md'
                    : 'bg-white/7 text-white/90 border border-white/16 hover:bg-white/12 hover:border-white/25 font-normal'
                    }`}
                  style={{ minHeight: "48px" }}
                >
                  <svg
                    className={`w-4 h-4 flex-shrink-0 ${dropLabel === poi.label ? 'text-gray-950' : 'text-white/70'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>

                  <span className="truncate">{poi.label}</span>
                </button>
              ))}

              {!showCustomInput ? (
                (() => {
                  const isCustomSelected =
                    Boolean(dropLabel) && !CAMPUS_POIS.some((p) => p.label === dropLabel);
                  return (
                    <button
                      onClick={() => {
                        setCustomLocation(isCustomSelected ? dropLabel : '');
                        setShowCustomInput(true);
                      }}
                      className={`w-full px-5 py-3 sm:py-3.5 rounded-2xl text-left text-[14px] sm:text-[15px] transition-all flex items-center justify-between cursor-pointer ${
                        isCustomSelected
                          ? 'bg-white text-gray-950 font-semibold border border-white shadow-md'
                          : 'bg-white/7 text-white/65 border border-white/16 hover:bg-white/12 hover:border-white/25'
                      }`}
                      style={{ minHeight: "48px" }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {isCustomSelected ? (
                          <svg
                            className="w-4 h-4 flex-shrink-0 text-gray-900"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                            />
                          </svg>
                        ) : (
                          <span className="text-lg leading-none text-white/60 font-light">+</span>
                        )}
                        <span className="truncate">
                          {isCustomSelected ? dropLabel : 'Enter custom location'}
                        </span>
                      </div>
                      {isCustomSelected && (
                        <span className="text-xs text-gray-500 hover:text-gray-900 ml-2 flex-shrink-0 font-medium">
                          Edit
                        </span>
                      )}
                    </button>
                  );
                })()
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <svg
                      style={{ left: "16px" }}
                      className="absolute w-4 h-4 text-white/40 pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="Type your destination (e.g. Kothrud, Swargate)..."
                      className="w-full bg-white/7 border border-white/20 rounded-2xl text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
                      autoFocus
                      style={{
                        width: "100%",
                        height: "48px",
                        paddingLeft: "44px",
                        paddingRight: "44px",
                        fontSize: "15px",
                        boxSizing: "border-box",
                        borderRadius: "16px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInput(false);
                        setAutocompleteResults([]);
                      }}
                      className="absolute right-4 text-white/50 hover:text-white text-sm cursor-pointer"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>

                  {autocompleteResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-[#121622]/95 backdrop-blur-xl border border-white/15 shadow-2xl max-h-56 overflow-y-auto z-30 p-2 flex flex-col gap-1">
                      {autocompleteResults.map((result, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            selectDropLocation(result.label, result.lat, result.lng)
                          }
                          className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-white/90 hover:bg-white/12 hover:text-white transition-colors cursor-pointer flex items-center gap-2.5"
                        >
                          <svg
                            className="w-4 h-4 flex-shrink-0 text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                            />
                          </svg>
                          <span className="truncate">{result.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Radius selector */}
            <div className="mb-5 sm:mb-6">
              <label className="text-white/65 text-[13px] sm:text-[14px] mb-2.5 block text-center tracking-wide font-normal">
                Search within:
              </label>

              <div className="flex flex-wrap gap-2.5 justify-center">
                {RADIUS_OPTIONS.map((opt: { label: string; value: number }) => (
                  <button
                    key={opt.value}
                    onClick={() => setRadius(opt.value)}
                    className={`rounded-xl text-[13px] sm:text-[14px] transition-all cursor-pointer border ${radius === opt.value
                      ? 'bg-white text-gray-950 font-bold border-white shadow-sm'
                      : 'bg-white/6 text-white/75 border-white/18 hover:bg-white/12 hover:border-white/30 font-medium'
                      }`}
                    style={{
                      minWidth: "62px",
                      height: "40px",
                      paddingLeft: "14px",
                      paddingRight: "14px",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Book Now button */}
            <button
              onClick={handleBookNow}
              className="home-book-btn w-full mt-4 text-white text-[15px] sm:text-[16px] font-bold tracking-widest cursor-pointer flex items-center justify-center select-none active:scale-[0.99] transition-all"
            >
              {loading ? <Spinner size="sm" className="border-white/20 border-t-white" /> : 'BOOK NOW'}
            </button>
          </div>
        )}

        {viewState === 'discovering' && (
          <div className="home-booking-card w-full max-w-[460px] text-center animate-fade-in-up flex flex-col items-center">
            {/* Destination info chip */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-white/80 mb-4">
              <span className="text-emerald-400">📍</span>
              <span className="font-medium truncate max-w-[190px]">{dropLabel || 'Destination'}</span>
              <span className="text-white/40">•</span>
              <span className="text-white/60">{radius} km</span>
            </div>

            {nearbyUsers.length === 0 ? (
              /* Loading state — no nearby riders found yet */
              <div className="flex flex-col items-center w-full py-2">
                <h3 className="font-instrument text-2xl sm:text-3xl text-white mb-2 tracking-wide">
                  Looking for Riders...
                </h3>
                <p className="text-xs sm:text-sm text-white/60 mb-6 max-w-xs leading-relaxed">
                  Scanning for students heading to {dropLabel || 'the same destination'} within {radius} km
                </p>

                {/* Concentric pulsing radar */}
                <div className="relative flex items-center justify-center w-44 h-44 my-2">
                  <div className="absolute inset-0 rounded-full border border-blue-500/25 animate-ping opacity-35" />
                  <div className="absolute w-32 h-32 rounded-full border border-blue-400/35 animate-pulse" />
                  <div className="absolute w-20 h-20 rounded-full bg-blue-500/15 border border-blue-400/40 flex items-center justify-center" />
                  <div className="relative z-10 flex flex-col items-center">
                    <Avatar name={user?.fullName || 'You'} imageUrl={user?.profilePicUrl} size="md" />
                    <span className="mt-1 text-[11px] font-semibold text-white/80 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      You
                    </span>
                  </div>
                </div>

                {/* Cancel booking button */}
                <button
                  type="button"
                  onClick={handleStopBooking}
                  className="w-full mt-7 py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-red-500/20 hover:border-red-500/40 border border-white/15 text-white/90 hover:text-red-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>Cancel Booking</span>
                </button>
              </div>
            ) : (
              /* Radial layout when riders found */
              (() => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                const maxRadar = isMobile ? 4 : 6;
                const visibleRadarUsers = nearbyUsers.slice(0, maxRadar);
                const extraCount = nearbyUsers.length - visibleRadarUsers.length;

                return (
                  <div className="flex flex-col items-center w-full py-1">
                    <h3 className="font-instrument text-2xl text-white mb-1 tracking-wide">
                      Co-riders Found!
                    </h3>
                    <p className="text-xs text-white/60 mb-4">
                      Tap a rider to view profile and connect
                    </p>

                    <div className="relative flex items-center justify-center my-2" style={{ minHeight: '270px', width: '270px' }}>
                      {/* Radar rings */}
                      <div className="absolute w-[260px] h-[260px] rounded-full border border-white/10 pointer-events-none" />
                      <div className="absolute w-[180px] h-[180px] rounded-full border border-white/10 pointer-events-none" />
                      <div className="absolute w-[90px] h-[90px] rounded-full border border-white/15 pointer-events-none" />

                      {/* Center indicator */}
                      <div className="absolute flex flex-col items-center z-10 pointer-events-none">
                        <Avatar name={user?.fullName || 'You'} imageUrl={user?.profilePicUrl} size="sm" />
                        <span className="mt-1 text-[10px] text-white/60 font-medium">You</span>
                      </div>

                      {visibleRadarUsers.map((nUser, i) => {
                        const pos = getUserPosition(i, visibleRadarUsers.length);
                        const name = nUser?.fullName || 'Rider';
                        const firstName = name.split(' ')[0] || 'Rider';
                        return (
                          <button
                            key={nUser.userId || i}
                            onClick={() => { setSelectedUser(nUser); setViewState('user-detail'); }}
                            className="absolute flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95 cursor-pointer z-20 group"
                            style={{
                              transform: `translate(${pos.x}px, ${pos.y}px)`,
                            }}
                          >
                            <div className="relative">
                              <Avatar name={name} imageUrl={nUser.profilePicUrl} size="md" className="ring-2 ring-blue-500/50 group-hover:ring-blue-400" />
                              {nUser.rating && (
                                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full shadow-md flex items-center gap-0.5 border border-black/20">
                                  ★ {nUser.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <span className="text-white text-xs font-semibold max-w-[70px] truncate drop-shadow-sm">
                              {firstName}
                            </span>
                            <span className="text-white/70 text-[10px] font-medium bg-black/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                              {formatDistance(nUser.distanceMeters || 0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* View all active riders button */}
                    {nearbyUsers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllRidersModal(true)}
                        className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 backdrop-blur-xl text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                      >
                        <span>👥 View all riders ({nearbyUsers.length})</span>
                        {extraCount > 0 && (
                          <span className="text-blue-400 font-bold">+{extraCount} more →</span>
                        )}
                      </button>
                    )}

                    {/* Cancel booking button */}
                    <button
                      type="button"
                      onClick={handleStopBooking}
                      className="w-full mt-5 py-3 px-6 rounded-2xl bg-white/10 hover:bg-red-500/20 hover:border-red-500/40 border border-white/15 text-white/90 hover:text-red-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Cancel Booking</span>
                    </button>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* User Detail Card */}
      {viewState === 'user-detail' && selectedUser && (
        <div className="nearby-user-overlay" onClick={() => setViewState('discovering')}>
          <div
            className="nearby-user-card animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Identity row: avatar left, name+distance right */}
            <div className="nearby-user-identity">
              <Avatar name={selectedUser.fullName} imageUrl={selectedUser.profilePicUrl} size="xl" className="nearby-user-avatar" />
              <div className="nearby-user-info">
                <span className="nearby-user-name">{selectedUser.fullName}</span>
                <span className="nearby-user-distance">{formatDistance(selectedUser.distanceMeters)} away</span>
              </div>
            </div>

            {/* Destination row */}
            <div className="nearby-user-destination">
              <svg className="nearby-user-pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="nearby-user-dest-label">Heading to:&nbsp;</span>
              <span className="nearby-user-dest-value">{selectedUser.dropLocationLabel}</span>
            </div>

            {/* Connect button */}
            <button
              onClick={() => handleConnect(selectedUser.userId)}
              className="nearby-user-connect-btn"
            >
              Connect
            </button>
          </div>
        </div>
      )}

      {/* Location Permission Modal */}
      <Modal
        open={locationPermissionModal}
        onClose={() => setLocationPermissionModal(false)}
        className="!max-w-sm !p-6 sm:!p-8 text-center"
      >
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-3xl mb-4">
            📍
          </div>
          <h3 className="font-instrument text-2xl text-white mb-2 tracking-wide">
            Location Access Needed
          </h3>
          <p className="text-sm text-white/65 mb-6 leading-relaxed">
            Wayza needs your location to find students near you. Your location is
            only stored temporarily and is never saved permanently.
          </p>
          <button
            onClick={handleLocationGranted}
            className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-white/90 text-black font-bold text-sm shadow-lg transition-all cursor-pointer"
          >
            Allow Location
          </button>
        </div>
      </Modal>

      {/* Logout Confirmation Modal — uses standard Modal with backdrop-blur-md */}
      <Modal open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} className="!max-w-sm !p-6 sm:!p-7 text-center">
        <h3 className="text-xl sm:text-2xl font-instrument text-white mb-2 tracking-wide">Are you sure?</h3>
        <p className="text-sm text-white/60 mb-6 leading-relaxed">You'll need to log in again to use Wayza.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLogoutConfirm(false)}
            className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            Yes, Logout
          </button>
        </div>
      </Modal>

      {/* Incoming Connection Invitation Popup — Dynamic Island Glass Style */}
      {incomingInvite && (
        <div className="wayza-dynamic-invite animate-fade-in-down">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                Ride Request
              </span>
            </div>
            <button
              onClick={() => setIncomingInvite(null)}
              className="text-white/40 hover:text-white p-1 text-xs cursor-pointer rounded-full hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-shrink-0">
              <Avatar name={incomingInvite.inviterName} imageUrl={incomingInvite.inviterPicUrl} size="md" />
              <div className="absolute -inset-0.5 rounded-full border border-blue-400/50 animate-pulse pointer-events-none" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate leading-snug">
                {incomingInvite.inviterName}
              </p>
              <p className="text-xs text-white/60 leading-tight">
                wants to share a ride with you
              </p>
              {incomingInvite.dropLocationLabel && (
                <p className="text-[11px] text-blue-300 mt-0.5 truncate flex items-center gap-1 font-medium">
                  <span>📍</span>
                  <span>To: {incomingInvite.dropLocationLabel}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => {
                const grpId = incomingInvite.groupId;
                setIncomingInvite(null);
                navigate(`/chat/${grpId}`);
              }}
              className="flex-1 py-2.5 px-4 rounded-full bg-white text-slate-900 font-semibold text-xs transition-all shadow-md hover:bg-slate-100 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Accept & Chat</span>
              <span className="text-sm leading-none">→</span>
            </button>
            <button
              onClick={() => setIncomingInvite(null)}
              className="py-2.5 px-4 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-white/75 hover:text-white border border-white/15 text-xs font-medium transition-all cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* All Active Riders Modal / Drawer */}
      <Modal open={showAllRidersModal} onClose={() => setShowAllRidersModal(false)}>
        <div className="p-4 sm:p-5 max-w-lg mx-auto text-left">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <h3 className="text-xl font-instrument text-white">Active Riders</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                  {nearbyUsers.length} online
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Sorted by highest reviews, rating & closest distance
              </p>
            </div>
            <button
              onClick={() => setShowAllRidersModal(false)}
              className="text-white/40 hover:text-white text-sm p-1 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
            {nearbyUsers.map((rider) => {
              const name = rider.fullName || 'Rider';
              return (
                <div
                  key={rider.userId}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] border border-white/10 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Avatar name={name} imageUrl={rider.profilePicUrl} size="md" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#121622]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {name}
                        </span>
                        {rider.rating && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 flex items-center gap-0.5">
                            ★ {rider.rating.toFixed(1)}
                            {rider.reviewsCount ? ` (${rider.reviewsCount})` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                        <span className="text-blue-300 truncate">
                          📍 {rider.dropLocationLabel || 'Campus'}
                        </span>
                        <span>•</span>
                        <span>{formatDistance(rider.distanceMeters || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowAllRidersModal(false);
                      handleConnect(rider.userId);
                    }}
                    className="flex-shrink-0 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Connect</span>
                    <span>→</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Ride History Modal */}
      <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} className="!p-4 sm:!p-6 max-w-lg w-full">
        <div className="w-full text-left">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📜</span>
              <h3 className="text-xl sm:text-2xl font-instrument text-white tracking-wide">Ride History</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
                {rideHistory.length}
              </span>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors text-xs cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : rideHistory.length === 0 ? (
            <div className="py-10 text-center text-white/50 text-sm">
              <p className="text-3xl mb-2">🚗</p>
              <p className="font-medium text-white/70">No past rides yet</p>
              <p className="text-xs text-white/35 mt-1">Your completed campus rides will show up here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {rideHistory.map((ride: any) => {
                const date = new Date(ride.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const coRiders = ride.members?.filter((m: any) => m.userId !== user?.id) || [];
                const dest = (!ride.dropLocation || ride.dropLocation === 'To be determined')
                  ? 'MIT-WPU Campus'
                  : ride.dropLocation;
                const isCompleted = ride.status === 'SPLIT_DONE' || ride.status === 'JOURNEY_ENDED';

                return (
                  <div
                    key={ride.id}
                    className="p-4 sm:p-4.5 rounded-xl bg-white/[0.05] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2.5 overflow-hidden shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-base shrink-0">📍</span>
                        <span className="text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-xs" title={dest}>
                          {dest}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] px-2.5 py-1 rounded-md font-medium whitespace-nowrap ${
                          isCompleted
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {isCompleted ? 'Completed' : ride.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/[0.08]">
                      <p className="text-xs text-white/55 truncate flex-1 min-w-0" title={`with ${coRiders.map((m: any) => m.fullName).join(', ') || 'Rider'}`}>
                        {date} • with {coRiders.map((m: any) => m.fullName).join(', ') || 'Rider'}
                      </p>
                      {ride.totalFare ? (
                        <div className="flex items-baseline gap-1 shrink-0 ml-2 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-xs font-bold text-emerald-400">₹{ride.totalFare}</span>
                          <span className="text-[10px] text-white/40">split</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Feedback Form */}
      <FeedbackForm open={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
}

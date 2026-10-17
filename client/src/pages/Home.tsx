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
import { RatingModal } from '../components/ui/RatingModal';
import { discoveryApi } from '../api/discovery.api';
import { groupApi } from '../api/group.api';
import { locationApi } from '../api/location.api';
import { ratingApi } from '../api/rating.api';
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
  const [pendingRatingIds, setPendingRatingIds] = useState<Set<string>>(new Set());
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingGroupId, setRatingGroupId] = useState<string | null>(null);

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
      .catch(() => { });
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
      const [historyData, pendingData] = await Promise.all([
        groupApi.getHistory(),
        ratingApi.getPendingRideIds().catch(() => ({ pendingGroupIds: [] as string[] })),
      ]);
      setRideHistory(historyData.rides || []);
      setPendingRatingIds(new Set(pendingData.pendingGroupIds));
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

  const handleStopBooking = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setViewState('booking');
    setNearbyUsers([]);
    setSelectedUser(null);
    setShowDropdown(false);
    showToast('Booking cancelled', 'info');

    // Run unpublish asynchronously without blocking UI
    discoveryApi.unpublish().catch(() => { });
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
    const r = 88;
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
      )}      {/* Top Navbar matching Landing page spacing */}
      <header
        style={{ marginTop: '10px' }}
        className="fixed top-0 left-0 right-0 z-40 w-full flex items-center justify-between px-8 sm:px-12 md:px-14 py-7 sm:py-8 pointer-events-none transition-all"
      >
        {/* Brand Logo - matching Landing page alignment */}
        <div className="pointer-events-auto select-none flex items-center">
          <span
            onClick={() => {
              if (viewState !== 'booking') handleStopBooking();
              else navigate('/home');
            }}
            className="text-white text-[32px] sm:text-[36px] font-instrument tracking-[0.14em] drop-shadow-md leading-none select-none font-normal cursor-pointer hover:opacity-85 transition-opacity"
            style={{ marginLeft: '10px' }}
            title="Wayza Home"
          >
            WAYZA
          </span>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto" style={{ marginRight: '10px' }}>
          {/* Tell us something — feedback button */}
          <button
            id="feedback-nav-btn"
            onClick={() => setShowFeedback(true)}
            className="feedback-nav-btn inline-flex items-center gap-1.5"
            aria-label="Share feedback"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="hidden sm:inline">Tell us something</span>
            <span className="sm:hidden text-xs">Feedback</span>
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
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-10">
        {viewState === 'booking' && (
          <div className="home-booking-card w-full text-center animate-fade-in-up">
            {/* Active Ride Banner */}
            {activeRide && (
              <div
                onClick={() => navigate(`/chat/${activeRide.id}`)}
                className="w-full mb-6 p-4 rounded-full bg-blue-500/15 border border-blue-400/35 backdrop-blur-md cursor-pointer hover:bg-blue-500/25 transition-all flex items-center justify-between text-left group shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm flex-shrink-0">
                    🚗
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Current Ride in Progress</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-300 group-hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-full flex-shrink-0">
                  Resume Chat →
                </span>
              </div>
            )}

            <h2 style={{ marginBottom: "50px" }} className="text-[clamp(30px,3.8vw,40px)] font-instrument italic text-white mb-7 leading-tight select-none">
              Where are you heading?
            </h2>

            {/* Drop location options */}
            <div style={{ marginBottom: "30px" }} className="flex flex-col gap-[20px] mb-6 w-full">
              {CAMPUS_POIS.map((poi: { label: string; lat: number; lng: number }) => (
                <button
                  key={poi.label}
                  onClick={() => selectDropLocation(poi.label, poi.lat, poi.lng)}
                  className={`w-full px-5 py-3.5 rounded-full text-left text-[16px] transition-all flex items-center gap-3.5 cursor-pointer ${dropLabel === poi.label
                    ? 'bg-white text-gray-950 font-medium border border-white shadow-sm '
                    : 'bg-white/7 text-white/90 border border-white/16 hover:bg-white/12 hover:border-white/25 mb-10'
                    }`}
                  style={{
                    minHeight: "48px",
                  }}
                >
                  <svg style={{ marginLeft: "20px" }}
                    className="w-4 h-4 flex-shrink-0 text-white/70"
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

              {/* Custom location option */}
              {!showCustomInput ? (
                (() => {
                  const isCustomSelected =
                    dropLabel && !CAMPUS_POIS.some((p: { label: string }) => p.label === dropLabel);
                  return (
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(true)}
                      className={`w-full px-5 py-3.5 rounded-full text-left text-[16px] transition-all flex items-center justify-between cursor-pointer ${isCustomSelected
                        ? 'bg-white text-gray-950 font-medium border border-white shadow-sm'
                        : 'bg-white/7 text-white/90 border border-white/16 hover:bg-white/12 hover:border-white/25'
                        }`}
                      style={{
                        minHeight: "48px",
                      }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {isCustomSelected ? (
                          <svg
                            style={{ marginLeft: "20px" }}
                            className="w-4 h-4 flex-shrink-0 text-white/70"
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
                          <span
                            style={{ marginLeft: "20px" }}
                            className="text-lg leading-none text-white/60"
                          >
                            +
                          </span>
                        )}
                        <span className="truncate">
                          {isCustomSelected ? dropLabel : 'Enter custom location'}
                        </span>
                      </div>
                      {isCustomSelected && (
                        <span className="text-xs text-gray-500 hover:text-gray-900 mr-2 flex-shrink-0">
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
                      style={{ left: "20px" }}
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
                      className="w-full bg-white/7 border border-white/20 rounded-full text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
                      autoFocus
                      style={{
                        width: "100%",
                        height: "48px",
                        paddingLeft: "48px",
                        paddingRight: "44px",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        borderRadius: "9999px",
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
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-[#121622]/95 backdrop-blur-xl border border-white/15 shadow-2xl max-h-56 overflow-y-auto z-30 p-1.5 flex flex-col gap-1">
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
            <div className="mb-7" >
              <label style={{ marginBottom: "20px" }} className="text-white/65 text-[14px] mb-5 block text-center tracking-wide font-normal">
                Search within:
              </label>

              <div className="flex flex-wrap gap-2.5 justify-center">
                {RADIUS_OPTIONS.map((opt: { label: string; value: number }) => (
                  <button
                    key={opt.value}
                    onClick={() => setRadius(opt.value)}
                    className={`rounded-full text-[14px] transition-all cursor-pointer border ${radius === opt.value
                      ? 'bg-white text-gray-950 font-bold border-white shadow-sm'
                      : 'bg-white/6 text-white/75 border-white/18 hover:bg-white/12 hover:border-white/30 font-medium'
                      }`}
                    style={{
                      minWidth: "64px",
                      height: "44px",
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
            <button style={{ marginTop: "20px" }}
              onClick={handleBookNow}
              className="home-book-btn w-full text-white text-[16px] sm:text-[17px] font-bold tracking-widest cursor-pointer flex items-center justify-center select-none active:scale-[0.99] transition-all"
            >
              {loading ? <Spinner size="sm" className="border-white/20 border-t-white" /> : 'BOOK NOW'}
            </button>
          </div>
        )}

        {/* Radar Discovery View — Shown after clicking BOOK NOW */}
        {viewState === 'discovering' && (() => {
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
          const maxRadar = isMobile ? 4 : 6;
          const visibleRadarUsers = nearbyUsers.slice(0, maxRadar);
          const extraCount = nearbyUsers.length - visibleRadarUsers.length;
          const radiusDisplay =
            RADIUS_OPTIONS.find((opt) => opt.value === radius)?.label ||
            (radius >= 1000 ? `${radius / 1000}km` : `${radius}m`);

          return (
            <div className="home-radar-card animate-fade-in-up">

              {/* Destination Pill */}
              <div className="radar-destination-pill">
                <span className="radar-pin">📍</span>
                <span className="truncate max-w-[210px] sm:max-w-xs">
                  {dropLabel || 'Destination'}
                </span>
                <span className="radar-pill-separator">•</span>
                <span>{radiusDisplay}</span>
              </div>

              {/* Heading */}
              <h3 className="radar-heading font-instrument">
                {nearbyUsers.length === 0
                  ? 'Looking for Riders...'
                  : 'Co-ride Found!'}
              </h3>

              {/* Subtitle */}
              <p className="radar-subtitle">
                {nearbyUsers.length === 0
                  ? `Scanning for students heading to ${dropLabel || 'destination'} within ${radiusDisplay}`
                  : 'Tap a rider to view profile and connect'}
              </p>

              {/* Radar */}
              <div className="radar-stage select-none">

                {/* Concentric rings */}
                <div className="radar-ring radar-ring-outer" />
                <div className="radar-ring radar-ring-middle" />
                <div className="radar-ring radar-ring-inner" />

                {/* Animated sweep while scanning */}
                {nearbyUsers.length === 0 && (
                  <div className="radar-sweep-beam" />
                )}

                {/* Ambient radar dots */}
                <div
                  className="radar-blip radar-blip-one"
                  aria-hidden="true"
                />
                <div
                  className="radar-blip radar-blip-two"
                  aria-hidden="true"
                />
                <div
                  className="radar-blip radar-blip-three"
                  aria-hidden="true"
                />

                {/* Current user */}
                <div className="radar-current-user">
                  <Avatar
                    name={user?.fullName || 'You'}
                    imageUrl={user?.profilePicUrl}
                    size="md"
                    className="!w-[52px] !h-[52px] text-base font-semibold border border-cyan-300/50 shadow-lg"
                  />
                  <span className="radar-you-label">You</span>
                </div>

                {/* Nearby riders */}
                {visibleRadarUsers.map((nUser, i) => {
                  const pos = getUserPosition(i, visibleRadarUsers.length);
                  const name = nUser?.fullName || 'Rider';
                  const firstName = name.split(' ')[0] || 'Rider';

                  return (
                    <button
                      key={nUser.userId || i}
                      type="button"
                      onClick={() => {
                        setSelectedUser(nUser);
                        setViewState('user-detail');
                      }}
                      aria-label={`View ${firstName}'s profile`}
                      className="radar-rider"
                      style={{
                        transform: `translate(${pos.x}px, ${pos.y}px)`,
                      }}
                    >
                      <div className="relative">
                        <Avatar
                          name={name}
                          imageUrl={nUser.profilePicUrl}
                          size="md"
                          className="border border-cyan-300/40 shadow-md"
                        />

                        {nUser.rating != null && (
                          <span className="radar-rider-rating">
                            ★ {nUser.rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <span className="radar-rider-name">{firstName}</span>

                      <span className="radar-rider-distance">
                        {formatDistance(nUser.distanceMeters || 0)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* More riders */}
              {extraCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllRidersModal(true)}
                  className="radar-more-riders"
                >
                  +{extraCount} more nearby riders
                </button>
              )}

              {/* Cancel Booking */}
              <button
                type="button"
                onClick={(e) => handleStopBooking(e)}
                className="radar-cancel-booking"
              >
                <span className="radar-cancel-icon">×</span>
                <span>Cancel Booking</span>
              </button>

            </div>
          );
        })()}
      </div>

      {/* User Detail Card — unchanged functionality */}
      {viewState === 'user-detail' && selectedUser && (
        <div
          className="nearby-user-overlay"
          onClick={() => setViewState('discovering')}
        >
          <div
            className="nearby-user-card animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nearby-user-identity">
              <Avatar
                name={selectedUser.fullName}
                imageUrl={selectedUser.profilePicUrl}
                size="xl"
                className="nearby-user-avatar"
              />

              <div className="nearby-user-info">
                <span className="nearby-user-name">
                  {selectedUser.fullName}
                </span>
                <span className="nearby-user-distance">
                  {formatDistance(selectedUser.distanceMeters)} away
                </span>
              </div>
            </div>

            <div className="nearby-user-destination">
              <svg
                className="nearby-user-pin-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>

              <span className="nearby-user-dest-label">
                Heading to:&nbsp;
              </span>
              <span className="nearby-user-dest-value">
                {selectedUser.dropLocationLabel}
              </span>
            </div>

            <button
              type="button"
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
        className="!max-w-md !p-7 sm:!p-8 text-center !rounded-[28px] !bg-gradient-to-b !from-[#0b0e16]/98 !to-[#080b12]/98 !border !border-slate-500/40 !shadow-[0_0_40px_rgba(0,0,0,0.35)] !backdrop-blur-2xl"
      >
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/40 flex items-center justify-center text-4xl mb-4 shadow-[0_0_25px_rgba(37,99,235,0.12)]">
            📍
          </div>

          <h3 className="font-instrument text-2xl sm:text-3xl text-white mb-3 tracking-wide">
            Location Access Needed
          </h3>

          <p className="text-base text-white/65 mb-6 leading-relaxed">
            Wayza needs your location to find students near you. Your location is
            only stored temporarily and is never saved permanently.
          </p>

          <button
            onClick={handleLocationGranted}
            className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.98] text-white font-bold text-base shadow-[0_0_24px_rgba(37,99,235,0.3)] transition-all duration-200 cursor-pointer"
          >
            Allow Location
          </button>
        </div>
      </Modal>

      {/* Logout Confirmation Modal — custom overlay so the scenic background remains clearly visible */}
      {showLogoutConfirm && (
        <div
          className="logout-confirm-overlay"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="logout-confirm-card animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="logout-confirm-heading">Are you sure?</h3>
            <p className="logout-confirm-message">You'll need to log in again to use Wayza.</p>
            <div className="logout-confirm-actions">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="logout-confirm-no-btn"
              >
                No
              </button>
              <button
                onClick={handleLogout}
                className="logout-confirm-yes-btn"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Ride Request — Top-Right Glass Notification */}
      {incomingInvite && (
        <div
          className="wayza-dynamic-invite wayza-invite-enter"
          role="region"
          aria-label="Incoming ride request"
        >
          {/* Header: Live indicator and dismiss */}
          <div className="wayza-invite-header">
            <div className="wayza-invite-status">
              <span className="wayza-invite-live-dot">
                <span className="wayza-invite-live-pulse" />
                <span className="wayza-invite-live-core" />
              </span>

              <span>Ride Request</span>
            </div>

            <button
              type="button"
              onClick={() => setIncomingInvite(null)}
              className="wayza-invite-dismiss"
              aria-label="Dismiss ride request"
            >
              ×
            </button>
          </div>

          {/* Rider information */}
          <div className="wayza-invite-rider">
            <div className="wayza-invite-avatar">
              <Avatar
                name={incomingInvite.inviterName}
                imageUrl={incomingInvite.inviterPicUrl}
                size="md"
                className="!w-12 !h-12 text-sm font-semibold"
              />

              <span className="wayza-invite-avatar-ring" />
            </div>

            <div className="wayza-invite-details">
              <p className="wayza-invite-name">
                {incomingInvite.inviterName}
              </p>

              <p className="wayza-invite-message">
                wants to share a ride with you
              </p>

              {incomingInvite.dropLocationLabel && (
                <div className="wayza-invite-destination">
                  <svg
                    className="wayza-invite-pin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>

                  <span className="wayza-invite-to-label">To:</span>

                  <span
                    className="wayza-invite-destination-name"
                    title={incomingInvite.dropLocationLabel}
                  >
                    {incomingInvite.dropLocationLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="wayza-invite-actions">
            <button
              type="button"
              onClick={() => {
                const grpId = incomingInvite.groupId;
                setIncomingInvite(null);
                navigate(`/chat/${grpId}`);
              }}
              className="wayza-invite-accept"
            >
              <span>Accept &amp; Chat</span>

              <svg
                className="wayza-invite-arrow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 5 7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setIncomingInvite(null)}
              className="wayza-invite-decline"
            >
              Decline
            </button>
          </div>
        </div>
      )}


      {/* All Active Riders Modal / Drawer */}
      <Modal open={showAllRidersModal} onClose={() => setShowAllRidersModal(false)}>
        <div className="p-3 sm:p-5 max-w-lg mx-auto text-left rounded-[28px] bg-[#071326]/95 border border-blue-500/50 shadow-[0_0_35px_rgba(0,100,255,0.15)] backdrop-blur-2xl">

          <div className="flex items-center justify-between mb-3 pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl text-blue-500">👥</span>

                <h3 className="text-2xl font-instrument text-white tracking-tight">
                  Active Riders
                </h3>

                <span className="text-xs px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold shadow-[0_0_12px_rgba(37,99,235,0.15)] whitespace-nowrap">
                  {nearbyUsers.length} online
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Sorted by highest reviews, rating &amp; closest distance
              </p>
            </div>

            <button
              onClick={() => setShowAllRidersModal(false)}
              className="ml-2 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/80 border border-white/5 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer text-xl"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">

            {nearbyUsers.map((rider) => {
              const name = rider.fullName || 'Rider';

              return (
                <div
                  key={rider.userId}
                  className="p-3 sm:p-3.5 rounded-[24px] bg-gradient-to-r from-[#111e32]/95 to-[#101a2c]/95 hover:from-[#172943] hover:to-[#14223a] border border-blue-400/20 hover:border-blue-400/50 flex items-center justify-between gap-2 sm:gap-3 transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">

                    <div className="relative flex-shrink-0">
                      <Avatar
                        name={name}
                        imageUrl={rider.profilePicUrl}
                        size="md"
                      />

                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#101a2c] shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-white truncate">
                          {name}
                        </span>

                        {rider.rating && (
                          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded-full bg-amber-400/15 text-amber-300 font-bold border border-amber-400/40 flex items-center gap-1 whitespace-nowrap">
                            ★ {rider.rating.toFixed(1)}
                            {rider.reviewsCount ? ` (${rider.reviewsCount})` : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-400 mt-1.5 min-w-0">
                        <span className="text-blue-300 truncate">
                          📍 {rider.dropLocationLabel || 'Campus'}
                        </span>

                        <span className="text-slate-500 flex-shrink-0">•</span>

                        <span className="text-slate-300 flex-shrink-0">
                          {formatDistance(rider.distanceMeters || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowAllRidersModal(false);
                      handleConnect(rider.userId);
                    }}
                    className="flex-shrink-0 py-2.5 px-3 sm:px-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-[0_0_18px_rgba(37,99,235,0.35)] hover:shadow-[0_0_24px_rgba(37,99,235,0.5)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <span>Connect</span>
                    <span className="text-base">→</span>
                  </button>
                </div>
              );
            })}

          </div>
        </div>
      </Modal>


      {/* Ride History Modal — matches exact design mockup */}
      {/* Ride History Modal */}
      {showHistoryModal && (
        <div
          className="ride-history-overlay"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="ride-history-card animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ride-history-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="ride-history-header">
              <div className="ride-history-heading">
                <span className="ride-history-icon" aria-hidden="true">
                  📜
                </span>

                <h3 id="ride-history-title" className="ride-history-title">
                  Ride History
                </h3>

                <span className="ride-history-count">
                  {rideHistory.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="ride-history-close"
                aria-label="Close ride history"
              >
                ×
              </button>
            </div>

            {/* Loading */}
            {loadingHistory ? (
              <div className="ride-history-loading">
                <Spinner size="md" />
              </div>
            ) : rideHistory.length === 0 ? (
              /* Empty State */
              <div className="ride-history-empty">
                <span className="ride-history-empty-icon">🚗</span>
                <p className="ride-history-empty-title">
                  No past rides yet
                </p>
                <p className="ride-history-empty-description">
                  Your completed campus rides will show up here.
                </p>
              </div>
            ) : (
              /* Ride History List */
              <div className="ride-history-list">
                {rideHistory.map((ride: any) => {
                  const date = new Date(ride.createdAt).toLocaleDateString(
                    'en-US',
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }
                  );

                  const coRiders =
                    ride.members?.filter(
                      (m: any) => m.userId !== user?.id
                    ) || [];

                  const dest =
                    !ride.dropLocation ||
                      ride.dropLocation === 'To be determined'
                      ? 'MIT-WPU Campus'
                      : ride.dropLocation;

                  const isCompleted =
                    ride.status === 'SPLIT_DONE' ||
                    ride.status === 'JOURNEY_ENDED';

                  const coRiderNames = coRiders
                    .map((m: any) => m.fullName)
                    .filter(Boolean)
                    .join(', ') || 'Rider';

                  return (
                    <div
                      key={ride.id}
                      className="ride-history-item"
                    >
                      {/* Left: Route and ride details */}
                      <div className="ride-history-left">
                        <div className="ride-history-route">
                          <span
                            className="ride-history-pin"
                            aria-hidden="true"
                          >
                            📍
                          </span>
                          <span
                            className="ride-history-route-line"
                            aria-hidden="true"
                          />
                        </div>

                        <div className="ride-history-info">
                          <h4
                            className="ride-history-destination"
                            title={dest}
                          >
                            {dest}
                          </h4>

                          <p className="ride-history-meta">
                            <span>{date}</span>
                            <span className="ride-history-meta-dot">•</span>
                            <span className="ride-history-riders">
                              with {coRiderNames}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Status and fare */}
                      <div className="ride-history-right">
                        <span
                          className={`ride-history-status ${isCompleted
                            ? 'ride-history-status-completed'
                            : 'ride-history-status-other'
                            }`}
                        >
                          {isCompleted && (
                            <span aria-hidden="true">✓</span>
                          )}
                          <span>
                            {isCompleted ? 'Completed' : ride.status}
                          </span>
                        </span>

                        {ride.totalFare != null &&
                          ride.totalFare !== '' && (
                            <div className="ride-history-fare">
                              <span className="ride-history-fare-amount">
                                ₹{ride.totalFare}
                              </span>
                              <span className="ride-history-fare-label">
                                split
                              </span>
                            </div>
                          )}

                        {/* Pending Rating Badge */}
                        {isCompleted && pendingRatingIds.has(ride.id) && (
                          <button
                            onClick={() => {
                              setRatingGroupId(ride.id);
                              setShowRatingModal(true);
                            }}
                            className="mt-1.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold hover:bg-amber-400/25 transition-all cursor-pointer whitespace-nowrap"
                          >
                            ⭐ Rate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Form */}
      <FeedbackForm open={showFeedback} onClose={() => setShowFeedback(false)} />

      {/* Rating Modal — triggered from ride history badge */}
      {ratingGroupId && (
        <RatingModal
          open={showRatingModal}
          groupId={ratingGroupId}
          onClose={() => {
            setShowRatingModal(false);
            // Refresh pending IDs after rating
            ratingApi.getPendingRideIds().then((d) => {
              setPendingRatingIds(new Set(d.pendingGroupIds));
            }).catch(() => {});
          }}
          onDone={() => {
            setShowRatingModal(false);
            ratingApi.getPendingRideIds().then((d) => {
              setPendingRatingIds(new Set(d.pendingGroupIds));
            }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}

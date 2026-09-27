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

  // Socket events for discovery
  useEffect(() => {
    if (!socket) return;

    socket.on('discovery:user-joined', (data: { userId: string; fullName: string; distanceMeters: number }) => {
      setNearbyUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, { ...data, profilePicUrl: null, dropLocationLabel: '' }];
      });
    });

    socket.on('discovery:user-left', (data: { userId: string }) => {
      setNearbyUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    return () => {
      socket.off('discovery:user-joined');
      socket.off('discovery:user-left');
    };
  }, [socket]);

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
      )}      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 w-full flex items-center justify-between px-8 sm:px-12 md:px-14 py-7 sm:py-8 pointer-events-none">
        {/* Brand Logo */}
        <div style={{ marginLeft: "10px" }} className="pointer-events-auto select-none">
          <span className="text-white text-[32px] sm:text-[36px] font-instrument tracking-[0.14em] drop-shadow-md leading-none select-none font-normal">
            WAYZA
          </span>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto" style={{ marginRight: '10px', marginTop: "10px" }}>
          {/* Tell us something — feedback button */}
          <button
            id="feedback-nav-btn"
            onClick={() => setShowFeedback(true)}
            className="feedback-nav-btn"
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
              className="flex items-center gap-2 cursor-pointer"
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
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-10">
        {viewState === 'booking' && (
          <div className="home-booking-card w-full text-center animate-fade-in-up">
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

                  <span>{poi.label}</span>
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
                      className={`w-full px-5 py-3.5 rounded-full text-left text-[16px] transition-all flex items-center justify-between cursor-pointer ${
                        isCustomSelected
                          ? 'bg-white text-gray-950 font-medium border border-white shadow-sm'
                          : 'bg-white/7 text-white/60 border border-white/16 hover:bg-white/12 hover:border-white/25'
                      }`}
                      style={{
                        minHeight: "48px",
                      }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {isCustomSelected ? (
                          <svg
                            style={{ marginLeft: "20px" }}
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

        {viewState === 'discovering' && (
          <div className="home-discovering-content animate-fade-in-up">
            {nearbyUsers.length === 0 ? (
              /* Loading state — no nearby riders found yet */
              <div className="home-loading-group">
                <p className="home-loading-text">Looking for nearby riders...</p>
                <div className="home-loading-spinner-wrap">
                  <Spinner size="lg" className="home-loading-spinner" />
                </div>
                <p className="home-loading-you">You</p>
              </div>
            ) : (
              /* Radial layout when riders found */
              <div className="relative flex items-center justify-center" style={{ minHeight: '320px' }}>
                {/* Center indicator */}
                <div className="absolute flex flex-col items-center">
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse-ring" />
                  <p className="mt-2 text-white/60 text-xs">You</p>
                </div>

                {nearbyUsers.map((nUser, i) => {
                  const pos = getUserPosition(i, nearbyUsers.length);
                  return (
                    <button
                      key={nUser.userId}
                      onClick={() => { setSelectedUser(nUser); setViewState('user-detail'); }}
                      className="absolute flex flex-col items-center gap-1 transition-all hover:scale-110"
                      style={{
                        transform: `translate(${pos.x}px, ${pos.y}px)`,
                      }}
                    >
                      <Avatar name={nUser.fullName} imageUrl={nUser.profilePicUrl} size="lg" />
                      <span className="text-white text-xs font-medium max-w-[80px] truncate text-video-overlay">
                        {nUser.fullName.split(' ')[0]}
                      </span>
                      <span className="text-white/50 text-[10px]">
                        {formatDistance(nUser.distanceMeters)}
                      </span>
                    </button>
                  );
                })}
              </div>
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
      >
        <div
          className="mx-auto text-center"
          style={{
            width: "480px",
            maxWidth: "calc(100vw - 40px)",
            minHeight: "360px",
            padding: "34px 32px 30px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            marginRight: "70px"
          }}
        >
          {/* Location Icon */}
          <div
            style={{
              fontSize: "48px",
              lineHeight: "1",
              marginBottom: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "40px"
            }}
          >
            📍
          </div>

          {/* Heading */}
          <h3
            className="font-instrument text-white"
            style={{
              width: "100%",
              fontSize: "24px",
              lineHeight: "1.25",
              margin: "0 0 16px 0",
              textAlign: "center",
              marginRight: "50px"
            }}
          >
            Location Access Needed
          </h3>

          {/* Description */}
          <p
            className="text-white/60"
            style={{
              width: "100%",
              maxWidth: "390px",
              fontSize: "15px",
              lineHeight: "1.65",
              margin: "0 auto 28px auto",
              textAlign: "center",
              marginRight: "50px"
            }}
          >
            Wayza needs your location to find students near you. Your location is
            only stored temporarily and is never saved permanently.
          </p>

          {/* Allow Location Button */}
          <button
            onClick={handleLocationGranted}
            className="bg-white text-black rounded-full font-medium hover:bg-white/90 transition-all cursor-pointer"
            style={{
              width: "100%",
              maxWidth: "380px",
              height: "52px",
              padding: "0 24px",
              fontSize: "17px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              boxSizing: "border-box",
              margin: "0 auto",
              marginRight: "50px"
            }}
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

      {/* Feedback Form */}
      <FeedbackForm open={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
}

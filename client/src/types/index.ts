// User types
export interface User {
  id: string;
  fullName: string;
  phone?: string;
  collegeEmail?: string;
  emailVerified?: boolean;
  profilePicUrl: string | null;
}

// Auth types
export interface CheckPhoneResponse {
  registered: boolean;
  userName?: string;
}

export interface CheckEmailResponse {
  registered: boolean;
  userName?: string;
}

export interface AuthResponse {
  user: User;
}

export interface VerifyOTPResponse {
  registered: boolean;
  emailVerified?: boolean;
  signupToken?: string;
  user?: User;
}


// Discovery types
export interface NearbyUser {
  userId: string;
  fullName: string;
  profilePicUrl: string | null;
  distanceMeters: number;
  dropLocationLabel: string;
}

export interface NearbyResponse {
  users: NearbyUser[];
}

// Group types
export type GroupStatus =
  | 'FORMING'
  | 'CONFIRMED'
  | 'JOURNEY_STARTED'
  | 'JOURNEY_ENDED'
  | 'SPLIT_DONE'
  | 'DISBANDED';

export interface GroupMember {
  userId: string;
  fullName: string;
  profilePicUrl: string | null;
  confirmedGoWith: boolean;
  sharedPhone: boolean;
  startedJourney: boolean;
  endedJourney: boolean;
  confirmedSplit: boolean;
  phone?: string;
}

export interface Group {
  id: string;
  status: GroupStatus;
  dropLocation: string;
  dropLat: number | null;
  dropLng: number | null;
  members: GroupMember[];
  journey: Journey | null;
  fareSplit: FareSplitData | null;
}

// Chat types
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  nextCursor: string | null;
}

// Journey types
export interface Journey {
  id: string;
  groupId: string;
  allStarted: boolean;
  allEnded: boolean;
  startedAt: string | null;
  endedAt: string | null;
}

// Fare types
export interface FareSplitData {
  id: string;
  totalFare: number;
  participants: SplitParticipant[];
}

export interface SplitParticipant {
  userId: string;
  fullName?: string;
  amount: number;
  acknowledged: boolean;
}

export interface FareSplitResponse {
  splitId: string;
  splits: Array<{ userId: string; fullName: string; amount: number }>;
}

// Location types
export interface CampusPOI {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface AutocompleteResult {
  label: string;
  lat: number;
  lng: number;
}

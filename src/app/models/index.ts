export interface Sport {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  image_url: string;
  active_games: number;
  active_communities: number;
}
export interface Person {
  id: string;
  full_name: string;
  username: string;
  bio: string;
  location: string;
  avatar_url: string | null;
  favorite_team: string;
  favorite_sports: string[];
  games_joined: number;
  games_created: number;
  friends: number;
  followers: number;
  following: number;
  role: string;
  match_percentage?: number;
  is_following?: boolean;
  friendship_status?: string | null;
  friendship_incoming?: boolean;
  age?: number;
  distance_km?: number;
  available_seats: number;
  group_size: number;
  latitude: number | null;
  longitude: number | null;
}
export interface Game {
  id: string;
  host_id: string;
  sport_id: string;
  title: string;
  sport: string;
  sport_icon: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location: string;
  venue: string;
  max_participants: number;
  required_participants: number;
  participants: number;
  type: string;
  skill_level: string;
  privacy: string;
  status: string;
  image_url: string;
  featured: boolean;
  host_name: string;
  host_avatar: string;
  joined_status: string | null;
  conversation_id?: string;
  avatars: { id: string; name: string; avatar_url: string }[];
  participant_list?: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    status: string;
  }[];
}
export interface Community {
  id: string;
  name: string;
  sport: string;
  sport_id: string;
  description: string;
  location: string;
  image_url: string;
  members: number | Person[];
  joined?: boolean;
}
export interface Conversation {
  id: string;
  event_id: string | null;
  title: string;
  peer_name: string;
  avatar_url: string;
  last_message: string;
  last_message_at: string;
  unread: number;
}
export interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  full_name: string;
  username: string;
  avatar_url: string;
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  type: string;
  link: string;
  read_at: string | null;
  created_at: string;
  avatar_url: string;
}

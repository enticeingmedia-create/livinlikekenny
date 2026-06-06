export type ReactionMap = Record<string, number>;

export type ChatMessage = {
  id: string;
  created_at: string;
  listener_name: string;
  body: string;
  gif_url: string | null;
  media_url: string | null;
  reply_to: string | null;
  reactions: ReactionMap;
};

export type SongRequest = {
  id: string;
  created_at: string;
  listener_name: string;
  song_title: string;
  artist: string;
  dedication: string | null;
  status: "new" | "seen" | "played" | "archived";
};

export type Announcement = {
  id: string;
  created_at: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  category: "event" | "appearance" | "theme" | "announcement";
  event_date: string | null;
  is_featured: boolean;
};

export type ShowSettings = {
  id: number;
  live_mode: boolean;
  live_title: string;
  live_note: string;
  updated_at: string;
};

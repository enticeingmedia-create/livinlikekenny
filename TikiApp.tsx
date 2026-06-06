"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import {
  Anchor,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Lock,
  Megaphone,
  MessageCircleReply,
  Music2,
  RadioTower,
  Send,
  SendHorizonal,
  SmilePlus,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Waves,
  X
} from "lucide-react";
import { toast } from "sonner";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";
import { formatDate, formatTime, linkify, readLocal, safeUrl, writeLocal } from "@/lib/utils";
import type { Announcement, ChatMessage, ShowSettings, SongRequest } from "@/lib/types";

const reactions = ["🌴", "🍹", "🎶", "🦜", "🔥"];
const radioUrl = process.env.NEXT_PUBLIC_RADIO_TROP_ROCK_URL || "https://radiotroprock.com/";

const demoSettings: ShowSettings = {
  id: 1,
  live_mode: false,
  live_title: "Livin' Like Kenny",
  live_note: "The chat is open, the beach chairs are saved, and the Trop Rock request line is ready.",
  updated_at: new Date().toISOString()
};

const demoAnnouncements: Announcement[] = [
  {
    id: "demo-theme",
    created_at: new Date().toISOString(),
    title: "This week: Beach bar favorites",
    body: "Pull up a stool in the virtual tiki hut and bring your favorite sunny requests for Wednesday night.",
    link_url: radioUrl,
    link_label: "Listen on Radio Trop Rock",
    category: "theme",
    event_date: null,
    is_featured: true
  }
];

export function TikiApp() {
  const supabase = useMemo(() => getSupabase(), []);
  const [listenerName, setListenerName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(demoAnnouncements);
  const [settings, setSettings] = useState<ShowSettings>(demoSettings);

  useEffect(() => {
    setListenerName(window.localStorage.getItem("llk.listenerName") || "");
    setNameDraft(window.localStorage.getItem("llk.listenerName") || "");

    if (!supabase) {
      const seededMessages = readLocal<ChatMessage[]>("chatMessages", [
        {
          id: "welcome",
          created_at: new Date().toISOString(),
          listener_name: "Kenny & Nell",
          body: "Welcome to the Virtual Tiki Hut. Say hey, request a song, and keep it sunny.",
          gif_url: null,
          media_url: null,
          reply_to: null,
          reactions: { "🌴": 2, "🎶": 1 }
        }
      ]);
      setMessages(seededMessages);
      setRequests(readLocal<SongRequest[]>("songRequests", []));
      setAnnouncements(readLocal<Announcement[]>("announcements", demoAnnouncements));
      setSettings(readLocal<ShowSettings>("showSettings", demoSettings));
      return;
    }

    supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(150).then(({ data, error }) => {
      if (error) toast.error("Could not load chat. Check your Supabase setup.");
      if (data) setMessages(data as ChatMessage[]);
    });
    supabase.from("song_requests").select("*").order("created_at", { ascending: false }).limit(40).then(({ data }) => data && setRequests(data as SongRequest[]));
    supabase.from("announcements").select("*").order("is_featured", { ascending: false }).order("event_date", { ascending: true }).limit(12).then(({ data }) => data && setAnnouncements(data as Announcement[]));
    supabase.from("show_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => data && setSettings(data as ShowSettings));

    const channel = supabase
      .channel("llk-live-room")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => setMessages((current) => [...current, payload.new as ChatMessage].slice(-150)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (payload) => setMessages((current) => current.map((item) => item.id === payload.new.id ? payload.new as ChatMessage : item)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "song_requests" }, (payload) => setRequests((current) => [payload.new as SongRequest, ...current].slice(0, 40)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "song_requests" }, (payload) => setRequests((current) => current.map((item) => item.id === payload.new.id ? payload.new as SongRequest : item)))
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, async () => {
        const { data } = await supabase.from("announcements").select("*").order("is_featured", { ascending: false }).order("event_date", { ascending: true }).limit(12);
        if (data) setAnnouncements(data as Announcement[]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "show_settings" }, (payload) => setSettings(payload.new as ShowSettings))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    if (supabase) return;
    const sync = () => {
      setMessages(readLocal<ChatMessage[]>("chatMessages", []));
      setRequests(readLocal<SongRequest[]>("songRequests", []));
      setAnnouncements(readLocal<Announcement[]>("announcements", demoAnnouncements));
      setSettings(readLocal<ShowSettings>("showSettings", demoSettings));
    };
    window.addEventListener("llk:chatMessages", sync as EventListener);
    window.addEventListener("llk:songRequests", sync as EventListener);
    window.addEventListener("llk:announcements", sync as EventListener);
    window.addEventListener("llk:showSettings", sync as EventListener);
    return () => {
      window.removeEventListener("llk:chatMessages", sync as EventListener);
      window.removeEventListener("llk:songRequests", sync as EventListener);
      window.removeEventListener("llk:announcements", sync as EventListener);
      window.removeEventListener("llk:showSettings", sync as EventListener);
    };
  }, [supabase]);

  const saveName = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = nameDraft.trim().slice(0, 36);
    if (!clean) return;
    window.localStorage.setItem("llk.listenerName", clean);
    setListenerName(clean);
  };

  const addMessage = useCallback(async (message: Omit<ChatMessage, "created_at">) => {
    const row = { ...message, created_at: new Date().toISOString() };
    if (supabase) {
      const { error } = await supabase.from("chat_messages").insert(row);
      if (error) throw error;
      return;
    }
    const next = [...messages, row].slice(-150);
    setMessages(next);
    writeLocal("chatMessages", next);
  }, [messages, supabase]);

  const updateMessage = useCallback(async (id: string, patch: Partial<ChatMessage>) => {
    if (supabase) {
      await supabase.from("chat_messages").update(patch).eq("id", id);
      return;
    }
    const next = messages.map((item) => item.id === id ? { ...item, ...patch } : item);
    setMessages(next);
    writeLocal("chatMessages", next);
  }, [messages, supabase]);

  const addSongRequest = useCallback(async (request: Omit<SongRequest, "id" | "created_at" | "status">) => {
    const row: SongRequest = { ...request, id: nanoid(), created_at: new Date().toISOString(), status: "new" };
    if (supabase) {
      const { error } = await supabase.from("song_requests").insert(request);
      if (error) throw error;
      return;
    }
    const next = [row, ...requests].slice(0, 40);
    setRequests(next);
    writeLocal("songRequests", next);
  }, [requests, supabase]);

  const updateSongRequest = useCallback(async (id: string, status: SongRequest["status"]) => {
    if (supabase) {
      await supabase.from("song_requests").update({ status }).eq("id", id);
      return;
    }
    const next = requests.map((item) => item.id === id ? { ...item, status } : item);
    setRequests(next);
    writeLocal("songRequests", next);
  }, [requests, supabase]);

  const addAnnouncement = useCallback(async (announcement: Omit<Announcement, "id" | "created_at" | "is_featured">) => {
    const row: Announcement = { ...announcement, id: nanoid(), created_at: new Date().toISOString(), is_featured: false };
    if (supabase) {
      const { error } = await supabase.from("announcements").insert(announcement);
      if (error) throw error;
      return;
    }
    const next = [row, ...announcements].slice(0, 12);
    setAnnouncements(next);
    writeLocal("announcements", next);
  }, [announcements, supabase]);

  const updateLiveMode = useCallback(async (liveMode: boolean) => {
    const row: ShowSettings = { ...settings, live_mode: liveMode, updated_at: new Date().toISOString() };
    if (supabase) {
      const { data, error } = await supabase.from("show_settings").upsert({ id: 1, live_mode: liveMode, live_title: settings.live_title, live_note: settings.live_note }).select("*").single();
      if (error) throw error;
      if (data) setSettings(data as ShowSettings);
      return;
    }
    setSettings(row);
    writeLocal("showSettings", row);
  }, [settings, supabase]);

  return (
    <main className="relative min-h-screen pb-8">
      <Backdrop />
      {!listenerName && <NameGate nameDraft={nameDraft} setNameDraft={setNameDraft} saveName={saveName} />}
      <div className="relative z-10 mx-auto grid max-w-7xl gap-5 px-4 py-4 md:px-6 md:py-6">
        <Hero settings={settings} backendReady={hasSupabaseConfig()} />
        <div className="grid gap-5 xl:grid-cols-[1fr_25rem]">
          <ChatPanel listenerName={listenerName} messages={messages} addMessage={addMessage} updateMessage={updateMessage} />
          <div className="grid content-start gap-5">
            <SongRequestCard listenerName={listenerName} addSongRequest={addSongRequest} />
            <Announcements items={announcements} />
          </div>
        </div>
      </div>
      <AdminDashboard requests={requests} settings={settings} updateSongRequest={updateSongRequest} addAnnouncement={addAnnouncement} updateLiveMode={updateLiveMode} />
    </main>
  );
}

function Backdrop() {
  return (
    <>
      <div className="fixed inset-0 bg-[url('/assets/livin-like-kenny-reference.png')] bg-cover bg-center opacity-[.18] blur-[1px]" />
      <div className="fixed inset-0 bg-gradient-to-b from-night/30 via-night/80 to-night" />
      <div className="tiki-noise" />
    </>
  );
}

function NameGate({ nameDraft, setNameDraft, saveName }: { nameDraft: string; setNameDraft: (value: string) => void; saveName: (event: React.FormEvent) => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-night/80 p-4 backdrop-blur-xl">
      <form onSubmit={saveName} className="tiki-glass max-w-lg rounded-[2rem] p-6 text-center shadow-glow md:p-8">
        <img src="/assets/livin-like-kenny-reference.png" alt="Livin' Like Kenny" className="mx-auto mb-5 max-h-44 rounded-3xl object-cover shadow-tiki" />
        <p className="text-xs font-black uppercase tracking-[.2em] text-sunset">Virtual Tiki Hut</p>
        <h1 className="mt-2 font-display text-4xl font-black text-white">Pull up a stool</h1>
        <p className="mt-3 text-cream/80">No account. No email. Just tell the hut what to call you.</p>
        <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} autoFocus maxLength={36} placeholder="Your listener name" className="mt-6 w-full rounded-2xl border border-cream/20 bg-white/10 px-4 py-4 text-center text-lg font-bold text-white outline-none placeholder:text-cream/45 focus:border-sunset" />
        <button className="mt-4 w-full rounded-2xl bg-hibiscus px-5 py-4 font-black text-white shadow-hibiscus transition hover:-translate-y-0.5">Enter the Hut</button>
      </form>
    </div>
  );
}

function Hero({ settings, backendReady }: { settings: ShowSettings; backendReady: boolean }) {
  return (
    <section className="tiki-glass overflow-hidden rounded-[2.5rem] p-5 md:p-7">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cream/20 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[.16em] text-sunset">
            <RadioTower size={15} /> Live Wednesdays · 7:30 PM Eastern
          </div>
          <h1 className="mt-5 font-display text-5xl font-black leading-[.95] text-white md:text-7xl">Livin' Like Kenny</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-cream/86">The always-open beach-radio clubhouse for Trop Rock requests, listener banter, show themes, events, and Kenny & Nell appearances.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={radioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-sunset px-5 py-4 font-black text-night shadow-glow transition hover:-translate-y-0.5">Listen on Radio Trop Rock <ExternalLink size={18} /></a>
            <a href="#request" className="inline-flex items-center gap-2 rounded-2xl border border-cream/20 bg-white/10 px-5 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15">Request a Song <Music2 size={18} /></a>
          </div>
          <p className="mt-4 text-xs text-cream/55">{backendReady ? "Supabase mode ready for multi-user launch." : "Bolt preview mode: add Supabase keys when you want real multi-user persistence."}</p>
        </div>
        <div className="rounded-[2rem] border border-cream/15 bg-night/50 p-4 shadow-tiki">
          <img src="/assets/livin-like-kenny-reference.png" alt="Livin' Like Kenny tropical artwork" className="aspect-[1.2] w-full rounded-[1.5rem] object-cover" />
          <div className="mt-4 rounded-3xl border border-cream/15 bg-white/8 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-lagoon">Live Show Mode</p>
                <h2 className="mt-1 text-2xl font-black text-white">{settings.live_mode ? settings.live_title : "The hut is open"}</h2>
              </div>
              <span className={`rounded-full px-3 py-2 text-xs font-black ${settings.live_mode ? "bg-hibiscus text-white" : "bg-white/10 text-cream/75"}`}>{settings.live_mode ? "LIVE" : "OPEN"}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-cream/75">{settings.live_note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatPanel({ listenerName, messages, addMessage, updateMessage }: { listenerName: string; messages: ChatMessage[]; addMessage: (message: Omit<ChatMessage, "created_at">) => Promise<void>; updateMessage: (id: string, patch: Partial<ChatMessage>) => Promise<void> }) {
  const [body, setBody] = useState("");
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [giphyOpen, setGiphyOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const replyLookup = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  async function send(mediaUrl?: string) {
    if (!listenerName) return toast.error("Pick a listener name first.");
    if (!body.trim() && !gifUrl && !mediaUrl) return;
    try {
      await addMessage({ id: nanoid(), listener_name: listenerName, body: body.trim(), gif_url: gifUrl, media_url: mediaUrl || null, reply_to: replyTo?.id || null, reactions: {} });
      setBody("");
      setGifUrl(null);
      setReplyTo(null);
    } catch {
      toast.error("The coconut telegraph jammed. Try again.");
    }
  }

  async function uploadPhoto(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Photos only for now. Video links are welcome in chat.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Please keep photos under 5MB.");
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await send(dataUrl);
    } catch {
      toast.error("Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function react(message: ChatMessage, emoji: string) {
    const next = { ...(message.reactions || {}) };
    next[emoji] = (next[emoji] || 0) + 1;
    await updateMessage(message.id, { reactions: next });
  }

  return (
    <section id="chat" className="tiki-glass flex min-h-[720px] flex-col overflow-hidden rounded-[2.5rem]">
      <div className="border-b border-cream/15 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-sunset">Chat Cove</p>
            <h2 className="font-display text-3xl font-black text-white">Beach-bar banter</h2>
          </div>
          <Waves className="text-lagoon" />
        </div>
      </div>
      <div className="scrollbar flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
        {messages.map((message) => {
          const replied = message.reply_to ? replyLookup.get(message.reply_to) : null;
          return (
            <article key={message.id} className="group rounded-3xl border border-cream/10 bg-night/40 p-3 transition hover:bg-night/55">
              {replied && <div className="mb-2 rounded-2xl border-l-4 border-sunset bg-white/8 p-2 text-xs text-cream/70">Replying to <b>{replied.listener_name}</b>: {replied.body || "media"}</div>}
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-hibiscus to-sunset font-black text-night">{message.listener_name.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-black text-white">{message.listener_name}</p><span className="text-xs text-cream/50">{formatTime(message.created_at)}</span></div>
                  {message.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-cream/90" dangerouslySetInnerHTML={{ __html: linkify(message.body) }} />}
                  {message.gif_url && <img src={message.gif_url} alt="GIF" className="mt-3 max-h-72 rounded-2xl object-cover" />}
                  {message.media_url && <img src={message.media_url} alt="Shared photo" className="mt-3 max-h-80 rounded-2xl object-cover" />}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {reactions.map((emoji) => <button key={emoji} onClick={() => react(message, emoji)} className="rounded-full bg-white/8 px-2 py-1 text-xs hover:bg-white/15">{emoji} {message.reactions?.[emoji] || ""}</button>)}
                    <button onClick={() => setReplyTo(message)} className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-xs text-cream/70 hover:bg-white/15"><MessageCircleReply size={13} /> reply</button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-cream/15 p-4">
        {replyTo && <div className="mb-3 flex items-center justify-between rounded-2xl bg-sunset/15 px-3 py-2 text-sm text-cream"><span>Replying to <b>{replyTo.listener_name}</b></span><button onClick={() => setReplyTo(null)}><X size={16} /></button></div>}
        {gifUrl && <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white/8 p-2"><img src={gifUrl} alt="Selected GIF" className="h-16 rounded-xl" /><button onClick={() => setGifUrl(null)} className="ml-auto"><X /></button></div>}
        {giphyOpen && <GiphyPicker onPick={(url) => { setGifUrl(url); setGiphyOpen(false); }} />}
        <div className="flex items-end gap-2">
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Say aloha, share a video link, or start a little Trop Rock trouble..." rows={2} className="min-h-14 flex-1 resize-none rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-cream/45 focus:border-sunset" />
          <button onClick={() => setGiphyOpen((value) => !value)} className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 hover:bg-white/15" aria-label="GIF picker"><SmilePlus /></button>
          <label className="grid h-12 w-12 cursor-pointer place-items-center rounded-2xl bg-white/10 hover:bg-white/15" aria-label="Upload photo"><ImagePlus /><input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => event.target.files?.[0] && uploadPhoto(event.target.files[0])} /></label>
          <button onClick={() => send()} className="grid h-12 w-12 place-items-center rounded-2xl bg-hibiscus shadow-hibiscus hover:bg-[#ff4e83]" aria-label="Send"><Send /></button>
        </div>
      </div>
    </section>
  );
}

function GiphyPicker({ onPick }: { onPick: (url: string) => void }) {
  const [query, setQuery] = useState("tropical music");
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch(`/api/giphy?q=${encodeURIComponent(query || "tropical")}`);
      const json = await response.json();
      setResults(json.results || []);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="mb-3 rounded-3xl border border-cream/15 bg-night/80 p-3">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search GIFs" className="mb-3 w-full rounded-2xl border border-cream/15 bg-white/10 px-3 py-2 text-sm text-white outline-none" />
      <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto md:grid-cols-5">
        {results.map((url) => <button key={url} onClick={() => onPick(url)}><img src={url} alt="GIF result" className="aspect-video w-full rounded-xl object-cover" /></button>)}
      </div>
    </div>
  );
}

function SongRequestCard({ listenerName, addSongRequest }: { listenerName: string; addSongRequest: (request: Omit<SongRequest, "id" | "created_at" | "status">) => Promise<void> }) {
  const [form, setForm] = useState({ listener_name: "", song_title: "", artist: "", dedication: "" });
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      await addSongRequest({ listener_name: form.listener_name || listenerName || "Tiki Guest", song_title: form.song_title, artist: form.artist, dedication: form.dedication || null });
      toast.success("Song request sent to the tiki control room.");
      setForm({ listener_name: "", song_title: "", artist: "", dedication: "" });
    } catch {
      toast.error("Song request missed the boat. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="request" className="tiki-glass rounded-[2.25rem] p-5 md:p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sunset text-night shadow-glow"><Music2 /></div>
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-sunset">Song Request</p><h2 className="font-display text-3xl font-black text-white">Send it to Kenny & Nell</h2></div>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input value={form.listener_name || listenerName} onChange={(event) => setForm({ ...form, listener_name: event.target.value })} placeholder="Listener name" className="w-full rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-cream/45 focus:border-sunset" />
        <input required value={form.song_title} onChange={(event) => setForm({ ...form, song_title: event.target.value })} placeholder="Song title" className="w-full rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-cream/45 focus:border-sunset" />
        <input required value={form.artist} onChange={(event) => setForm({ ...form, artist: event.target.value })} placeholder="Artist" className="w-full rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-cream/45 focus:border-sunset" />
        <textarea value={form.dedication} onChange={(event) => setForm({ ...form, dedication: event.target.value })} placeholder="Dedication / message" rows={4} className="w-full resize-none rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-cream/45 focus:border-sunset" />
        <button disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-hibiscus px-5 py-4 font-black text-white shadow-hibiscus transition hover:-translate-y-0.5 disabled:opacity-50"><SendHorizonal size={18} /> {sending ? "Sending..." : "Request This Song"}</button>
      </form>
    </section>
  );
}

function Announcements({ items }: { items: Announcement[] }) {
  return (
    <section className="tiki-glass rounded-[2.25rem] p-5 md:p-6">
      <p className="text-xs font-black uppercase tracking-[.18em] text-sunset">Coconut Telegraph</p>
      <h2 className="mt-1 font-display text-3xl font-black text-white">Events & show themes</h2>
      <div className="mt-5 space-y-3">
        {items.length === 0 && <p className="rounded-2xl bg-white/8 p-4 text-sm text-cream/75">Announcements will wash ashore here soon.</p>}
        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-cream/12 bg-night/40 p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-lagoon"><CalendarDays size={14} /> {item.category}{item.event_date ? ` · ${formatDate(item.event_date)}` : ""}</div>
            <h3 className="mt-2 text-xl font-black text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-cream/80">{item.body}</p>
            {item.link_url && <a href={item.link_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full bg-sunset px-3 py-2 text-xs font-black text-night">{item.link_label || "Learn More"}<ExternalLink size={13} /></a>}
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminDashboard({ requests, settings, updateSongRequest, addAnnouncement, updateLiveMode }: { requests: SongRequest[]; settings: ShowSettings; updateSongRequest: (id: string, status: SongRequest["status"]) => Promise<void>; addAnnouncement: (announcement: Omit<Announcement, "id" | "created_at" | "is_featured">) => Promise<void>; updateLiveMode: (liveMode: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [announcement, setAnnouncement] = useState({ title: "", body: "", category: "announcement" as Announcement["category"], link_url: "", link_label: "", event_date: "" });
  const lastRequestId = useRef<string | null>(null);

  useEffect(() => {
    setUnlocked(window.sessionStorage.getItem("llk.admin") === "true");
  }, []);

  useEffect(() => {
    if (!unlocked || requests.length === 0) return;
    const newest = requests[0];
    if (lastRequestId.current && lastRequestId.current !== newest.id && newest.status === "new") {
      beep();
      toast.success(`New request: ${newest.song_title} by ${newest.artist}`);
    }
    lastRequestId.current = newest.id;
  }, [requests, unlocked]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/verify", { method: "POST", body: JSON.stringify({ passcode }), headers: { "content-type": "application/json" } });
    if (!response.ok) return toast.error("That passcode did not get past the bouncer.");
    window.sessionStorage.setItem("llk.admin", "true");
    setUnlocked(true);
  }

  async function postAnnouncement(event: React.FormEvent) {
    event.preventDefault();
    try {
      await addAnnouncement({
        title: announcement.title,
        body: announcement.body,
        category: announcement.category,
        link_url: safeUrl(announcement.link_url) || null,
        link_label: announcement.link_label || null,
        event_date: announcement.event_date ? new Date(announcement.event_date).toISOString() : null
      });
      toast.success("Announcement posted.");
      setAnnouncement({ title: "", body: "", category: "announcement", link_url: "", link_label: "", event_date: "" });
    } catch {
      toast.error("Announcement did not post.");
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-40 rounded-2xl border border-cream/20 bg-night/85 px-4 py-3 text-sm font-black text-white shadow-glow backdrop-blur transition hover:-translate-y-0.5"><Anchor className="mr-2 inline" size={18} /> Captain's Dashboard</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-night/80 p-3 backdrop-blur-xl md:p-6">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-cream/15 bg-[#081d24] shadow-glow">
            <div className="flex items-center justify-between border-b border-cream/15 p-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-sunset">Kenny & Nell Only</p><h2 className="font-display text-3xl font-black text-white">Captain's Dashboard</h2></div><button onClick={() => setOpen(false)} className="rounded-2xl bg-white/10 p-3"><X /></button></div>
            {!unlocked ? (
              <form onSubmit={login} className="m-auto grid w-full max-w-md gap-4 p-6 text-center"><Lock className="mx-auto text-sunset" size={40} /><h3 className="text-2xl font-black text-white">Unlock the control room</h3><input value={passcode} onChange={(event) => setPasscode(event.target.value)} type="password" placeholder="Admin passcode" className="rounded-2xl border border-cream/20 bg-white/10 px-4 py-4 text-center text-white outline-none focus:border-sunset" /><button className="rounded-2xl bg-hibiscus px-5 py-4 font-black text-white shadow-hibiscus">Enter</button><p className="text-xs text-cream/55">Default Bolt preview passcode is “kenny”. Change ADMIN_PASSCODE before launch.</p></form>
            ) : (
              <div className="scrollbar grid flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_.9fr]">
                <section className="rounded-3xl border border-cream/15 bg-white/7 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-sunset">Request Queue</p><h3 className="text-2xl font-black text-white">Song requests</h3></div><BellRing className="text-sunset" /></div>
                  <div className="space-y-3">
                    {requests.length === 0 && <p className="rounded-2xl bg-white/8 p-4 text-cream/70">No requests yet. The blender is quiet.</p>}
                    {requests.map((request) => <article key={request.id} className="rounded-3xl border border-cream/10 bg-night/55 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-cream/50">{formatTime(request.created_at)} · {request.listener_name}</p><h4 className="mt-1 text-xl font-black text-white">{request.song_title}</h4><p className="text-sunset">{request.artist}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-cream/70">{request.status}</span></div>{request.dedication && <p className="mt-3 rounded-2xl bg-white/8 p-3 text-sm text-cream/80">“{request.dedication}”</p>}<div className="mt-3 flex flex-wrap gap-2"><button onClick={() => updateSongRequest(request.id, "seen")} className="rounded-full bg-white/10 px-3 py-2 text-xs font-black">Seen</button><button onClick={() => updateSongRequest(request.id, "played")} className="rounded-full bg-lagoon px-3 py-2 text-xs font-black text-night">Played</button><button onClick={() => updateSongRequest(request.id, "archived")} className="rounded-full bg-white/10 px-3 py-2 text-xs font-black">Archive</button></div></article>)}
                  </div>
                </section>
                <div className="grid content-start gap-4">
                  <section className="rounded-3xl border border-cream/15 bg-white/7 p-4"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-sunset">Live Mode</p><h3 className="text-2xl font-black text-white">Show status</h3></div>{settings.live_mode ? <ToggleRight className="text-hibiscus" size={38} /> : <ToggleLeft className="text-cream/60" size={38} />}</div><button onClick={() => updateLiveMode(!settings.live_mode)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sunset px-4 py-4 font-black text-night shadow-glow"><Sparkles size={18} /> {settings.live_mode ? "Turn Live Mode Off" : "Turn Live Mode On"}</button></section>
                  <section className="rounded-3xl border border-cream/15 bg-white/7 p-4"><div className="mb-4 flex items-center gap-3"><Megaphone className="text-sunset" /><div><p className="text-xs font-black uppercase tracking-[.18em] text-sunset">Coconut Telegraph</p><h3 className="text-2xl font-black text-white">Post announcement</h3></div></div><form onSubmit={postAnnouncement} className="space-y-3"><select value={announcement.category} onChange={(event) => setAnnouncement({ ...announcement, category: event.target.value as Announcement["category"] })} className="w-full rounded-2xl border border-cream/20 bg-night px-4 py-3 text-white outline-none"><option value="announcement">Announcement</option><option value="theme">Show Theme</option><option value="event">Trop Rock Event</option><option value="appearance">Kenny & Nell Appearance</option></select><input required value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} placeholder="Title" className="w-full rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-white outline-none" /><textarea required value={announcement.body} onChange={(event) => setAnnouncement({ ...announcement, body: event.target.value })} placeholder="Details" rows={4} className="w-full resize-none rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-white outline-none" /><input value={announcement.event_date} onChange={(event) => setAnnouncement({ ...announcement, event_date: event.target.value })} type="datetime-local" className="w-full rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-white outline-none" /><input value={announcement.link_url} onChange={(event) => setAnnouncement({ ...announcement, link_url: event.target.value })} placeholder="Optional link URL" className="w-full rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-white outline-none" /><input value={announcement.link_label} onChange={(event) => setAnnouncement({ ...announcement, link_label: event.target.value })} placeholder="Optional link label" className="w-full rounded-2xl border border-cream/20 bg-white/10 px-4 py-3 text-white outline-none" /><button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-hibiscus px-4 py-4 font-black text-white shadow-hibiscus"><CheckCircle2 size={18} /> Publish</button></form></section>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function beep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.type = "sine";
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.34);
  } catch {
    // Browser audio can be blocked until user interaction. The toast still appears.
  }
}

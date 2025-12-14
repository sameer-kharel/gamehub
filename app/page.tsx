'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useScrollProgress } from './hooks/useScrollProgress';
import { IGame } from '@/models/Game';
import { IHallOfShame } from '@/models/HallOfShame';

const Scene = dynamic(() => import('./components/canvas/Scene'), {
  ssr: false,
  loading: () => <div className="canvas-container bg-gradient-to-b from-[#0a0a15] to-[#050508]" />,
});

// Content for each scroll phase - synced with controller camera positions
const PHASES = [
  { id: 'hero', label: 'WELCOME', sublabel: 'Premium Gaming Experience' },
  { id: 'dpad', label: 'D-PAD', sublabel: 'Navigate the gaming world' },
  { id: 'buttons', label: 'ACTION BUTTONS', sublabel: 'Execute winning moves' },
  { id: 'sticks', label: 'ANALOG STICKS', sublabel: 'Precision control' },
  { id: 'triggers', label: 'TRIGGERS', sublabel: 'L1, L2, R1, R2' },
  { id: 'shame', label: 'HALL OF SHAME', sublabel: 'Legends vs Losers' },
  { id: 'visit', label: 'VISIT US', sublabel: 'Ready to play?' },
];

export default function Home() {
  const [showContent, setShowContent] = useState(false);
  const { progress } = useScrollProgress();
  const [games, setGames] = useState<IGame[]>([]);
  const [hallOfShame, setHallOfShame] = useState<IHallOfShame[]>([]);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    email: '',
    date: '',
    notes: ''
  });
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStatus('submitting');

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingForm),
      });

      if (res.ok) {
        setBookingStatus('success');
        setBookingForm({ name: '', email: '', date: '', notes: '' });
        setTimeout(() => {
          setShowBookingModal(false);
          setBookingStatus('idle');
        }, 2000);
      } else {
        setBookingStatus('error');
      }
    } catch (error) {
      setBookingStatus('error');
    }
  };

  useEffect(() => {
    setTimeout(() => setShowContent(true), 1200);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, shameRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/hall-of-shame')
      ]);
      const gamesData = await gamesRes.json();
      const shameData = await shameRes.json();

      if (gamesData.success) setGames(gamesData.data);
      if (shameData.success) setHallOfShame(shameData.data.slice(0, 3)); // Only show top 3
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Calculate current phase
  const phaseIndex = Math.min(
    Math.floor(progress * PHASES.length),
    PHASES.length - 1
  );
  const currentPhase = PHASES[phaseIndex];

  const scrollTo = (targetProgress: number) => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: targetProgress * docHeight, behavior: 'smooth' });
  };

  // Helper to generate random color for games if not provided (fallback)
  const getGameColor = (index: number) => {
    const colors = ['#ff00ff', '#00d4ff', '#00ff00', '#ff0000', '#ffff00'];
    return colors[index % colors.length];
  };

  return (
    <>
      {/* 3D Scene */}
      <Scene scrollProgress={progress} />

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]" onClick={() => setShowBookingModal(false)} />
          <div className="relative bg-[#0a0a15] border border-[#ff00ff]/30 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-[0_0_50px_rgba(255,0,255,0.2)] animate-[scaleIn_0.2s_ease-out]">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff00ff] to-[#00d4ff] mb-1 uppercase tracking-wider">Book Your Spot</h3>
            <p className="text-gray-400 text-sm mb-6">Reserve your gaming session in advance.</p>

            {bookingStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h4 className="text-xl font-bold text-white mb-2">Booking Requested!</h4>
                <p className="text-gray-400">We'll see you soon at MT GameHub.</p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#ff00ff] focus:outline-none transition-colors"
                    placeholder="Enter your name"
                    value={bookingForm.name}
                    onChange={e => setBookingForm({ ...bookingForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#ff00ff] focus:outline-none transition-colors [color-scheme:dark]"
                    value={bookingForm.date}
                    onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Info</label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#ff00ff] focus:outline-none transition-colors"
                    placeholder="Phone number or Email"
                    value={bookingForm.email}
                    onChange={e => setBookingForm({ ...bookingForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes (Optional)</label>
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#ff00ff] focus:outline-none transition-colors resize-none h-20"
                    placeholder="Specific console preference?"
                    value={bookingForm.notes}
                    onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingStatus === 'submitting'}
                  className="w-full bg-gradient-to-r from-[#ff00ff] to-[#00d4ff] text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
                >
                  {bookingStatus === 'submitting' ? 'Booking...' : 'Confirm Booking'}
                </button>

                {bookingStatus === 'error' && (
                  <p className="text-red-500 text-xs text-center mt-2">Failed to submit. Please try again.</p>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-opacity duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between p-4 md:p-6">
          <button onClick={() => scrollTo(0)} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff00ff] to-[#00d4ff] p-0.5">
              <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                <span className="text-white font-black text-lg">MT</span>
              </div>
            </div>
            <div className="hidden md:block">
              <p className="text-white font-bold text-lg tracking-wider">GAMEHUB</p>
              <p className="text-[10px] text-[#ff00ff] uppercase tracking-widest">Sagarmatha Chowk, Jhapa</p>
            </div>
          </button>

          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-xl rounded-full p-1 border border-white/10">
            {[
              { label: 'HOME', progress: 0 },
              { label: 'GAMES', progress: 0.35 },
              { label: 'PRICING', progress: 0.65 },
              { label: 'VISIT', progress: 0.9 },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => scrollTo(item.progress)}
                className={`px-3 md:px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${progress >= item.progress && progress < (item.progress + 0.25)
                  ? 'bg-gradient-to-r from-[#ff00ff] to-[#00d4ff] text-white'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.label[0]}</span>
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-gray-400">ONLINE</span>
          </div>
        </div>
      </nav>

      {/* Scroll content container */}
      <div className={`scroll-container transition-opacity duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <div style={{ height: '700vh' }}>

          {/* Phase indicator */}
          <div className="fixed bottom-8 left-8 z-30 pointer-events-none">
            <p className="text-[#ff00ff] text-xs uppercase tracking-widest mb-1">
              {String(phaseIndex + 1).padStart(2, '0')} / {String(PHASES.length).padStart(2, '0')}
            </p>
            <h2 className="text-2xl md:text-4xl font-black text-white mb-1">
              {currentPhase.label}
            </h2>
            <p className="text-gray-400 text-sm">{currentPhase.sublabel}</p>
          </div>

          {/* Hero Section */}
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-center transition-all duration-500 ${phaseIndex === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}>
            <h1 className="text-5xl md:text-8xl font-black mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff00ff] via-[#ff66ff] to-[#00d4ff]">
                MT GAMEHUB
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white mb-2">Play. Compete. Repeat.</p>
            <p className="text-gray-400 mb-8">Premium Gaming in Sagarmatha Chowk, Jhapa</p>

            <div className={`flex flex-col md:flex-row items-center justify-center gap-4 ${phaseIndex === 0 ? 'pointer-events-auto' : 'pointer-events-none'}`}>
              <button
                onClick={() => scrollTo(0.35)}
                className="px-8 py-4 bg-gradient-to-r from-[#ff00ff] to-[#ff00aa] rounded-lg font-bold text-white uppercase tracking-wider hover:scale-105 transition-transform w-[240px]"
              >
                Explore Games
              </button>

              <button
                onClick={() => setShowBookingModal(true)}
                className="px-8 py-4 bg-white/10 border border-white/20 backdrop-blur rounded-lg font-bold text-white uppercase tracking-wider hover:bg-white/20 hover:scale-105 transition-all w-[240px]"
              >
                Book Appointment
              </button>
            </div>

            <div className="mt-12 animate-bounce">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Scroll to explore</p>
            </div>
          </div>

          {/* D-Pad Phase - Games */}
          <div className={`fixed inset-0 z-20 pointer-events-none transition-all duration-500 ${phaseIndex === 1 ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className="absolute top-1/2 right-8 -translate-y-1/2 max-w-sm">
              <div className={`bg-black/70 backdrop-blur-xl rounded-2xl p-6 border border-[#ff00ff]/30 ${phaseIndex === 1 ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <p className="text-[#00d4ff] text-xs uppercase tracking-widest mb-2">Game Library</p>
                <h3 className="text-2xl font-bold text-white mb-4">Choose Your Game</h3>
                <div className="space-y-2">
                  {games.slice(0, 4).map((game, i) => (
                    <div key={String(game._id)} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="w-3 h-3 rounded-full" style={{ background: getGameColor(i) }} />
                      <span className="text-white">{game.name}</span>
                    </div>
                  ))}
                  {games.length > 4 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="w-3 h-3 rounded-full" style={{ background: "red" }} />
                      <span className="text-white">and {games.length - 4} others</span>
                    </div>
                  )}
                  {games.length === 0 && (
                    <p className="text-gray-500 text-sm">Loading games...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons Phase - More Games */}
          <div className={`fixed inset-0 z-20 pointer-events-none transition-all duration-500 ${phaseIndex === 2 ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className="absolute top-1/2 left-8 -translate-y-1/2 max-w-sm">
              <div className={`bg-black/70 backdrop-blur-xl rounded-2xl p-6 border border-[#00d4ff]/30 ${phaseIndex === 2 ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <p className="text-[#ff00ff] text-xs uppercase tracking-widest mb-2">More Games</p>
                <h3 className="text-2xl font-bold text-white mb-4">Action Awaits</h3>
                <div className="space-y-2">
                  {games.slice(4, 8).map((game, i) => (
                    <div key={String(game._id)} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="w-3 h-3 rounded-full" style={{ background: getGameColor(i + 4) }} />
                      <span className="text-white">{game.name}</span>
                    </div>
                  ))}
                  {games.length <= 4 && (
                    <p className="text-gray-500 text-sm">Check back later for more games!</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticks Phase - Pricing */}
          <div className={`fixed inset-0 z-20 pointer-events-none transition-all duration-500 ${phaseIndex === 3 ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className="absolute top-1/2 right-8 -translate-y-1/2 max-w-sm">
              <div className={`bg-black/70 backdrop-blur-xl rounded-2xl p-6 border border-[#ff00ff]/30 ${phaseIndex === 3 ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <p className="text-[#ff00ff] text-xs uppercase tracking-widest mb-2">Pricing</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-black text-white">Rs. 200</span>
                  <span className="text-gray-400">/ hour</span>
                </div>
                <div className="space-y-2 mb-6">
                  {['All games included', 'HD Display', 'Smoking Zone', 'Coffee and Beer'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Triggers Phase - Features */}
          <div className={`fixed inset-0 z-20 pointer-events-none transition-all duration-500 ${phaseIndex === 4 ? 'opacity-100' : 'opacity-0'
            }`}>
            {/* Scattered items container */}
            <div className={`absolute inset-0 overflow-hidden ${phaseIndex === 4 ? 'pointer-events-auto' : 'pointer-events-none'}`}>
              {[
                { icon: '🎮', title: 'Pro Controllers', desc: 'DualShock 4', pos: 'top-[15%] left-[5%]' },
                { icon: '📺', title: 'HD Displays', desc: 'Crystal clear 4K', pos: 'top-[15%] right-[5%]' },
                { icon: '❄️', title: 'Premium Vibe', desc: 'Climate controlled', pos: 'bottom-[20%] left-[5%]' },
                { icon: '🎧', title: 'Pro Audio', desc: 'Surround sound', pos: 'bottom-[20%] right-[5%]' },
                { icon: '⚡', title: 'Fast Charging', desc: 'For all devices', pos: 'top-[40%] left-[8%]' },
                { icon: '🏆', title: 'Hall of Fame', desc: 'Top players board', pos: 'top-[40%] right-[8%]' },
                { icon: '☕', title: 'Coffee Bar', desc: 'Freshly brewed', pos: 'bottom-[10%] right-[25%]' },
                { icon: '🍵', title: 'Tea Station', desc: 'Hot & refreshing', pos: 'top-[60%] right-[5%]' },
                { icon: '🚬', title: 'Smoking Zone', desc: 'Designated area', pos: 'bottom-[10%] left-[25%]' },
                { icon: '🥤', title: 'Refreshments', desc: 'Cold drinks', pos: 'top-[60%] left-[5%]' },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`absolute ${item.pos} transform transition-all duration-500 hover:scale-110 hover:z-50`}
                  style={{
                    transitionDelay: `${i * 100}ms`,
                    opacity: phaseIndex === 4 ? 1 : 0,
                    transform: phaseIndex === 4 ? 'scale(1) translateY(0)' : 'scale(0) translateY(20px)'
                  }}
                >
                  <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 hover:border-[#00d4ff] hover:bg-black/80 shadow-lg flex items-center gap-3 min-w-[200px]">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="text-white font-bold text-sm">{item.title}</p>
                      <p className="text-gray-400 text-xs">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Central Title for this section */}
              <div className="absolute top-[10%] left-1/2 -translate-x-1/2 text-center">
                <h3 className="text-[#00d4ff] font-bold tracking-widest uppercase text-sm mb-2">Premium Amenities</h3>
              </div>
            </div>
          </div>

          {/* Hall of Shame Phase */}
          <div className={`fixed inset-0 z-20 pointer-events-none transition-all duration-500 ${phaseIndex === 5 ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className="absolute top-1/2 left-4 right-4 md:left-auto md:right-16 -translate-y-1/2 md:w-full md:max-w-md">
              <div className={`text-right mb-8 ${phaseIndex === 5 ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff00ff] to-red-500 animate-pulse" style={{ textShadow: '0 0 20px rgba(255,0,0,0.5)' }}>
                  HALL OF SHAME
                </h2>
                <p className="text-gray-400 text-sm md:text-base tracking-widest uppercase">
                  Legends remember. <span className="text-red-500 font-bold">Losers</span> are immortalized.
                </p>
              </div>

              <div className={`space-y-4 ${phaseIndex === 5 ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                {hallOfShame.map((entry, i) => (
                  <div key={String(entry._id)} className="bg-black/80 backdrop-blur-xl border-l-4 border-[#ff00ff] rounded-r-xl p-4 relative overflow-hidden group hover:translate-x-2 transition-transform">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#ff00ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <span className="text-xs font-bold text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-1 rounded mb-2 inline-block">
                          {entry.game.name}
                        </span>
                        <div className="flex items-center gap-2 text-lg">
                          <span className="font-black text-white text-xl drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                            {entry.winner.name}
                          </span>
                          <span className="text-gray-500 text-xs uppercase">def.</span>
                          <span className="text-red-400 font-medium line-through decoration-red-500/50">
                            {entry.loser.name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white italic">
                          {entry.result.type === 'Score'
                            ? `${entry.result.scoreWinner} - ${entry.result.scoreLoser}`
                            : entry.result.type}
                        </p>
                        <p className="text-[10px] text-gray-500">{new Date(entry.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {hallOfShame.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No shame entries yet. Be the first!</p>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <Link href="/leaderboard" className="text-xs text-gray-500 hover:text-white transition-colors uppercase tracking-widest border-b border-gray-700 hover:border-white pb-1">
                    View Full Leaderboard
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Final Phase - Location */}
          <div className={`fixed inset-0 flex items-center justify-center z-20 pointer-events-none transition-all duration-500 ${phaseIndex === 6 ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className={`text-center px-4 ${phaseIndex === 6 ? 'pointer-events-auto' : 'pointer-events-none'}`}>
              <p className="text-[#ff00ff] text-sm uppercase tracking-widest mb-4">📍 Find Us</p>
              <h2 className="text-4xl md:text-6xl font-black text-white mb-2">
                Sagarmatha Chowk, JHAPA
              </h2>
              <p className="text-xl text-gray-400 mb-8">Eastern Nepal</p>

              <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
                <div className="bg-white/5 backdrop-blur rounded-xl px-6 py-4 border border-white/10">
                  <p className="text-gray-400 text-sm">Hours</p>
                  <p className="text-white font-bold">10 AM - 10 PM</p>
                </div>
                <div className="bg-white/5 backdrop-blur rounded-xl px-6 py-4 border border-white/10">
                  <p className="text-gray-400 text-sm">Rate</p>
                  <p className="text-white font-bold">Rs. 200/hr</p>
                </div>
              </div>

              <button className="px-10 py-4 bg-gradient-to-r from-[#ff00ff] to-[#00d4ff] rounded-xl font-bold text-white uppercase tracking-wider hover:scale-105 transition-transform">
                Get Directions
              </button>

              <p className="mt-12 text-gray-500 text-sm">© {new Date().getFullYear()} MT Gamehub</p>
            </div>
          </div>

        </div>
      </div>

      {/* Progress dots */}
      <div className={`fixed right-4 top-1/2 -translate-y-1/2 z-50 transition-opacity duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col items-center gap-2">
          {PHASES.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i / PHASES.length)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${phaseIndex === i ? 'bg-[#ff00ff] scale-150 shadow-[0_0_10px_#ff00ff]' : 'bg-white/30 hover:bg-white/50'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className={`fixed bottom-0 left-0 right-0 h-1 bg-white/10 z-50 transition-opacity duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <div
          className="h-full bg-gradient-to-r from-[#ff00ff] to-[#00d4ff]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { IAppointment } from '@/models/Appointment';
import { IHallOfShame } from '@/models/HallOfShame';
import { IGame } from '@/models/Game';
import { IBooking } from '@/models/Booking';
import { IConsole } from '@/models/Console';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'bookings' | 'appointments' | 'hallofshame' | 'users' | 'games' | 'summary'>('bookings');
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [hallOfShame, setHallOfShame] = useState<IHallOfShame[]>([]);
    const [games, setGames] = useState<IGame[]>([]);
    const [bookings, setBookings] = useState<IBooking[]>([]);
    const [consoles, setConsoles] = useState<IConsole[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'week' | 'month' | 'all'>('day');
    const [loading, setLoading] = useState(true);

    // Forms state
    const [newUser, setNewUser] = useState({ username: '', password: '' });
    const [newGame, setNewGame] = useState({ name: '', key: '', description: '' });

    // New Booking Form State
    const [newBooking, setNewBooking] = useState({
        userName: '',
        duration: 1,
        consoleNumber: 1,
        paymentMethod: 'Cash',
        notes: '',
    });

    // New Hall of Shame Form State
    const [newShame, setNewShame] = useState({
        gameId: '', // Selected Game ID
        winnerName: '',
        loserName: '',
        resultType: 'Score',
        scoreWinner: '',
        scoreLoser: '',
        description: '',
        roast: '',
        isPaid: false,
        amount: 0
    });

    const [message, setMessage] = useState({ text: '', type: '' });
    const [newConsoleName, setNewConsoleName] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    useEffect(() => {
        fetchData();
        // Refresh active bookings every 30 seconds
        const interval = setInterval(() => {
            if (activeTab === 'bookings') {
                fetchBookingsData();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [apptRes, shameRes, gameRes] = await Promise.all([
                fetch('/api/appointments', { cache: 'no-store' }),
                fetch('/api/hall-of-shame', { cache: 'no-store' }),
                fetch('/api/games', { cache: 'no-store' }),
            ]);

            const apptData = await apptRes.json();
            const shameData = await shameRes.json();
            const gameData = await gameRes.json();

            if (apptData.success) setAppointments(apptData.data);
            if (shameData.success) setHallOfShame(shameData.data);
            if (gameData.success) setGames(gameData.data);

            // Fetch bookings data if on bookings tab
            if (activeTab === 'bookings') {
                await fetchBookingsData();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookingsData = async () => {
        try {
            const [bookingsRes, consolesRes, analyticsRes] = await Promise.all([
                fetch('/api/bookings', { cache: 'no-store' }),
                fetch('/api/consoles', { cache: 'no-store' }),
                fetch(`/api/analytics?period=${analyticsPeriod}`, { cache: 'no-store' }),
            ]);

            const bookingsData = await bookingsRes.json();
            const consolesData = await consolesRes.json();
            const analyticsData = await analyticsRes.json();

            if (bookingsData.success) setBookings(bookingsData.data);
            if (consolesData.success) {
                setConsoles(consolesData.data);
            }
            if (analyticsData.success) setAnalytics(analyticsData.data);
        } catch (error) {
            console.error('Error fetching bookings data:', error);
        }
    };

    // Auto-select first available console when consoles data changes
    useEffect(() => {
        const availableConsoles = consoles.filter(c => c.status === 'available');
        if (availableConsoles.length > 0) {
            // Check if current selection is valid
            const isCurrentSelectionValid = availableConsoles.some(c => c.consoleNumber === newBooking.consoleNumber);

            if (!isCurrentSelectionValid) {
                setNewBooking(prev => ({ ...prev, consoleNumber: availableConsoles[0].consoleNumber }));
            }
        }
    }, [consoles]);

    const handleDeleteConsole = async (id: string) => {
        if (!confirm('Are you sure you want to delete this console?')) return;
        try {
            console.log('Attempting to delete console:', id);

            // Optimistic update
            setConsoles(prev => prev.filter(c => String(c._id) !== id));

            const res = await fetch(`/api/consoles/${id}`, { method: 'DELETE' });
            console.log('Delete response status:', res.status);

            if (res.ok) {
                console.log('Delete success, refreshing data...');
                await fetchBookingsData(); // Sync with server for full correctness
                showMessage('Console deleted', 'success');
            } else {
                const err = await res.json();
                console.error('Delete failed:', err);
                showMessage('Failed to delete console', 'error');
                fetchBookingsData(); // Revert on failure
            }
        } catch (error) {
            console.error('Delete error:', error);
            showMessage('Failed to delete console', 'error');
            fetchBookingsData(); // Revert on failure
        }
    };

    const handleAppointmentAction = async (id: string, status: 'approved' | 'rejected') => {
        try {
            const res = await fetch(`/api/appointments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                fetchData(); // Refresh
                showMessage('Appointment updated successfully', 'success');
            }
        } catch (error) {
            showMessage('Failed to update appointment', 'error');
        }
    };

    const handleConvertBooking = (appt: IAppointment) => {
        setNewBooking(prev => ({
            ...prev,
            userName: appt.name,
            notes: appt.notes || '',
        }));
        setActiveTab('bookings');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showMessage('Booking form pre-filled from appointment', 'success');

    };

    const handleAddConsole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/consoles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newConsoleName || `PS4-${consoles.length + 1}` }),
            });

            const data = await res.json();

            if (res.ok) {
                setNewConsoleName('');
                fetchBookingsData();
                showMessage('Console created successfully', 'success');
            } else {
                showMessage(data.error || 'Failed to create console', 'error');
            }
        } catch (error) {
            showMessage(`Error: ${(error as Error).message}`, 'error');
        }
    };


    const handleDeleteShame = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            const res = await fetch(`/api/hall-of-shame/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
                showMessage('Entry deleted', 'success');
            }
        } catch (error) {
            showMessage('Failed to delete entry', 'error');
        }
    };

    const handleDeleteGame = async (id: string) => {
        if (!confirm('Are you sure? This might affect existing records.')) return;
        try {
            const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
                showMessage('Game deleted', 'success');
            }
        } catch (error) {
            showMessage('Failed to delete game', 'error');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            });
            const data = await res.json();
            if (res.ok) {
                setNewUser({ username: '', password: '' });
                showMessage(`User ${data.data.username} created!`, 'success');
            } else {
                showMessage(data.error, 'error');
            }
        } catch (error) {
            showMessage('Failed to create user', 'error');
        }
    };

    const handleCreateGame = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGame),
            });
            if (res.ok) {
                setNewGame({ name: '', key: '', description: '' });
                fetchData();
                showMessage('Game added!', 'success');
            } else {
                showMessage('Failed to add game', 'error');
            }
        } catch (error) {
            showMessage('Failed to add game', 'error');
        }
    };

    const handleCreateShame = async (e: React.FormEvent) => {
        e.preventDefault();

        const selectedGame = games.find(g => String(g._id) === newShame.gameId);
        if (!selectedGame) {
            showMessage('Please select a game', 'error');
            return;
        }

        // Construct payload matching new schema
        const payload = {
            game: {
                name: selectedGame.name,
                key: selectedGame.key,
            },
            winner: { name: newShame.winnerName },
            loser: { name: newShame.loserName },
            result: {
                type: newShame.resultType,
                scoreWinner: newShame.resultType === 'Score' ? Number(newShame.scoreWinner) : undefined,
                scoreLoser: newShame.resultType === 'Score' ? Number(newShame.scoreLoser) : undefined,
                description: newShame.description,
            },
            roast: newShame.roast,
            paid: {
                isPaid: newShame.isPaid,
                amount: Number(newShame.amount),
            }
        };

        try {
            const res = await fetch('/api/hall-of-shame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                // Reset form
                setNewShame({
                    gameId: '', winnerName: '', loserName: '',
                    resultType: 'Score', scoreWinner: '', scoreLoser: '',
                    description: '', roast: '', isPaid: false, amount: 0
                });
                fetchData();
                showMessage('Hall of Shame entry added!', 'success');
            } else {
                showMessage('Failed to add entry', 'error');
            }
        } catch (error) {
            showMessage('Failed to add entry', 'error');
        }
    };

    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newBooking.userName.trim()) {
            showMessage('Please enter a user name', 'error');
            return;
        }

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBooking),
            });

            const data = await res.json();

            if (res.ok) {
                setNewBooking({
                    userName: '',
                    duration: 1,
                    consoleNumber: 1,
                    paymentMethod: 'Cash',
                    notes: '',
                });
                fetchBookingsData();
                showMessage('Booking created successfully!', 'success');
            } else {
                showMessage(data.error || 'Failed to create booking', 'error');
            }
        } catch (error) {
            showMessage('Failed to create booking', 'error');
        }
    };

    const handleEndSessionClick = (bookingId: string) => {
        setSelectedBookingId(bookingId);
        setShowPaymentModal(true);
    };

    const confirmEndSession = async () => {
        if (!selectedBookingId) return;

        try {
            const res = await fetch(`/api/bookings/${selectedBookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'end', paymentMethod }),
            });

            if (res.ok) {
                fetchBookingsData();
                setShowPaymentModal(false);
                setSelectedBookingId(null);
                setPaymentMethod('Cash');
                showMessage('Session completed and payment recorded', 'success');
            } else {
                showMessage('Failed to end session', 'error');
            }
        } catch (error) {
            showMessage('Failed to end session', 'error');
        }
    };

    const handleMarkPaid = async (bookingId: string, isPaid: boolean) => {
        try {
            const res = await fetch(`/api/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPaid }),
            });

            if (res.ok) {
                fetchBookingsData();
                showMessage(`Marked as ${isPaid ? 'paid' : 'unpaid'}`, 'success');
            }
        } catch (error) {
            showMessage('Failed to update payment status', 'error');
        }
    };

    const getSessionDuration = (startTime: Date) => {
        const now = new Date();
        const start = new Date(startTime);
        const diff = now.getTime() - start.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const getAvailableConsoles = () => {
        return consoles.filter(c => c.status === 'available');
    };


    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    if (loading) return <div className="text-white">Loading...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                {message.text && (
                    <div className={`px-4 py-2 rounded ${message.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-zinc-800 pb-4 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('bookings')}
                    className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'bookings' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                >
                    🎮 Bookings & Revenue
                </button>
                <button
                    onClick={() => setActiveTab('appointments')}
                    className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'appointments' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                >
                    Appointments
                </button>
                <button
                    onClick={() => setActiveTab('hallofshame')}
                    className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'hallofshame' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                >
                    Hall of Shame
                </button>
                <button
                    onClick={() => setActiveTab('games')}
                    className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'games' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                >
                    Games
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                >
                    User Management
                </button>
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'summary' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                >
                    Summary
                </button>
            </div>

            {/* Content */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                {activeTab === 'bookings' && (
                    <div className="space-y-8">
                        {/* Today's Revenue Card */}
                        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-indigo-400 text-sm font-medium mb-1">Today's Revenue (24h)</p>
                                <h3 className="text-4xl font-bold text-white">
                                    NPR {bookings.filter(b => {
                                        const bookingDate = new Date(b.startTime);
                                        const today = new Date();
                                        return bookingDate.getDate() === today.getDate() &&
                                            bookingDate.getMonth() === today.getMonth() &&
                                            bookingDate.getFullYear() === today.getFullYear();
                                    }).reduce((sum, b) => sum + (b.totalAmount || 0), 0)}
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-zinc-400 text-xs">Sessions Today</p>
                                <p className="text-2xl font-bold text-white">
                                    {bookings.filter(b => {
                                        const bookingDate = new Date(b.startTime);
                                        const today = new Date();
                                        return bookingDate.getDate() === today.getDate() &&
                                            bookingDate.getMonth() === today.getMonth() &&
                                            bookingDate.getFullYear() === today.getFullYear();
                                    }).length}
                                </p>
                            </div>
                        </div>


                        {/* Console Status Cards */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span>🎮</span> Console Status
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {consoles.map((console: any) => (
                                    <div
                                        key={console._id}
                                        className={`relative group p-4 rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden ${console.status === 'available'
                                            ? 'bg-zinc-900/50 border-green-500/30 hover:border-green-500/60 hover:shadow-green-900/20'
                                            : console.status === 'in-use'
                                                ? 'bg-zinc-900/50 border-red-500/30 hover:border-red-500/60 hover:shadow-red-900/20'
                                                : 'bg-zinc-900/50 border-yellow-500/30 hover:border-yellow-500/60 hover:shadow-yellow-900/20'
                                            }`}
                                    >
                                        {/* Status LED */}
                                        <div className={`absolute top-4 right-4 w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] animate-pulse ${console.status === 'available' ? 'bg-green-500 text-green-500' :
                                            console.status === 'in-use' ? 'bg-red-500 text-red-500' :
                                                'bg-yellow-500 text-yellow-500'
                                            }`} />

                                        <div className="flex flex-col h-full justify-between">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="text-lg font-bold text-white tracking-wider">{console.name}</h3>
                                                </div>
                                                <p className={`text-xs font-semibold uppercase tracking-widest ${console.status === 'available' ? 'text-green-400' :
                                                    console.status === 'in-use' ? 'text-red-400' :
                                                        'text-yellow-400'
                                                    }`}>
                                                    {console.status === 'available' ? 'Available' :
                                                        console.status === 'in-use' ? 'Occupied' :
                                                            'Maintenance'}
                                                </p>
                                                {/* Show current user if in use */}
                                                {console.status === 'in-use' && (() => {
                                                    const activeBooking = bookings.find(b => b.status === 'active' && b.consoleNumber === console.consoleNumber);
                                                    return activeBooking ? (
                                                        <div className="mt-3 bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
                                                            <p className="text-zinc-400 text-xs">Player:</p>
                                                            <p className="text-white font-medium truncate">{activeBooking.userName}</p>
                                                            <p className="text-zinc-500 text-xs mt-1">{getSessionDuration(activeBooking.startTime)} elapsed</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-zinc-500 text-xs mt-2">Active</p>
                                                    );
                                                })()}
                                            </div>

                                            {/* Action Bar */}
                                            <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center">
                                                <div className="text-zinc-600">
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>
                                                </div>
                                                {console.status === 'available' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteConsole(console._id); }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg"
                                                        title="Delete Console"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions & Active Sessions Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* LEFT COLUMN: Start Session */}
                            <div className="bg-zinc-800/30 p-6 rounded-xl border border-zinc-700/50 h-fit">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    Start Session
                                </h3>
                                <form onSubmit={handleCreateBooking} className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">User</label>
                                        <input
                                            type="text"
                                            placeholder="Player Name"
                                            required
                                            className="w-full bg-zinc-900 border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                            value={newBooking.userName}
                                            onChange={e => setNewBooking({ ...newBooking, userName: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Console</label>
                                            <select
                                                required
                                                className="w-full bg-zinc-900 border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
                                                value={newBooking.consoleNumber}
                                                onChange={e => setNewBooking({ ...newBooking, consoleNumber: Number(e.target.value) })}
                                            >
                                                <option value="" disabled>Select</option>
                                                {consoles.filter(c => c.status === 'available').map(c => (
                                                    <option key={String(c._id)} value={c.consoleNumber}>{c.name}</option>
                                                ))}
                                                {getAvailableConsoles().length === 0 && <option value="" disabled>Full</option>}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Time</label>
                                            <select
                                                className="w-full bg-zinc-900 border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
                                                value={newBooking.duration}
                                                onChange={e => setNewBooking({ ...newBooking, duration: Number(e.target.value) })}
                                            >
                                                <option value={0.5}>30m</option>
                                                <option value={1}>1h</option>
                                                <option value={1.5}>1.5h</option>
                                                <option value={2}>2h</option>
                                                <option value={2.5}>2.5h</option>
                                                <option value={3}>3h</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Estimated Price Display */}
                                    <div className="bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20 text-center">
                                        <p className="text-indigo-300 text-xs uppercase tracking-widest mb-1">Total Amount</p>
                                        <p className="text-xl font-bold text-indigo-400">NPR {newBooking.duration * 200}</p>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-500 font-bold tracking-wide uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={getAvailableConsoles().length === 0}
                                    >
                                        Start Session
                                    </button>
                                </form>
                            </div>

                            {/* RIGHT COLUMN: Active Sessions List (Spans 2 cols) */}
                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                    Active Sessions
                                </h3>
                                <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-zinc-400">
                                            <thead className="bg-zinc-900/50 text-zinc-200 uppercase text-xs tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4">User</th>
                                                    <th className="px-6 py-4">Console</th>
                                                    <th className="px-6 py-4">Elapsed</th>
                                                    <th className="px-6 py-4">Remaining</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {bookings.filter(b => b.status === 'active').map((booking: any) => (
                                                    <tr key={booking._id} className="hover:bg-zinc-800/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-white">{booking.userName}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs border border-zinc-700">
                                                                PS4-{booking.consoleNumber}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-green-400 font-mono">{getSessionDuration(booking.startTime)}</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-zinc-500">
                                                            {/* Simple logic for demo, ideally calculated */}
                                                            {booking.duration}h Total
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-white">NPR {booking.totalAmount}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleEndSessionClick(booking._id)}
                                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide border border-red-500/20 transition-all hover:border-red-500/50"
                                                            >
                                                                End Session
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {bookings.filter(b => b.status === 'active').length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                                            <p className="text-4xl mb-2">😴</p>
                                                            <p>No active sessions</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Add Console Section (Moved Bottom) */}
                        <div className="bg-black/20 p-6 rounded-xl border border-zinc-800 border-dashed">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-medium text-zinc-400">Inventory Management</h3>
                                    <p className="text-sm text-zinc-500">Add new units to your console fleet.</p>
                                </div>
                                <form onSubmit={handleAddConsole} className="flex gap-3 w-full md:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Console Name (e.g. PS4-5)"
                                        className="bg-zinc-900 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-zinc-600 outline-none flex-1 md:w-64"
                                        value={newConsoleName}
                                        onChange={e => setNewConsoleName(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-zinc-800 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 border border-zinc-700 font-medium transition-colors whitespace-nowrap"
                                    >
                                        + Add Unit
                                    </button>
                                </form>
                            </div>
                        </div>


                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-white">Recent Appointments</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-zinc-400">
                                <thead className="bg-zinc-800/50 text-zinc-200 uppercase">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {appointments.map((appt: any) => (
                                        <tr key={appt._id} className="hover:bg-zinc-800/30">
                                            <td className="px-6 py-4 font-medium text-white">{appt.name}</td>
                                            <td className="px-6 py-4">{new Date(appt.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs ${appt.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                                    appt.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                                        'bg-yellow-500/20 text-yellow-500'
                                                    }`}>
                                                    {appt.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 space-x-2">
                                                {appt.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleAppointmentAction(appt._id, 'approved')}
                                                            className="text-green-500 hover:text-green-400"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleAppointmentAction(appt._id, 'rejected')}
                                                            className="text-red-500 hover:text-red-400"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleConvertBooking(appt)}
                                                    className="text-indigo-500 hover:text-indigo-400"
                                                    title="Convert to Booking"
                                                >
                                                    Convert
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {appointments.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center">No appointments found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'summary' && (() => {
                    // Filter bookings based on active period
                    const now = new Date();
                    const getFilteredBookings = () => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        return bookings.filter(b => {
                            if (b.status !== 'completed') return false;
                            const bDate = new Date(b.startTime);
                            if (analyticsPeriod === 'day') {
                                return bDate >= today;
                            } else if (analyticsPeriod === 'week') {
                                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                return bDate >= weekAgo;
                            } else if (analyticsPeriod === 'month') {
                                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                                return bDate >= monthAgo;
                            }
                            return true;
                        });
                    };

                    const filteredBookings = getFilteredBookings();
                    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                    const totalDuration = filteredBookings.reduce((sum, b) => sum + (b.duration || 0), 0);
                    const avgDuration = filteredBookings.length > 0 ? (totalDuration / filteredBookings.length).toFixed(1) : 0;
                    const unpaidRevenue = filteredBookings.filter(b => !b.isPaid).reduce((sum, b) => sum + (b.totalAmount || 0), 0);


                    return (
                        <div className="space-y-6">
                            {/* Revenue Analytics */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        Revenue Analytics
                                    </h2>
                                    <div className="bg-zinc-800 p-1 rounded-lg flex space-x-1">
                                        {['day', 'week', 'month', 'all'].map(period => (
                                            <button
                                                key={period}
                                                onClick={() => setAnalyticsPeriod(period as any)}
                                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${analyticsPeriod === period
                                                    ? 'bg-indigo-600 text-white shadow-lg'
                                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                                                    }`}
                                            >
                                                {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    <div className="bg-zinc-800/50 border border-blue-500/20 p-6 rounded-xl hover:border-blue-500/40 transition-colors">
                                        <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Bookings</p>
                                        <p className="text-3xl font-bold text-white">{filteredBookings.length}</p>
                                    </div>
                                    <div className="bg-zinc-800/50 border border-green-500/20 p-6 rounded-xl hover:border-green-500/40 transition-colors">
                                        <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Revenue</p>
                                        <p className="text-3xl font-bold text-white">NPR {totalRevenue}</p>
                                    </div>
                                    <div className="bg-zinc-800/50 border border-purple-500/20 p-6 rounded-xl hover:border-purple-500/40 transition-colors">
                                        <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">Avg Duration</p>
                                        <p className="text-3xl font-bold text-white">{avgDuration}h</p>
                                    </div>
                                    <div className="bg-zinc-800/50 border border-yellow-500/20 p-6 rounded-xl hover:border-yellow-500/40 transition-colors">
                                        <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">Unpaid <span className="text-yellow-600">(Pending)</span></p>
                                        <p className="text-3xl font-bold text-white">NPR {unpaidRevenue}</p>
                                    </div>
                                </div>

                                {/* Revenue by Console (Dynamic) */}
                                <div className="bg-zinc-800/20 p-6 rounded-xl border border-zinc-700/50 mb-10">
                                    <h3 className="text-lg font-medium text-white mb-6">Console Performance</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {consoles.map((console) => {
                                            // Calculate revenue for this specific console from filtered bookings
                                            const consoleBookings = filteredBookings.filter(b => b.consoleNumber === console.consoleNumber);
                                            const consoleRevenue = consoleBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                                            const bookingCount = consoleBookings.length;

                                            return (
                                                <div key={String(console._id)} className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-700/50 flex flex-col justify-between hover:border-zinc-600 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-zinc-400 text-sm font-medium">{console.name}</span>
                                                        <span className="text-indigo-400 text-xs bg-indigo-500/10 px-2 py-0.5 rounded">{bookingCount} sessions</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-white">NPR {consoleRevenue}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {consoles.length === 0 && <p className="text-zinc-500 text-sm italic">No consoles found. Add consoles to see analytics.</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                    Detailed History
                                </h2>
                                <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-zinc-400">
                                            <thead className="bg-zinc-900/50 text-zinc-200 uppercase text-xs tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4">User</th>
                                                    <th className="px-6 py-4">Console</th>
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4">Time</th>
                                                    <th className="px-6 py-4">Duration</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Payment</th>
                                                    <th className="px-6 py-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800">
                                                {/* Show all completed bookings for history, or just filtered? Usually user wants history table to match analytics filter */}
                                                {filteredBookings.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map((booking: any) => (
                                                    <tr key={booking._id} className="hover:bg-zinc-800/30 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-white">{booking.userName}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="bg-zinc-800 px-2 py-1 rounded text-xs border border-zinc-700">PS4-{booking.consoleNumber}</span>
                                                        </td>
                                                        <td className="px-6 py-4">{new Date(booking.startTime).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 text-xs font-mono">
                                                            {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            <span className="text-zinc-600 mx-1">→</span>
                                                            {booking.endTime ? new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4">{booking.duration}h</td>
                                                        <td className="px-6 py-4 font-bold text-white">NPR {booking.totalAmount}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs border ${booking.paymentMethod === 'Cash'
                                                                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                                                : 'bg-purple-500/10 border-purple-500/30 text-purple-500'
                                                                }`}>
                                                                {booking.paymentMethod || 'Cash'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-xs">Completed</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredBookings.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                                                            No records found for this period
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {activeTab === 'hallofshame' && (
                    <div className="space-y-8">
                        {/* Add Form */}
                        <div className="bg-zinc-800/30 p-6 rounded-lg border border-zinc-700/50">
                            <h3 className="text-lg font-medium text-white mb-4">Add New Entry</h3>
                            <form onSubmit={handleCreateShame} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Game Info */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-zinc-400 mb-1">Select Game</label>
                                    <select
                                        required
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white"
                                        value={newShame.gameId}
                                        onChange={e => setNewShame({ ...newShame, gameId: e.target.value })}
                                    >
                                        <option value="">-- Select a Game --</option>
                                        {games.map(game => (
                                            <option key={String(game._id)} value={String(game._id)}>{game.name}</option>
                                        ))}
                                    </select>
                                    {games.length === 0 && (
                                        <p className="text-xs text-yellow-500 mt-1">No games found. Please add a game in the "Games" tab first.</p>
                                    )}
                                </div>

                                {/* Players */}
                                <input
                                    type="text"
                                    placeholder="Winner Name"
                                    required
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500"
                                    value={newShame.winnerName}
                                    onChange={e => setNewShame({ ...newShame, winnerName: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Loser Name"
                                    required
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500"
                                    value={newShame.loserName}
                                    onChange={e => setNewShame({ ...newShame, loserName: e.target.value })}
                                />

                                {/* Result Type */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-zinc-400 mb-1">Result Type</label>
                                    <select
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white"
                                        value={newShame.resultType}
                                        onChange={e => setNewShame({ ...newShame, resultType: e.target.value })}
                                    >
                                        <option value="Score">Score</option>
                                        <option value="KO">KO</option>
                                        <option value="Submission">Submission</option>
                                        <option value="Pinfall">Pinfall</option>
                                        <option value="TimeOut">Time Out</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {/* Conditional Score Inputs */}
                                {newShame.resultType === 'Score' && (
                                    <>
                                        <input
                                            type="number"
                                            placeholder="Winner Score"
                                            required
                                            className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500"
                                            value={newShame.scoreWinner}
                                            onChange={e => setNewShame({ ...newShame, scoreWinner: e.target.value })}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Loser Score"
                                            required
                                            className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500"
                                            value={newShame.scoreLoser}
                                            onChange={e => setNewShame({ ...newShame, scoreLoser: e.target.value })}
                                        />
                                    </>
                                )}

                                {/* Description & Roast */}
                                <input
                                    type="text"
                                    placeholder="Result Description (e.g. Round 1 KO)"
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500 md:col-span-2"
                                    value={newShame.description}
                                    onChange={e => setNewShame({ ...newShame, description: e.target.value })}
                                />
                                <textarea
                                    placeholder="Roast Message (Max 280 chars)"
                                    maxLength={280}
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500 md:col-span-2 h-20 resize-none"
                                    value={newShame.roast}
                                    onChange={e => setNewShame({ ...newShame, roast: e.target.value })}
                                />

                                {/* Paid */}
                                <div className="md:col-span-2 flex items-center space-x-4">
                                    <label className="flex items-center space-x-2 text-zinc-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newShame.isPaid}
                                            onChange={e => setNewShame({ ...newShame, isPaid: e.target.checked })}
                                            className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>Paid Entry?</span>
                                    </label>
                                    {newShame.isPaid && (
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500 w-32"
                                            value={newShame.amount}
                                            onChange={e => setNewShame({ ...newShame, amount: Number(e.target.value) })}
                                        />
                                    )}
                                </div>

                                <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-500 md:col-span-2 font-medium transition-colors">
                                    Add to Hall of Shame
                                </button>
                            </form>
                        </div>

                        {/* List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {hallOfShame.map((entry: any) => (
                                <div key={entry._id} className="bg-zinc-800 p-5 rounded-lg border border-zinc-700 flex flex-col justify-between group hover:border-indigo-500/50 transition-colors">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{entry.game.name}</span>
                                            <span className="text-xs text-zinc-500">{new Date(entry.date).toLocaleDateString()}</span>
                                        </div>

                                        <div className="flex items-center justify-between mb-3">
                                            <div className="text-center">
                                                <p className="text-green-400 font-bold">{entry.winner.name}</p>
                                                <p className="text-xs text-zinc-500">Winner</p>
                                            </div>
                                            <div className="text-xl font-bold text-zinc-600">VS</div>
                                            <div className="text-center">
                                                <p className="text-red-400 font-bold">{entry.loser.name}</p>
                                                <p className="text-xs text-zinc-500">Loser</p>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/50 rounded p-2 text-center mb-3">
                                            <p className="text-sm text-white font-medium">
                                                {entry.result.type === 'Score'
                                                    ? `${entry.result.scoreWinner} - ${entry.result.scoreLoser}`
                                                    : entry.result.type}
                                            </p>
                                            {entry.result.description && (
                                                <p className="text-xs text-zinc-400 mt-1">{entry.result.description}</p>
                                            )}
                                        </div>

                                        {entry.roast && (
                                            <p className="text-zinc-300 text-sm italic border-l-2 border-indigo-500 pl-3 my-2">
                                                "{entry.roast}"
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-700/50">
                                        {entry.paid?.isPaid && (
                                            <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded border border-yellow-500/20">
                                                Paid ${entry.paid.amount}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteShame(entry._id)}
                                            className="text-red-500 text-sm hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'games' && (
                    <div className="space-y-8">
                        {/* Add Form */}
                        <div className="bg-zinc-800/30 p-6 rounded-lg border border-zinc-700/50">
                            <h3 className="text-lg font-medium text-white mb-4">Add New Game</h3>
                            <form onSubmit={handleCreateGame} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Game Name (e.g. EA Sports FC 24)"
                                    required
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500"
                                    value={newGame.name}
                                    onChange={e => setNewGame({ ...newGame, name: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Game Key (optional, e.g. fc24)"
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500"
                                    value={newGame.key}
                                    onChange={e => setNewGame({ ...newGame, key: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Description (optional)"
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500 md:col-span-2"
                                    value={newGame.description}
                                    onChange={e => setNewGame({ ...newGame, description: e.target.value })}
                                />
                                <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-500 md:col-span-2 font-medium transition-colors">
                                    Add Game
                                </button>
                            </form>
                        </div>

                        {/* List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {games.map((game: any) => (
                                <div key={game._id} className="bg-zinc-800 p-4 rounded-lg border border-zinc-700 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{game.name}</h3>
                                        <p className="text-indigo-400 text-sm font-mono">{game.key}</p>
                                        {game.description && (
                                            <p className="text-zinc-400 mt-2 text-sm">{game.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteGame(game._id)}
                                        className="mt-4 text-red-500 text-sm hover:text-red-400 self-end"
                                    >
                                        Delete Game
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="max-w-md mx-auto">
                        <h2 className="text-xl font-semibold text-white mb-6">Create New Admin User</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white"
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-500"
                            >
                                Create User
                            </button>
                        </form>
                    </div>
                )}
            </div>
            {/* Payment Modal */}
            {
                showPaymentModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-white mb-4">Complete Session & Payment</h3>

                            <div className="mb-6">
                                <label className="block text-sm text-zinc-400 mb-2">Payment Method</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('Cash')}
                                        className={`p-3 rounded-lg border text-center transition-all ${paymentMethod === 'Cash'
                                            ? 'bg-green-500/20 border-green-500 text-green-500'
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                                            }`}
                                    >
                                        💵 Cash
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('UPI')}
                                        className={`p-3 rounded-lg border text-center transition-all ${paymentMethod === 'UPI'
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-500'
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                                            }`}
                                    >
                                        📱 Online / UPI
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowPaymentModal(false); setSelectedBookingId(null); }}
                                    className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmEndSession}
                                    className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium"
                                >
                                    Confirm Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

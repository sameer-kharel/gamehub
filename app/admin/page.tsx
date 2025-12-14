'use client';

import { useState, useEffect } from 'react';
import { IAppointment } from '@/models/Appointment';
import { IHallOfShame } from '@/models/HallOfShame';
import { IGame } from '@/models/Game';
import { IBooking } from '@/models/Booking';
import { IConsole } from '@/models/Console';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'bookings' | 'appointments' | 'hallofshame' | 'users' | 'games'>('bookings');
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [hallOfShame, setHallOfShame] = useState<IHallOfShame[]>([]);
    const [games, setGames] = useState<IGame[]>([]);
    const [bookings, setBookings] = useState<IBooking[]>([]);
    const [consoles, setConsoles] = useState<IConsole[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'week' | 'month'>('day');
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
                fetch('/api/bookings?status=active', { cache: 'no-store' }),
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

    const handleEndSession = async (bookingId: string) => {
        if (!confirm('End this session?')) return;

        try {
            const res = await fetch(`/api/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'end' }),
            });

            if (res.ok) {
                fetchBookingsData();
                showMessage('Session ended successfully', 'success');
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
            </div>

            {/* Content */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                {activeTab === 'bookings' && (
                    <div className="space-y-8">
                        {/* Console Status Cards */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">PS4 Console Status</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {consoles.map((console: any) => (
                                    <div
                                        key={console._id}
                                        className={`p-6 rounded-lg border-2 transition-all ${console.status === 'available' ? 'bg-green-500/10 border-green-500/50' :
                                            console.status === 'in-use' ? 'bg-red-500/10 border-red-500/50' :
                                                'bg-yellow-500/10 border-yellow-500/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{console.name}</h3>
                                                {console.status === 'in-use' && console.currentBookingId && (
                                                    <p className="text-xs text-indigo-400 font-medium">
                                                        👤 {console.currentBookingId.userName}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${console.status === 'available' ? 'bg-green-500 text-white' :
                                                console.status === 'in-use' ? 'bg-red-500 text-white' :
                                                    'bg-yellow-500 text-black'
                                                }`}>
                                                {console.status === 'available' ? '✓ Available' :
                                                    console.status === 'in-use' ? '🎮 In Use' :
                                                        '🔧 Maintenance'}
                                            </span>
                                        </div>
                                        {console.status === 'in-use' && console.currentBookingId && (
                                            <div className="mt-3 text-sm text-zinc-300">
                                                <p className="font-medium">Current User: {bookings.find(b => String(b._id) === String(console.currentBookingId))?.userName || 'Unknown'}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Console Section */}
                        <div className="bg-zinc-800/30 p-6 rounded-lg border border-zinc-700/50">
                            <h3 className="text-lg font-medium text-white mb-4">Add New Console</h3>
                            <form onSubmit={handleAddConsole} className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Console Name (e.g. PS4-4)"
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500 flex-1"
                                    value={newConsoleName}
                                    onChange={e => setNewConsoleName(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-500 font-medium transition-colors"
                                >
                                    Add Console
                                </button>
                            </form>
                        </div>

                        {/* Quick Add Booking Form */}
                        <div className="bg-zinc-800/30 p-6 rounded-lg border border-zinc-700/50">
                            <h3 className="text-lg font-medium text-white mb-4">🎮 Start New Session</h3>
                            <form onSubmit={handleCreateBooking} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <input
                                    type="text"
                                    placeholder="User Name"
                                    required
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500"
                                    value={newBooking.userName}
                                    onChange={e => setNewBooking({ ...newBooking, userName: e.target.value })}
                                />
                                <select
                                    required
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white"
                                    value={newBooking.consoleNumber}
                                    onChange={e => setNewBooking({ ...newBooking, consoleNumber: Number(e.target.value) })}
                                >
                                    {consoles.filter(c => c.status === 'available').map(c => (
                                        <option key={c._id} value={c.consoleNumber}>{c.name}</option>
                                    ))}
                                    {getAvailableConsoles().length === 0 && <option value="">No consoles available</option>}
                                </select>
                                <select
                                    className="bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 text-white"
                                    value={newBooking.duration}
                                    onChange={e => setNewBooking({ ...newBooking, duration: Number(e.target.value) })}
                                >
                                    <option value={0.5}>30 min - NPR 100</option>
                                    <option value={1}>1 hour - NPR 200</option>
                                    <option value={1.5}>1.5 hours - NPR 300</option>
                                    <option value={2}>2 hours - NPR 400</option>
                                    <option value={2.5}>2.5 hours - NPR 500</option>
                                    <option value={3}>3 hours - NPR 600</option>
                                </select>
                                <button
                                    type="submit"
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={getAvailableConsoles().length === 0}
                                >
                                    Start Session
                                </button>
                            </form>
                        </div>

                        {/* Active Sessions */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Active Sessions</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-zinc-400">
                                    <thead className="bg-zinc-800/50 text-zinc-200 uppercase">
                                        <tr>
                                            <th className="px-6 py-3">User</th>
                                            <th className="px-6 py-3">Console</th>
                                            <th className="px-6 py-3">Start Time</th>
                                            <th className="px-6 py-3">Duration</th>
                                            <th className="px-6 py-3">Amount</th>
                                            <th className="px-6 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {bookings.filter(b => b.status === 'active').map((booking: any) => (
                                            <tr key={booking._id} className="hover:bg-zinc-800/30">
                                                <td className="px-6 py-4 font-medium text-white">{booking.userName}</td>
                                                <td className="px-6 py-4">PS4-{booking.consoleNumber}</td>
                                                <td className="px-6 py-4">{new Date(booking.startTime).toLocaleTimeString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-green-400">{getSessionDuration(booking.startTime)}</span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-white">NPR {booking.totalAmount}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleEndSession(booking._id)}
                                                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-1 rounded text-xs font-medium transition-colors"
                                                    >
                                                        End Session
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {bookings.filter(b => b.status === 'active').length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No active sessions</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Revenue Analytics */}
                        {analytics && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-white">Revenue Analytics</h2>
                                    <div className="flex space-x-2">
                                        {['day', 'week', 'month'].map(period => (
                                            <button
                                                key={period}
                                                onClick={() => { setAnalyticsPeriod(period as any); fetchBookingsData(); }}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${analyticsPeriod === period
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                    }`}
                                            >
                                                {period.charAt(0).toUpperCase() + period.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 p-6 rounded-lg">
                                        <p className="text-blue-400 text-sm font-medium mb-1">Total Bookings</p>
                                        <p className="text-3xl font-bold text-white">{analytics.summary.totalBookings}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 p-6 rounded-lg">
                                        <p className="text-green-400 text-sm font-medium mb-1">Total Revenue</p>
                                        <p className="text-3xl font-bold text-white">NPR {analytics.summary.totalRevenue}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 p-6 rounded-lg">
                                        <p className="text-purple-400 text-sm font-medium mb-1">Avg Duration</p>
                                        <p className="text-3xl font-bold text-white">{analytics.summary.averageDuration}h</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 p-6 rounded-lg">
                                        <p className="text-yellow-400 text-sm font-medium mb-1">Unpaid Amount</p>
                                        <p className="text-3xl font-bold text-white">NPR {analytics.summary.unpaidRevenue}</p>
                                    </div>
                                </div>

                                {/* Revenue by Console */}
                                <div className="bg-zinc-800/30 p-6 rounded-lg border border-zinc-700/50">
                                    <h3 className="text-lg font-medium text-white mb-4">Revenue by Console</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {analytics.revenueByConsole.map((item: any) => (
                                            <div key={item.console} className="bg-zinc-800 p-4 rounded-lg">
                                                <p className="text-zinc-400 text-sm mb-1">{item.console}</p>
                                                <p className="text-2xl font-bold text-white mb-1">NPR {item.revenue}</p>
                                                <p className="text-xs text-zinc-500">{item.bookings} bookings</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
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
        </div>
    );
}

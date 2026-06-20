import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

interface Notification { message: string; type: string; created_at: string; }

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = () => {
      client.get(`/notifications/${user.id}`).then(r => setNotifications(r.data)).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative text-gray-300 hover:text-white">
        🔔
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-sm p-4">No notifications yet</p>
          ) : (
            notifications.map((n, i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-800 last:border-0 text-sm text-gray-300">
                {n.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

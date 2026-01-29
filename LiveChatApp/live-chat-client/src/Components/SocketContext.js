import React, { createContext, useEffect, useState } from "react";
import io from "socket.io-client";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({}); // { userId: { isOnline, lastSeen } }

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userData"));
    
    if (userData && userData.data) {
      // Create a single socket connection
      const newSocket = io("http://localhost:8080", {
        query: { userId: userData.data._id },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // When connected, notify server that this user is online
      newSocket.on("connect", () => {
        console.log("SocketProvider connected, socket id:", newSocket.id);
        newSocket.emit("user_online", userData.data._id);
      });

      // Listen for global user status changes
      newSocket.on('user_status_changed', (data) => {
        // data: { userId, isOnline, lastSeen }
        console.log('SocketProvider received user_status_changed:', data);
        setOnlineUsers((prev) => ({ ...prev, [data.userId]: { isOnline: data.isOnline, lastSeen: data.lastSeen } }));
      });

      // Initialize online users list when connecting
      newSocket.on('current_online_users', (data) => {
        // data: { userIds: [id...] }
        console.log('SocketProvider received current_online_users:', data);
        if (!data || !data.userIds) return;
        const init = {};
        data.userIds.forEach((id) => {
          init[id] = { isOnline: true };
        });
        setOnlineUsers((prev) => ({ ...prev, ...init }));
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.disconnect();
      };
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

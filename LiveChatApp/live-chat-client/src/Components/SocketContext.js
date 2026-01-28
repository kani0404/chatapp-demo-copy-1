import React, { createContext, useEffect, useState } from "react";
import io from "socket.io-client";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

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

      // When connected, add user to online list
      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        newSocket.emit("addUser", userData.data._id);
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
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

"use client";

import React, { useState, useRef } from 'react';
import styles from './websocket.module.css';

// Add this type declaration at the top of the file
declare global {
  interface Window {
    WebSocket: {
      new (url: string): WebSocket;
    };
  }
}

const WebSocket: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);

    const handleConnect = () => {
        if (!isConnected) {
            socketRef.current = new window.WebSocket('ws://api.somnipro.io/ws');

            socketRef.current.onopen = function (this: WebSocket, event: Event) {
                console.log("WebSocket connection established");
                setIsConnected(true);
            };

            socketRef.current.onclose = function (this: WebSocket, event: CloseEvent) {
                console.log("WebSocket connection closed");
                setIsConnected(false);
            };
        } else {
            socketRef.current?.close();
        }
    };

    return (
        <div className={styles.container}>
            <h1>WebSocket Demo</h1>

            <button
                onClick={handleConnect}
                className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
            >
                {isConnected ? "Disconnect" : "Connect to WebSocket"}
            </button>
        </div>
    );
};

export default WebSocket;

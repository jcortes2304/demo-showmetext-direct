import React, { useEffect, useState } from 'react';

interface CountDownProps {
    timeout: number;
    pause: boolean;
    onTimeout: () => void;
}

const CountDown: React.FC<CountDownProps> = ({ timeout, pause, onTimeout }) => {
    const [time, setTime] = useState(timeout);

    useEffect(() => {
        setTime(timeout);
    }, [timeout]);

    useEffect(() => {
        if (!pause) {
            if (time > 0) {
                const timer = setTimeout(() => {
                    setTime(time - 1);
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                onTimeout();
                setTime(timeout);
            }
        }
    }, [time, pause, onTimeout, timeout]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="flex items-center justify-center h-full">
            <div className="bg-red-500 text-white font-bold rounded-box p-1 text-1xl shadow-md">
                {formatTime(time)}
            </div>
        </div>
    );
};

export default CountDown;

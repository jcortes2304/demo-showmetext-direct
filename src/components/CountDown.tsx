import React, { useEffect, useState } from 'react';

interface CountDownProps {
    timeout: number;
    pause: boolean;
}

const CountDown: React.FC<CountDownProps> = ({ timeout, pause }) => {
    const [timeLeft, setTimeLeft] = useState(timeout);

    useEffect(() => {
        if (pause) {
            return;
        }

        if (timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [timeLeft, pause]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="flex items-center justify-center h-full">
            <div className="bg-blue-500 text-white font-bold rounded-lg p-4 text-2xl shadow-md">
                {formatTime(timeLeft)}
            </div>
        </div>
    );
};

export default CountDown;

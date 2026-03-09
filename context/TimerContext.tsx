import * as Haptics from "expo-haptics";
import React, { createContext, useContext, useEffect, useState } from "react";

interface TimerContextType {
    taskId: string | null;
    taskName: string | null;
    timeLeft: number;
    duration: number; // initial duration selected
    isActive: boolean;
    isCompleted: boolean;
    startTimer: (id: string, name: string, seconds: number) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    stopTimer: () => void;
    resetTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskName, setTaskName] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isCompleted, setIsCompleted] = useState<boolean>(false);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive && !isCompleted) {
            setIsActive(false);
            setIsCompleted(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, isCompleted]);

    const startTimer = (id: string, name: string, seconds: number) => {
        setTaskId(id);
        setTaskName(name);
        setDuration(seconds);
        setTimeLeft(seconds);
        setIsActive(true);
        setIsCompleted(false);
    };

    const pauseTimer = () => {
        setIsActive(false);
    };

    const resumeTimer = () => {
        if (timeLeft > 0) {
            setIsActive(true);
        }
    };

    const stopTimer = () => {
        setIsActive(false);
        setTaskId(null);
        setTaskName(null);
        setTimeLeft(0);
        setDuration(0);
        setIsCompleted(false);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(duration);
        setIsCompleted(false);
    };

    return (
        <TimerContext.Provider
            value={{
                taskId,
                taskName,
                timeLeft,
                duration,
                isActive,
                isCompleted,
                startTimer,
                pauseTimer,
                resumeTimer,
                stopTimer,
                resetTimer,
            }}
        >
            {children}
        </TimerContext.Provider>
    );
};

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error("useTimer must be used within a TimerProvider");
    }
    return context;
};

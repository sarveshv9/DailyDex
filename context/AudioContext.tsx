// context/AudioContext.tsx
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import React, { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { SONG_LIST } from '../constants/songs';

interface AudioContextType {
  selectedSong: number;
  setSelectedSong: (id: number) => void;
  isPlaying: boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedSong, _setSelectedSong] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const soundRef = useRef<AudioPlayer | null>(null);
  const selectedSongRef = useRef(selectedSong);

  // Set audio mode on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
        });
      } catch (error) {
        // Error handling
      }
    };
    setupAudio();
  }, []);

  // Unload sound safely on component unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
    };
  }, []);

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      soundRef.current.pause();
      soundRef.current.release();
      soundRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playSound = useCallback(async (id: number) => {
    const song = SONG_LIST.find((s) => s.id === id);
    if (!song) return;

    // Always unload previous sound when loading a new one
    if (soundRef.current) {
      try {
        soundRef.current.pause();
        soundRef.current.release();
      } catch (error) {
        // Ignore unload error
      }
      soundRef.current = null;
    }

    try {
      const player = createAudioPlayer(song.file);
      player.loop = true;
      player.play();
      soundRef.current = player;
      setIsPlaying(true);
    } catch (error) {
      setIsPlaying(false);
    }
  }, []);

  const setSelectedSong = useCallback((id: number) => {
    _setSelectedSong(id);
    selectedSongRef.current = id;

    if (id === 0) {
      stopSound();
    } else {
      playSound(id);
    }
  }, [playSound, stopSound]);

  const value = useMemo(() => ({
    selectedSong,
    setSelectedSong,
    isPlaying
  }), [selectedSong, setSelectedSong, isPlaying]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
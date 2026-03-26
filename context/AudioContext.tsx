// context/AudioContext.tsx
import { Audio } from 'expo-av';
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

  const soundRef = useRef<Audio.Sound | null>(null);
  const selectedSongRef = useRef(selectedSong);

  // Set audio mode on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
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
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
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
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (error) {
        // Ignore unload error
      }
      soundRef.current = null;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        song.file,
        { 
          shouldPlay: true, 
          isLooping: true,
          progressUpdateIntervalMillis: 500,
          positionMillis: 0,
        },
        (status) => {
          if (!status.isLoaded && 'error' in status) {
            // Silently handle error
          }
        }
      );
      soundRef.current = sound;
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
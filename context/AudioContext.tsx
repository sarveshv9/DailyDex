// context/AudioContext.tsx
import { Audio } from 'expo-av';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
        console.log('✅ Audio mode configured');
      } catch (error) {
        console.error('❌ Error setting audio mode:', error);
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

  const playSound = async (id: number) => {
    const song = SONG_LIST.find((s) => s.id === id);
    if (!song) {
      console.error('❌ Song not found:', id);
      return;
    }

    console.log('🎵 Attempting to load song:', song.title);
    console.log('📂 File source:', JSON.stringify(song.file, null, 2));

    // Always unload previous sound when loading a new one
    if (soundRef.current) {
      console.log('🔄 Unloading previous sound');
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.log('Note: Error unloading previous sound (this is okay)', error);
      }
      soundRef.current = null;
    }

    try {
      // More lenient audio loading options
      const { sound } = await Audio.Sound.createAsync(
        song.file,
        { 
          shouldPlay: true, 
          isLooping: true,
          // Add these options for better compatibility
          progressUpdateIntervalMillis: 500,
          positionMillis: 0,
        },
        // Status update callback
        (status) => {
          if (!status.isLoaded && 'error' in status) {
            console.error('❌ Playback error:', status.error);
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      console.log('✅ Successfully loaded and playing:', song.title);
    } catch (error) {
      console.error('❌ Error loading audio for song:', song.title);
      console.error('❌ Error details:', error);
      console.error('❌ File that failed:', JSON.stringify(song.file, null, 2));
      setIsPlaying(false);
      
      // More helpful error message
      console.error('💡 Suggestions:');
      console.error('   1. Check if the MP3 file is corrupted');
      console.error('   2. Try re-encoding the file with: ffmpeg -i input.mp3 -acodec libmp3lame -ar 44100 -ab 192k output.mp3');
      console.error('   3. Verify the file exists at the correct path');
    }
  };

  const stopSound = async () => {
    if (soundRef.current) {
      console.log('⏹️ Stopping sound');
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
  };

  const setSelectedSong = (id: number) => {
    console.log('🎵 setSelectedSong called with id:', id);
    _setSelectedSong(id);
    selectedSongRef.current = id;

    if (id === 0) {
      stopSound();
    } else {
      playSound(id);
    }
  };

  return (
    <AudioContext.Provider value={{ selectedSong, setSelectedSong, isPlaying }}>
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
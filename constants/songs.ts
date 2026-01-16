// constants/songs.ts

const songData = [
  { id: 1, title: 'Title Screen', file: 'Title Screen.mp3' },
  { id: 2, title: 'Route 1', file: 'Route 1.mp3' },
  { id: 3, title: 'Opening Movie', file: 'Opening Movie.mp3' },
  { id: 4, title: 'Pallet Town', file: 'Pallet Town.mp3' },
  { id: 5, title: 'Pokemon Center', file: 'Pokemon Center.mp3' },
  { id: 6, title: 'Pokemon Gym', file: 'Pokemon Gym.mp3' },
  { id: 7, title: 'Viridian City', file: 'Viridian City.mp3' },
  { id: 8, title: 'Victory Road', file: 'Victory Road.mp3' },
  { id: 9, title: 'Ending Theme', file: 'Ending Theme.mp3' },
  { id: 10, title: 'Littleroot Town', file: 'LittlerootTown.mp3' }
];

export const SONG_LIST = songData.map((song) => {
  // NOTE: We removed the "if (Platform.OS === 'web')" block.
  // We now let the 'require' logic below handle Web as well. 
  // This ensures the bundler processes the file and resolves the correct path 
  // so you don't get 404 errors.

  try {
    let audioFile;
    
    switch (song.id) {
      case 1:
        audioFile = require('../app/assets/audio/Title Screen.mp3');
        break;
      case 2:
        audioFile = require('../app/assets/audio/Route 1.mp3');
        break;
      case 3:
        audioFile = require('../app/assets/audio/Opening Movie.mp3');
        break;
      case 4:
        audioFile = require('../app/assets/audio/Pallet Town.mp3');
        break;
      case 5:
        audioFile = require('../app/assets/audio/Pokemon Center.mp3');
        break;
      case 6:
        audioFile = require('../app/assets/audio/Pokemon Gym.mp3');
        break;
      case 7:
        audioFile = require('../app/assets/audio/Viridian City.mp3');
        break;
      case 8:
        audioFile = require('../app/assets/audio/Victory Road.mp3');
        break;
      case 9:
        audioFile = require('../app/assets/audio/Ending Theme.mp3');
        break;
      case 10:
        // Ensure this filename matches your file on disk exactly (case-sensitive)
        audioFile = require('../app/assets/audio/LittlerootTown.mp3');
        break;  
      default:
        audioFile = require('../app/assets/audio/Title Screen.mp3');
    }
    
    // On Web, 'require' returns a URI or module ID that Expo Audio handles automatically
    return { ...song, file: audioFile };

  } catch (error) {
    console.error(`❌ Failed to load module for song ${song.id}: ${song.title}`, error);
    // Return a fallback
    return { ...song, file: require('../app/assets/audio/Title Screen.mp3') };
  }
});
export const API_BASE = import.meta.env.VITE_API_URL || 'https://chord-j7vn.onrender.com/api';

export const defaultPrefs = {
  artists: [],
  genres: [],
  interests: [],
  languages: ['Hindi', 'English']
};

export const artistsList = [
  'Arijit Singh', 'Taylor Swift', 'The Weeknd', 'Ed Sheeran', 'Drake', 
  'Badshah', 'Diljit Dosanjh', 'Justin Bieber', 'Billie Eilish', 'AR Rahman',
  'Bruno Mars', 'Shreya Ghoshal', 'Atif Aslam', 'Dua Lipa', 'Post Malone',
  'Sonu Nigam', 'Kishore Kumar', 'Lata Mangeshkar', 'Kumar Sanu', 'Alka Yagnik',
  'Udit Narayan', 'Neha Kakkar', 'Jubin Nautiyal', 'Darshan Raval', 'Guru Randhawa',
  'Honey Singh', 'Eminem', 'Rihanna', 'Beyonce', 'Adele',
  'Katy Perry', 'Ariana Grande', 'Selena Gomez', 'Shawn Mendes', 'Charlie Puth',
  'Harry Styles', 'Zayn Malik', 'Sia', 'David Guetta', 'Calvin Harris',
  'Karan Aujla', 'Sidhu Moose Wala', 'AP Dhillon', 'Divine', 'Krsna',
  'Armaan Malik', 'Mika Singh', 'Sunidhi Chauhan', 'Shaan', 'KK',
  'Coldplay', 'Imagine Dragons', 'Maroon 5', 'One Direction', 'BTS',
  'Blackpink', 'Alan Walker', 'Marshmello', 'Martin Garrix', 'DJ Snake'
];

export const genresList = [
  { name: 'Pop', color: '#ec4899' },
  { name: 'Hip Hop', color: '#f97316' },
  { name: 'Rock', color: '#ef4444' },
  { name: 'Lo-Fi', color: '#8b5cf6' },
  { name: 'Classical', color: '#eab308' },
  { name: 'Electronic', color: '#06b6d4' },
  { name: 'Indie', color: '#14b8a6' },
  { name: 'R&B', color: '#f43f5e' },
  { name: 'Jazz', color: '#6366f1' },
  { name: 'Country', color: '#84cc16' }
];

export const interestsList = [
  'Discover new', 'Love olds', 'Workout', 'Study & Focus', 'Party', 'Chill / Relax', 'Travel / Drive'
];

export const languagesList = [
  'Hindi', 'English', 'Spanish', 'Bengali', 'Punjabi', 'Tamil', 'Telugu', 'Korean', 'French', 'Japanese'
];

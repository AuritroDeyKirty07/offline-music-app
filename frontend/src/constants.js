export const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  ? `http://${window.location.hostname}:5000/api`
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

export const defaultPrefs = {
  artists: [],
  genres: [],
  interests: [],
  languages: ['Hindi', 'English']
};

export const artistsList = [
  'Karan Aujla', 'Shubh', 'Cheema Y', 'Sidhu Moose Wala', 'Diljit Dosanjh', 'AP Dhillon',
  'Arijit Singh', 'Taylor Swift', 'The Weeknd', 'Ed Sheeran', 'Drake', 'Bruno Mars',
  'Shreya Ghoshal', 'Atif Aslam', 'Dua Lipa', 'Post Malone', 'Sonu Nigam', 'Anuv Jain',
  'Seedhe Maut', 'KR$NA', 'Divine', 'Badshah', 'Honey Singh', 'Pritam', 'Vishal Mishra',
  'Darshan Raval', 'Guru Randhawa', 'Justin Bieber', 'Billie Eilish', 'AR Rahman',
  'Charlie Puth', 'Harry Styles', 'Zayn Malik', 'Travis Scott', 'Kendrick Lamar', 'Olivia Rodrigo',
  'Eminem', 'Rihanna', 'Adele', 'Katy Perry', 'Ariana Grande', 'Selena Gomez',
  'Coldplay', 'Imagine Dragons', 'Alan Walker', 'Marshmello', 'Martin Garrix', 'DJ Snake',
  'Masoom Sharma', 'Gulzaar Chhaniwala', 'Renuka Panwar', 'Bad Bunny', 'BTS', 'BLACKPINK'
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

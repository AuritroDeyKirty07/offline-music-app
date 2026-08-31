const ytSearch = require('yt-search');
const fs = require('fs');

const artistsList = [
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

async function run() {
    const map = {};
    const batchSize = 5;
    for (let i = 0; i < artistsList.length; i += batchSize) {
        const batch = artistsList.slice(i, i + batchSize);
        const promises = batch.map(async (a) => {
            try {
                // Improve search accuracy for artists
                let query = a + ' official artist channel';
                if (a === 'KK') query = 'KK singer india official';
                
                const r = await ytSearch(query);
                if (r.channels && r.channels.length > 0) {
                    map[a] = r.channels[0].thumbnail;
                } else {
                    map[a] = `https://ui-avatars.com/api/?name=${encodeURIComponent(a)}&background=random`;
                }
            } catch(e) {
                map[a] = `https://ui-avatars.com/api/?name=${encodeURIComponent(a)}&background=random`;
            }
        });
        await Promise.all(promises);
        console.log(`Fetched batch ${i/batchSize + 1}`);
    }
    fs.writeFileSync('artistImages.json', JSON.stringify(map, null, 2));
    console.log('Done!');
}
run();

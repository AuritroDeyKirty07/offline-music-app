const fs = require('fs'); 
const path = require('path'); 
const { execSync } = require('child_process'); 
const dir = path.join(__dirname, 'downloads'); 
const dbFile = path.join(__dirname, 'db.json'); 
const ffmpeg = 'C:\\Users\\KIRTY\\Downloads\\ffmpeg-8.1.2-full_build\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe'; 

const files = fs.readdirSync(dir); 
let db = JSON.parse(fs.readFileSync(dbFile, 'utf8')); 

files.forEach(file => { 
    if (file.endsWith('.webm')) { 
        const base = file.replace('.webm', ''); 
        const mp3 = base + '.mp3'; 
        console.log('Converting', file); 
        try { 
            execSync(`"${ffmpeg}" -y -i "${path.join(dir, file)}" -q:a 0 -map a "${path.join(dir, mp3)}"`); 
            fs.unlinkSync(path.join(dir, file)); 
            
            // Update db.json
            const idMatch = file.match(/ - ([a-zA-Z0-9_-]{11})\.webm$/); 
            if (idMatch) { 
                const s = db.find(s => s.id === idMatch[1]); 
                if (s) {
                    s.fileExt = mp3; 
                }
            } 
        } catch(e) { 
            console.error('Failed', file, e.message); 
        } 
    } 
}); 
fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); 
console.log('Done');

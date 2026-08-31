const path = require('path');
const sharp = require('sharp');

async function generate() {
    const assetsDir = path.resolve(__dirname, '../mobile/assets/images');

    // 1. App Icon SVG (1024x1024)
    // Dark background #09090b, White squircle in center, Black Music2 icon inside
    const iconSvg = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" rx="240" fill="#09090b"/>
      <rect x="180" y="180" width="664" height="664" rx="160" fill="#ffffff"/>
      <g transform="translate(512, 512) scale(20) translate(-12, -12)">
        <circle cx="8" cy="18" r="4" fill="#09090b"/>
        <path d="M12 18V2l7 4" stroke="#09090b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
    </svg>
    `);

    // 2. Android Adaptive Foreground (transparent background, centered white squircle with black Music2)
    const foregroundSvg = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect x="240" y="240" width="544" height="544" rx="130" fill="#ffffff"/>
      <g transform="translate(512, 512) scale(16) translate(-12, -12)">
        <circle cx="8" cy="18" r="4" fill="#09090b"/>
        <path d="M12 18V2l7 4" stroke="#09090b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
    </svg>
    `);

    // 3. Android Adaptive Background (solid #09090b)
    const backgroundSvg = Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#09090b"/>
    </svg>
    `);

    // 4. Splash Icon (512x512)
    const splashSvg = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect x="96" y="96" width="320" height="320" rx="75" fill="#ffffff"/>
      <g transform="translate(256, 256) scale(10) translate(-12, -12)">
        <circle cx="8" cy="18" r="4" fill="#09090b"/>
        <path d="M12 18V2l7 4" stroke="#09090b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
    </svg>
    `);

    console.log('Rendering icon.png (1024x1024)...');
    await sharp(iconSvg).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon.png'));

    console.log('Rendering android-icon-foreground.png (1024x1024)...');
    await sharp(foregroundSvg).resize(1024, 1024).png().toFile(path.join(assetsDir, 'android-icon-foreground.png'));

    console.log('Rendering android-icon-background.png (1024x1024)...');
    await sharp(backgroundSvg).resize(1024, 1024).png().toFile(path.join(assetsDir, 'android-icon-background.png'));

    console.log('Rendering splash-icon.png (512x512)...');
    await sharp(splashSvg).resize(512, 512).png().toFile(path.join(assetsDir, 'splash-icon.png'));

    console.log('Rendering favicon.png (48x48)...');
    await sharp(iconSvg).resize(48, 48).png().toFile(path.join(assetsDir, 'favicon.png'));

    console.log('✅ ALL APP ICONS GENERATED SUCCESSFULLY!');
}

generate().catch(err => {
    console.error('Icon generation failed:', err);
    process.exit(1);
});
// Pure JavaScript DES ECB Decryption for JioSaavn encrypted media URLs
const pc1 = [57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4];
const pc2 = [14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32];
const ip = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];
const fp = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25];
const sBoxes = [
  [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
  [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
  [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
  [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
  [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
  [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
  [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
  [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]
];
const shifts = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1];

function getBits(bytes) {
  const bits = [];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 7; j >= 0; j--) bits.push((bytes[i] >> j) & 1);
  }
  return bits;
}
function bitsToBytes(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0);
    bytes.push(b);
  }
  return bytes;
}
function permute(bits, table) {
  return table.map(idx => bits[idx - 1]);
}
function generateSubkeys(keyBytes) {
  const keyBits = permute(getBits(keyBytes), pc1);
  let c = keyBits.slice(0, 28);
  let d = keyBits.slice(28, 56);
  const subkeys = [];
  for (let i = 0; i < 16; i++) {
    const shift = shifts[i];
    c = c.slice(shift).concat(c.slice(0, shift));
    d = d.slice(shift).concat(d.slice(0, shift));
    subkeys.push(permute(c.concat(d), pc2));
  }
  return subkeys;
}
function f(r, k) {
  const e = [32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1];
  const p = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25];
  const er = permute(r, e);
  const x = er.map((b, i) => b ^ k[i]);
  const sOut = [];
  for (let i = 0; i < 8; i++) {
    const b = x.slice(i * 6, (i + 1) * 6);
    const row = (b[0] << 1) | b[5];
    const col = (b[1] << 3) | (b[2] << 2) | (b[3] << 1) | b[4];
    const val = sBoxes[i][(row << 4) | col];
    for (let j = 3; j >= 0; j--) sOut.push((val >> j) & 1);
  }
  return permute(sOut, p);
}
function decryptBlock(blockBits, subkeys) {
  const ipBits = permute(blockBits, ip);
  let l = ipBits.slice(0, 32);
  let r = ipBits.slice(32, 64);
  for (let i = 15; i >= 0; i--) {
    const newL = r;
    const fVal = f(r, subkeys[i]);
    r = l.map((b, idx) => b ^ fVal[idx]);
    l = newL;
  }
  return permute(r.concat(l), fp);
}

function b64Decode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = [];
  let buffer = 0, bits = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '=') break;
    const val = chars.indexOf(c);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }
  return output;
}

export const decryptMediaUrl = (base64Enc, keyStr = '38346591') => {
  if (!base64Enc) return null;
  try {
    const raw = b64Decode(base64Enc);
    const keyBytes = Array.from(keyStr).map(c => c.charCodeAt(0));
    const subkeys = generateSubkeys(keyBytes);
    const outBytes = [];
    for (let i = 0; i < raw.length; i += 8) {
      const chunk = raw.slice(i, i + 8);
      if (chunk.length < 8) break;
      const bits = getBits(chunk);
      const decBits = decryptBlock(bits, subkeys);
      outBytes.push(...bitsToBytes(decBits));
    }
    const pad = outBytes[outBytes.length - 1];
    const trimmed = (pad > 0 && pad <= 8) ? outBytes.slice(0, outBytes.length - pad) : outBytes;
    return String.fromCharCode(...trimmed);
  } catch (e) {
    return null;
  }
};

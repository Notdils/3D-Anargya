# Motion Anargya — Electric Kart 3D & Minigame

## Setup & Menjalankan

### 1. Prasyarat
- **Node.js 18.18 atau lebih baru** (disarankan 20/22/24). Cek: `node -v`
- **Git**. Cek: `git --version`

### 2. Clone & install
```bash
git clone https://github.com/Notdils/3D-Anargya.git
cd 3D-Anargya
npm install
```

### 3. Jalankan (development)
```bash
npm run dev
```
Buka **http://localhost:5173** (landing page) dan **http://localhost:5173/game.html** (minigame).

### 4. Buka dari HP / perangkat lain di WiFi yang sama
```bash
npm run dev -- --host
```
Buka alamat **Network** yang muncul di terminal (contoh `http://192.168.1.5:5173`) dari perangkat lain.
- Jika muncul pertanyaan Windows Firewall, pilih **Allow** untuk *Private networks*.
- Pastikan profil WiFi di Windows = **Private** (*Settings → Network & internet → Wi-Fi → Network profile type*).
- WiFi kampus/publik sering memblokir koneksi antar-perangkat. Solusinya: pakai hotspot HP.

### 5. Build production
```bash
npm run build      # hasil di folder dist/
npm run preview    # cek hasil build di http://localhost:4173 (tambah -- --host untuk akses dari HP)
```

### 6. Deploy ke Vercel
1. Push repository ke GitHub.
2. Di [vercel.com](https://vercel.com): **Add New → Project → Import** repository ini.
3. Vercel otomatis mengenali Vite (Build Command `npm run build`, Output Directory `dist`). Klik **Deploy**.
4. Setiap `git push` ke branch `main` akan otomatis di-deploy ulang.

### Perintah
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server (hot reload), port 5173 |
| `npm run build` | Cek TypeScript + build production ke `dist/` |
| `npm run preview` | Menjalankan hasil build, port 4173 |

### Troubleshooting
| Masalah | Solusi |
|---|---|
| `'vite' is not recognized` | `npm install` belum selesai/gagal. Jalankan ulang sampai tanpa `npm error` |
| Port 5173 dipakai | `npm run dev -- --port 5174` |
| Loading screen tidak muncul lagi | Normal: hanya sekali per sesi. Tutup tab lalu buka tab baru |
| Ingin menghapus best lap & ghost | DevTools → Application → Local Storage → hapus key `anargya-best-its-*` dan `anargya-ghost-its-*` |

## Tentang

Website hackathon **Anargya ITS EV Team**: landing page dengan model 3D low-poly kart listrik yang terus berputar, dan minigame balap satu lap di sirkuit ITS memakai kart yang sama.

Aset foto diambil di sirkuit ITS, 31 Oktober 2026.

| | |
|---|---|
| **Stack** | Vite 6 + TypeScript + Three.js (tanpa framework) |
| **Halaman** | `/` landing page · `/game.html` minigame |
| **Backend** | Tidak ada. Best lap disimpan di `localStorage` browser |

## Fitur

**Landing page (`index.html`, `src/main.ts`, `src/loader.ts`)**
- Loading screen speedometer 0–100 (jarum mengikuti progress loading, minimal 3 detik), sekali per sesi browser
- Hero dengan kart 3D yang berputar otomatis, bisa diputar manual dengan drag (OrbitControls, zoom dimatikan)
- Render berhenti saat hero tidak terlihat di layar (hemat baterai), rotasi otomatis mati jika `prefers-reduced-motion`
- Section About, Inside the Kart (4 komponen + foto asli), Gallery, CTA ke game
- Responsif: desktop, tablet, mobile

**Minigame (`game.html`, `src/game.ts`)**
- Lintasan = **sirkuit ITS**, dijiplak dari citra satelit Google Maps (±1 km per lap)
- 1 lap (ubah `LAPS`), countdown 3-2-1-GO, timer, best lap tersimpan di perangkat
- **Ghost car**: lap terbaik direkam (posisi tiap 50 ms) dan diputar ulang sebagai kendaraan hijau transparan di balapan berikutnya. Disimpan per kendaraan di `localStorage`
- Kontrol: `W`/`↑` gas, `S`/`↓` rem/mundur, `A` `D` / `←` `→` belok. Di HP muncul tombol sentuh
- Keluar lintasan (ke rumput) = kecepatan maksimum turun
- Lap hanya dihitung jika melewati 2 checkpoint (tidak bisa potong jalan atau mundur melewati garis)
- HUD: lap, waktu, best lap, kecepatan km/h, minimap

**Model kart (`src/kart.ts`)**
- Dibuat dari kode (primitif Three.js), bukan file 3D, berdasarkan foto: side pod oranye-putih-hitam, nose, steering cowl, setir merah + layar, kotak aluminium (kiri), kotak putih elektro-ITS + tombol darurat, radiator + selang hijau (kanan belakang), bumper belakang
- Ukuran memakai patokan kart standar (±1,8 m), belum diukur langsung

**Mobil F1 (opsional, `src/vehicles.ts`)**
- Di layar awal game bisa memilih *Anargya EV Kart* (default) atau *F1 Car*. File F1 (`public/models/f1.glb`, ±1,6 MB) baru diunduh saat dipilih; jika gagal dimuat, game kembali memakai kart
- Model F1 berasal dari file 3D pihak ketiga (McLaren MP4/5). Livery asli yang penuh logo sponsor (termasuk merek rokok) **sudah diganti** warna Anargya hijau-hitam, tekstur dikecilkan ke WebP, dan jumlah polygon dikurangi (37 MB → 1,6 MB)
- Roda F1 berputar dan setir ikut belok, tapi ban depan tidak ikut berbelok (di file aslinya kedua roda depan menyatu jadi satu objek)

## Struktur

```
├── index.html          # landing page
├── game.html           # minigame
├── public/img/         # foto dari sirkuit (webp) + logo
├── public/models/      # f1.glb
├── src/
│   ├── kart.ts         # model 3D kart (dipakai di landing & game)
│   ├── vehicles.ts     # kendaraan game: kart & F1 (memuat .glb)
│   ├── main.ts         # scene hero landing page
│   ├── loader.ts       # loading screen speedometer
│   ├── game.ts         # lintasan, fisika sederhana, lap timer, HUD, kontrol
│   ├── style.css       # gaya umum
│   └── game.css        # HUD & layar game
└── vite.config.ts      # konfigurasi 2 halaman
```

## Mengubah

| Yang diubah | Lokasi |
|---|---|
| Bentuk lintasan | `MAP_PX` di `src/game.ts` (titik piksel dari peta, dikali `M_PER_PX` jadi meter) |
| Jumlah lap, kecepatan, kemudi | Konstanta di atas `src/game.ts` (`LAPS`, `MAX_SPEED`, `STEER_RATE`, ...) |
| Warna/bentuk kart | `src/kart.ts` |
| Teks & foto | `index.html` |

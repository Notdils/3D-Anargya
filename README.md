# Motion Anargya — Electric Kart 3D & Minigame

Website hackathon **Anargya ITS EV Team**: landing page dengan model 3D low-poly kart listrik yang terus berputar, dan minigame balap 3 lap memakai kart yang sama.

Aset foto diambil di sirkuit ITS, 31 Oktober 2026.

| | |
|---|---|
| **Stack** | Vite 6 + TypeScript + Three.js (tanpa framework) |
| **Halaman** | `/` landing page · `/game.html` minigame |
| **Backend** | Tidak ada. Best lap disimpan di `localStorage` browser |

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
```

Build production (hasil di folder `dist/`, bisa di-upload ke Vercel/Netlify/GitHub Pages sebagai situs statis):

```bash
npm run build
npm run preview
```

## Fitur

**Landing page (`index.html`, `src/main.ts`)**
- Hero dengan kart 3D yang berputar otomatis, bisa diputar manual dengan drag (OrbitControls, zoom dimatikan)
- Render berhenti saat hero tidak terlihat di layar (hemat baterai), rotasi otomatis mati jika `prefers-reduced-motion`
- Section About, Inside the Kart (4 komponen + foto asli), Gallery, CTA ke game
- Responsif: desktop, tablet, mobile

**Minigame (`game.html`, `src/game.ts`)**
- 3 lap, countdown 3-2-1-GO, timer per lap, best lap tersimpan di perangkat
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
- Lisensi model belum dicek: aman untuk proof of concept, tapi cek sumbernya sebelum dipublikasikan
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
│   ├── game.ts         # lintasan, fisika sederhana, lap timer, HUD, kontrol
│   ├── style.css       # gaya umum
│   └── game.css        # HUD & layar game
└── vite.config.ts      # konfigurasi 2 halaman
```

## Mengubah

| Yang diubah | Lokasi |
|---|---|
| Bentuk lintasan | `CONTROL` di `src/game.ts` (titik x, z dalam meter, lintasan tertutup) |
| Jumlah lap, kecepatan, kemudi | Konstanta di atas `src/game.ts` (`LAPS`, `MAX_SPEED`, `STEER_RATE`, ...) |
| Warna/bentuk kart | `src/kart.ts` |
| Teks & foto | `index.html` |

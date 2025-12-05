# Auto Panel Pterodactyl + QRIS (Pakasir)

Struktur:
- `frontend/` — HTML, CSS, JS (UI ala DigitalOcean, tombol hijau ala Tokopedia)
- `backend/` — handler Node.js untuk Vercel (API `/api/order` dan `/api/order-status`)
- `pakasir/` — integrasi ke Pakasir dan Pterodactyl (config, pakasir.js, ptero.js)
- `vercel.json` — config deploy ke Vercel

Harga paket:
- 1GB – Rp 1.000/bulan
- 2GB – Rp 2.000/bulan
- ...
- 10GB – Rp 10.000/bulan
- Unlimited – Rp 11.000/bulan

Nomor WhatsApp user tidak diminta. Di header & di keterangan pembayaran/server ada info:
hubungi owner di WhatsApp: https://wa.me/6281239977516.

## Cara Pakai (lokal)

1. Install dependency:
   ```bash
   npm install
   ```

2. Set environment variable (disarankan di Vercel Dashboard):
   - `PAKASIR_PROJECT`
   - `PAKASIR_API_KEY`
   - `PTERO_DOMAIN`
   - `PTERO_API_KEY`
   - `PTERO_EGG`
   - `PTERO_NEST_ID`
   - `PTERO_LOC`

3. Deploy ke Vercel dengan meng-upload folder ini sebagai project.

Front-end akan call:
- `POST /api/order` → generate QRIS (via Pakasir) berdasarkan paket.
- `GET /api/order-status?orderId=...` → cek status pembayaran (via Pakasir) dan auto-create server di Pterodactyl.

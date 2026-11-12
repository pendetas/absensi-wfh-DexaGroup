# Backend Sistem Absensi WFH

API gateway dan tiga microservice NestJS (auth, employee, attendance).

Cara menjalankan, arsitektur, daftar API, dan akun untuk mencoba ada di [README utama](../README.md).

Perintah yang sering dipakai, dijalankan di folder ini:

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan gateway dan ketiga layanan dalam mode pengembangan |
| `npm run db:setup` | Menjalankan migration lalu mengisi data contoh |
| `npm run db:migrate` | Menjalankan migration saja |
| `npm run db:seed` | Mengisi atau mengembalikan data contoh |
| `npm test` | Unit test |
| `npm run test:e2e` | Test end-to-end (butuh MySQL) |
| `npm run build` | Build keempat aplikasi ke `dist/` |
| `npm run lint` | Pemeriksaan kode |

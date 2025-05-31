# Summarization API

> **Summarization API** adalah backend aplikasi berbasis Express dan Prisma yang menyediakan layanan autentikasi pengguna dan penyimpanan hasil ringkasan teks.  
> API ini dirancang untuk berintegrasi dengan frontend (misalnya React) dan mendukung login, register, logout, serta penyimpanan dan pengambilan hasil ringkasan berbasis AI.

---

## 🚀 Fitur Utama

### 🔐 Autentikasi
- **Register** akun baru menggunakan email, password, dan nama.
- **Login** menggunakan email dan password, menghasilkan token JWT yang disimpan dalam cookie.
- **Logout** untuk menghapus token dan mengakhiri sesi.
- **Profile** untuk mendapatkan informasi user yang sedang login.

### 📝 Ringkasan Teks (Summarization)
- **POST teks** yang ingin diringkas dan simpan hasil ringkasannya ke database.
- **GET semua ringkasan** milik user yang sedang login.
- **GET ringkasan tertentu** berdasarkan ID-nya.

### 🛡️ Keamanan
- Token JWT digunakan sebagai metode autentikasi.
- Password disimpan dengan hashing menggunakan bcrypt.
- Middleware `authenticateToken` digunakan untuk melindungi endpoint sensitif.

---

## 🧰 Teknologi yang Digunakan

- **Backend**: Node.js + Express  
- **ORM**: Prisma  
- **Database**: PostgreSQL / MySQL *(tergantung konfigurasi Prisma)*  
- **Authentication**: JWT + Bcrypt  
- **Middleware**: `cookie-parser`, `dotenv`, `cors`  
- **Frontend yang terhubung**: React (`http://localhost:5173`)

---

## 🛠️ Instalasi & Penggunaan Lokal

### 1. Clone Repository

```bash
git clone https://github.com/username/summarization-api.git
cd summarization-api
```

### 2. Install Dependencies

```bash
npm install
```

### 4. Setup Prisma & Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

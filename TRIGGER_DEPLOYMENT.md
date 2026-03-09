# Cara Trigger Vercel Deployment

**Status**: Perubahan sudah di-push ke GitHub (commit: 86d6044dca)  
**Issue**: Vercel tidak auto-deploy

---

## 🚀 Cara 1: Trigger dari Vercel Dashboard (Paling Mudah)

1. Buka Vercel Dashboard: https://vercel.com/dashboard
2. Pilih project Anda
3. Klik tab **"Deployments"**
4. Cari deployment terakhir
5. Klik tombol **"..."** (three dots) di sebelah kanan
6. Pilih **"Redeploy"**
7. Centang **"Use existing Build Cache"** (optional, untuk lebih cepat)
8. Klik **"Redeploy"**

Deployment akan dimulai dan selesai dalam 2-3 menit.

---

## 🚀 Cara 2: Trigger dengan Git Push Kosong

Jika cara 1 tidak berhasil, trigger deployment dengan push kosong:

```bash
# Buat commit kosong untuk trigger deployment
git commit --allow-empty -m "chore: trigger Vercel deployment"

# Push ke GitHub
git push origin main
```

Vercel akan otomatis detect push baru dan mulai deployment.

---

## 🚀 Cara 3: Cek Vercel Git Integration

Pastikan Vercel terhubung dengan GitHub:

1. Buka Vercel Dashboard
2. Pilih project Anda
3. Klik **"Settings"**
4. Klik **"Git"** di sidebar
5. Pastikan:
   - ✅ Repository terhubung
   - ✅ Production Branch: `main`
   - ✅ Auto-deploy enabled

Jika tidak terhubung:
- Klik **"Connect Git Repository"**
- Pilih repository Anda
- Authorize Vercel

---

## 🔍 Cek Status Deployment

### Dari Vercel Dashboard

1. Buka: https://vercel.com/dashboard
2. Pilih project Anda
3. Lihat status deployment:
   - 🟢 **Ready** = Deployment berhasil
   - 🟡 **Building** = Sedang build
   - 🔴 **Error** = Ada error

### Dari Git

```bash
# Cek commit terakhir
git log --oneline -3

# Output yang diharapkan:
# 2459243751 docs: add legal pages update documentation
# 86d6044dca feat: enhance company branding on legal pages
# 45a7c1b1b4 docs: add Meta verification guides
```

---

## 🐛 Troubleshooting

### Issue: Deployment Tidak Muncul di Vercel

**Kemungkinan Penyebab**:
1. Git integration tidak aktif
2. Branch salah (bukan `main`)
3. Vercel sedang maintenance
4. Build error (cek logs)

**Solusi**:
1. Cek Git integration di Settings → Git
2. Pastikan push ke branch `main`
3. Coba redeploy manual dari dashboard
4. Cek build logs untuk error

### Issue: Build Error

**Cek Logs**:
1. Buka deployment yang error
2. Klik **"View Build Logs"**
3. Cari error message (biasanya di bagian bawah)

**Common Errors**:
- **Module not found**: Run `npm install` locally
- **Type error**: Run `npm run build` locally untuk test
- **Environment variable missing**: Cek Settings → Environment Variables

### Issue: Deployment Success tapi Perubahan Tidak Muncul

**Kemungkinan**:
1. Browser cache - Tekan `Ctrl+Shift+R` (hard refresh)
2. CDN cache - Tunggu 5-10 menit
3. Wrong URL - Pastikan URL production benar

**Solusi**:
```bash
# Hard refresh di browser
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Atau buka incognito/private mode
```

---

## ✅ Verifikasi Deployment Berhasil

Setelah deployment selesai, test halaman ini:

### 1. Privacy Policy
```
https://your-domain.vercel.app/privacy-policy
```

**Yang harus terlihat**:
- ✅ Banner biru dengan "BANGUN JAYA TRANSINDO" di atas
- ✅ Footer gelap dengan 3 kolom di bawah
- ✅ Nama perusahaan dalam bold di footer

### 2. Terms of Service
```
https://your-domain.vercel.app/terms-of-service
```

**Yang harus terlihat**:
- ✅ Banner biru dengan "BANGUN JAYA TRANSINDO" di atas
- ✅ Footer gelap dengan 3 kolom di bawah
- ✅ Nama perusahaan dalam bold di footer

### 3. About Us
```
https://your-domain.vercel.app/about
```

**Yang harus terlihat**:
- ✅ Banner biru dengan "BANGUN JAYA TRANSINDO" di atas
- ✅ Footer gelap dengan 3 kolom di bawah
- ✅ Nama perusahaan dalam bold di footer

### 4. Homepage
```
https://your-domain.vercel.app/
```

**Yang harus terlihat**:
- ✅ Hero section dengan "BANGUN JAYA TRANSINDO"
- ✅ Footer gelap dengan 3 kolom di bawah

---

## 📱 Test di Mobile

Setelah deployment berhasil, test juga di mobile:

1. Buka URL di HP
2. Pastikan banner dan footer responsive
3. Cek navigation menu berfungsi
4. Test semua links

---

## 🔄 Jika Masih Belum Muncul

### Option 1: Force Redeploy

```bash
# Buat perubahan kecil untuk force deployment
echo "# Deployment trigger" >> README.md
git add README.md
git commit -m "chore: force deployment trigger"
git push origin main
```

### Option 2: Clear Vercel Cache

1. Buka Vercel Dashboard
2. Settings → General
3. Scroll ke bawah
4. Klik **"Clear Build Cache"**
5. Redeploy

### Option 3: Hubungi Vercel Support

Jika semua cara di atas tidak berhasil:
1. Buka Vercel Dashboard
2. Klik icon "?" di pojok kanan bawah
3. Pilih **"Contact Support"**
4. Jelaskan issue Anda

---

## 📊 Expected Timeline

- **Manual Redeploy**: 2-3 menit
- **Git Push Trigger**: 3-5 menit
- **CDN Propagation**: 5-10 menit (untuk perubahan terlihat global)

---

## ✅ Checklist

Sebelum submit ke Meta, pastikan:

- [ ] Deployment status "Ready" di Vercel
- [ ] Banner biru muncul di Privacy Policy
- [ ] Banner biru muncul di Terms of Service
- [ ] Banner biru muncul di About Us
- [ ] Footer baru muncul di semua halaman
- [ ] Nama perusahaan dalam bold di footer
- [ ] Test di browser (hard refresh)
- [ ] Test di incognito mode
- [ ] Test di mobile
- [ ] Semua links berfungsi

---

## 🎯 Quick Commands

```bash
# Cek status git
git status

# Cek commit terakhir
git log --oneline -5

# Trigger deployment dengan empty commit
git commit --allow-empty -m "chore: trigger deployment"
git push origin main

# Hard refresh browser
# Windows/Linux: Ctrl + Shift + R
# Mac: Cmd + Shift + R
```

---

**Next Step**: Pilih salah satu cara di atas untuk trigger deployment! 🚀

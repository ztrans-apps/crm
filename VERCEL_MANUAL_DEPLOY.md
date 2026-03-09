# Manual Deployment ke Vercel

**Issue**: On-Demand Concurrent Builds disabled  
**Effect**: Deployment tidak auto-trigger dari Git push  
**Solution**: Manual redeploy dari Vercel Dashboard

---

## 🚀 Cara Manual Redeploy (RECOMMENDED)

### Step 1: Buka Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Pilih project Anda
3. Klik tab **"Deployments"**

### Step 2: Redeploy Latest Commit

1. Cari deployment terakhir yang berhasil
2. Klik tombol **"..."** (three dots) di sebelah kanan
3. Pilih **"Redeploy"**
4. **PENTING**: Uncheck **"Use existing Build Cache"**
5. Klik **"Redeploy"** untuk confirm

### Step 3: Tunggu Build Selesai

- Status akan berubah dari "Building" → "Ready"
- Biasanya 2-3 menit
- Cek build logs jika ada error

---

## 🔧 Alternative: Enable Concurrent Builds (Optional)

Jika Anda punya Pro plan dan ingin auto-deploy:

### Step 1: Buka Settings

1. Vercel Dashboard → Project Anda
2. Klik **"Settings"**
3. Klik **"General"** di sidebar

### Step 2: Enable Concurrent Builds

1. Scroll ke **"On-Demand Concurrent Builds"**
2. Pilih **"Run all builds immediately"** atau **"Run up to one build per branch"**
3. Klik **"Save"**

**Note**: Fitur ini mungkin memerlukan Pro plan dan ada biaya tambahan per build minute.

---

## 📋 Verifikasi Commit yang Akan Di-Deploy

Pastikan commit terbaru sudah benar:

```bash
# Cek commit terakhir
git log --oneline -5
```

Expected output:
```
8407aa7d3b fix: remove duplicate legal pages and fix import paths
8c3f24ddee docs: add cache issue troubleshooting guide
254925acd4 fix: force rebuild of public pages to clear Vercel cache
1e8c539cce docs: add deployment trigger guide
493b2c246b chore: trigger Vercel deployment for legal pages update
```

Commit **8407aa7d3b** adalah yang paling penting karena:
- ✅ Menghapus duplicate pages
- ✅ Fix import errors
- ✅ Build berhasil (sudah test local)

---

## 🎯 Setelah Redeploy Berhasil

### 1. Verifikasi Deployment

Cek di Vercel Dashboard:
- Status: **"Ready"** (hijau)
- Commit: **8407aa7d3b**
- No errors in build logs

### 2. Test Production URLs

**Hard refresh** browser (Ctrl+Shift+R atau Cmd+Shift+R):

```
https://your-domain.vercel.app/privacy-policy
https://your-domain.vercel.app/terms-of-service
https://your-domain.vercel.app/about
https://your-domain.vercel.app/
```

### 3. Visual Checklist

Yang harus terlihat:

**Privacy Policy**:
- ✅ Banner biru dengan "BANGUN JAYA TRANSINDO" di atas
- ✅ Footer gelap dengan 3 kolom di bawah
- ✅ Nama perusahaan dalam bold di footer

**Terms of Service**:
- ✅ Banner biru dengan "BANGUN JAYA TRANSINDO" di atas
- ✅ Footer gelap dengan 3 kolom di bawah
- ✅ Nama perusahaan dalam bold di footer

**About Us**:
- ✅ Banner biru dengan "BANGUN JAYA TRANSINDO" di atas
- ✅ Footer gelap dengan 3 kolom di bawah
- ✅ Nama perusahaan dalam bold di footer

**Homepage**:
- ✅ Hero section dengan "BANGUN JAYA TRANSINDO" (besar)
- ✅ Footer gelap dengan 3 kolom di bawah

---

## 🐛 Troubleshooting

### Issue: Redeploy Button Tidak Ada

**Solution**:
1. Klik deployment terakhir untuk membuka detail
2. Di halaman detail, ada tombol **"Redeploy"** di pojok kanan atas
3. Atau gunakan Vercel CLI (lihat di bawah)

### Issue: Build Error

**Solution**:
1. Klik deployment yang error
2. Klik **"View Build Logs"**
3. Cari error message (biasanya di bagian bawah)
4. Screenshot dan share jika perlu bantuan

**Note**: Build sudah berhasil di local, jadi seharusnya tidak ada error.

### Issue: Perubahan Masih Belum Muncul

**Solution**:
1. **Hard refresh**: Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)
2. **Incognito mode**: Buka browser private/incognito
3. **Clear cache**: Clear browser cache completely
4. **Test dari device lain**: Buka dari HP atau komputer lain
5. **Tunggu CDN**: Tunggu 10-15 menit untuk CDN propagation

---

## 💻 Alternative: Vercel CLI Deploy

Jika manual redeploy tidak berhasil, gunakan Vercel CLI:

### Install Vercel CLI

```bash
npm i -g vercel
```

### Login

```bash
vercel login
```

### Link Project

```bash
vercel link
```

Pilih:
- Scope: Your team/account
- Link to existing project: Yes
- Project name: Your project name

### Deploy to Production

```bash
vercel --prod
```

Ini akan:
1. Build project locally
2. Upload ke Vercel
3. Deploy ke production
4. Bypass queue system

---

## 📊 Expected Timeline

### Manual Redeploy:
- **0-1 min**: Click redeploy button
- **1-3 min**: Build process
- **3-5 min**: Deployment ready
- **5-10 min**: CDN propagation

**Total**: 10 minutes maximum

### Vercel CLI Deploy:
- **0-2 min**: Build locally
- **2-4 min**: Upload to Vercel
- **4-6 min**: Deployment ready
- **6-10 min**: CDN propagation

**Total**: 10 minutes maximum

---

## ✅ Success Criteria

Deployment berhasil jika:

1. ✅ Vercel deployment status "Ready"
2. ✅ Build logs tidak ada error
3. ✅ Commit hash: 8407aa7d3b
4. ✅ Banner biru muncul di halaman legal
5. ✅ Footer gelap muncul di semua halaman
6. ✅ Hard refresh menampilkan perubahan
7. ✅ Incognito mode menampilkan perubahan
8. ✅ Test dari device lain menampilkan perubahan

---

## 🎯 Quick Action Steps

**Langkah Tercepat** (5 menit):

1. **Buka Vercel Dashboard**
   - https://vercel.com/dashboard
   - Pilih project Anda
   - Tab "Deployments"

2. **Redeploy**
   - Klik "..." di deployment terakhir
   - Pilih "Redeploy"
   - Uncheck "Use existing Build Cache"
   - Klik "Redeploy"

3. **Tunggu 3 Menit**
   - Status berubah ke "Ready"

4. **Test**
   - Buka: https://your-domain.vercel.app/privacy-policy
   - Hard refresh: Ctrl+Shift+R
   - Lihat banner biru dan footer gelap

5. **Submit ke Meta**
   - Jika sudah muncul, langsung submit!

---

## 📞 Need Help?

Jika masih bermasalah setelah manual redeploy:

1. Screenshot Vercel deployment status
2. Screenshot build logs (jika ada error)
3. Screenshot halaman yang masih lama
4. Share production URL

---

**Status**: Ready for manual redeploy  
**Commit**: 8407aa7d3b  
**Action**: Redeploy dari Vercel Dashboard

🚀 Silakan redeploy manual dari Vercel Dashboard sekarang!

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  MessageSquare, 
  Users, 
  Settings,
  BarChart3,
  Radio,
  Bot,
  Zap,
  Phone,
  UserPlus,
  Send,
  Search,
  Filter,
  Bell,
  Lock,
  HelpCircle
} from 'lucide-react'

export default function UserGuidePage() {
  const [activeTab, setActiveTab] = useState('getting-started')

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-vx-purple" />
          <h1 className="text-3xl font-bold">User Guide</h1>
        </div>
        <p className="text-vx-text-muted">
          Panduan lengkap menggunakan WhatsApp CRM System
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Getting Started Tab */}
        <TabsContent value="getting-started" className="space-y-6">
          <GettingStartedSection />
        </TabsContent>

        {/* Chats Tab */}
        <TabsContent value="chats" className="space-y-6">
          <ChatsSection />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <ContactsSection />
        </TabsContent>

        {/* Broadcasts Tab */}
        <TabsContent value="broadcasts" className="space-y-6">
          <BroadcastsSection />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <SettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Getting Started Section
function GettingStartedSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Selamat Datang di WhatsApp CRM
          </CardTitle>
          <CardDescription>Panduan cepat untuk memulai</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-vx-purple text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Login ke Sistem</h3>
                <p className="text-sm text-vx-text-muted mb-2">
                  Gunakan email dan password yang diberikan oleh admin untuk login
                </p>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                  <p className="text-blue-900 dark:text-blue-100">
                    💡 Tip: Jika lupa password, klik "Forgot Password" di halaman login
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-vx-purple text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Kenali Dashboard</h3>
                <p className="text-sm text-vx-text-muted mb-2">
                  Setelah login, Anda akan melihat dashboard dengan berbagai menu di sidebar
                </p>
                <div className="grid md:grid-cols-2 gap-2 text-sm mt-3">
                  <div className="p-2 border rounded flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-vx-purple" />
                    <span>Chats - Kelola percakapan</span>
                  </div>
                  <div className="p-2 border rounded flex items-center gap-2">
                    <Users className="h-4 w-4 text-vx-purple" />
                    <span>Contacts - Kelola kontak</span>
                  </div>
                  <div className="p-2 border rounded flex items-center gap-2">
                    <Radio className="h-4 w-4 text-vx-purple" />
                    <span>Broadcasts - Kirim pesan massal</span>
                  </div>
                  <div className="p-2 border rounded flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-vx-purple" />
                    <span>Analytics - Lihat statistik</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-vx-purple text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Pahami Role Anda</h3>
                <p className="text-sm text-vx-text-muted mb-2">
                  Setiap user memiliki role dengan akses yang berbeda
                </p>
                <div className="space-y-2 mt-3">
                  <div className="p-3 border rounded-lg">
                    <Badge className="mb-2">Agent</Badge>
                    <p className="text-xs text-vx-text-muted">
                      Dapat melihat dan membalas chat, mengelola kontak
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge className="mb-2">Manager</Badge>
                    <p className="text-xs text-vx-text-muted">
                      Dapat mengelola team, melihat analytics, kirim broadcast
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge className="mb-2">Admin</Badge>
                    <p className="text-xs text-vx-text-muted">
                      Akses penuh ke semua fitur termasuk settings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="text-yellow-900 dark:text-yellow-100">
            Tips Penting
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-800 dark:text-yellow-200 space-y-2 text-sm">
          <p>✓ Selalu logout setelah selesai menggunakan sistem</p>
          <p>✓ Jangan share password Anda dengan orang lain</p>
          <p>✓ Gunakan fitur search untuk menemukan chat/kontak dengan cepat</p>
          <p>✓ Aktifkan notifikasi untuk tidak melewatkan pesan penting</p>
          <p>✓ Hubungi admin jika mengalami masalah teknis</p>
        </CardContent>
      </Card>
    </>
  )
}

// Chats Section
function ChatsSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mengelola Percakapan
          </CardTitle>
          <CardDescription>Cara menggunakan fitur Chats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Melihat Daftar Chat</h3>
              <p className="text-sm text-vx-text-muted mb-3">
                Klik menu "Chats" di sidebar untuk melihat semua percakapan
              </p>
              <div className="p-4 border rounded-lg space-y-2 text-sm">
                <p><strong>Filter Status:</strong></p>
                <div className="grid md:grid-cols-3 gap-2">
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                    <Badge variant="outline" className="mb-1">Open</Badge>
                    <p className="text-xs text-vx-text-muted">Chat yang sedang aktif</p>
                  </div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                    <Badge variant="outline" className="mb-1">Pending</Badge>
                    <p className="text-xs text-vx-text-muted">Menunggu respon</p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-950 rounded">
                    <Badge variant="outline" className="mb-1">Closed</Badge>
                    <p className="text-xs text-vx-text-muted">Chat selesai</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Membalas Pesan</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </div>
                  <p>Klik pada chat yang ingin dibalas dari daftar</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </div>
                  <p>Ketik pesan Anda di kolom input di bagian bawah</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    3
                  </div>
                  <p>Klik tombol Send atau tekan Enter untuk mengirim</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Fitur Lanjutan</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="h-4 w-4 text-vx-purple" />
                    <strong>Quick Replies</strong>
                  </div>
                  <p className="text-xs text-vx-text-muted">
                    Gunakan template pesan untuk respon cepat
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-vx-purple" />
                    <strong>Assign Chat</strong>
                  </div>
                  <p className="text-xs text-vx-text-muted">
                    Transfer chat ke agent lain jika diperlukan
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="h-4 w-4 text-vx-purple" />
                    <strong>Search Messages</strong>
                  </div>
                  <p className="text-xs text-vx-text-muted">
                    Cari pesan tertentu dalam percakapan
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-vx-purple" />
                    <strong>Contact Info</strong>
                  </div>
                  <p className="text-xs text-vx-text-muted">
                    Lihat detail kontak dan riwayat chat
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
          <p>✓ Balas pesan customer dalam waktu maksimal 24 jam</p>
          <p>✓ Gunakan bahasa yang sopan dan profesional</p>
          <p>✓ Baca seluruh riwayat chat sebelum membalas</p>
          <p>✓ Tandai chat sebagai "Closed" setelah masalah selesai</p>
          <p>✓ Gunakan Quick Replies untuk efisiensi</p>
        </CardContent>
      </Card>
    </>
  )
}

// Contacts Section
function ContactsSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mengelola Kontak
          </CardTitle>
          <CardDescription>Cara mengelola database kontak</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Menambah Kontak Baru</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </div>
                  <p>Buka halaman "Contacts" dari sidebar</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </div>
                  <p>Klik tombol "Add Contact" di pojok kanan atas</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    3
                  </div>
                  <p>Isi form dengan informasi kontak (nama, nomor WhatsApp, email, dll)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    4
                  </div>
                  <p>Klik "Save" untuk menyimpan kontak</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Mengedit Kontak</h3>
              <p className="text-sm text-vx-text-muted mb-3">
                Klik pada nama kontak → Klik tombol "Edit" → Ubah informasi → Klik "Save"
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Mencari Kontak</h3>
              <div className="p-4 border rounded-lg space-y-2 text-sm">
                <p><strong>Cara mencari:</strong></p>
                <ul className="space-y-1 ml-4 text-vx-text-muted">
                  <li>• Gunakan search box di atas daftar kontak</li>
                  <li>• Ketik nama, nomor telepon, atau email</li>
                  <li>• Hasil akan muncul secara real-time</li>
                  <li>• Gunakan filter untuk mempersempit pencarian</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Informasi Kontak</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-vx-surface-elevated rounded-lg">
                  <p className="font-semibold mb-1">Data Dasar</p>
                  <p className="text-xs text-vx-text-muted">Nama, nomor, email, alamat</p>
                </div>
                <div className="p-3 bg-vx-surface-elevated rounded-lg">
                  <p className="font-semibold mb-1">Riwayat Chat</p>
                  <p className="text-xs text-vx-text-muted">Semua percakapan dengan kontak</p>
                </div>
                <div className="p-3 bg-vx-surface-elevated rounded-lg">
                  <p className="font-semibold mb-1">Tags/Labels</p>
                  <p className="text-xs text-vx-text-muted">Kategorisasi kontak</p>
                </div>
                <div className="p-3 bg-vx-surface-elevated rounded-lg">
                  <p className="font-semibold mb-1">Custom Fields</p>
                  <p className="text-xs text-vx-text-muted">Informasi tambahan sesuai kebutuhan</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-900 dark:text-green-100">
            Tips Mengelola Kontak
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-800 dark:text-green-200 space-y-2 text-sm">
          <p>✓ Selalu isi nama kontak dengan lengkap dan jelas</p>
          <p>✓ Gunakan tags untuk kategorisasi (customer, lead, partner, dll)</p>
          <p>✓ Update informasi kontak secara berkala</p>
          <p>✓ Hapus kontak duplikat untuk menjaga database tetap bersih</p>
          <p>✓ Backup data kontak secara rutin</p>
        </CardContent>
      </Card>
    </>
  )
}

// Broadcasts Section
function BroadcastsSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Mengirim Broadcast
          </CardTitle>
          <CardDescription>Kirim pesan ke banyak kontak sekaligus</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Membuat Broadcast Baru</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-semibold">Buka Halaman Broadcasts</p>
                    <p className="text-xs text-vx-text-muted">Klik menu "Broadcasts" di sidebar</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-semibold">Klik "Create Broadcast"</p>
                    <p className="text-xs text-vx-text-muted">Tombol di pojok kanan atas</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-semibold">Isi Detail Broadcast</p>
                    <ul className="text-xs text-vx-text-muted mt-1 ml-4 space-y-1">
                      <li>• Nama campaign</li>
                      <li>• Pesan yang akan dikirim</li>
                      <li>• Pilih penerima (semua kontak atau filter tertentu)</li>
                      <li>• Jadwal pengiriman (sekarang atau nanti)</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <p className="font-semibold">Review & Send</p>
                    <p className="text-xs text-vx-text-muted">Periksa kembali sebelum mengirim</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Jenis Broadcast</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">Text Message</Badge>
                  <p className="text-xs text-vx-text-muted">
                    Pesan teks sederhana, paling cepat dan efisien
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">Image + Caption</Badge>
                  <p className="text-xs text-vx-text-muted">
                    Gambar dengan teks, lebih menarik perhatian
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">Template Message</Badge>
                  <p className="text-xs text-vx-text-muted">
                    Pesan dengan format yang sudah disetujui WhatsApp
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">Interactive Buttons</Badge>
                  <p className="text-xs text-vx-text-muted">
                    Pesan dengan tombol untuk respon cepat
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Memilih Penerima</h3>
              <div className="p-4 border rounded-lg space-y-2 text-sm">
                <p><strong>Opsi filter penerima:</strong></p>
                <ul className="space-y-1 ml-4 text-vx-text-muted">
                  <li>• <strong>All Contacts:</strong> Kirim ke semua kontak</li>
                  <li>• <strong>By Tags:</strong> Filter berdasarkan tag/label</li>
                  <li>• <strong>By Segment:</strong> Grup kontak tertentu</li>
                  <li>• <strong>Custom List:</strong> Pilih kontak manual</li>
                  <li>• <strong>Import CSV:</strong> Upload daftar dari file</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Monitoring Broadcast</h3>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Sent</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Jumlah pesan terkirim</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="font-semibold text-green-900 dark:text-green-100">Delivered</p>
                  <p className="text-xs text-green-700 dark:text-green-300">Pesan sampai ke penerima</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="font-semibold text-purple-900 dark:text-purple-100">Read</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">Pesan dibaca penerima</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-900 dark:text-red-100">
            ⚠️ Perhatian Penting
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-800 dark:text-red-200 space-y-2 text-sm">
          <p><strong>Jangan spam!</strong> WhatsApp memiliki batasan pengiriman pesan</p>
          <p>✗ Jangan kirim broadcast terlalu sering (max 1x per hari)</p>
          <p>✗ Jangan kirim ke kontak yang tidak opt-in</p>
          <p>✗ Jangan kirim konten promosi berlebihan</p>
          <p>✓ Pastikan konten relevan dan bermanfaat</p>
          <p>✓ Berikan opsi untuk unsubscribe</p>
        </CardContent>
      </Card>
    </>
  )
}

// Settings Section
function SettingsSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pengaturan Sistem
          </CardTitle>
          <CardDescription>Kustomisasi pengalaman Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Pengaturan Profil</h3>
              <div className="space-y-2 text-sm">
                <p className="text-vx-text-muted mb-2">
                  Klik menu "Settings" di sidebar untuk mengakses pengaturan
                </p>
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold mb-2">Yang bisa diubah:</p>
                  <ul className="space-y-1 ml-4 text-vx-text-muted">
                    <li>• Nama lengkap</li>
                    <li>• Email</li>
                    <li>• Foto profil</li>
                    <li>• Password</li>
                    <li>• Nomor telepon</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Notifikasi</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="h-4 w-4 text-vx-purple" />
                    <strong>Desktop Notifications</strong>
                  </div>
                  <p className="text-xs text-vx-text-muted">
                    Notifikasi pop-up di browser untuk pesan baru
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="h-4 w-4 text-vx-purple" />
                    <strong>Sound Alerts</strong>
                  </div>
                  <p className="text-xs text-vx-text-muted">
                    Suara notifikasi saat ada pesan masuk
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Keamanan</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
                    <strong className="text-yellow-900 dark:text-yellow-100">Ganti Password</strong>
                  </div>
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Disarankan mengganti password setiap 3 bulan sekali
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold mb-2">Tips Password Aman:</p>
                  <ul className="space-y-1 ml-4 text-vx-text-muted text-xs">
                    <li>• Minimal 8 karakter</li>
                    <li>• Kombinasi huruf besar, kecil, angka, simbol</li>
                    <li>• Jangan gunakan informasi pribadi</li>
                    <li>• Jangan gunakan password yang sama di tempat lain</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Quick Replies</h3>
              <p className="text-sm text-vx-text-muted mb-3">
                Buat template pesan untuk respon cepat
              </p>
              <div className="p-4 border rounded-lg space-y-2 text-sm">
                <p><strong>Cara membuat Quick Reply:</strong></p>
                <ol className="space-y-1 ml-4 text-vx-text-muted">
                  <li>1. Buka menu "Quick Replies"</li>
                  <li>2. Klik "Add Quick Reply"</li>
                  <li>3. Isi shortcut (misal: /greeting)</li>
                  <li>4. Isi pesan template</li>
                  <li>5. Save</li>
                </ol>
                <p className="text-xs text-vx-text-muted mt-2">
                  💡 Gunakan dengan mengetik shortcut saat membalas chat
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            Butuh Bantuan?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-3 text-sm">
          <p><strong>Hubungi Admin jika:</strong></p>
          <ul className="space-y-1 ml-4">
            <li>• Lupa password dan tidak bisa reset</li>
            <li>• Perlu akses ke fitur tertentu</li>
            <li>• Menemukan bug atau error</li>
            <li>• Butuh training tambahan</li>
            <li>• Ada pertanyaan tentang sistem</li>
          </ul>
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mt-3">
            <p className="font-semibold mb-1">Kontak Support:</p>
            <p className="text-xs">Email: support@yourcompany.com</p>
            <p className="text-xs">WhatsApp: +62 xxx-xxxx-xxxx</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

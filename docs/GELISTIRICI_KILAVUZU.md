# Dersteyim geliştirme ve dağıtım kılavuzu

Bu belge geliştiriciler ve dağıtım ekibi içindir. 1.3 kaynak değişikliklerinin Windows paketleme adımları taslaktır; EXE ve gerçek Windows kurulumu henüz doğrulanmamıştır.

## Mimari

Electron masaüstü kabuğu, Node 24 ile Express uygulamasını ayrı ve yalnızca `127.0.0.1` üzerinde dinleyen bir süreç olarak başlatır. Arayüz Electron penceresinde açılır; dış tarayıcıya yönlendirilmez. Kayıtlar SQLite veritabanında yereldir. Her kurulum bağımsızdır. Sınıflar eğitim öğretim yılıyla ayrılır; öğrenci yeni sınıfa aktarılırken eski yoklama oturumları korunur. Otomatik sınıf geçirme yapılmaz. Masaüstü kabuğu ve paketleme için ücretli API kullanılmaz.

Başlıca dosyalar: `desktop/main.cjs` pencereyi; `desktop/backend-process.cjs` yerel servis ömrünü; `backend/installation.js` ilk yerel hesabı; `backend/localFiles.js` Windows klasörleri ve TXT dosyalarını; `backend/attendanceReport.js` Excel raporlarını yönetir. `backend/routes/api.js` yetkilendirme ve işlemleri, `client/src` arayüzü içerir. E-posta ve push bileşenleri kodda dursa da okul modunda devre dışıdır.

## Yerelde derleme

Gerekenler: Windows 10/11 x64, Node.js 24.15 veya daha yeni 24.x, npm, bağımlılıkları indirmek için internet. Uygulamanın okulda günlük kullanımı için internet gerekmez.

```powershell
npm ci
npm --prefix client ci
npm run build
npm test
New-Item -ItemType Directory -Force bin | Out-Null
Copy-Item (Get-Command node.exe).Source bin/node.exe
npm install --prefix desktop --no-audit --no-fund
npm --prefix desktop run dist
```

Hedefler `dist_installer` altında kurulum EXE'si ve taşınabilir EXE üretmek üzere yapılandırılmıştır. Kurulum hedefi Windows kaldırma kaydı ve kısayollar oluşturmak, kaldırmada kullanıcı verilerini korumak üzere yapılandırılmıştır. Bu davranışları gerçek Windows üzerinde sınamadan doğrulanmış kabul etmeyin. Dosyaların dijital kod imzası henüz sağlanmamıştır.

## GitHub iş akışı

`.github/workflows/windows.yml`, varsayılan dalda ve elle çalıştırmada bir Windows derleme işi tanımlar. Testleri ve arayüz derlemesini çalıştırır, EXE üretip Actions iş çıktısı olarak yüklemeyi amaçlar. İş akışı sonuçlarını kontrol edin; başarısız bir işten sürüm yayımlamayın. Oluşan EXE'leri indirdikten sonra temiz Windows 10 ve 11 x64 cihazlarda test edin ve gerekiyorsa GitHub Releases'a elle ekleyin. Bir iş akışının hazırlanmış olması, çalıştırıldığı veya EXE'nin mevcut olduğu anlamına gelmez.

Depoya `node_modules`, gerçek okul verileri, veritabanları, yedekler, `.env`, anahtarlar ve şifre TXT dosyaları eklenmez. `.gitignore` bunları dışlamaya yardımcı olur; yayım öncesi ayrıca kontrol edin. Windows Node çalışma dosyası depoya konmaz; iş akışı onu kurulu Node ortamından paketleme için kopyalar.

## Doğrulanması gerekenler

- EXE'nin gerçek Windows'ta açılması, tarayıcı sekmesi açmaması ve veri/şifre klasörlerinin yönlendirilmiş Belgeler veya OneDrive masaüstünde doğru bulunması.
- İlk kurulum, ikinci açılış, şifre değişikliği ve unutulan şifre klasörü.
- Öğrenci/sınıf aktarımı, farklı ders saatleri, düzeltme, Excel dosyaları, dosya adı çakışması ve yazma izni hatası.
- Kurulum, sessiz kurulum, kaldırma, güncelleme, veri korunumu ve yedekten geri yükleme.
- İkinci örnek başlatma, beklenmeyen kapanma, temiz yeniden açılış ve erişilebilirlik.
- Önceki 1.2 verilerinin bağımsız yedeklenmesi ve taşınması. Bu sürüm eski profilleri otomatik içe aktarmayı vaat etmez.

## Güvenlik ve sorumluluk

Kullanıcı isteğiyle şifreler Belgeler altında düz metin tutulur; aynı Windows profilindeki kişilerin ve kötü amaçlı yazılımların dosyaları okuyabilmesi ciddi bir risktir. Veritabanındaki şifre karması bu TXT dosyasını korumaz. Yerel Excel dosyaları ve yedekler de erişim kontrollü saklanmalıdır. Uygulama çevrimdışı olsa da Windows hesap güvenliği, disk şifrelemesi, yedekler ve erişim yönetimi gereklidir. Kurum adı ve logo ile resmî dağıtımdan önce yetkili birimlerin onayı ve hak sahipliği gözden geçirilmelidir.

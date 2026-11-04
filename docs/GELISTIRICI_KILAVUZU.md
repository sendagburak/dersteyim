# VarYok geliştirme ve dağıtım kılavuzu

Bu belge geliştiriciler ve dağıtım ekibi içindir. Windows iş akışındaki örnek veri testleri, okullarda gerçek cihaz ve gerçek veriyle dağıtım onayının yerini almaz.

## Mimari

Electron masaüstü kabuğu, Node 24 ile Express uygulamasını ayrı ve yalnızca `127.0.0.1` üzerinde dinleyen bir süreç olarak başlatır. Arayüz Electron penceresinde açılır; dış tarayıcıya yönlendirilmez. Kayıtlar SQLite veritabanında yereldir. Her kurulum bağımsızdır. Sınıflar eğitim öğretim yılıyla ayrılır; öğrenci yeni sınıfa aktarılırken eski yoklama oturumları korunur. Otomatik sınıf geçirme yapılmaz. Masaüstü kabuğu ve paketleme için ücretli API kullanılmaz.

Başlıca dosyalar: `desktop/main.cjs` pencereyi; `desktop/backend-process.cjs` yerel servis ömrünü; `backend/installation.js` ilk yerel hesabı; `backend/localFiles.js` Windows klasörleri ve TXT dosyalarını; `backend/attendanceReport.js` Excel raporlarını yönetir. `backend/routes/api.js` yetkilendirme ve işlemleri, `client/src` arayüzü içerir. E-posta ve push bileşenleri kodda dursa da okul modunda devre dışıdır.

Servis yerel kullanım için rastgele bir boş porta bağlanır. Electron uygulaması Node sürecini başlatır, sağlık yanıtı ve süreç kimliğini kontrol ettikten sonra arayüzü kendi penceresinde yükler. Bu mimari internet sunucusu gerektirmez; ancak bilgisayarda yerel bir HTTP servisi vardır. Pencere dış sitelere yönlendirmeyi engeller ve Node entegrasyonu kapalıdır. Bu tedbirler tek başına güvenlik testi veya KVKK uygunluğu anlamına gelmez.

## Veri ve geçmiş sürüm yolları

Yeni masaüstü profilinde veritabanı `%APPDATA%/VarYok/okul-verileri/eyoklama.db` konumundadır; aynı klasörde anahtar ve çalışma durumu dosyaları bulunur. Önceki `%APPDATA%/Dersteyim/okul-verileri` varsa ve yeni veri klasörü yoksa önceki klasör yerinde kullanılır. Her iki klasör varsa yeni klasör seçilir; otomatik birleştirme yapılmaz. Kullanıcı hesabı TXT dosyalarının önceki Belgeler/Dersteyim konumunu da aynı profil için bulma desteği vardır. İki veri kümesini birleştirmeden önce bağımsız ve doğrulanmış yedek alın.

Yoklama raporları Masaüstü/Yoklamalar altındadır. Belgeler/VarYok Yedekleri'ndeki isteğe bağlı yedek veritabanını ve ilgili anahtarları içerir; şifre TXT dosyaları ve XLSX raporları ayrı yerlerdedir. Windows klasörleri sistemin bilinen Belgeler ve Masaüstü yollarına göre çözülür; yeniden yönlendirme veya bulut eşitlemesi ayrıca değerlendirilmelidir.

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

`.github/workflows/windows.yml`, varsayılan dal, pull request ve elle çalıştırma için bir Windows derleme işi tanımlar. Arayüz derlemesi ve otomatik testlerden sonra kurulum ve taşınabilir EXE üretir. Paketlenmiş uygulamayı ve taşınabilir EXE'yi geçici profille açıp örnek hesap, gelecek yıl sınıfı ve XLSX kaydını sınar. İş akışı sonucunu ve ilgili commit kimliğini kontrol edin; başarısız veya farklı commit'e ait çıktıdan sürüm yayımlamayın. Oluşan EXE'leri ayrıca temiz Windows 10 ve 11 x64 cihazlarda, gerçek kurulum/kaldırma davranışıyla test edin.

Depoya `node_modules`, gerçek okul verileri, veritabanları, yedekler, `.env`, anahtarlar ve şifre TXT dosyaları eklenmez. `.gitignore` bunları dışlamaya yardımcı olur; yayım öncesi ayrıca kontrol edin. Windows Node çalışma dosyası depoya konmaz; iş akışı onu kurulu Node ortamından paketleme için kopyalar.

## Test, lisans ve yayın incelemesi

- `npm test` yerel kurulum, yetki sınırları, şifre dosyaları, yıllar arası kayıt, yoklama, rapor, yedek, hata durumları ve eski veri klasörü seçimine ilişkin otomatik testleri çalıştırır.
- `scripts/windows-package-smoke.cjs` yalnız örnek verilerle paketlenmiş Windows uygulamasını başlatır; gerçek öğrenci kayıtları kullanılmamalıdır. Test, bütün ekranların veya fiziksel cihazlardaki kurulumun kapsamlı incelemesi değildir.
- Kök `LICENSE` kaynak için MIT lisansıdır. Electron, Node.js, React, Lucide ve diğer bağımlılıkların kendi lisans/telif bildirimleri dağıtılan paketle birlikte kontrol edilmelidir. Paket içeriğinin üçüncü taraf lisans envanteri henüz bağımsız hukuk incelemesi değildir.
- GitHub'a yüklenen dosyaların ve örneklerin kişisel veri içermediğini kontrol edin. Gerçek veritabanlarını, kullanıcı şifrelerini, hata dökümlerini ve raporları açık issue veya pull request'e eklemeyin.
- Kod imzalama, Windows güvenlik uyarıları, kurum adına yayın yetkisi, marka araştırması ve güvenlik taraması tamamlanmadan okullara üretim sürümü duyurmayın.

## Doğrulanması gerekenler

- EXE'nin gerçek Windows'ta açılması, tarayıcı sekmesi açmaması ve veri/şifre klasörlerinin yönlendirilmiş Belgeler veya OneDrive masaüstünde doğru bulunması.
- İlk kurulum, ikinci açılış, şifre değişikliği ve unutulan şifre klasörü.
- Öğrenci/sınıf aktarımı, farklı ders saatleri, düzeltme, Excel dosyaları, dosya adı çakışması ve yazma izni hatası.
- Kurulum, sessiz kurulum, kaldırma, güncelleme, veri korunumu ve yedekten geri yükleme.
- İkinci örnek başlatma, beklenmeyen kapanma, temiz yeniden açılış ve erişilebilirlik.
- Önceki 1.2 verilerinin bağımsız yedeklenmesi ve taşınması. Bu sürüm eski profilleri otomatik içe aktarmayı vaat etmez.

## Güvenlik ve sorumluluk

Kullanıcı isteğiyle şifreler Belgeler altında düz metin tutulur; aynı Windows profilindeki kişilerin ve kötü amaçlı yazılımların dosyaları okuyabilmesi ciddi bir risktir. Veritabanındaki şifre karması bu TXT dosyasını korumaz. Yerel Excel dosyaları ve yedekler de erişim kontrollü saklanmalıdır. Uygulama çevrimdışı olsa da Windows hesap güvenliği, disk şifrelemesi, yedekler ve erişim yönetimi gereklidir. Kurum adı ve logo ile resmî dağıtımdan önce yetkili birimlerin onayı ve hak sahipliği gözden geçirilmelidir.

# Dersteyim

Dersteyim, okul yoklamalarını bilgisayarda tutmak üzere geliştirilen açık kaynaklı bir Windows masaüstü uygulamasıdır. Bu kaynak paketi 1.3 için geliştirme sürümüdür. **Windows EXE derlemesi ve gerçek Windows kurulum, kaldırma ve arayüz testleri henüz doğrulanmamıştır; okullara üretim sürümü olarak dağıtmayın.**

## Kullanım biçimi

- İlk açılışta kullanıcı kendi kullanıcı adını ve şifresini oluşturur. Okul talep formu, yetki dosyası ve ayrı yönetim aracı kullanılmaz.
- Uygulama kendi penceresinde açılacak şekilde hazırlanmıştır; Chrome sekmesi açılması amaçlanmaz. Arkada yalnızca aynı bilgisayardan erişilen bir yerel servis bulunur.
- Eğitim öğretim yılı otomatik önerilir; gelecek yıllar seçilebilir veya yazılabilir. Önceki yılların yoklamaları korunur. Öğrenci aktarımı otomatik değildir.
- Her bilgisayar kendi veritabanını tutar. Farklı bilgisayarlar otomatik eşitlenmez; bu sürüm ortak okul sunucusu değildir.
- E-posta ve push kodları korunur, okul modunda kapalıdır. İnternet, ücretli API, host ve domain günlük çalışma için gerekli değildir.
- e-Okul ile otomatik entegrasyon yoktur. Sınıf listesi ve ders programı XLSX veya CSV dosyasından aktarılır.

## Giriş bilgileri ve gizlilik

Kullanıcıların şifreleri istenen işleyiş gereği **Belgeler/Dersteyim** altında okunabilir TXT dosyalarında tutulur. Bu dosyaya ulaşabilen herkes ilgili hesaba girebilir. Bilgisayar hesabını ve diski koruyun; giriş bilgilerini, öğrencilerin verilerini ve veritabanı anahtarlarını GitHub'a yüklemeyin. Şifre dosyasında kullanıcı adı ve şifre görüntülenebilir. Uygulama giriş ekranındaki **Şifremi unuttum** düğmesi bu klasörü açmayı dener.

Bu uygulamanın kullanılması tek başına KVKK'ya uygunluk garantisi veya resmî uygunluk belgesi sağlamaz. Kullanıcı ve kurum gerekli idari ve teknik tedbirleri ayrıca değerlendirmelidir.

## Yoklama dosyaları

Her kayıttan sonra Masaüstü/Yoklamalar altında ay ve gün klasörü oluşturulur. Örnek: `Yoklamalar/03-Kasım/04.11.2026/6-A_04.11.2026_09-15.xlsx`. Her Excel dosyası o sınıf ve gün için kaydedilmiş derslerde **gelmedi** durumundaki öğrencileri içerir; öğrenci adı maskelidir. Yeni kayıtlar daha önceki dosyaları silmez. Aynı dakika içinde dosya adı çakışırsa sıra numarası eklenir. Rapor oluşturulamazsa yoklama veritabanında kalır ve ekranda hata belirtilir.

## Geliştiriciler için

Derleme için Windows 10/11 x64, Node.js 24.x ve internet üzerinden ücretsiz bağımlılıkların edinilmesi gerekir. Windows 7/8 ve 32 bit için destek sağlanmamıştır. Yalnız uygulamanın günlük kullanımı çevrimdışıdır.

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

Hazırlanan GitHub Actions iş akışı Windows üzerinde kurulum ve taşınabilir EXE üretmeyi amaçlar; bu iş akışı henüz çalıştırılarak doğrulanmamıştır. Üretilmiş dosyalar bulunuyorsa iş akışı çıktılarından indirilmeli, gerçek Windows cihazlarında sınandıktan sonra GitHub Releases bölümüne eklenmelidir.

Ayrıntılar: [Okul kullanım kılavuzu](docs/OKUL_KULLANIM.md) ve [geliştirme ve dağıtım notları](docs/GELISTIRICI_KILAVUZU.md).

## Lisans

Kaynak kodu için MIT lisansı öngörülmektedir; [LICENSE](LICENSE) ve [NOTICE](NOTICE) dosyalarına bakın. Kurum adı ve logosuyla yapılacak resmî yayım öncesinde hak sahipliği ve kurum içi izinler ilgili kurum tarafından doğrulanmalıdır. Üçüncü taraf bileşenler kendi lisanslarına tabidir.

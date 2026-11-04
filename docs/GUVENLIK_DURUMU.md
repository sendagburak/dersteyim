# Güvenlik ve bağımlılık denetimi durumu

Tarih: 4 Kasım 2026. Bu kayıt bir sızma testi veya eksiksiz kaynak kodu güvenlik incelemesi değildir.

## Bağımlılık taraması

GitHub Actions'ta Node/npm bağımlılıkları `npm audit` ile tarandı. Uygulama ve arayüz için üretim bağımlılıkları; masaüstü paketleyici için geliştirme bağımlılıkları dahil edilmiştir. İlgili iş: [bağımlılık denetimi](https://github.com/sendagburak/varyok/actions/runs/41825556614).

| Bileşen | Sonuç |
| --- | --- |
| Arayüz üretim bağımlılıkları | 0 bildirilen açıklık |
| Uygulama üretim bağımlılıkları | 8 orta seviye etkilenen bağımlılık kaydı; yüksek/kritik bildirilmedi |
| Masaüstü derleme zinciri | 15 orta seviye etkilenen bağımlılık kaydı; yüksek/kritik bildirilmedi |

Bu sayılar ayrı ayrı güvenlik açıkları sayısı değildir. Her iki zincirde de `minimatch` ile ilişkili [GHSA-g3hv-75wg-m249 / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249) uyarısı raporlanmıştır. Uygulamada zincir ExcelJS üzerinden, derleme tarafında electron-builder üzerinden gelmektedir. Etkilenen bileşenin uygulamanın somut veri akışında istismar edilebilir olup olmadığı bu denetimde doğrulanmamıştır. `npm audit`'in önerdiği zorlayıcı sürüm değişikliği geriye dönük kırılmaya yol açabildiğinden otomatik uygulanmamıştır. Bağımlılıkların güvenli güncellemeleri takip edilmeli, güncellemeden sonra XLSX ve Windows paket testleri tekrarlanmalıdır.

Denetim yalnızca o tarihte npm veri tabanında bilinen ve taranan bağımlılıklara ilişkindir. Gerçek Windows ikilisindeki tüm bileşenlerin ayrıca tarandığı veya yazılımın açık içermediği sonucunu vermez.

## Uygulamaya özgü açık riskler

- Kullanıcının seçimi gereği şifreler Belgeler klasöründe okunabilir TXT dosyalarına yazılır. Aynı dosyaya erişebilen bir kişi hesaba girebilir. Windows klasör izinleri, disk şifrelemesi ve diğer erişimler ayrıca değerlendirilmelidir.
- Yoklama XLSX'leri ve yedekler kişisel veri içerebilir; yerel klasörlerin OneDrive gibi bir hizmetle eşitlenmesi ayrıca veri aktarımına neden olabilir.
- Sınırlı otomatik testler ve npm taraması bağımsız uzman kaynak kodu denetiminin veya fiziksel okul cihazlarında güvenlik ve kurulum testinin yerine geçmez.
- Kritik/yüksek riskler değerlendirilmeden ve kurumsal veri koruma süreçleri tamamlanmadan gerçek öğrenci verileriyle genel dağıtım yapılmamalıdır.

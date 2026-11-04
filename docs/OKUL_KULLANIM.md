# VarYok okul kullanım kılavuzu

Bu kılavuz Windows yerel masaüstü deneme sürümü içindir. Gerçek öğrenci verileriyle kullanmadan önce kurumun yetki, güvenlik ve KVKK değerlendirmesi tamamlanmalıdır. Her bilgisayardaki kayıtlar ayrıdır; okulun diğer bilgisayarlarıyla otomatik eşitleme yapılmaz.

## Başlamadan önce

- Windows 10 veya 11'in 64 bit sürümünü ve kullanacağınız Windows hesabını kontrol edin.
- Uygulamanın internete bağlanması günlük çalışma için gerekli değildir. İlk indirme ve kaynak koddan derleme internet gerektirir.
- Kurulum dosyası uygulamayı bilgisayara kurar; taşınabilir EXE doğrudan açılabilir. Her iki biçim de bu Windows kullanıcısının yerel verilerini kullanır.
- Okulunuzun hangi bilgisayarda çalışacağını ve kayıtların kimler tarafından görülebileceğini önceden belirleyin. İki bilgisayara kurmak verileri otomatik birleştirmez.
- Bu sürüm resmî e-Okul kaydının yerine geçtiği varsayılarak kullanılmamalıdır; mevcut resmî iş akışına ilişkin kararı ilgili kurum verir.

## İlk açılış

1. Windows için doğrulanmış kurulum veya taşınabilir EXE yayımlandığında dosyayı açın. Kurulum seçeneği kullanılıyorsa ekrandaki adımları izleyin.
2. İlk ekranda kullanıcı adı ve en az 12 karakterlik şifre oluşturun. Şifreyi tekrar yazın ve **Hesabı oluştur** seçeneğine basın.
3. Hesap bu bilgisayara ait okul idarecisi olarak oluşturulur. Kurulum talebi veya yetki dosyası gerekmez.
4. Giriş bilgilerini kullanarak uygulamaya girin. Kullanıcı adı ve şifre Belgeler/VarYok altındaki TXT dosyasına da yazılır.

**Güvenlik:** TXT dosyasını açabilen biri şifrenizi okuyabilir. Bilgisayar hesabınızı kilitleyin ve dosyanın erişimini sınırlayın. Şifrenizi paylaşırsanız bu kişinin hesabınızla yapabileceği işlemleri de paylaşmış olursunuz. Uygulama kişisel veri güvenliğine ilişkin kurumsal yükümlülüklerin yerine geçtiğini garanti etmez.

## Şifremi unuttum

Giriş ekranında **Şifremi unuttum** düğmesini seçin. Bilgisayardaki Belgeler/VarYok klasörünün ilgili alt klasörü açılır; uygun TXT dosyasını açıp kullanıcı adınızı ve şifrenizi görebilirsiniz. Klasör otomatik açılmazsa Windows Dosya Gezgini üzerinden Belgeler/VarYok konumuna gidin. Şifre değiştirildiğinde ilgili TXT güncellenir. TXT dosyasını silmek veritabanını silmez ama bu basit hatırlatma yöntemini kullanamazsınız; yöneticinin şifre sıfırlama yetkisi ilgili hesaplarla sınırlıdır.

## Sınıfları ve öğrencileri hazırlama

1. **Okul / sınıf kurulumu → Okul / sınıf** bölümünde sınıf düzeyini ve şubeyi girin. Eğitim öğretim yılı otomatik önerilir; listeden başka bir yıl seçebilir veya gelecek yılları YYYY-YYYY biçiminde yazabilirsiniz. Sınıfı kaydedin.
2. **Öğrenci ekle** bölümünde sınıfı, okul numarasını ve adı soyadı yazın. Kimlik numarası ve veli alanları isteğe bağlıdır. Gerekli kayıtları tamamlayın.
3. Toplu aktarım için **e-Okul İçe Aktar** bölümünden öğrenci listesi veya haftalık ders programını seçin. Excel şablonunu indirip sütun başlıklarına göre doldurun; örnek satırı kaldırın ve doğru sınıfa XLSX veya UTF-8 CSV olarak yükleyin. Bu işlem e-Okul hesabınıza otomatik bağlanmaz.
4. Yeni yıl başladığında o yıla ait sınıfları oluşturup listeleri tekrar içe aktarın. Aynı okul numarasındaki öğrenci yeni sınıfa taşınır; önceki yoklamaları geçmişte kalır. Öğrenci bir üst sınıfa otomatik geçirilmez. Boş bırakılan isteğe bağlı veli ve kimlik alanları mevcut bilgilerle korunur.
5. **Ders saatleri** ve **Ders programı** bölümlerinde gerçek saatleri, günleri ve öğretmenleri tanımlayın. Öğretmenin erişebileceği sınıf, kayıtlı güncel dersine göre sınırlandırılır.

## Kullanıcılar

İlk hesapla **Öğretmen & Personel Tanımla** bölümünden uygun rolde kullanıcı oluşturabilirsiniz. Yönetici tarafından verilen geçici şifrenin ilk girişte değiştirilmesi istenir. Hesap açılması ve şifre değiştirme işlemleri aynı bilgisayarın yerel veritabanını etkiler; başka bir bilgisayarda otomatik hesap açmaz. Veli veya öğrenci hesabının ilgili kayıtları görmesi için **Okul / sınıf kurulumu → Hesap eşleştirme** bölümünde doğru öğrenciye bağlanması gerekir.

Her hesap için oluşturulan TXT aynı Windows kullanıcısının Belgeler/VarYok dizinindedir. Bu klasörün ortak Windows oturumunda aynı oturumu kullanan diğer kişilerce okunabileceğini dikkate alın.

## Yoklama alma ve rapor

1. **Yoklama Al** ekranında sınıfı ve ders saatini seçin. Öğretmen hesabında o anda programda bulunan sınıf gösterilir.
2. Her öğrenci için Geldi, Gelmedi, Geç veya İzinli durumunu belirleyin; ardından **Yoklamayı Kaydet** düğmesine basın.
3. Ders ve tarih ayrı tutulur. Daha sonra aynı derste düzeltme yapmak gerekiyorsa ilgili kayıt güncellenir. Sınıf seçerken yanındaki eğitim öğretim yılını kontrol edin; aynı şubenin önceki yıl kaydı ayrıca seçilebilir. Başka bir oturum aynı kaydı değiştirmişse listeyi yenileyip tekrar deneyin.
4. Kaydetmeden sonra ekrandaki sonucu okuyun. Excel başarısız olsa bile veritabanı kaydı tamamlanmış olabilir; uyarıya göre masaüstü klasörü ve yazma izinlerini kontrol edin.
5. Masaüstündeki **Yoklamalar** klasöründen ilgili ayı ve tarih klasörünü açın. Dosya adı sınıf, tarih ve oluşturma saatini içerir. Bir sınıfın aynı gündeki tüm kaydedilmiş derslerinde **Gelmedi** işaretlenen öğrenciler raporda dersleriyle birlikte yer alır. İsimler maskelidir. Her kayıt yeni bir dosya oluşturabilir; en güncel dosyayı saatine göre seçin.
6. **Ders & Yoklama Matrisi** ile geçmiş tarih seçilebilir; **Excel olarak indir** seçilen günün gelmeyenlerini dışa aktarır.

Eylül-Temmuz klasörleri oluşturulur. Ağustos ayı için kayıt yapılırsa ayrıca Ağustos klasörü oluşturulur. Aynı dakikadaki raporlar üzerine yazılmaz; ada sıra numarası eklenir.

Örnek dosya yolu: `Masaüstü/Yoklamalar/03-Kasım/04.11.2026/6-A_04.11.2026_09-15.xlsx`. Dosyadaki adlar maskeli olsa da öğrenci numarasıyla kişi belirlenebileceğinden dosya kişisel veri içerir. Raporları yalnızca görevi gereği erişmesi gereken kişilerle paylaşın.

## Diğer ekranlar

- **Ödev Paneli** ve **Duyurular** uygulamanın yerel kayıtlarıdır. Diğer bilgisayarlara kendiliğinden gönderilmezler.
- **Bildirimler** uygulama içi kayıtları gösterir. Bu sürümde e-posta ve push gönderimi kapalıdır.
- **Acil Durum** kaydı uygulama içindedir; SMS, telefon araması, haricî siren veya dış bildirim göndermez.
- **KVKK Öğrenci & Veli Paneli** maskeli bilgileri gösterir. Yetkili tam bilgiyi görüntülemeye çalıştığında şifre ve gerekçe istenen işlemler günlüğe kaydedilir. Windows dosya sistemi üzerinden yapılan her erişimin uygulama tarafından kaydedildiği varsayılmamalıdır.
- **Hesabım** üzerinden şifre değiştirilir. TXT dosyası da güncellenir.

## Yedek ve geri yükleme

İdareci olarak **Okul / sınıf kurulumu → Sistem / yedek → Yedek oluştur** seçeneğini kullanın. Yedek, Belgeler/VarYok Yedekleri altında tarihli bir klasöre yazılır. Veritabanı ve şifreleme anahtarı birlikte bulunmalıdır. Yedek kişisel veri içerir; güvenli ve erişimi kısıtlı bir yerde saklayın. TXT şifre dosyaları ve masaüstü Excel raporları bu yedeğe dahil edilmez; gerekiyorsa bunları ayrıca koruyun.

Geri yükleme öncesi uygulamayı kapatın. Mevcut `%APPDATA%/VarYok/okul-verileri` klasörünü silmeden başka bir güvenli yere kopyalayın. Sonra aynı yedeğe ait `eyoklama.db`, `encryption-key.json` ve varsa diğer dosyaları bu klasöre taşıyın. Şifreleme anahtarı başka bir yedekten olmamalıdır. Bu işlem Windows üzerinde ayrıca pilot test gerektirir.

Önceki adı Dersteyim olan bir kurulumdan geçişte kayıtlar `%APPDATA%/Dersteyim/okul-verileri` içinde kalabilir. Yeni VarYok veri klasörü henüz yoksa uygulama önceki klasörü kullanır; şifre dosyaları da eski Belgeler/Dersteyim klasöründe kalabilir. İki klasör de varsa uygulama kayıtları kendiliğinden birleştirmez. Dosyaları silmeden önce ikisini ayrı ayrı yedekleyip yetkili teknik destekle durumu değerlendirin.

## Kişisel verilerle çalışma

Öğrenci listesi, sınıf numarası, yoklama, rapor ve yedekler korunması gereken kişisel veriler içerebilir. İhtiyacınız olmayan T.C. kimlik numarası, veli iletişimi ve benzeri isteğe bağlı alanları doldurmayın. Ders notuna veya diğer serbest alanlara sağlık bilgisi ve devamsızlık gerekçesi yazmayın. Maskeleme veya çevrimdışı çalışma tek başına anonimlik sağlamaz.

Okul, öğrencileri ve velileri kendi işlemine uygun aydınlatma metniyle bilgilendirmekten ve bu yükümlülüğü yerine getirdiğini gösterebilmekten sorumlu veri sorumlusunu belirlemelidir. Program deposundaki taslak metinler her okul için doğrulanmadan aynen kullanılmamalıdır. Masaüstü veya Belgeler klasörü bir bulut hizmetiyle eşitleniyorsa bu hizmetin ayrıca değerlendirilmesi gerekir.

## Sorun giderme

- **Uygulama açılmıyor:** Windows 10/11 x64 kullandığınızı ve indirdiğiniz paketin tamamlandığını kontrol edin. Hata sürerse `%APPDATA%/VarYok/okul-verileri/dersteyim.log` dosyasını inceleyin. Günlükleri paylaşmadan önce içinde kişisel veri olup olmadığını kontrol edin.
- **Yanlış kullanıcı adı veya şifre:** Doğru Windows hesabında Belgeler/VarYok içindeki TXT dosyasını kontrol edin. Çok sayıda hatalı denemeden sonra 15 dakika beklemeniz gerekebilir.
- **Sınıf görünmüyor:** İdareci olarak sınıf ve öğrenci kayıtlarını; öğretmen olarak ders programını, dersi ve okulun ders saatlerini kontrol edin.
- **Excel oluşmadı:** Masaüstü konumunun erişilebilir ve yazılabilir olduğundan emin olun; dosya açıksa kapatıp yoklamayı kontrol ederek tekrar deneyin. Hata mesajında veritabanı kaydının durumu ayrıca belirtilir.
- **Başka bilgisayarda hesap veya kayıt yok:** Bu sürümde her kurulum bağımsızdır. Ağ üzerinden otomatik paylaşım veya eşitleme yapılmaz.
- **E-posta/push gitmiyor:** Bu sürümde bilerek kapalıdır. İnternet açmak veya süre beklemek bunları etkinleştirmez.
- **Kaldırma:** Kurulum sürümünün kaldırılması programı kaldıracak, kullanıcı verilerini koruyacak biçimde yapılandırılmıştır. Bu davranış henüz gerçek Windows cihazında doğrulanmamıştır; kaldırmadan önce bağımsız bir yedek alın.

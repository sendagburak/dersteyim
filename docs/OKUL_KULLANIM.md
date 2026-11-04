# VarYok okul kullanım kılavuzu

Bu kılavuz Windows yerel masaüstü deneme sürümü içindir. Gerçek öğrenci verileriyle kullanmadan önce kurumun yetki, güvenlik ve KVKK değerlendirmesi tamamlanmalıdır. Her bilgisayardaki kayıtlar ayrıdır; okulun diğer bilgisayarlarıyla otomatik eşitleme yapılmaz.

## Hızlı başlangıç: tek bilgisayarda yoklama

1. VarYok'u okulun belirlediği bilgisayarda açın. İlk açılışta bir kullanıcı adı ve şifre oluşturun, ardından giriş yapın.
2. **Okul / sınıf kurulumu → Okul / sınıf** bölümünde sınıfları ve şubelerini oluşturun. Her sınıf için eğitim yılını kontrol edin.
3. **Öğrenci ekle** bölümünden öğrencileri tek tek ekleyin veya **e-Okul İçe Aktar** bölümündeki şablonla sınıf listelerini yükleyin.
4. **Yoklama Al** bölümünde sınıfı, tarihi ve ders saatini seçin; gelmeyenleri işaretleyin ve **Yoklamayı Kaydet** düğmesine basın.
5. Masaüstünde **Yoklamalar** klasörünü açıp ay, gün ve sınıfın dosyasını kontrol edin. Kayıt işleminden sonra ekranda hata olup olmadığını da okuyun.

İlk hesap tek başına yeterlidir; bütün sınıfların yoklamasını alabilir. Ek kullanıcı, öğretmen hesabı, veli hesabı ve haftalık ders programı günlük yoklama için zorunlu değildir. Bu kılavuz ilk kurulum, giriş ve uygulama içindeki **Kullanım kılavuzu** bağlantısından internet olmadan açılabilir.

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
5. **Ders saatleri** bölümünden okulun ders başlangıç ve bitiş saatlerini gerekirse düzeltin. İlk hesapla yoklama almak için haftalık ders programı tanımlamak gerekmez. Ayrı öğretmen hesapları kullanılacaksa **Ders programı (isteğe bağlı)** bölümünde öğretmen, sınıf, gün ve ders saatlerini tanımlayın; öğretmen hesabının yoklama erişimi güncel programıyla sınırlandırılır.

## Ek kullanıcılar ve personel: isteğe bağlı

İlk hesapla tüm sınıfların yoklaması alınabilir. Gerçekten ayrı hesap gerektiren durumlarda **Ek kullanıcılar (isteğe bağlı)** bölümünden uygun rolde kullanıcı oluşturabilirsiniz. Yönetici tarafından verilen geçici şifrenin ilk girişte değiştirilmesi istenir. Hesap açılması ve şifre değiştirme işlemleri aynı bilgisayarın yerel veritabanını etkiler; başka bir bilgisayarda otomatik hesap açmaz. Bir öğretmen hesabıyla yoklama alınacaksa bu öğretmenin güncel dersi **Okul / sınıf kurulumu → Ders programı (isteğe bağlı)** bölümünde tanımlanmalıdır. Veli veya öğrenci hesabının ilgili kayıtları görmesi için **Okul / sınıf kurulumu → Hesap eşleştirme (isteğe bağlı)** bölümünde doğru öğrenciye bağlanması gerekir.

Her hesap için oluşturulan TXT aynı Windows kullanıcısının Belgeler/VarYok dizinindedir. Bu klasörün ortak Windows oturumunda aynı oturumu kullanan diğer kişilerce okunabileceğini dikkate alın.

## Yoklama alma ve rapor

1. İlk hesapla giriş yapın. **Yoklama Al** ekranında sınıfı, tarihi ve ders saatini seçin. Seçtiğiniz sınıfın yanındaki eğitim öğretim yılının doğru olduğuna bakın. Ayrı bir öğretmen hesabı kullanıyorsanız o anda programda bulunan sınıf gösterilir.
2. Öğrenciler başlangıçta **Geldi** olarak işaretlenir. Gelmeyenleri **Gelmedi**, gerekiyorsa diğer öğrencileri **Geç** veya **İzinli** olarak işaretleyin; listeyi kontrol ettikten sonra **Yoklamayı Kaydet** düğmesine basın. Kaydetmeden başka sınıfa geçmeyin.
3. Ders ve tarih ayrı tutulur. Daha sonra aynı derste düzeltme yapmak gerekiyorsa ilgili kayıt güncellenir. Sınıf seçerken yanındaki eğitim öğretim yılını kontrol edin; aynı şubenin önceki yıl kaydı ayrıca seçilebilir. Başka bir oturum aynı kaydı değiştirmişse listeyi yenileyip tekrar deneyin.
4. Kaydetmeden sonra ekrandaki sonucu okuyun. Excel başarısız olsa bile veritabanı kaydı tamamlanmış olabilir; uyarıya göre masaüstü klasörü ve yazma izinlerini kontrol edin.
5. Masaüstündeki **Yoklamalar** klasöründen ilgili ayı ve tarih klasörünü açın. Dosya adı sınıf, tarih ve oluşturma saatini içerir. Bir sınıfın aynı gündeki tüm kaydedilmiş derslerinde **Gelmedi** işaretlenen öğrenciler raporda dersleriyle birlikte yer alır. İsimler maskelidir. Her kayıt yeni bir dosya oluşturabilir; en güncel dosyayı saatine göre seçin.
6. **Ders & Yoklama Matrisi** ile geçmiş tarih seçilebilir; **Excel olarak indir** seçilen günün gelmeyenlerini dışa aktarır.

Eylül-Temmuz klasörleri oluşturulur. Ağustos ayı için kayıt yapılırsa ayrıca Ağustos klasörü oluşturulur. Aynı dakikadaki raporlar üzerine yazılmaz; ada sıra numarası eklenir.

Örnek dosya yolu: `Masaüstü/Yoklamalar/03-Kasım/04.11.2026/6-A_04.11.2026_09-15.xlsx`. Dosyadaki adlar maskeli olsa da öğrenci numarasıyla kişi belirlenebileceğinden dosya kişisel veri içerir. Raporları yalnızca görevi gereği erişmesi gereken kişilerle paylaşın.

## Acil durum ve sesli alarm

1. Bilgisayar açıkken hoparlörün bağlı, Windows ses çıkışının doğru ve ses düzeyinin duyulabilir olduğundan emin olun.
2. İlk hesapla sağ üstteki **Acil Durum** düğmesine basın. Yangın, deprem, tahliye, güvenlik veya sağlık türlerinden uygun olanı seçin.
3. İsterseniz **Seçili sesi dene** düğmesine basın. Kısa bir örnek çalar; bu işlem alarm kaydı başlatmaz. Sesler uygulama tarafından üretilir, internet ve dışarıdan ses dosyası indirmek gerekmez.
4. Mesajı kurumun ilgili acil durum planına göre kontrol edin. **Alarmı onayla ve başlat** düğmesine bastığınızda kayıt oluşturulur; açık uygulamada uyarı görünür ve bilgisayarın ses çıkışından seçilen alarm tekrarlanır.
5. Yetkili kişi tehlikenin sona erdiğini değerlendirdiğinde **Alarmı Kapat / Normale Dön** düğmesine basar. Uyarı kapanır ve ses durur.

Ses başlamazsa alarm şeridindeki **Sesi etkinleştir** düğmesine basın; Windows ses düzeyini, seçili ses aygıtını ve hoparlör bağlantısını kontrol edin. Bu özellik yalnızca bu bilgisayarın mevcut ses çıkışını kullanır; tüm okula duyulması bağlı ses sistemine ve ses düzeyine bağlıdır. Bilgisayar veya uygulama kapalıyken ses çalmaz. Yeniden girişte etkin bir alarm görünürse sesi ayrıca etkinleştirmek gerekebilir.

VarYok SMS, telefon araması, push veya haricî sirene otomatik komut göndermez; resmî yangın, tahliye, deprem uyarı ve acil çağrı sistemlerinin yerine geçmez. Hangi durumda nasıl hareket edileceğini kurumun yürürlükteki planı ve yetkilileri belirler.

## Diğer ekranlar

- **Ödev Paneli** ve **Duyurular** uygulamanın yerel kayıtlarıdır. Diğer bilgisayarlara kendiliğinden gönderilmezler.
- **Bildirimler** uygulama içi kayıtları gösterir. Bu sürümde e-posta ve push gönderimi kapalıdır.
- **Acil Durum** uyarısı ve sesi uygulamanın açık olduğu bilgisayardadır; SMS, telefon araması, haricî siren veya dış bildirim göndermez.
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
- **Acil durum sesi duyulmuyor:** Önce ekrandaki **Sesi etkinleştir** düğmesini, ardından Windows'un doğru hoparlöre ses gönderdiğini ve uygulama/cihaz sesinin kısık olmadığını kontrol edin. Alarm ekranındaki **Seçili sesi dene** düğmesi kayıt oluşturmadan deneme yapar; etkin alarm sırasında deneme düğmesi kullanılamaz.
- **E-posta/push gitmiyor:** Bu sürümde bilerek kapalıdır. İnternet açmak veya süre beklemek bunları etkinleştirmez.
- **Kaldırma:** Kurulum sürümünün kaldırılması programı kaldıracak, kullanıcı verilerini koruyacak biçimde yapılandırılmıştır. Bu davranış henüz gerçek Windows cihazında doğrulanmamıştır; kaldırmadan önce bağımsız bir yedek alın.

# Yerel okul modu: veri envanteri taslağı

Bu tablo bir kurumsal VERBİS envanteri yerine geçmez. Yol ve davranışlar 1.3 geliştirme koduna göre hazırlanmıştır; gerçek Windows paketinde ayrıca doğrulanmalıdır. Kurum, işlemediği alanları kendi envanterinden çıkarır; amaç, hukuki sebep, süre ve alıcı bilgilerini gerçek duruma göre tamamlar.

| Veri / kişi grubu | Nerede ve ne amaçla | Durum / dikkat |
| --- | --- | --- |
| Öğrenci adı, numarası, sınıf, ders, tarih ve devam durumu | Yerel SQLite veritabanı; yoklama ve geçmişi | Öğrenci numarası ve sınıf kişiyi belirlenebilir kılar. İsimlerin bir bölümü şifreli veya maskeli tutulsa da bütün veritabanı şifreli değildir. |
| T.C. kimlik numarası, veli adı/e-posta/telefonu, cinsiyet | İsteğe bağlı olarak öğrenci kaydı / içe aktarma | İş amacına uygun ihtiyaç yoksa girilmez. T.C. numarası ve kimi iletişim alanları uygulama anahtarıyla şifrelenir; anahtarın ele geçirilmesi korumayı etkiler. |
| Kullanıcı adı, rol, şifre özeti, kullanıcı ve işlem kayıtları | Yerel veritabanı; yetkilendirme ve işlem takibi | Kayıtlar ve oturum bilgileri kişisel veri içerebilir. İşlem günlüklerinin otomatik imha süresi yoktur. |
| Kullanıcı adı ve **açık şifre** | Belgeler/VarYok altındaki TXT; istenen şifre hatırlatma işlevi | Dosyayı okuyabilen kullanıcı hesaba girebilir. Windows ACL ve bulut eşitlemesi özellikle incelenmelidir. Yüksek risk. |
| Maskeli öğrenci adı, okul numarası, sınıf, tarih ve gelmediği dersler | Masaüstü/Yoklamalar/ay/gün klasöründeki XLSX raporları | Parolasızdır, otomatik yeni kopyalar oluşur. Maskelenmiş adla birlikte okul numarası kişiyi belirleyebilir; anonim veri değildir. |
| Veritabanı ve ilgili anahtar dosyaları | Kullanıcı istediğinde Belgeler/VarYok Yedekleri | Yedek kişisel veri içerir; anahtar veriyle birlikte yer alabilir. Ayrı erişim ve koruma gerekir. TXT şifre klasörü bu yedekte değildir. |
| Kullanıcı adı, kayıt zamanları ve teknik hata bilgileri | Uygulama veri klasöründeki günlükler ve audit kayıtları | Sunucunun her dosya erişimini kaydettiği varsayılmamalıdır; hata içeriği ve saklama süresi gözden geçirilmelidir. |
| Öğrenci / personel bilgilerinin içe aktarıldığı XLSX/CSV | Kullanıcının seçtiği yerel kaynak dosya | İçe aktarımdan sonra kaynak dosya kendiliğinden imha edilmez; okul ayrıca yönetir. |
| Genel ders notu, duyuru ve diğer serbest metinler | Yerel veritabanı | Sağlık gibi özel nitelikli veriler girilmemelidir; teknik olarak her yanlış girişin engellendiği garanti edilmez. |

Okul modunda uygulama e-posta veya push gönderecek şekilde yapılandırılmamıştır. Farklı bilgisayardaki kurulumlar otomatik eşitlenmez. İşletim sistemi, antivirüs, yedekleme veya bulut eşitleme servislerinin kendi faaliyetleri bu iddianın dışındadır. Yazılımın indirilmesinde kullanılan GitHub ve tarayıcı ayrı hizmetlerdir.

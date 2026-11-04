# Hukuki değerlendirme ve yayın öncesi açık konular

İnceleme tarihi: 4 Kasım 2026. Bu belge yazılımın gözlenen tasarımına ve aşağıdaki resmî kaynaklara dayalı çalışma notudur; kişiye özel hukuk görüşü, kurum izni, marka tescil sorgusu veya KVKK uygunluk sertifikası değildir. Gerçek okul kullanımı öncesinde yetkili kurumun hukuk, bilgi güvenliği ve ilgili veri sorumlusu birimleri somut işleyişi değerlendirmelidir.

## 1. Veri sorumlusu ve aydınlatma

Okulun veya üst kurumun hangi sıfatla hareket ettiği; verilerin amaç ve araçlarına kimin karar verdiği, fiilî süreç ve yetki ilişkilerine göre belirlenir. Her kurulum için veri sorumlusunun kesinlikle geliştirici, okul müdürlüğü veya MEB olduğu varsayılmaz. İndirme sayfasının GitHub üzerinden sunulması ile uygulamanın okul bilgisayarındaki çalışması ayrı veri akışlarıdır.

KVKK m.10 kapsamında kimlik, amaç, alıcı, toplama yöntemi ve somut hukuki sebep ile m.11 hakları açıklanmalıdır. 18.02.2026 tarihli 2026/347 sayılı Kurul ilke kararı, aydınlatmanın rızadan bağımsız olması, rıza gerekiyorsa metinlerin ayrılması, başka kurum metinlerinin uyarlanmadan kopyalanmaması ve metinlerin açık olması gerektiğini vurgular. Bu nedenle kısa, kuruma uyarlanacak bir [aydınlatma taslağı](AYDINLATMA_TASLAGI.md) ve ayrı ayrıntılı değerlendirme hazırlanmıştır. Uygulamayı açan öğretmenin bilgilendirilmesi öğrenci veya velinin aydınlatılmasının otomatik kanıtı değildir.

## 2. Amaç, hukuki sebep ve ölçülülük

Devam kaydı bir eğitim faaliyetiyle ilişkili olsa da bu tek başına her okulun bu ek yazılımı, her alanı ve bütün kopyaları işlemesi için otomatik hukuki dayanak oluşturmaz. Her kurum; okul türüne ilişkin güncel düzenlemeyi, e-Okul sorumluluklarını, yerel ek kopyanın gerekli ve orantılı olup olmadığını ve her amaç için m.5'teki somut şartı belirlemelidir. Açık rıza her durumda gerekli değildir ve kurumun tercihine göre varsayılan dayanak olarak kullanılmamalıdır.

Ad, okul numarası, sınıf ve yoklama durumu kişisel veridir. Raporlarda adın maskelenmesi, aynı satırdaki okul numarasıyla kişinin belirlenebilmesi nedeniyle veriyi kendiliğinden anonimleştirmez. T.C. kimlik numarası, veli iletişimi ve cinsiyet isteğe bağlıdır; amaç için gerekli değilse alınmamalıdır. Notlar ve serbest yazı alanlarına tanı, sağlık raporu veya başka özel nitelikli veri girilmemelidir. Uygulama tüm serbest metni otomatik tespit ve engelleme garantisi vermez.

## 3. Yerel veri akışı ve güvenlik sınırları

İncelenen masaüstü okul modunda kendi Electron penceresi ve aynı bilgisayarda 127.0.0.1 üzerinde çalışan bir servis bulunur; e-posta ve push varsayılan ve masaüstü modunda kapalıdır. SQLite veritabanı ve anahtar uygulamanın kullanıcı verileri klasöründe, yoklama XLSX dosyaları masaüstünde, talep edilen yedekler ve şifre TXT dosyaları Belgeler'de bulunur. Ayrıntı [veri envanterindedir](VERI_ENVANTERI.md).

**Yüksek risk — açık şifre dosyası:** Kullanıcının önceki ürün tercihi gereği hesap adı ve şifresi okunabilir TXT dosyasındadır. Bu dosyayı okuyan bir kişi hesaba girebilir; veritabanındaki scrypt özeti bu kopyayı korumaz. Windows'ta Node'un `mode` parametresi tek başına doğrulanmış NTFS erişim listesi değildir. Şifre dosyalarının herkese açık bilgisayarlarda kullanımı ve kullanıcı profilinin paylaşımı ayrıca risklidir. Daha güvenli parola kurtarma yöntemi kararlaştırılmadan ve test edilmeden KVKK güvenliği sağlandı denemez.

**Diğer açık noktalar:** Anahtar ile veritabanı aynı kullanıcı profilinde bulunabilir; uygulama yedeklerinde birlikte kopyalanır. Excel raporları parolalı/şifreli değildir. Masaüstü veya Belgeler OneDrive gibi bir servisle eşitlenebilir. Programın uygulama içi günlüğü, Windows üzerinden dosyaya erişimleri tam olarak göstermez. Otomatik, kuruma uygun saklama süresi ve kişi bazlı tam silme/yedeklerden imha işlevi doğrulanmış değildir. Kullanılan Windows hesabı, dosya erişimleri, disk şifreleme, yedekler ve bulut eşitlemesi okulun ayrıca yönetmesi gereken alanlardır.

## 4. Saklama, başvuru ve ihlal yönetimi

Kurum mevzuat ve amaca göre saklama sürelerini, yedeklerin ömrünü ve silme yöntemini belirlemelidir; yazılıma rastgele bir yıllık süre atanamaz. KVKK m.13 çerçevesinde başvuruların en geç 30 gün içinde sonuçlandırılması ve tebliğ usulünün uygulanması gerekir. Kanuna aykırı elde edilme durumu tespit edildiğinde yetkili veri sorumlusu Kurulun 2019/10 sayılı kararındaki bildirim ve etkilenen kişilere bildirme yükümlülüklerini gecikmeden değerlendirir. Silme talebi, bütün kayıtların her durumda ve hemen silineceği anlamına gelmez; diğer yasal saklama yükümlülükleri incelenir.

## 5. İsim, kurumsal görünüm, telif ve üçüncü taraf lisansları

4 Kasım 2026 tarihli sınırlı web araştırmasında “VarYok” adının [bir sanat sergisi](https://www.yunt.art/varyok) için kullanıldığı görüldü. Bir [üçüncü taraf marka dizininde](https://www.trademarkia.com/varyok-99211682) de ABD'de 35. sınıfla ilişkili aynı adlı bir kayıt iddiası yer alıyor; kayıt durumu ve kapsamı resmî ABD sicilinden bu incelemede doğrulanmadı. Bu bulgular Türkiye'deki kullanımın ihlal oluşturduğunu veya oluşturmadığını göstermez. TÜRKPATENT'in [marka araştırma ekranında](https://www.turkpatent.gov.tr/arastirma-yap?form=trademark) kelime, benzer işaret ve ilgili sınıflar; gerektiğinde diğer siciller uzman tarafından araştırılmalıdır. Türkiye sicilinden doğrulanmış sonuç bu incelemede yoktur. İsim tescile uygundur veya risksizdir denemez.

Depo sahibinin seçtiği kaynak lisansı MIT'tir. Kod, ikon, logo, isim ve kurumsal iletişim üzerindeki gerçek hak sahipliği ve kurum adına dağıtım yetkisi doğrulanmalıdır. Kurum adı, resmî logo, gov alanını andıran uygulama kimliği veya arayüzdeki kurumsal ifadeler resmî onay izlenimi doğurabilir. Kullanım izni ve temsil yetkisi doğrulanana dek resmî MEB ürünü olarak tanıtılmamalıdır. Kaynaktaki mevcut telif bildirimleri inceleme tamamlanmadan silinmez; bunların varlığı mülkiyetin doğrulandığı anlamına gelmez.

Electron, Node, React, ExcelJS ve diğer bağımlılıkların ve dağıtılan ikililerin lisans ve telif bildirimleri korunmalıdır. Sadece projenin MIT olması bütün bağımlılıkların MIT olduğu anlamına gelmez. Dağıtılacak gerçek paketin bağımlılık ve lisans envanteri, yapıdan üretilerek ayrıca doğrulanmalıdır. Program kodunun ve grafik varlıklarının kaynağı ve kullanım hakları da incelenmelidir.

## 6. Sonuç ve yayın sınırı

Programın bu aşamada gerçek öğrenci verileriyle okullara dağıtımı önerilmez. Ayrı uzman güvenlik taraması, yüksek risklerin giderilmesi, Windows'ta kurulum/kaldırma ve veri yolları testleri, bağımlılık/lisans kontrolü, kurumsal izin ve marka incelemesi ile her veri sorumlusuna özgü metnin onayı tamamlanmalıdır. Sıfır güvenlik açığı veya otomatik hukuki uygunluk garantisi verilmez.

## Resmî ve birincil kaynaklar

- [KVKK: Aydınlatma yükümlülüğü](https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-)
- [KVKK: 2026/347 sayılı ilke kararı duyurusu](https://www.kvkk.gov.tr/Icerik/8710/veri-sorumlulari-tarafindan-acik-riza-ve-aydinlatma-metinlerinin-ayri-ayri-duzenlenmesi-gerektigi-hakkinda-kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu)
- [KVKK: Veri güvenliği rehberi](https://www.kvkk.gov.tr/Icerik/4198/Kisisel-Veri-Guvenligi-Rehberi-%28Teknik-ve-Idari-Tedbirler%29)
- [KVKK: Kişisel verilerin silinmesi ve imhası](https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi)
- [KVKK: İlgili kişi başvurusuna cevap](https://www.kvkk.gov.tr/Icerik/2046/Ilgili-Kisiler-Tarafindan-Yapilan-Basvurularin-Cevaplanmasi-Yukumlulugu)
- [KVKK: 2019/10 veri ihlali bildirimi kararı](https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi)
- [KVKK: T.C. kimlik numaralarının işlenmesi rehberi](https://www.kvkk.gov.tr/Icerik/7798/Turkiye-Cumhuriyeti-Kimlik-Numaralarinin-Islenmesi-Hakkinda-Rehber)
- [Aile ve Sosyal Hizmetler Bakanlığı: Ortaöğretim kurumları yönetmeliği, devam/devamsızlık](https://aile.gov.tr/eyhgm/mevzuat/ulusal-mevzuat/yonetmelikler/milli-egitim-bakanligi-ortaogretim-kurumlari-yonetmeligi/); her okul türü için ilgili güncel resmî metin ayrıca doğrulanmalıdır.
- [OSI: MIT lisansı](https://opensource.org/license/mit)

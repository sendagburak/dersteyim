# VarYok 1.3 geliştirme durumu

Bu depo kaynak kodudur. Windows iş akışının deneme çıktıları GitHub Actions üzerinde üretilir; kaynak deposunun kendisi bir EXE içermez.

## Yapılanlar

Yerel ilk kullanıcı oluşturma, şifre TXT dosyaları, sınıf ve gün bazında devamsızlık Excel'i, yedekleme, sonraki eğitim öğretim yılları ve geçmiş kayıtların korunması kodlandı. Uygulamanın kendi masaüstü penceresinde açılması için Electron kabuğu ve Windows derleme iş akışı hazırlandı. E-posta ve push okul modunda kapalıdır.

## Doğrulama

Linux ve Windows iş akışında Node ile 36 otomatik test geçti. Windows iş akışında hem paketlenmiş uygulama hem taşınabilir EXE, örnek hesap, sonraki eğitim yılı ve yoklama XLSX'iyle sınandı. Testlerde gerçek kişi verisi kullanılmadı. Okul cihazlarında gerçek kurulum, kaldırma, ekranların kapsamlı kontrolü ve uzman güvenlik incelemesi tamamlanmadı. Kaynak deposu kullanıcı verisi, okul kayıtları, özel anahtar veya üretilmiş EXE içermez.

## Tamamlanması gerekenler

1. Üretilen taşınabilir ve kurulum EXE'lerini okulun Windows 10/11 x64 cihazlarında, pencere, veri yolları, Excel, yedek, kurulum ve kaldırma akışlarıyla sınayın.
2. Bağımsız güvenlik taraması, kod imzalama ve kurum adı/logo/telif yetkilerini gözden geçirin. Şifrelerin düz metin saklanmasının riskini değerlendirin.
3. Kılavuzları, doğrulanmış son sürüme ve kurumun gerçek işleyişine göre güncelleyin.
4. Yalnızca bu adımlardan sonra okullara yayımlayın. Windows 7/8 ve 32 bit desteklenmemektedir.

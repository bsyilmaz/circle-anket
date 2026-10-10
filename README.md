# circle: doğrulama anketi

Tek sayfalık, mobil öncelikli bir anket. Ürünü anlatmaz, yalnızca problemi ölçer.
Her IP'den tek yanıt kabul eder ve Vercel'de çalışır.

## Yayına alma (yaklaşık 10 dakika)

1. Bu klasörü yeni bir GitHub reposuna yükle. Yerelde: `git init && git add . && git commit -m anket && git push`.
2. vercel.com → **Add New → Project** → repoyu seç → **Deploy**. Framework seçme ("Other" kalsın).
3. Proje → **Storage** sekmesi → **Upstash for Redis**'i (Marketplace) projeye bağla. Ücretsiz plan yeterli.
   Bu adım `KV_REST_API_URL` ve `KV_REST_API_TOKEN` değişkenlerini kendiliğinden ekler.
4. Proje → **Settings → Environment Variables** bölümüne şunları ekle:
   | Değişken | Değer | Ne işe yarar |
   |---|---|---|
   | `IP_SALT` | uzun rastgele bir metin | IP'ler bununla özetlenir (hash); açık IP hiçbir yerde saklanmaz |
   | `ADMIN_KEY` | uzun rastgele bir şifre | Sonuçları indirmek için gerekir |
   | `MAX_PER_IP` | `1` | Aynı IP'den kabul edilecek yanıt sayısı |
   | `MIN_SECONDS` | `15` | Bundan hızlı doldurulan yanıtlar bot sayılır |
5. **Deployments → Redeploy**. Bitti.

> Redis bağlanmazsa site yine açılır, ama yanıtlar sunucu belleğinde tutulur ve kaybolur.
> Yayına almadan önce bir deneme yanıtı gönder; ardından aşağıdaki CSV bağlantısıyla geldiğini doğrula.

## Sonuçları indirme

- Yanıtlar (CSV, Excel'de açılır): `https://SITEN.vercel.app/api/results?key=ADMIN_KEY`
- JSON: sonuna `&format=json` ekle.

CSV'nin ilk sütunu ad soyad. Raporlarda ve sunumda isim kullanmayın; yalnızca toplam sayılar gösterilir.

## Kanal takibi

Linki her kanalda farklı paylaş: `?r=whatsapp`, `?r=dernek`, `?r=linkedin`, `?r=instagram`.
CSV'deki `ref` sütunu, hangi kanalın nitelikli yanıt getirdiğini gösterir.

## "Tek IP, tek yanıt" hakkında bilinmesi gerekenler

- Türkiye'de mobil operatörler çok sayıda kullanıcıyı aynı IP arkasında toplar (CGNAT). Kampüs ve iş yeri Wi-Fi'leri de öyle.
  Bu yüzden bazı gerçek katılımcılar "zaten yanıt verilmiş" ekranını görebilir.
  Bu durum sık yaşanırsa `MAX_PER_IP` değerini 3 yap. Tarayıcı tarafında ayrıca localStorage işareti de kontrol ediliyor.
- VPN ile IP değiştiren biri tekrar doldurabilir. Ankete olan güveni `seconds` sütunu ve açık uçlu cevapların kalitesi gösterir.

## Sorular neden böyle yazıldı

Anketi genç katılımcılar (hackathon çevresi) dolduruyor; sorular onların ailesindeki büyük hakkında.
The Mom Test (Rob Fitzpatrick) ilkelerine göre yazıldı:
- **Ürün anlatılmıyor ve "alır mıydın?" sorulmuyor.** Bunun yerine geçmiş davranış ve bugünkü durum soruluyor.
- **Her soruda "Bilmiyorum" seçeneği var.** Genç katılımcı, ailesinde olan her şeyi bilmeyebilir. Uydurma cevap, boş cevaptan kötüdür.
- **Tek kişisel bilgi ad soyad.** Katılımın gerçek kişilerden geldiğini göstermek için alınıyor; e-posta ya da telefon istenmiyor.
- Ailesinde böyle biri olmayanlar ilk soruda bitiriyor ve ayrıca sayılıyor.
- 12 zorunlu soru + 1 isteğe bağlı açık uçlu soru, yaklaşık 2 dakika. Sıkılan bırakır; kısa anket daha dürüst veri getirir.

## Karar kriterleri (veri gelmeden ÖNCE ekipçe sabitleyin)

Yalnızca `rol` = ayri ya da ayni olan yanıtlarla hesapla. "Bilmiyorum" cevaplarını paydadan çıkar.

| Hipotez | Ölçüm | Geçme eşiği (öneri) |
|---|---|---|
| Ailelerde endişe sık ve gerçek | `son_endise` ∈ {hafta, ay} | ≥ %40 |
| Olay yaşanıyor | `olay` içinde hicbiri ya da bilmiyorum dışında en az bir seçenek | ≥ %35 |
| Yük tek kişinin üzerinde | `kontrol_kimde` ∈ {ben, tek_kisi} | ≥ %50 |
| Birden fazla kişiye haber gitmeli | `haber` sorusunda 2 veya daha fazla kişi seçilmesi | ≥ %60 |
| Bugün emek ya da para harcanıyor | `rutin` ≠ yok veya `harcama` > 0 | ≥ %50 |
| Doktor paneli ihtiyacı | `doktor` ∈ {kontrolde, gormuyor} | ≥ %50 |
| Bileklik formu kabul görüyor | `bilek` ∈ {her_gun, ara_sira, takabilir} | ≥ %60 |
| İlgi | `gorusme` = evet | ≥ %15 |

En az 60–100 hedef yanıt topla ve "evet" diyenlerle 10 birebir görüşme yap.
Anket "ne kadar yaygın?" sorusuna, görüşmeler "neden?" sorusuna cevap verir.

## Dosyalar

- `index.html`: anketin tamamı (sorular dosyanın başındaki `Q` dizisinde)
- `api/submit.js`: yanıtı kaydeder, IP limitini uygular
- `api/check.js`: sayfa açılırken bu IP'nin daha önce yanıt verip vermediğini kontrol eder
- `api/results.js`: CSV/JSON dışa aktarım (ADMIN_KEY ile)
- `api/_lib.js`: depolama, IP özeti, ayarlar

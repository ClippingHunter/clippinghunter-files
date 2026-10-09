# ClippingHunter — file download

Repo ini tempat nyimpen file yang didownload app **ClippingHunter**. Kode app-nya gak ada di sini; yang ada
cuma script kecil buat nyalin yt-dlp otomatis (`scripts/`, `.github/workflows/`).

| Rilis | Isi |
|---|---|
| [`ytdlp-<versi>`](https://github.com/officialgercepai/clippinghunter-files/releases) | salinan otomatis yt-dlp (lihat di bawah); versi terbarunya di [`ytdlp/latest.json`](ytdlp/latest.json) |
| [`music-v2`](https://github.com/officialgercepai/clippinghunter-files/releases/tag/music-v2) | pustaka musik latar versi 2 (dipakai app sekarang) |
| [`music-v1`](https://github.com/officialgercepai/clippinghunter-files/releases/tag/music-v1) | pustaka musik latar versi 1 (app versi lama) |

## yt-dlp (salinan otomatis, rilis `ytdlp-<versi>`)

App ClippingHunter pakai [yt-dlp](https://github.com/yt-dlp/yt-dlp) buat ngambil video dari link. Tiap hari
GitHub Actions ([`.github/workflows/ytdlp.yml`](.github/workflows/ytdlp.yml)) ngecek rilis resmi terbarunya.
Kalau ada versi baru:

1. `yt-dlp.exe`, `yt-dlp.tar.gz`, `SHA2-256SUMS` + `SHA2-256SUMS.sig` didownload dari rilis resmi;
2. tanda tangan GPG `SHA2-256SUMS` dicek pakai kunci rilis yt-dlp
   ([`ytdlp/yt-dlp-signing-key.asc`](ytdlp/yt-dlp-signing-key.asc), fingerprint
   `AC0C BBE6 848D 6A87 3464 AF4E 57CF 6593 3B5A 7581`), terus SHA-256 tiap file dicocokin. Gak cocok = gak disalin
   (dan GitHub ngirim email ke pemilik repo);
3. semua file disalin apa adanya (gak diubah) ke rilis `ytdlp-<versi>`, yang gak pernah ditandai "Latest",
   bareng teks lisensi & source code yang diminta lisensinya;
4. versi terbarunya dicatat di [`ytdlp/latest.json`](ytdlp/latest.json) (dibaca app: link salinan ini, link resmi,
   ukuran, SHA-256).

Script-nya: [`scripts/mirror-ytdlp.mjs`](scripts/mirror-ytdlp.mjs) (bisa dicoba tanpa upload apa-apa:
`node scripts/mirror-ytdlp.mjs --dry-run`, butuh Node 20+, `gpg` & `gpgv`).

**Lisensi:** yt-dlp sendiri berlisensi [Unlicense](https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE), tapi
`yt-dlp.exe` (dibikin pakai PyInstaller) ngebundel komponen lain yang sebagian berlisensi GPL, jadi `yt-dlp.exe`
secara keseluruhan berlisensi **GPLv3+**. Tiap rilis `ytdlp-<versi>` bawa `THIRD_PARTY_LICENSES.txt`, source
yt-dlp, script build + versi pasti tiap library yang dibundel, dan source library copyleft yang dibundel
(keterangan lengkap di halaman tiap rilis). Source yang kamu butuh gak ketemu? Buka
[issue](https://github.com/officialgercepai/clippinghunter-files/issues).

## Pustaka musik latar

Semua lagu berlisensi **CC0 1.0 Universal** (public domain,
https://creativecommons.org/publicdomain/zero/1.0/): boleh dipakai, diubah, dan dibagikan ulang,
termasuk buat komersial, tanpa izin dan tanpa wajib nyebut pembuatnya. Pembuatnya tetap kami sebut
di bawah sebagai terima kasih. Lisensi tiap lagu dicek di halaman lagunya (v1: 2026-10-08, v2: 2026-10-09).

### `music-v2` (dipakai app sekarang)

File-nya ada di rilis [`music-v2`](https://github.com/officialgercepai/clippinghunter-files/releases/tag/music-v2): 43 lagu, 9 mood, dikompres jadi
Ogg Opus 96 kbps dari file asli Free Music Archive (selain itu gak diubah). App download tiap lagu pas pertama
kali dipakai. SHA-256 tiap file keliatan di halaman rilis itu.

| Mood | Lagu | Artis | File | Halaman asli |
|---|---|---|---|---|
| Santai | Bubbles | HoliznaCC0 | `santai-bubbles.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/bubbles-lofi-bright-relaxed/) |
| Santai | Calm Currents | HoliznaCC0 | `santai-calm-currents.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/calm-currents-lofi-relax-calm/) |
| Santai | Ocean Breeze | HoliznaCC0 | `santai-ocean-breeze.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/ocean-breeze-lofi-ukulele-peaceful-mp3/) |
| Santai | Barque sur le lac | Komiku | `santai-barque-sur-le-lac.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure_/Komiku_-_Its_time_for_adventure_-_04_Barque_sur_le_lac/) |
| Lo-fi | Tokyo Sunset | HoliznaCC0 | `lofi-tokyo-sunset.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/tokyo-sunset-lofi-peaceful-soft/) |
| Lo-fi | Morning Coffee | HoliznaCC0 | `lofi-morning-coffee.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/lo-fi-and-chill/morning-coffee/) |
| Lo-fi | Shimmer | HoliznaCC0 | `lofi-shimmer.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/shimmer-lofi-chill/) |
| Lo-fi | Roof Tops | HoliznaCC0 | `lofi-roof-tops.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/summer-air-lo-fi/roof-tops/) |
| Lo-fi | Chillin with a drink at the club | Loyalty Freak Music | `lofi-chillin-with-a-drink.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/TO_CHILL_AND_STAY_AWAKE/Loyalty_Freak_Music_-_TO_CHILL_AND_STAY_AWAKE_-_03_Chillin_with_a_drink_at_the_club/) |
| Semangat | Yippee ! | Loyalty Freak Music | `semangat-yippee.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/POSITIVE_ATTITUDE_/Loyalty_Freak_Music_-_POSITIVE_ATTITUDE__-_08_Yippee_/) |
| Semangat | High Technologic Beat Explosion | Loyalty Freak Music | `semangat-beat-explosion.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROBOT_DANCE_/Loyalty_Freak_Music_-_ROBOT_DANCE__-_02_High_Technologic_Beat_Explosion/) |
| Semangat | Jams | HoliznaCC0 | `semangat-jams.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/rock-montage/jams/) |
| Semangat | 50 Over The Speed Limit | HoliznaCC0 | `semangat-50-over-the-speed-limit.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/power-pop/50-over-the-speed-limit/) |
| Semangat | I'M ON FIRE | Loyalty Freak Music | `semangat-im-on-fire.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROLLER_DISCO_DANCE_DANCE/Loyalty_Freak_Music_-_ROLLER_DISCO_DANCE_DANCE_-_03_IM_ON_FIRE/) |
| Semangat | Battle Theme | Komiku | `semangat-battle-theme.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure__vol_2/Komiku_-_Its_time_for_adventure_vol_2_-_03_Battle_Theme/) |
| Jualan / Upbeat | Roller Fever | Loyalty Freak Music | `jualan-roller-fever.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROLLER_DISCO_DANCE_DANCE/Loyalty_Freak_Music_-_ROLLER_DISCO_DANCE_DANCE_-_01_Roller_Fever/) |
| Jualan / Upbeat | Can't Stop My Feet ! | Loyalty Freak Music | `jualan-cant-stop-my-feet.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROLLER_DISCO_DANCE_DANCE/Loyalty_Freak_Music_-_ROLLER_DISCO_DANCE_DANCE_-_04_Cant_Stop_My_Feet_/) |
| Jualan / Upbeat | Go to the Picnic | Loyalty Freak Music | `jualan-go-to-the-picnic.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/POSITIVE_ATTITUDE_/Loyalty_Freak_Music_-_POSITIVE_ATTITUDE__-_01_Go_to_the_Picnic/) |
| Jualan / Upbeat | Funky Pop | HoliznaCC0 | `jualan-funky-pop.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/power-pop/funky-pop/) |
| Jualan / Upbeat | Happy Dance | HoliznaCC0 | `jualan-happy-dance.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/power-pop/happy-dance-2/) |
| Inspiratif | Walking Away | HoliznaCC0 | `inspiratif-walking-away.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/walking-away-lofi-peaceful-motivating/) |
| Inspiratif | Hope On Repeat | HoliznaCC0 | `inspiratif-hope-on-repeat.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/spring-woke-me-up/hope-on-repeat/) |
| Inspiratif | Feeling Human Again | HoliznaCC0 | `inspiratif-feeling-human-again.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/spring-woke-me-up/feeling-human-again/) |
| Inspiratif | Ambiant Hope | Komiku | `inspiratif-ambiant-hope.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/The_Binge_Watchers__Score_1/Komiku_-_The_Binge_Watchers_-_Score_1_-_10_Ambiant_Hope/) |
| Inspiratif | Friends's theme | Komiku | `inspiratif-friends-theme.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure__vol_5/Komiku_-_Its_time_for_adventure_vol_5_-_06_Friendss_theme/) |
| Sedih | Canon Event | HoliznaCC0 | `sedih-canon-event.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/canon-event-lofi-sad-reflection/) |
| Sedih | Forgotten Keep Sakes | HoliznaCC0 | `sedih-forgotten-keep-sakes.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/forgotten-keep-sakes-lofi-sad-mp3/) |
| Sedih | Never Sleeping | HoliznaCC0 | `sedih-never-sleeping.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/never-sleeping-lofi-dark-sad/) |
| Sedih | Sad walk with sad melodica | Komiku | `sedih-sad-walk-melodica.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure__vol_2/Komiku_-_Its_time_for_adventure_vol_2_-_14_Sad_walk_with_sad_melodica/) |
| Sedih | Drifting Piano | HoliznaCC0 | `sedih-drifting-piano.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/background-music/drifting-piano/) |
| Dramatis | Lullabies For The End Of The World #1 | HoliznaCC0 | `dramatis-lullabies-1.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/lullabies-for-the-end-of-the-world/lullabies-for-the-end-of-the-world-1/) |
| Dramatis | La Citadelle | Komiku | `dramatis-la-citadelle.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure_/Komiku_-_Its_time_for_adventure_-_05_La_Citadelle/) |
| Dramatis | Action Epic | Komiku | `dramatis-action-epic.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/The_Binge_Watchers__Score_1/Komiku_-_The_Binge_Watchers_-_Score_1_-_11_Action_Epic/) |
| Dramatis | Every myths are true stories | Komiku | `dramatis-every-myths.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure__vol_4/Komiku_-_Its_time_for_adventure_vol_4_-_02_Every_myths_are_true_stories/) |
| Misterius | Creepy Piano 1 | HoliznaCC0 | `misterius-creepy-piano-1.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/background-music/creepy-piano-1/) |
| Misterius | Cabin Fever | HoliznaCC0 | `misterius-cabin-fever.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/background-music/cabin-fever/) |
| Misterius | Quelques rues sombres | Komiku | `misterius-quelques-rues-sombres.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure_/Komiku_-_Its_time_for_adventure_-_10_Quelques_rues_sombres/) |
| Misterius | A really dark alley | Loyalty Freak Music | `misterius-a-really-dark-alley.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/WITCHY_BATTY_SPOOKY_HALLOWEEN_IN_SEPTEMBER_/A_really_dark_alley/) |
| Misterius | Ambiant Obscur Technology | Komiku | `misterius-obscur-technology.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/The_Binge_Watchers__Score_1/Komiku_-_The_Binge_Watchers_-_Score_1_-_18_Ambiant_Obscur_Technology/) |
| Lucu | Mushrooms | Komiku | `lucu-mushrooms.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Captain_Glouglous_Incredible_Week_Soundtrack/bibliothque/) |
| Lucu | Hug Convoy | Loyalty Freak Music | `lucu-hug-convoy.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/POSITIVE_ATTITUDE_/Loyalty_Freak_Music_-_POSITIVE_ATTITUDE__-_02_Hug_Convoy/) |
| Lucu | Cat City | Komiku | `lucu-cat-city.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Poupis_incredible_adventures_/Komiku_-_Poupis_incredible_adventures__-_15_Cat_City/) |
| Lucu | Time for the walk of the day | Komiku | `lucu-walk-of-the-day.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Poupis_incredible_adventures_/Komiku_-_Poupis_incredible_adventures__-_03_Time_for_the_walk_of_the_day/) |

### `music-v1` (app versi lama)

File-nya ada di rilis
[`music-v1`](https://github.com/officialgercepai/clippinghunter-files/releases/tag/music-v1)
(SHA-256 tiap file keliatan di halaman rilis itu). File MP3 disalin apa adanya (gak diubah) dari Free Music Archive.

| Mood | Lagu | Artis | File | Halaman asli |
|---|---|---|---|---|
| Santai | Bubbles | HoliznaCC0 | `santai-bubbles.mp3` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/bubbles-lofi-bright-relaxed/) |
| Santai | Calm Currents | HoliznaCC0 | `santai-calm-currents.mp3` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/calm-currents-lofi-relax-calm/) |
| Semangat | Phonk ish | HoliznaCC0 | `semangat-phonk-ish.mp3` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/phonk-aura-farming/phonk-ish/) |
| Semangat | Yippee ! | Loyalty Freak Music | `semangat-yippee.mp3` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/POSITIVE_ATTITUDE_/Loyalty_Freak_Music_-_POSITIVE_ATTITUDE__-_08_Yippee_/) |
| Dramatis | Lullabies For The End Of The World #1 | HoliznaCC0 | `dramatis-lullabies-1.mp3` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/lullabies-for-the-end-of-the-world/lullabies-for-the-end-of-the-world-1/) |
| Dramatis | La Citadelle | Komiku | `dramatis-la-citadelle.mp3` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure_/Komiku_-_Its_time_for_adventure_-_05_La_Citadelle/) |
| Lucu | Mushrooms | Komiku | `lucu-mushrooms.mp3` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Captain_Glouglous_Incredible_Week_Soundtrack/bibliothque/) |
| Lucu | Hug Convoy | Loyalty Freak Music | `lucu-hug-convoy.mp3` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/POSITIVE_ATTITUDE_/Loyalty_Freak_Music_-_POSITIVE_ATTITUDE__-_02_Hug_Convoy/) |

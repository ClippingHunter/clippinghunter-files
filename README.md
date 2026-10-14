# ClippingHunter — file download

Repo ini tempat nyimpen file yang didownload app **ClippingHunter**. Kode app-nya gak ada di sini; yang ada
cuma script kecil buat nyalin yt-dlp & komponen dari sumber resminya (`scripts/`, `.github/workflows/`).

| Rilis | Isi |
|---|---|
| [`app-v<versi>`](https://github.com/ClippingHunter/clippinghunter-files/releases/tag/app-v1.0.0) | installer app & update otomatis (tiap rilis ada `release.json` yang ditandatangani). Pembeli download lewat https://lisensi.clippinghunter.id/download |
| [`ffmpeg-n8.1.3-ch1`](https://github.com/ClippingHunter/clippinghunter-files/releases/tag/ffmpeg-n8.1.3-ch1) | FFmpeg yang ikut di installer (LGPL): source persis, script build, binary |
| [`components-v1`](https://github.com/ClippingHunter/clippinghunter-files/releases/tag/components-v1) | mesin transkrip (whisper.cpp) & model AI yang didownload di layar Setup (lihat di bawah) |
| [`ytdlp-<versi>`](https://github.com/ClippingHunter/clippinghunter-files/releases) | salinan otomatis yt-dlp (lihat di bawah); versi terbarunya di [`ytdlp/latest.json`](ytdlp/latest.json) |
| [`music-v3`](https://github.com/ClippingHunter/clippinghunter-files/releases/tag/music-v3) | pustaka musik latar versi 3: 43 lagu tambahan (8 mood baru), dipakai app mulai 1.0.3 bareng `music-v2` |
| [`music-v2`](https://github.com/ClippingHunter/clippinghunter-files/releases/tag/music-v2) | pustaka musik latar versi 2 (dipakai app sekarang) |
| [`music-v1`](https://github.com/ClippingHunter/clippinghunter-files/releases/tag/music-v1) | pustaka musik latar versi 1 (app versi lama) |

## Komponen app (rilis `components-v<N>`)

Mesin transkrip & model AI yang didownload app di layar Setup. Daftarnya ada di
[`components/components-v1.json`](components/components-v1.json) (sumber resmi + SHA-256 yang dipatok); rilisnya
dibikin GitHub Actions ([`.github/workflows/components.yml`](.github/workflows/components.yml), dijalanin manual):
file resmi didownload & dicek SHA-256-nya, model AI disalin apa adanya, dan dari zip resmi whisper.cpp cuma
diambil file yang dipakai app (+ teks lisensinya). Ukuran & SHA-256 semua file, termasuk tiap file di dalam zip,
dicatat di `components-v1.lock.json` (di rilisnya & di folder [`components/`](components/)). Isi rilis yang udah
jadi gak pernah diubah: komponen baru = rilis baru.

Lisensi: whisper.cpp & ggml MIT; DLL NVIDIA CUDA 12.4 (cuma di zip `…-cuda12.4.zip`) = "Redistributable Software"
NVIDIA CUDA Toolkit EULA, dibagiin cuma sebagai bagian dari app ClippingHunter; model Whisper (OpenAI), Silero
VAD & YuNet MIT.

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
[issue](https://github.com/ClippingHunter/clippinghunter-files/issues).

## Pustaka musik latar

Semua lagu berlisensi **CC0 1.0 Universal** (public domain,
https://creativecommons.org/publicdomain/zero/1.0/): boleh dipakai, diubah, dan dibagikan ulang,
termasuk buat komersial, tanpa izin dan tanpa wajib nyebut pembuatnya. Pembuatnya tetap kami sebut
di bawah sebagai terima kasih. Lisensi tiap lagu dicek di halaman lagunya (v1: 2026-10-08, v2: 2026-10-09, v3: 2026-10-14).

### `music-v3` (tambahan, dipakai app mulai 1.0.3)

File-nya ada di rilis [`music-v3`](https://github.com/ClippingHunter/clippinghunter-files/releases/tag/music-v3): 43 lagu tambahan (8 mood baru + 3 lagu Lucu),
dikompres jadi Ogg Opus 96 kbps dari file asli Free Music Archive (selain itu gak diubah). Tiap lagu juga dicek gak ada
nyanyian/omongan di dalamnya. App download tiap lagu pas pertama kali dipakai. SHA-256 tiap file keliatan di halaman rilis itu.

| Mood | Lagu | Artis | File | Halaman asli |
|---|---|---|---|---|
| Horor | Tension In The Air | HoliznaCC0 | `horor-tension-in-the-air.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/beats-from-the-crypt/tension-in-the-air/) |
| Horor | Someones In The Attic | HoliznaCC0 | `horor-someones-in-the-attic.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/beats-from-the-crypt/someones-in-the-attic/) |
| Horor | Halloween Soundscape | HoliznaCC0 | `horor-halloween-soundscape.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/horseless-headman-halloween-beats/halloween-soundscape/) |
| Horor | Haunted Houses | HoliznaCC0 | `horor-haunted-houses.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/horseless-headman-halloween-beats/haunted-houses/) |
| Horor | The graveyard | Loyalty Freak Music | `horor-the-graveyard.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/WITCHY_BATTY_SPOOKY_HALLOWEEN_IN_SEPTEMBER_/The_graveyard/) |
| Petualangan | Fouler l'horizon | Komiku | `petualangan-fouler-lhorizon.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure_/Komiku_-_Its_time_for_adventure_-_01_Fouler_lhorizon/) |
| Petualangan | Pirates libertaires | Komiku | `petualangan-pirates-libertaires.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure_/Komiku_-_Its_time_for_adventure_-_12_Pirates_libertaires/) |
| Petualangan | L'orage et l'aventure | Komiku | `petualangan-lorage-et-laventure.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure_/Komiku_-_Its_time_for_adventure_-_15_Lorage_et_laventure/) |
| Petualangan | Pensive Adventure | HoliznaCC0 | `petualangan-pensive-adventure.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/retro-gamer-soundtrack/pensive-adventure/) |
| Petualangan | Introduction to your adventure | Komiku | `petualangan-introduction-to-your-adventure.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/ULTRA_PERSON_VOL1/Komiku_-_ULTRA_PERSON_VOL1_-_01_Introduction_to_your_adventure/) |
| Nostalgia | Remember the time we use to play | Komiku | `nostalgia-remember-the-time.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Tale_on_the_Late/Komiku_-_Tale_on_the_Late_-_02_Remember_the_time_we_use_to_play/) |
| Nostalgia | The road we use to travel when we were kids | Komiku | `nostalgia-the-road-we-use-to-travel.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Tale_on_the_Late/Komiku_-_Tale_on_the_Late_-_03_The_road_we_use_to_travel_when_we_were_kids/) |
| Nostalgia | Childhood scene | Komiku | `nostalgia-childhood-scene.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure__vol_3/Komiku_-_Its_time_for_adventure_vol_3_-_01_Childhood_scene/) |
| Nostalgia | The place that never get old | Komiku | `nostalgia-the-place-that-never-get-old.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure__vol_3/Komiku_-_Its_time_for_adventure_vol_3_-_07_The_place_that_never_get_old/) |
| Nostalgia | Life On Cassette | HoliznaCC0 | `nostalgia-life-on-cassette.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/be-happy-with-who-you-are/life-on-cassette/) |
| Serius | Action Investigation | Komiku | `serius-action-investigation.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/The_Binge_Watchers__Score_1/Komiku_-_The_Binge_Watchers_-_Score_1_-_06_Action_Investigation/) |
| Serius | Ambiant Truth | Komiku | `serius-ambiant-truth.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/The_Binge_Watchers__Score_1/Komiku_-_The_Binge_Watchers_-_Score_1_-_08_Ambiant_Truth/) |
| Serius | Ambiant Wait | Komiku | `serius-ambiant-wait.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/The_Binge_Watchers__Score_1/Komiku_-_The_Binge_Watchers_-_Score_1_-_16_Ambiant_Wait/) |
| Serius | Let's be serious a second | Loyalty Freak Music | `serius-lets-be-serious-a-second.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON/Loyalty_Freak_Music_-_INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON_-_11_Lets_be_serious_a_second/) |
| Serius | The Decision | Loyalty Freak Music | `serius-the-decision.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON/Loyalty_Freak_Music_-_INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON_-_14_The_Decision/) |
| Disko | Grab A Partner | Loyalty Freak Music | `disko-grab-a-partner.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROLLER_DISCO_DANCE_DANCE/Loyalty_Freak_Music_-_ROLLER_DISCO_DANCE_DANCE_-_05_Grab_A_Partner/) |
| Disko | Sweat Time ! | Loyalty Freak Music | `disko-sweat-time.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROLLER_DISCO_DANCE_DANCE/Loyalty_Freak_Music_-_ROLLER_DISCO_DANCE_DANCE_-_07_Sweat_Time_/) |
| Disko | Dance Robot ACTIVATE | Loyalty Freak Music | `disko-dance-robot-activate.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROLLER_DISCO_DANCE_DANCE/Loyalty_Freak_Music_-_ROLLER_DISCO_DANCE_DANCE_-_02_Dance_Robot_ACTIVATE/) |
| Disko | We used To Dance | HoliznaCC0 | `disko-we-used-to-dance.opus` | [Free Music Archive](https://freemusicarchive.org/music/holiznacc0/waves-of-nostalgia-2/we-used-to-dance/) |
| Disko | Disco Challenge | Komiku | `disko-disco-challenge.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Helice_Awesome_Dance_Adventure_/disco-challenge/) |
| Ending bahagia | Victory | Komiku | `ending-victory.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure__vol_2/Komiku_-_Its_time_for_adventure_vol_2_-_15_Victory/) |
| Ending bahagia | Credits, thank you for playing | Komiku | `ending-credits-thank-you.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure__vol_5/Komiku_-_Its_time_for_adventure_vol_5_-_13_Credits_thank_you_for_playing/) |
| Ending bahagia | Together we are stronger | Komiku | `ending-together-we-are-stronger.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Poupis_incredible_adventures_/Komiku_-_Poupis_incredible_adventures__-_59_Together_we_are_stronger/) |
| Ending bahagia | Sweet Sun | Loyalty Freak Music | `ending-sweet-sun.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/POSITIVE_ATTITUDE_/Loyalty_Freak_Music_-_POSITIVE_ATTITUDE__-_04_Sweet_Sun/) |
| Ending bahagia | Sunset on the beach | Komiku | `ending-sunset-on-the-beach.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Poupis_incredible_adventures_/Komiku_-_Poupis_incredible_adventures__-_55_Sunset_on_the_beach/) |
| Ngendap-ngendap | Gang of alley cats | Komiku | `ngendap-gang-of-alley-cats.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Poupis_incredible_adventures_/Komiku_-_Poupis_incredible_adventures__-_17_Gang_of_alley_cats/) |
| Ngendap-ngendap | Tenacious, incompetent, honorous, scientist, bouffon (evil side kick theme) | Komiku | `ngendap-evil-side-kick-theme.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Its_time_for_adventure__vol_5/Komiku_-_Its_time_for_adventure_vol_5_-_02_Tenacious_incompetent_honorous_scientist_bouffon_evil_side_kick_theme/) |
| Ngendap-ngendap | Monster Parade | Loyalty Freak Music | `ngendap-monster-parade.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/WITCHY_BATTY_SPOOKY_HALLOWEEN_IN_SEPTEMBER_/Monster_Parade/) |
| Ngendap-ngendap | The Old Witch Place | Loyalty Freak Music | `ngendap-the-old-witch-place.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/WITCHY_BATTY_SPOOKY_HALLOWEEN_IN_SEPTEMBER_/The_Old_Witch_Place/) |
| Ngendap-ngendap | Intensive puzzle resolution | Komiku | `ngendap-intensive-puzzle-resolution.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Poupis_incredible_adventures_/Komiku_-_Poupis_incredible_adventures__-_36_Intensive_puzzle_resolution/) |
| Jedag-jedug | After Party | Loyalty Freak Music | `jedag-after-party.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROBOT_DANCE_/Loyalty_Freak_Music_-_ROBOT_DANCE__-_03_After_Party/) |
| Jedag-jedug | Everyone is so alive | Loyalty Freak Music | `jedag-everyone-is-so-alive.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROBOT_DANCE_/Loyalty_Freak_Music_-_ROBOT_DANCE__-_01_Everyone_is_so_alive/) |
| Jedag-jedug | Action Techno | Komiku | `jedag-action-techno.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/The_Binge_Watchers__Score_1/Komiku_-_The_Binge_Watchers_-_Score_1_-_20_Action_Techno/) |
| Lucu | Mall | Komiku | `lucu-mall.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Captain_Glouglous_Incredible_Week_Soundtrack/mall_1328/) |
| Lucu | School | Komiku | `lucu-school.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Captain_Glouglous_Incredible_Week_Soundtrack/school/) |
| Lucu | Poupi on a scooter | Komiku | `lucu-poupi-on-a-scooter.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Poupis_incredible_adventures_/Komiku_-_Poupis_incredible_adventures__-_21_Poupi_on_a_scooter/) |
| Jedag-jedug | It feels good to be alive too | Loyalty Freak Music | `jedag-it-feels-good-to-be-alive.opus` | [Free Music Archive](https://freemusicarchive.org/music/Loyalty_Freak_Music/ROBOT_DANCE_/Loyalty_Freak_Music_-_ROBOT_DANCE__-_04_It_feels_good_to_be_alive_too/) |
| Jedag-jedug | Dance with two or more | Komiku | `jedag-dance-with-two-or-more.opus` | [Free Music Archive](https://freemusicarchive.org/music/Komiku/Helice_Awesome_Dance_Adventure_/dance-with-two-or-more/) |

### `music-v2` (dipakai app sekarang)

File-nya ada di rilis [`music-v2`](https://github.com/ClippingHunter/clippinghunter-files/releases/tag/music-v2): 43 lagu, 9 mood, dikompres jadi
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
[`music-v1`](https://github.com/ClippingHunter/clippinghunter-files/releases/tag/music-v1)
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

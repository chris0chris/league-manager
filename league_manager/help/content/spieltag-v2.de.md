# Scorecard v2

Die Scorecard v2 ist die neue Erfassung am Feld (Beta). Sie führt dich von der
Spieltagsauswahl bis zum abgeschickten Ergebnis und schreibt dieselben Einträge
wie die bisherige Scorecard
([Ergebnisse erfassen](/help/ergebnisse-erfassen/)).

<figure class="help-figure">
  <img src="/static/help/img/spieltag-v2.png" alt="Scorecard v2 im Spiel: Spielstand, Ballbesitz, Aktionen und Spielverlauf mit Rückgängig">
  <figcaption>Im Spiel: Spielstand, Ballbesitz, Aktionen und der Spielverlauf – jeder Eintrag lässt sich rückgängig machen.</figcaption>
</figure>

## Schritt für Schritt

1. Öffne **Team → 📱 Scorecard v2 (Beta)** (oder `/scorecard/v2/`) und tippe auf
   einen Spieltag unter **Meine Spieltage**.
   Laufende Spiele setzen die Erfassung fort, geplante öffnen **Spiel
   vorbereiten**.
2. Prüfe in **Spiel vorbereiten** die Offiziellen und ihre Lizenzen, halte
   **Münzwurf gewonnen von**, **Erster Ballbesitz** und **Spielrichtung** fest
   und tippe auf **Spiel starten**. Optional wählst du im Abschnitt
   **Quarterback (optional)** für jedes Team die Trikotnummer; sie ist beim
   ersten Pass und beim Versuch vorausgewählt und gilt auf jedem Gerät.
   **Jetzt starten** bestätigt den Start.
   Die Schalter für **Münzwurf gewonnen von** und **Erster Ballbesitz** tragen
   die Teamfarben (Heim rot, Gast grün). Die **Münzwahl** hat immer das
   Gastteam – das zweit genannte Team; der Hinweis steht direkt unter dem
   Schalter. Die **Spielrichtung** liegt zwischen den Endzonen **Nord** und
   **Süd** (die Seitenlinie verläuft Ost–West); der Pfeil zeigt auf die
   Endzone, die angegriffen wird.
3. Erfasse im laufenden Spiel (oben stehen Feld und Runde) jeden Spielzug
   über die Kacheln **Pass**, **Run** oder **Sack** – der Assistent fragt in
   dieser Reihenfolge: **Spielzug** → **Ergebnis** → **Quarterback und
   Trikotnummer** (ein Schritt) → **Defense** → **Feldposition** (zuletzt).
   Übersprungene Schritte (kein QB beim Lauf, kein Tackle beim Sack, kein
   Tackler beim Touchdown) fallen weg. Im Schritt **Feldposition** trägst du
   den Raumgewinn als **Yards** oder über die **Feldposition** (A/B + 0–25)
   ein; darunter steht die Vorschau, z. B. **2nd & M · A19** oder bei einem
   scheiternden vierten Versuch **Turnover on downs**. Die Vorschau ist grün
   hinterlegt wie das Ergebnis beim Münzwurf – sie zeigt nur, was der Eintrag
   bewirkt.
   **Touchdown** trägt die Distanz bis zur Endzone
   ein und blendet den Verlust-Schalter aus; **Safety** (bei Run, Sack und
   Pass) trägt den Weg bis zur eigenen Endzone ein.
   **Interception** fragt zusätzlich Verteidiger, **Ballbesitz ab** und
   optional **Pick six (Touchdown)**. Sobald du **Return-Yards** einträgst,
   gilt der Return als beendet und der Touchdown wird wieder abgewählt.
   Die Verteidiger-Trikotnummer steht unter
   **Defense**; bei einem unvollständigen Pass zuerst **Deflection** wählen.
   Unter dem Ballbesitz steht der **Down & Distanz** (z. B. **2nd & M**) mit
   der Feldposition (z. B. **A12**). Das Feld ist 50 Yards lang: **A** ist die
   eigene Hälfte (0–25), **M** die Mittellinie und **B** die gegnerische
   Hälfte (B20 = gegnerische 20-Yard-Linie). Jeder Angriff startet bei **A5**
   mit **1st & M**; wer die Mittellinie erreicht, bekommt **1st & G** und hat
   vier Versuche bis zur Endzone. Ein nicht verwandelter vierter Versuch gibt
   den Ball ab und schreibt eine eigene **Turnover**-Zeile in den
   Spielverlauf.

   **Mehr** öffnet die übrigen Einträge: **Turnover**, **1st Down**,
   **Safety**, **Overtime**, **Challenge**, **Feldposition** und
   **Touchdown (Kurzform)** für ein Spiel ohne Spielzug-Erfassung. Die
   **Feldposition** setzt A/B + 0–25 und hält über Reloads, weil sie als
   Eintrag im Spielverlauf steht; sie setzt auch **Down** (1–4) und **Line to
   gain** (**M** oder **G**), wenn du sie von Hand korrigierst. **Challenge**
   hält einen Einspruch fest – ohne Text oder mit einer kurzen Begründung.

   Ein **Touchdown** zählt fürs Team auch **ohne Trikotnummer** (**Ohne
   Nummer**) – die Nummer ist Statistik, nicht die Bedingung für die sechs
   Punkte. Nach einem Touchdown bleibt der Ball bei der Mannschaft, die den
   Versuch spielt; **+1** oder **+2** öffnet die Trikotwahl – der
   Touchdown-Schütze ist vorausgewählt, du kannst aber den tatsächlichen
   Verwandler wählen (ohne eingetragenen Schützen wählst du frei). Der
   **Quarterback** steht im Versuch als Nummer mit **ändern** daneben;
   **nicht verwandelt** beendet den Versuch und gibt den Ball ab. Eine
   **Strafe** bleibt auch während des Versuchs erreichbar und wiederholt ihn
   vom verschobenen Punkt.

   Eine **Auszeit** nimmst du über die Kachel **Auszeit** oder die Kreise
   neben dem Team im Spielstand: **●●** heißt zwei Auszeiten übrig, **●○**
   eine, **○○** keine. Der Dialog zeigt, wer wann welche Auszeit genommen hat,
   und lässt dich oben zwischen beiden Teams wechseln. Er fragt optional die
   **Restliche Spielzeit** (mm:ss; ein leeres Feld zählt als 0) und zählt
   danach 60 Sekunden herunter. Eine dritte Auszeit in einer
   Halbzeit verlangt einen zweiten Tipp (**Trotzdem erfassen**) und erinnert an
   die Strafe „Auszeit ohne verbleibende Auszeit“ (5 Yards). Eine **Auszeit**
   trägt sich unabhängig davon ein, wer den Ball hat. **Overtime** startet die
   Verlängerung; danach wird der Versuch zum **+1 XP**.
   **1st Down** und **Turnover** werden sofort gespeichert; bei **1st Down**
   trägst du die Trikotnummer nach, wenn du die Kachel innerhalb von 10
   Sekunden noch einmal tippst (**Nr. ergänzen**). Eine **Interception** läuft
   über den Spielzug-Assistenten (**Pass** → **Interception**).

   Bei **Strafe** stehen die fünf häufigsten oben, der Rest alphabetisch.
   **Yardage** und **Nächster Versuch** (Wiederholung, First Down, Loss of
   Down) sind aus der Strafe vorbelegt und bleiben änderbar. Die
   Trikotnummer ist standardmäßig **Ohne Nummer**; **Ganzes Team** steht als
   eigene Kachel am Ende der Nummern. Bei
   **Disqualifikation** ist die Trikotnummer Pflicht. Bei **Unsportlichem
   Verhalten** trägst du die Nummer(n) als Freitext ein (optional, mehrere mit
   Komma oder Leerzeichen); das Sheet zeigt die bisherigen UNV des Teams und
   warnt, wenn es für eine Nummer der zweite ist – dann ist die Person
   automatisch disqualifiziert. Die Feldposition wird vom letzten Spot aus
   verschoben, höchstens bis zur halben Distanz zur Endzone; über die
   Mittellinie wird daraus **1st & G**. Eine später eingetragene
   **Feldposition** gewinnt immer: Sie verschiebt den Ball und die
   eingetragenen **Down**/**Line to gain** – ohne Angabe bleibt der laufende
   Versuch stehen – **1st** gibt es erst, wenn die Mittellinie (in Goal-to-go
   die Endzone) erreicht ist oder das Team wechselt.

   Die Trikotwahl zeigt Namen nur aus dem **bestätigten Passcheck** des
   Spieltags; ohne Passcheck stehen die Nummern ohne Namen da. Die
   Nummerntasten tragen die Farbe des Teams, dessen Nummer du eingibst – Rot
   für die Heim-, Grün für die Gastmannschaft –, auch bei der
   Verteidiger-Nummer, wenn das Heimteam den Ball hat.

   **Halbzeit** öffnet einen Dialog mit Spielstand, **Ballbesitz 2.
   Halbzeit** und der gedrehten **Spielrichtung**; **Halbzeit starten** wechselt
   die Halbzeit und startet die Pause (Standard 2 Minuten, aus der
   Regeldefinition). **Pause beenden** schließt sie früher ab.
4. Das Pfeil-Symbol neben einem Eintrag im Spielverlauf (**Rückgängig**) nimmt
   ihn zurück, **Ändern** korrigiert ihn an Ort und Stelle (Trikotnummer, bei
   Spielzügen die Yards, bei **Feldposition** die Yardlinie, bei **Spielzeit**
   und **Auszeit** die Spielzeit); am großen Bildschirm geht das
   Zurücknehmen auch mit **Strg Z**. Auch ein versehentlich gestarteter
   **Halbzeit**- oder **Overtime**-Eintrag lässt sich so zurücknehmen: Das
   Spiel steht danach wieder in der ersten Halbzeit bzw. vor der Overtime. Ein Eintrag, der den Ballbesitz gedreht
   hat (**Turnover**, **Interception**, **Safety**), nimmt dabei auch diese
   Drehung zurück – auch wenn er noch nicht gesendet wurde. Der Touchdown
   selbst dreht den Ball nicht mehr: erst der Versuch (**+1**, **+2**,
   **nicht verwandelt** oder **Gegner +2**) gibt ihn ab.
   **Nur Punkte** blendet alles aus, was keine
   Punkte gebracht hat, damit ein falscher Spielstand schnell zu finden ist.
   **Halbzeit**
   fragt beim ersten Tippen nach (**Halbzeit starten**) und wechselt erst beim
   zweiten Tippen innerhalb von 10 Sekunden in die zweite Halbzeit; danach
   läuft oben die **Pause** mit Countdown (Standard 2 Minuten, aus der
   Regeldefinition), **Pause beenden**
   schließt sie früher ab.
5. **Spielende und Bestätigung** öffnet den Abschluss: beide Captains
   bestätigen, dann **Ergebnis abschicken**. Danach zeigt **Ergebnis gesendet**
   den Endstand mit beiden Halbzeiten und den vollständigen Spielverlauf.

Oben rechts öffnet der Avatar das **Konto**-Menü: dort stehen die Darstellung
**Auto**, **Hell** und **Dunkel** (Auto folgt der Einstellung des Geräts) und
**Abmelden**.

## Breite Bildschirme und Tastatur

Auf Tablets im Querformat steht der Spielverlauf neben den Eingaben. Die
Spieleliste zeigt bei mehreren Feldern einen Feldplan mit gemeinsamen
Anstoßzeiten. Auf dem Desktop kommen Spielinfo und Halbzeitenstände hinzu.

Dort kannst du mit **T** einen Touchdown öffnen, mit **P** einen Spielzug
(Pass), mit **1–4** Pass/Run/Sack/Interception, mit **5** die Strafe, mit
**6** die Spielzeit und mit **7** **Mehr** öffnen; **8–0** lösen 1st Down,
Turnover und Safety aus. Mit **B** wechselt der Ballbesitz, mit **Strg+Z**
(Mac: **Cmd+Z**) nimmst du den letzten Eintrag zurück. Die Tastenkürzel sind deaktiviert, solange ein
Dialog oder ein Eingabefeld aktiv ist oder das Spiel nur gelesen werden darf.

**Offizielle eintragen:** Tippe in **Spiel vorbereiten** auf eine Position und
suche nach dem Nachnamen. Die Vorschläge kommen aus dem ganzen Verzeichnis, mit
Team und Lizenz. **Freitext** heißt: es ist nur ein Name gespeichert – er
braucht Vor- und Nachnamen und wird nur angeboten, wenn niemand gefunden wurde.
Wer schon in einer anderen Position steht, lässt sich nicht wählen. Eine
abgelaufene Lizenz steht als Hinweis an der Zeile und warnt beim Start, sie
sperrt ihn nicht.

Welche Positionen **Spiel vorbereiten** anbietet und wie sie heißen, bereitet
die Ligaleitung für ihre Liga vor – du wählst nur die Personen aus. Welche
Positionen als Pflicht zählen, legt sie ebenfalls fest; der Zähler oben zeigt
**4/4 besetzt**. Eine optionale Position ohne Besetzung erscheint als schmale
Zeile **Scorecard Judge hinzufügen**; sobald jemand eingetragen ist, wird daraus
eine normale Zeile.

**Spiel starten bestätigen:** Über **Spiel starten** steht die Zeile **Bereit
zum Starten**, sobald alle Pflichtangaben gesetzt sind; fehlt etwas, listet
**Angaben fehlen** genau auf, was noch fehlt. Ohne Verbindung oder bei einem
gesperrten Spiel steht dort **Start nur online** bzw. **Nur lesen**. **Spiel
starten** öffnet zuerst
eine Übersicht: Begegnung, Anstoß, Feld, Offizielle, Münzwurf gewonnen von,
erster Ballbesitz, Spielrichtung, Passcheck und Lizenzwarnungen. **Jetzt
starten** schreibt die Vorbereitung und sperrt das Spiel für dieses Gerät – eine
Spieluhr läuft in der App nicht. Fehlt eine Pflichtposition oder eine der drei
Angaben, nennt die Übersicht den Grund und der Start bleibt gesperrt. Eine
abgelaufene Lizenz warnt nur: **Trotzdem starten** startet.

## Ohne Netz

Einmal geöffnet, funktioniert die Erfassung auch ohne Verbindung: Einträge,
Rückgängig (solange nicht übertragen), Ballbesitz und Halbzeit werden auf dem
Gerät gespeichert und später in der Reihenfolge der Eingabe gesendet.

Netz brauchst du zum **Spiel starten**, zum Bearbeiten der Offiziellen, zum
**Ergebnis abschicken** und für ein Spiel, das dieses Gerät noch nie geöffnet
hat. Das Ergebnis lässt sich erst senden, wenn die Warteschlange leer ist.

Oben in der Leiste zeigt dir der Punkt den Stand der Übertragung: **Synchron**,
**N warten** oder **Offline**; ein Tipp versucht es sofort erneut. Abgelehnte
Einträge erscheinen darunter und lassen sich dort erneut versuchen oder
verwerfen. Meldet sich vor dem Senden ein anderer Nutzer an, bleibt am Eintrag
stehen, wer ihn erfasst hat: **erfasst von X, gesendet von Y**.

## Zweites Gerät

Das Spiel gehört dem Gerät, das es gestartet hat. Ein zweites Gerät öffnet es
nur lesend und sagt dir auch, warum. Staff kann die Sperre freigeben, wenn ein
Gerät verloren geht.

Nimmt ein anderes Gerät das Spiel, zeigt dein Gerät den offiziellen
Spielstand. Eigene, noch nicht übertragene Einträge stehen darunter mit
Anzahl und lassen sich mit einem Tipp anzeigen; sie sind **nicht im
offiziellen Spielbericht**. Ob und wie sie noch übertragen werden, entscheidet
die Turnierleitung.

## Häufige Fragen

**Wo ist die alte Scorecard hin?**
Sie bleibt unter `/scorecard/` unverändert erreichbar. Beide Apps schreiben
dieselben Ergebnisse.

**Warum lässt sich das Ergebnis nicht abschicken?**
Solange Einträge warten oder abgelehnt wurden, ist der Knopf gesperrt. Übertrage
oder verwerfe sie zuerst über die Anzeige oben.

**Wie viele Auszeiten hat ein Team schon genommen?**
Neben dem Ballbesitz steht bei beiden Teams sein Auszeit-Feld: der Stand zeigt
„genommen/erlaubt“ für diese Halbzeit (z. B. 1/2). Zwei sind es pro Halbzeit
(IFAF 2023); eine dritte lässt sich trotzdem erfassen – die App warnt nur, denn
auf dem Feld entscheidet der Schiedsrichter.

**Wie komme ich später an ein Spiel?**
Der Link `/scorecard/v2/gameday/<Spieltag-ID>/game/<Spiel-ID>/` öffnet genau
dieses Spiel – auch ein beendetes, dann nur lesend; die Spieltag-ID steht mit
im Pfad. Die IDs sind die Nummern aus der Spieleliste bzw. der
Gameinfo-Eintrag. Ältere Links (`?game=<Spiel-ID>` und `/spiel/<Spiel-ID>/`)
funktionieren weiterhin und werden auf den neuen Pfad umgeschrieben.

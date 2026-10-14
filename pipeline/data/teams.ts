/**
 * Canonical team names. Every provider spells teams differently ("Manchester City FC",
 * "Man City", "Manchester City", "FC Arsenal"); the pipeline keys fixtures by canonical
 * name so sources can be mixed. Canonical spelling = football-data.co.uk (used by the
 * backtest), plus English names for UCL clubs outside the big five leagues.
 *
 * Matching: exact alias → normalised exact → token overlap. Unmatched names are logged
 * so the alias table can be extended; they are never silently guessed.
 */

const CANONICAL: Record<string, string[]> = {
  // England
  Arsenal: ["Arsenal FC", "FC Arsenal"],
  "Aston Villa": ["Aston Villa FC"],
  Bournemouth: ["AFC Bournemouth"],
  Brentford: ["Brentford FC", "Brentford F.C."],
  Brighton: ["Brighton & Hove Albion FC", "Brighton & Hove Albion", "Brighton and Hove Albion", "Brighton Hove Albion"],
  Burnley: ["Burnley FC"],
  Chelsea: ["Chelsea FC"],
  Coventry: ["Coventry City", "Coventry City FC"],
  "Crystal Palace": ["Crystal Palace FC"],
  Everton: ["Everton FC"],
  Fulham: ["Fulham FC"],
  Hull: ["Hull City", "Hull City AFC"],
  Ipswich: ["Ipswich Town", "Ipswich Town FC"],
  Leeds: ["Leeds United", "Leeds United FC", "Leeds Utd"],
  Leicester: ["Leicester City", "Leicester City FC"],
  Liverpool: ["Liverpool FC", "FC Liverpool"],
  "Man City": ["Manchester City", "Manchester City FC", "Man. City"],
  "Man United": ["Manchester United", "Manchester United FC", "Man Utd", "Man. United", "Manchester Utd"],
  Newcastle: ["Newcastle United", "Newcastle United FC", "Newcastle Utd"],
  "Nott'm Forest": ["Nottingham Forest", "Nottingham Forest FC", "Nottm Forest", "Nottingham"],
  Southampton: ["Southampton FC"],
  Sunderland: ["Sunderland AFC"],
  Tottenham: ["Tottenham Hotspur", "Tottenham Hotspur FC", "Spurs"],
  "West Ham": ["West Ham United", "West Ham United FC", "West Ham Utd"],
  Wolves: ["Wolverhampton Wanderers", "Wolverhampton Wanderers FC", "Wolverhampton"],
  // Spain
  Alaves: ["Deportivo Alavés", "Deportivo Alaves", "Alavés", "CD Alaves"],
  "Ath Bilbao": ["Athletic Club", "Athletic Bilbao", "Athletic Club de Bilbao"],
  "Ath Madrid": ["Atlético Madrid", "Atletico Madrid", "Club Atlético de Madrid", "Atlético de Madrid", "Atletico de Madrid"],
  Barcelona: ["FC Barcelona", "Barcelona FC"],
  Betis: ["Real Betis", "Real Betis Balompié", "Real Betis Balompie"],
  Celta: ["Celta Vigo", "RC Celta de Vigo", "RC Celta", "Celta de Vigo"],
  Elche: ["Elche CF"],
  Espanol: ["Espanyol", "RCD Espanyol de Barcelona", "RCD Espanyol", "Espanyol Barcelona"],
  Getafe: ["Getafe CF", "FC Getafe"],
  Girona: ["Girona FC"],
  "La Coruna": ["Deportivo La Coruña", "Deportivo A Coruña", "Deportivo de La Coruña", "Deportivo La Coruna", "Deportivo"],
  "Las Palmas": ["UD Las Palmas"],
  Leganes: ["CD Leganés", "CD Leganes", "Leganés"],
  Levante: ["Levante UD"],
  Malaga: ["Málaga CF", "Malaga CF", "FC Malaga", "Málaga"],
  Mallorca: ["RCD Mallorca", "Real Mallorca"],
  Osasuna: ["CA Osasuna"],
  Oviedo: ["Real Oviedo"],
  "Real Madrid": ["Real Madrid CF"],
  Santander: ["Racing Santander", "Real Racing Club", "Racing de Santander", "Real Racing Club de Santander"],
  Sevilla: ["Sevilla FC", "FC Sevilla"],
  Sociedad: ["Real Sociedad", "Real Sociedad de Fútbol", "Real Sociedad de Futbol"],
  Valencia: ["Valencia CF", "FC Valencia"],
  Valladolid: ["Real Valladolid", "Real Valladolid CF"],
  Vallecano: ["Rayo Vallecano", "Rayo Vallecano de Madrid"],
  Villarreal: ["Villarreal CF", "FC Villareal", "Villareal"],
  // Italy
  Atalanta: ["Atalanta BC", "Atalanta Bergamo"],
  Bologna: ["Bologna FC 1909", "Bologna FC"],
  Cagliari: ["Cagliari Calcio"],
  Como: ["Como 1907"],
  Cremonese: ["US Cremonese"],
  Empoli: ["Empoli FC"],
  Fiorentina: ["ACF Fiorentina", "AC Fiorentina"],
  Frosinone: ["Frosinone Calcio"],
  Genoa: ["Genoa CFC"],
  Inter: ["Inter Milan", "FC Internazionale Milano", "Internazionale", "Inter Mailand"],
  Juventus: ["Juventus FC", "Juventus Turin"],
  Lazio: ["SS Lazio", "Lazio Rom", "Lazio Roma"],
  Lecce: ["US Lecce"],
  Milan: ["AC Milan", "AC Mailand"],
  Monza: ["AC Monza"],
  Napoli: ["SSC Napoli", "SSC Neapel"],
  Parma: ["Parma Calcio 1913", "Parma Calcio"],
  Pisa: ["Pisa SC", "AC Pisa 1909"],
  Roma: ["AS Roma", "AS Rom"],
  Sassuolo: ["US Sassuolo Calcio", "US Sassuolo"],
  Torino: ["Torino FC", "FC Turin"],
  Udinese: ["Udinese Calcio"],
  Venezia: ["Venezia FC"],
  Verona: ["Hellas Verona", "Hellas Verona FC"],
  // Germany
  Augsburg: ["FC Augsburg"],
  "Bayern Munich": ["FC Bayern München", "FC Bayern Munchen", "Bayern München", "Bayern Munchen", "FC Bayern"],
  Bochum: ["VfL Bochum", "VfL Bochum 1848"],
  Dortmund: ["Borussia Dortmund", "BVB"],
  "Ein Frankfurt": ["Eintracht Frankfurt"],
  Elversberg: ["SV Elversberg", "SV 07 Elversberg"],
  "FC Koln": ["1. FC Köln", "1. FC Koln", "FC Köln", "FC Cologne", "Köln"],
  Freiburg: ["SC Freiburg"],
  Hamburg: ["Hamburger SV", "HSV"],
  Heidenheim: ["1. FC Heidenheim", "1. FC Heidenheim 1846", "FC Heidenheim"],
  Hoffenheim: ["TSG 1899 Hoffenheim", "TSG Hoffenheim"],
  "Holstein Kiel": ["Holstein Kiel"],
  Leverkusen: ["Bayer 04 Leverkusen", "Bayer Leverkusen"],
  "M'gladbach": ["Borussia Mönchengladbach", "Borussia Monchengladbach", "Mönchengladbach", "Gladbach", "Borussia M'gladbach"],
  Mainz: ["1. FSV Mainz 05", "FSV Mainz 05", "Mainz 05"],
  Paderborn: ["SC Paderborn 07", "SC Paderborn"],
  "RB Leipzig": ["RasenBallsport Leipzig", "Leipzig"],
  "Schalke 04": ["FC Schalke 04", "Schalke"],
  "St Pauli": ["FC St. Pauli", "St. Pauli", "FC St Pauli"],
  Stuttgart: ["VfB Stuttgart"],
  "Union Berlin": ["1. FC Union Berlin", "FC Union Berlin"],
  "Werder Bremen": ["SV Werder Bremen"],
  Wolfsburg: ["VfL Wolfsburg"],
  // France
  Angers: ["Angers SCO", "SCO Angers"],
  Auxerre: ["AJ Auxerre"],
  Brest: ["Stade Brestois 29", "Stade Brestois", "Stade Brest"],
  "Le Havre": ["Le Havre AC", "Havre AC"],
  "Le Mans": ["Le Mans FC"],
  Lens: ["RC Lens", "Racing Club de Lens"],
  Lille: ["Lille OSC", "LOSC Lille", "LOSC"],
  Lorient: ["FC Lorient"],
  Lyon: ["Olympique Lyonnais", "Olympique Lyon", "OL"],
  Marseille: ["Olympique de Marseille", "Olympique Marseille", "OM"],
  Metz: ["FC Metz"],
  Monaco: ["AS Monaco", "AS Monaco FC"],
  Montpellier: ["Montpellier HSC"],
  Nantes: ["FC Nantes"],
  Nice: ["OGC Nice"],
  "Paris FC": ["Paris FC"],
  "Paris SG": ["Paris Saint-Germain", "Paris Saint Germain", "Paris Saint-Germain FC", "PSG", "Paris St. Germain", "Paris St Germain"],
  Reims: ["Stade de Reims", "Stade Reims"],
  Rennes: ["Stade Rennais", "Stade Rennais FC", "Stade Rennais FC 1901", "Rennes FC"],
  "St Etienne": ["AS Saint-Étienne", "AS Saint-Etienne", "Saint-Etienne", "Saint-Étienne", "St. Etienne"],
  Strasbourg: ["RC Strasbourg Alsace", "RC Strasbourg", "Racing Strasbourg"],
  Toulouse: ["Toulouse FC", "FC Toulouse"],
  Troyes: ["ESTAC Troyes", "ES Troyes AC"],
  // UCL clubs outside the big five
  "AEK Athens": ["AEK Athen", "AEK Athens FC", "AEK"],
  Ajax: ["AFC Ajax", "Ajax Amsterdam"],
  Benfica: ["SL Benfica", "Benfica Lissabon", "Sport Lisboa e Benfica"],
  "Bodo/Glimt": ["FK Bodø/Glimt", "FK Bodö/Glimt", "Bodø/Glimt", "Bodo Glimt", "Bodø Glimt", "Bodo/Glimt"],
  "Club Brugge": ["Club Brugge KV", "Club Brügge", "FC Brügge", "Club Bruges", "FC Bruges"],
  Celtic: ["Celtic FC", "Celtic Glasgow"],
  Copenhagen: ["FC Copenhagen", "FC København", "FC Kopenhagen", "F.C. Copenhagen"],
  Fenerbahce: ["Fenerbahçe", "Fenerbahçe SK", "Fenerbahce SK", "Fenerbahce Istanbul", "Fenerbahçe Istanbul"],
  Feyenoord: ["Feyenoord Rotterdam"],
  Galatasaray: ["Galatasaray SK", "Galatasaray Istanbul", "Galatasaray AS"],
  "Kairat Almaty": ["Kairat Almaty", "FC Kairat", "Kairat"],
  LASK: ["LASK Linz"],
  Olympiacos: ["Olympiacos FC", "Olympiakos Piräus", "Olympiakos", "Olympiacos Piraeus", "Olympiakos Piraeus"],
  Pafos: ["Pafos FC", "Paphos"],
  Porto: ["FC Porto", "Porto FC"],
  PSV: ["PSV Eindhoven", "PSV Eindhoven FC"],
  Qarabag: ["Qarabağ FK", "Qarabag FK", "Qarabağ", "Karabach Agdam", "Qarabag Agdam"],
  Sabah: ["Sabah FK", "Sabah FC"],
  "Shakhtar Donetsk": ["FC Shakhtar Donetsk", "Schachtar Donezk", "Shakhtar"],
  "Slavia Prague": ["SK Slavia Praha", "Slavia Praha", "Slavia Prag"],
  "Slovan Bratislava": ["ŠK Slovan Bratislava", "SK Slovan Bratislava"],
  "Sporting CP": ["Sporting Clube de Portugal", "Sporting Lisbon", "Sporting Lissabon", "Sporting"],
  "Sturm Graz": ["SK Sturm Graz"],
  "Union St Gilloise": ["Royale Union Saint-Gilloise", "Union Saint-Gilloise", "Union SG", "Royale Union SG"],
  Viking: ["Viking FK", "Viking Stavanger"],
  "Young Boys": ["BSC Young Boys", "Young Boys Bern"],
  "Dinamo Zagreb": ["GNK Dinamo Zagreb", "Dinamo Zagreb"],
  "Red Star Belgrade": ["Crvena Zvezda", "FK Crvena Zvezda", "Roter Stern Belgrad", "Red Star"],
  "Red Bull Salzburg": ["FC Red Bull Salzburg", "FC Salzburg", "Salzburg", "RB Salzburg"],
  "Sparta Prague": ["AC Sparta Praha", "Sparta Praha", "Sparta Prag"],
  Shkendija: ["KF Shkëndija", "Shkëndija", "KF Shkendija"],
  Ludogorets: ["PFC Ludogorets Razgrad", "Ludogorets Razgrad"],
};

const STOP = new Set([
  "fc", "cf", "afc", "sc", "ac", "as", "ss", "ssc", "us", "club", "de", "del", "di", "da", "sv", "vfb", "vfl", "tsg", "fsv", "bsc", "cd", "ud",
  "rcd", "sd", "ogc", "rc", "losc", "sl", "fk", "kv", "sk", "cfc", "calcio", "bc", "hsc", "sco", "aj", "acf", "cp", "the", "e", "v",
  "fussball", "fußball", "football", "futbol", "fútbol", "ev", "e.v.", "1", "04", "05", "07", "09", "29", "1846", "1848", "1899", "1900",
  "1901", "1904", "1907", "1908", "1909", "1910", "1913", "1919", "1946", "1960", "balompie", "balompié",
]);

export function normalizeTeam(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/&/g, " and ")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return base
    .split(" ")
    .filter((t) => t && !STOP.has(t))
    .join(" ");
}

const ALIAS = new Map<string, string>();
const NORMALIZED_CANON = new Map<string, string>();
for (const [canon, aliases] of Object.entries(CANONICAL)) {
  ALIAS.set(canon.toLowerCase(), canon);
  NORMALIZED_CANON.set(normalizeTeam(canon), canon);
  for (const a of aliases) {
    ALIAS.set(a.toLowerCase(), canon);
    ALIAS.set(normalizeTeam(a), canon);
  }
}

export const CANONICAL_TEAMS = Object.keys(CANONICAL);
const unmatched = new Set<string>();

export function canonicalTeam(raw: string): string | null {
  const trimmed = raw.trim();
  const direct = ALIAS.get(trimmed.toLowerCase());
  if (direct) return direct;
  const norm = normalizeTeam(trimmed);
  const viaNorm = ALIAS.get(norm) ?? NORMALIZED_CANON.get(norm);
  if (viaNorm) return viaNorm;
  // Token overlap fallback: all tokens of the shorter side must appear in the longer side.
  const tokens = norm.split(" ").filter(Boolean);
  let best: string | null = null;
  let bestScore = 0;
  for (const [cn, canon] of NORMALIZED_CANON) {
    const ct = cn.split(" ").filter(Boolean);
    const inter = ct.filter((t) => tokens.includes(t)).length;
    if (inter === 0) continue;
    const score = inter / Math.max(ct.length, tokens.length);
    if (score > bestScore) {
      bestScore = score;
      best = canon;
    } else if (score === bestScore) {
      best = null; // ambiguous
    }
  }
  if (best && bestScore >= 0.5) return best;
  if (!unmatched.has(trimmed)) {
    unmatched.add(trimmed);
    console.warn(`teams: no canonical match for "${trimmed}" (normalised "${norm}")`);
  }
  return null;
}

export function slugTeam(canon: string): string {
  return canon
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Canonical fixture id: competition, UTC date, home slug, away slug. */
export function fixtureId(competition: string, kickoffUtc: Date, home: string, away: string): string {
  return `${competition}-${kickoffUtc.toISOString().slice(0, 10)}-${slugTeam(home)}-${slugTeam(away)}`;
}

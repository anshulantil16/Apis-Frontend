/* Where a job is and where a candidate is, for TalentMatch's "nearest
 * location" - the cities APIS hires in, with their coordinates, so the
 * distance between two of them can be worked out. Covers the metros, the
 * north where most of APIS is (Delhi NCR, UP, Uttarakhand - Roorkee is the
 * plant - Haryana, Punjab), state capitals, and Dubai. */

export interface City { name: string; lat: number; lon: number; aliases: string[] }

const c = (name: string, lat: number, lon: number, ...aliases: string[]): City => ({ name, lat, lon, aliases: [name.toLowerCase(), ...aliases] });

export const CITIES: City[] = [
  // Delhi NCR
  c('Delhi', 28.61, 77.21, 'new delhi', 'delhi ncr', 'ncr', 'okhla', 'dwarka', 'rohini', 'saket', 'janakpuri', 'laxmi nagar', 'pitampura'),
  c('Gurugram', 28.46, 77.03, 'gurgaon'), c('Noida', 28.54, 77.39), c('Greater Noida', 28.47, 77.5),
  c('Ghaziabad', 28.67, 77.45), c('Faridabad', 28.41, 77.32), c('Sonipat', 28.99, 77.02, 'sonepat'),
  // Uttarakhand
  c('Roorkee', 29.85, 77.89), c('Haridwar', 29.95, 78.16), c('Dehradun', 30.32, 78.03), c('Rishikesh', 30.09, 78.27),
  c('Haldwani', 29.22, 79.51), c('Rudrapur', 28.98, 79.4), c('Kashipur', 29.21, 78.96),
  // Uttar Pradesh
  c('Lucknow', 26.85, 80.95), c('Kanpur', 26.45, 80.33), c('Agra', 27.18, 78.01), c('Meerut', 28.98, 77.71),
  c('Varanasi', 25.32, 82.97, 'banaras'), c('Prayagraj', 25.44, 81.85, 'allahabad'), c('Bareilly', 28.37, 79.43),
  c('Moradabad', 28.84, 78.77), c('Aligarh', 27.88, 78.08), c('Gorakhpur', 26.76, 83.37), c('Saharanpur', 29.96, 77.55),
  c('Muzaffarnagar', 29.47, 77.7), c('Mathura', 27.49, 77.67), c('Jhansi', 25.45, 78.57),
  // Haryana, Punjab, Himachal, J&K
  c('Chandigarh', 30.73, 76.78, 'mohali', 'panchkula', 'zirakpur', 'tricity'), c('Ambala', 30.38, 76.78), c('Karnal', 29.69, 76.99),
  c('Panipat', 29.39, 76.97), c('Rohtak', 28.9, 76.61), c('Hisar', 29.15, 75.72), c('Yamunanagar', 30.13, 77.28),
  c('Ludhiana', 30.9, 75.86), c('Amritsar', 31.63, 74.87), c('Jalandhar', 31.33, 75.58), c('Patiala', 30.34, 76.39), c('Bathinda', 30.21, 74.95),
  c('Shimla', 31.1, 77.17), c('Baddi', 30.96, 76.79), c('Solan', 30.9, 77.1), c('Jammu', 32.73, 74.86), c('Srinagar', 34.08, 74.8),
  // Rajasthan
  c('Jaipur', 26.91, 75.79), c('Jodhpur', 26.24, 73.02), c('Udaipur', 24.59, 73.71), c('Kota', 25.21, 75.86),
  c('Ajmer', 26.45, 74.64), c('Bikaner', 28.02, 73.31), c('Alwar', 27.55, 76.6), c('Neemrana', 27.99, 76.38), c('Bhiwadi', 28.21, 76.86),
  // West
  c('Mumbai', 19.08, 72.88, 'bombay', 'navi mumbai', 'thane', 'andheri', 'powai', 'bhiwandi'), c('Pune', 18.52, 73.86, 'pimpri', 'chinchwad', 'hinjewadi'),
  c('Nagpur', 21.15, 79.09), c('Nashik', 20.0, 73.79), c('Aurangabad', 19.88, 75.34, 'chhatrapati sambhajinagar'),
  c('Ahmedabad', 23.02, 72.57, 'gandhinagar'), c('Surat', 21.17, 72.83), c('Vadodara', 22.31, 73.18, 'baroda'), c('Rajkot', 22.3, 70.8),
  c('Goa', 15.49, 73.83, 'panaji', 'margao', 'vasco'),
  // Central
  c('Bhopal', 23.26, 77.41), c('Indore', 22.72, 75.86, 'pithampur'), c('Gwalior', 26.22, 78.18), c('Jabalpur', 23.18, 79.99), c('Raipur', 21.25, 81.63),
  // East and North-east
  c('Kolkata', 22.57, 88.36, 'calcutta', 'howrah', 'salt lake'), c('Patna', 25.59, 85.14), c('Ranchi', 23.34, 85.31),
  c('Jamshedpur', 22.8, 86.2), c('Bhubaneswar', 20.3, 85.82, 'cuttack'), c('Guwahati', 26.14, 91.74), c('Siliguri', 26.73, 88.4),
  // South
  c('Bengaluru', 12.97, 77.59, 'bangalore', 'whitefield', 'electronic city'), c('Chennai', 13.08, 80.27, 'madras'),
  c('Hyderabad', 17.39, 78.49, 'secunderabad', 'gachibowli', 'hitech city'), c('Kochi', 9.93, 76.27, 'cochin', 'ernakulam'),
  c('Thiruvananthapuram', 8.52, 76.94, 'trivandrum'), c('Coimbatore', 11.02, 76.96), c('Madurai', 9.93, 78.12),
  c('Visakhapatnam', 17.69, 83.22, 'vizag'), c('Vijayawada', 16.51, 80.65), c('Mysuru', 12.3, 76.64, 'mysore'),
  c('Mangaluru', 12.91, 74.86, 'mangalore'), c('Hubballi', 15.36, 75.12, 'hubli'),
  // Abroad - APIS has a facility in Dubai
  c('Dubai', 25.2, 55.27, 'uae', 'sharjah', 'abu dhabi'),
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CITY_RE = CITIES.map(city => ({
  city, re: new RegExp(`(?<![a-z])(?:${city.aliases.map(esc).join('|')})(?![a-z])`, 'i'),
}));

export const cityByName = (name: string) => CITIES.find(x => x.name.toLowerCase() === name.toLowerCase() || x.aliases.includes(name.toLowerCase()));

/* The first city a piece of text mentions. Longer names are tried first,
   so "Greater Noida" isn't read as Noida nor "New Delhi" as anything else. */
const BY_LENGTH = [...CITY_RE].sort((a, b) => Math.max(...b.city.aliases.map(x => x.length)) - Math.max(...a.city.aliases.map(x => x.length)));
export function cityIn(text: string): City | null {
  let best: { city: City; at: number } | null = null;
  for (const { city, re } of BY_LENGTH) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.at)) best = { city, at: m.index };
  }
  return best?.city ?? null;
}

/* Kilometres between two cities, as the crow flies. */
export function distanceKm(a: City, b: City) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

/* How a distance scores: same city or metro area is full marks, and it
   falls off with the travel a move would need. */
export function locationScore(km: number) {
  return km <= 40 ? 1 : km <= 150 ? 0.85 : km <= 350 ? 0.65 : km <= 800 ? 0.4 : 0.2;
}

// ── industries ────────────────────────────────────────────────────────────

export interface Industry { name: string; related: string[]; words: string[] }

/* Each industry by the companies people name and the words they use. APIS
   is FMCG & Food; the related list says what counts as near it. */
export const INDUSTRIES: Industry[] = [
  { name: 'FMCG & Food', related: ['Retail', 'E-commerce', 'Pharma & Healthcare', 'Agri & Dairy'], words: [
    'fmcg', 'cpg', 'consumer goods', 'consumer products', 'packaged food', 'food products', 'food processing', 'foods', 'beverages',
    'confectionery', 'bakery', 'snacks', 'spices', 'edible oil', 'honey', 'dry fruits', 'personal care', 'home care',
    'dabur', 'nestle', 'nestlé', 'itc', 'patanjali', 'marico', 'emami', 'haldiram', "haldiram's", 'bikaji', 'britannia', 'parle',
    'hindustan unilever', 'hul', 'unilever', 'procter', 'p&g', 'colgate', 'godrej consumer', 'tata consumer', 'adani wilmar',
    'agro tech', 'del monte', 'kissan', 'mondelez', 'cadbury', 'pepsico', 'coca-cola', 'coca cola', 'bisleri', 'zydus wellness',
    'baidyanath', 'himalaya', 'jyothy', 'bajaj consumer', 'kellogg', 'mtr', 'everest', 'mdh', 'catch foods', 'fortune foods', 'tata tea',
    'saffola', 'hamdard', 'bagrry', 'dmart foods', 'heinz', 'kraft', 'mars', 'ferrero', 'perfetti', 'wipro consumer', 'reckitt',
    'nivea', 'loreal', "l'oreal", 'cavinkare', 'gits', 'priya foods', 'haldirams', 'bikanervala', 'balaji wafers', 'apis india',
  ] },
  { name: 'Agri & Dairy', related: ['FMCG & Food'], words: [
    'dairy', 'amul', 'mother dairy', 'parag', 'agriculture', 'agri', 'agro', 'seeds', 'fertilizer', 'fertiliser', 'poultry', 'apiculture', 'beekeeping',
  ] },
  { name: 'Retail', related: ['FMCG & Food', 'E-commerce'], words: [
    'retail', 'reliance retail', 'reliance fresh', 'dmart', 'd-mart', 'avenue supermarts', 'big bazaar', 'future group', "spencer's",
    'more retail', 'v-mart', 'vishal mega mart', 'star bazaar', 'metro cash', 'walmart', 'best price', 'lulu',
  ] },
  { name: 'E-commerce', related: ['Retail', 'FMCG & Food'], words: [
    'e-commerce', 'ecommerce', 'amazon', 'flipkart', 'zepto', 'blinkit', 'grofers', 'swiggy', 'instamart', 'bigbasket', 'jiomart',
    'myntra', 'meesho', 'nykaa', 'zomato', 'quick commerce',
  ] },
  { name: 'Pharma & Healthcare', related: ['FMCG & Food'], words: [
    'pharma', 'pharmaceutical', 'pharmaceuticals', 'healthcare', 'hospital', 'sun pharma', 'cipla', 'lupin', "dr. reddy", 'dr reddy',
    'mankind', 'alkem', 'glenmark', 'torrent', 'abbott', 'zydus', 'cadila', 'nutraceutical', 'ayurvedic',
  ] },
  { name: 'IT & Software', related: [], words: [
    'software', 'it services', 'saas', 'infosys', 'tcs', 'tata consultancy', 'wipro technologies', 'wipro limited', 'hcl', 'tech mahindra',
    'accenture', 'cognizant', 'capgemini', 'ibm', 'ltimindtree', 'mphasis', 'deloitte',
  ] },
  { name: 'Banking & Finance', related: [], words: [
    'bank', 'banking', 'nbfc', 'hdfc', 'icici', 'sbi', 'axis bank', 'kotak', 'bajaj finance', 'insurance company', 'life insurance', 'mutual fund', 'fintech', 'paytm',
  ] },
  { name: 'Automobile', related: [], words: ['automobile', 'automotive', 'maruti', 'tata motors', 'hero motocorp', 'bajaj auto', 'mahindra', 'hyundai', 'honda', 'auto parts'] },
  { name: 'Manufacturing', related: ['FMCG & Food'], words: ['manufacturing', 'plant', 'factory', 'industries ltd', 'steel', 'cement', 'chemicals', 'packaging', 'textile'] },
  { name: 'Logistics', related: [], words: ['logistics', 'supply chain company', 'delhivery', 'blue dart', 'dtdc', 'ecom express', 'shadowfax', 'freight', 'courier'] },
];

const IND_RE = INDUSTRIES.map(ind => ({
  ind, re: new RegExp(`(?<![a-z0-9])(?:${ind.words.map(esc).join('|')})(?![a-z0-9])`, 'gi'),
}));

/* The industries a text mentions, most first. */
export function industriesIn(text: string): { name: string; count: number }[] {
  return IND_RE.map(({ ind, re }) => ({ name: ind.name, count: text.match(re)?.length ?? 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

export const industryByName = (name: string) => INDUSTRIES.find(i => i.name === name);

// ── fields of study ───────────────────────────────────────────────────────

/* What a degree is in - so "MBA in Marketing" or "B.Tech Food Technology"
   in a JD is checked against the candidate's field, not just the level. */
export const FIELDS: { name: string; re: RegExp }[] = [
  { name: 'Marketing', re: /\bmarketing\b/i },
  { name: 'Sales', re: /\bsales\b/i },
  { name: 'Finance', re: /\bfinance\b|\bfinancial\b/i },
  { name: 'HR', re: /\bhuman resources?\b|\bhrm\b|\bhr\b|\bpersonnel\b/i },
  { name: 'Operations / Supply Chain', re: /\boperations\b|\bsupply chain\b|\blogistics\b/i },
  { name: 'Food Technology', re: /\bfood (technology|science|tech|processing|engineering)\b|\bdairy technology\b/i },
  { name: 'Agriculture', re: /\bagricultur|\bhorticultur|\bagri\b/i },
  { name: 'Chemistry', re: /\bchemistry\b/i },
  { name: 'Microbiology', re: /\bmicrobiology\b/i },
  { name: 'Biotechnology', re: /\bbiotech(nology)?\b|\bbiochemistry\b/i },
  { name: 'Computer Science / IT', re: /\bcomputer (science|applications|engineering)\b|\binformation technology\b|\bcse\b|\bb\.?c\.?a\b|\bm\.?c\.?a\b/i },
  { name: 'Electronics / Electrical', re: /\belectronics\b|\belectrical\b|\bece\b|\beee\b/i },
  { name: 'Mechanical', re: /\bmechanical\b/i },
  { name: 'Chemical Engineering', re: /\bchemical engineering\b/i },
  { name: 'Commerce / Accounting', re: /\bcommerce\b|\bb\.?\s?com\b|\bm\.?\s?com\b|\baccount(ing|ancy)\b/i },
  { name: 'Economics', re: /\beconomics\b/i },
  { name: 'Statistics / Mathematics', re: /\bstatistics\b|\bmathematics\b|\bmaths?\b/i },
  { name: 'Pharmacy', re: /\bpharmacy\b|\bb\.?\s?pharm\b|\bm\.?\s?pharm\b/i },
  { name: 'Law', re: /\bllb\b|\bllm\b|\blaw\b|\blegal studies\b/i },
];

export const fieldsIn = (text: string) => FIELDS.filter(f => f.re.test(text)).map(f => f.name);

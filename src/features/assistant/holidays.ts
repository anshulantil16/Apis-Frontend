/* Telling a holiday question apart from the rest, for Ask APIS. */

/* Words that make a question about holidays. Festival names are here so
   "when is diwali" is understood without the word "holiday". */
export const HOLIDAY_WORDS = ['holiday', 'holidays', 'chutti', 'vacation', 'festival', 'diwali', 'deepavali', 'holi',
  'dussehra', 'dussera', 'christmas', 'eid', 'fitr', 'zuha', 'milad', 'bakrid', 'muharram', 'independence', 'republic', 'gandhi',
  'janmashtami', 'rakhi', 'raksha', 'bandhan', 'navami', 'mahavir', 'buddha', 'guru', 'nanak', 'lohri', 'pongal',
  'onam', 'ugadi', 'baisakhi', 'gudi', 'padwa', 'chhath', 'navratri', 'durga', 'puja', 'ganesh', 'chaturthi'];

/* Words in a holiday question that aren't part of a holiday's name. */
export const GENERIC = new Set(['holiday', 'holidays', 'chutti', 'vacation', 'festival', 'next', 'upcoming', 'list', 'day']);

export function wordsOf(text: string) {
  return text.toLowerCase().replace(/[’'()]/g, '').match(/[a-z0-9]+/g) ?? [];
}

export function isHolidayQuestion(query: string) {
  return wordsOf(query).some(w => HOLIDAY_WORDS.includes(w));
}

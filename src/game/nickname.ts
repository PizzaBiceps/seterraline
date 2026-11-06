/** Server validation is authoritative; this helper is shared with the entry form. */
export function validateNickname(value: unknown): string {
 if (typeof value !== 'string') throw new Error('Enter a nickname.');
 const name = value.normalize('NFKC').trim();
 if (!name || name.length > 24 || /[\p{C}]/u.test(name)) throw new Error('Use a nickname of 1–24 visible characters.');
 const normalized = name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[013457@$!]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i'}[c]!));
 const compact = normalized.replace(/[^a-z]/g,'').replace(/(.)\1+/g,'$1');
 const blocked = ['fuck','shit','cunt','bitch','nigger','nigga','faggot','motherfucker','asshole'];
 if (blocked.some(word=>[compact.startsWith(word.replace(/(.)\1+/g,'$1')), compact.endsWith(word.replace(/(.)\1+/g,'$1'))].some(Boolean))) throw new Error('Please choose a nickname without offensive language.');
 return name;
}

/** Extract only a room ID; pasted links never navigate to or send data to another site. */
export function parsePartyInvite(value:string):string|null {
 const text=value.trim(),pattern=/^[a-f0-9]{16}$/i;
 if(pattern.test(text))return text.toLowerCase();
 try{const url=new URL(text);if(!['https:','http:'].includes(url.protocol))return null;const code=url.searchParams.get('room')||'';return pattern.test(code)?code.toLowerCase():null;}catch{return null;}
}

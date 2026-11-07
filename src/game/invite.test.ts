import test from 'node:test';import assert from 'node:assert/strict';import {parsePartyInvite} from './invite';
test('join accepts a room code or invite link without forwarding unrelated URL data',()=>{
 assert.equal(parsePartyInvite('  ABCDEF1234567890  '),'abcdef1234567890');
 assert.equal(parsePartyInvite('https://pizzabiceps.github.io/seterraline/?room=abcdef1234567890&extra=discard'),'abcdef1234567890');
 assert.equal(parsePartyInvite('http://127.0.0.1:5173/seterraline/?room=abcdef1234567890'),'abcdef1234567890');
 for(const value of ['', 'not-a-room','javascript:?room=abcdef1234567890','https://example.com/?room=invalid','abcdef12345678901'])assert.equal(parsePartyInvite(value),null);
});

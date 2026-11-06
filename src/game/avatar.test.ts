import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultAvatar,validateAvatar } from './avatar';
import { validateNickname } from './nickname';
test('avatars are deterministic, varied and strictly limited to 81 mirrored pixels',()=>{
 const a=defaultAvatar('Atlas'),b=defaultAvatar('Nova');assert.notDeepEqual(a,b);assert.deepEqual(a,defaultAvatar('Atlas'));
 for(let y=0;y<9;y++)for(let x=0;x<9;x++)assert.equal(a[y*9+x],a[y*9+8-x]);
 assert.throws(()=>validateAvatar(Array(64).fill(1)));assert.throws(()=>validateAvatar(Array(81).fill(99)));
 const custom=Array(81).fill(0);custom[0]=2;assert.equal(validateAvatar(custom)[8],2);
});
test('nickname filter blocks disguised profanity but allows ordinary nicknames',()=>{
 for(const name of ['Atlas','Nova','PizzaBiceps','Classy','Scunthorpe'])assert.equal(validateNickname(name),name);
 for(const name of ['f.u.c.k','sh1t','FUUUCK','b!tch','\u200b'])assert.throws(()=>validateNickname(name));
});

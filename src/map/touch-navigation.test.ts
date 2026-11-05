import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TouchNavigation, type MapView } from './touch-navigation';
const view: MapView = { center:[0,0],zoom:2,width:400,height:800,baseScale:1 };
test('pinch keeps the touched world position anchored and combines zoom with translation', () => {
 const nav=new TouchNavigation();
 assert.equal(nav.down(1,{x:150,y:400},view),'single');
 assert.equal(nav.down(2,{x:250,y:400},view),'pinch');
 assert.deepEqual(nav.move(2,{x:250,y:400},view),{center:[0,0],zoom:2});
 nav.move(1,{x:100,y:420},view);
 const next=nav.move(2,{x:300,y:420},view)!;
 assert.equal(next.zoom,4); assert.deepEqual(next.center,[0,-5]);
 assert.equal(next.center[1]+(420-400)/next.zoom,0);
});
test('neither finger release or the remaining finger movement can submit a tap after pinching', () => {
 const nav=new TouchNavigation();
 nav.down(1,{x:100,y:400},view);nav.down(2,{x:200,y:400},view);
 assert.equal(nav.up(2,view),true); assert.equal(nav.blocked,true);
 assert.equal(nav.move(1,{x:110,y:410},view),null);
 assert.equal(nav.up(1,view),true); assert.equal(nav.blocked,false);
 assert.equal(nav.down(3,{x:100,y:400},view),'single'); assert.equal(nav.up(3,view),false);
});
test('pinch clamps zoom, rebases after a third finger, and fully resets on cancellation', () => {
 const nav=new TouchNavigation();
 nav.down(1,{x:100,y:400},view);nav.down(2,{x:200,y:400},view);
 assert.equal(nav.move(2,{x:2000,y:400},view)!.zoom,16);
 assert.equal(nav.move(2,{x:101,y:400},view)!.zoom,1);
 nav.down(3,{x:300,y:400},view);assert.equal(nav.up(1,view),true);
 assert.ok(nav.move(3,{x:300,y:400},view));
 nav.cancel(); assert.equal(nav.points.size,0); assert.equal(nav.blocked,false);
 assert.equal(nav.move(2,{x:210,y:400},view),null);
});

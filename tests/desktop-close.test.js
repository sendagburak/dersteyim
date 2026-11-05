const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');

function simulateChoice(choice) {
  const {installCloseConfirmation}=require('../desktop/close-confirmation.cjs');
  const window={webContents:new EventEmitter()};
  let shown=0,options,parent,prevented=false;
  installCloseConfirmation(window,{showMessageBoxSync:(owner,settings)=>{shown++;parent=owner;options=settings;return choice;}});
  window.webContents.emit('will-prevent-unload',{preventDefault:()=>{prevented=true;}});
  return {shown,options,parent,window,prevented};
}

test('kaydedilmemiş yoklama varken düzenlemeye dön seçilirse pencere açık kalır',()=>{
  const result=simulateChoice(1);
  assert.equal(result.shown,1);
  assert.equal(result.parent,result.window);
  assert.equal(result.options.defaultId,1);
  assert.equal(result.options.cancelId,1);
  assert.equal(result.prevented,false);
});

test('kaydetmeden çık seçilirse pencerenin kapanmasına izin verilir',()=>{
  const result=simulateChoice(0);
  assert.equal(result.shown,1);
  assert.equal(result.prevented,true);
});

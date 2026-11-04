const {encryptSensitiveData,decryptSensitiveData}=require('./kvkk');
function protectPersonal(data){return encryptSensitiveData(JSON.stringify({full_name:data.full_name||'',parent_name:data.parent_name||'',parent_email:data.parent_email||'',parent_phone:data.parent_phone||''}));}
function personalData(row){
  if(!row.encrypted_personal_data)return {full_name:row.full_name||'',parent_name:row.parent_name||'',parent_email:row.parent_email||'',parent_phone:row.parent_phone||''};
  const raw=decryptSensitiveData(row.encrypted_personal_data);if(raw===null)throw new Error('Öğrenci kişisel verisi çözülemedi. Şifreleme anahtarını kontrol edin.');return JSON.parse(raw);
}
module.exports={protectPersonal,personalData};

export function makeDailyDraft(periods) {
  const result={};
  for(const item of periods){
    const records={};
    for(const studentId of item.studentIds)records[studentId]=item.existingRecords[studentId]||'GELDI';
    result[item.period]={records,recorded:item.existingRecords,note:item.existingSession?.note||'',version:item.existingSession?.saved_timestamp??null,saved:!!item.existingSession};
  }
  return result;
}
export function markStudent(state,selected,studentId,status) {
  const next={...state};
  for(const period of selected){const entry=state[period];if(entry&&Object.hasOwn(entry.records,studentId))next[period]={...entry,records:{...entry.records,[studentId]:status}};}
  return next;
}
export function markAllPresent(state,selected) {
  const next={...state};
  for(const period of selected){const entry=state[period];if(entry)next[period]={...entry,records:Object.fromEntries(Object.keys(entry.records).map(id=>[id,'GELDI']))};}
  return next;
}

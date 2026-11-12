const pieces={
 fold:{number:'FORM STUDY / 01',title:'Fold',text:'A silhouette gathered from lines that refuse to stay still. Fold is a study in layered tailoring and a little more room to move.'},
 drift:{number:'FORM STUDY / 02',title:'Drift',text:'Soft geometry, following the body rather than defining it. Drift explores fluid shape, movement and the gentle weight of a second layer.'},
 trace:{number:'FORM STUDY / 03',title:'Trace',text:'A quiet line of contrast, made to be found up close. Trace is a study in threaded detail and the marks we choose to leave.'}
};
const dialog=document.querySelector('#pieceDialog');
for(const button of document.querySelectorAll('[data-piece]')){
 button.addEventListener('click',()=>{
  const piece=pieces[button.dataset.piece];
  if(!piece)return;
  document.querySelector('#pieceNumber').textContent=piece.number;
  document.querySelector('#pieceTitle').textContent=piece.title;
  document.querySelector('#pieceText').textContent=piece.text;
  dialog.showModal();
 });
}
document.querySelector('.dialogClose').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
